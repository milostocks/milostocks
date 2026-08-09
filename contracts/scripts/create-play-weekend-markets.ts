// Creates one "weekend gap" PlayMarket per ticker: locks at this week's NYSE
// close (Friday 16:00 ET), resolves at the following Monday's open
// (09:30 ET). Mirrors create-weekend-markets.ts (GapMarket) — same DST-aware
// window math, different (chips-only) target contract.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPublicClient, createWalletClient, http, defineChain, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLAY_MARKET_ADDRESS = (process.env.PLAY_MARKET_ADDRESS ??
  "0xa10910C5CA5f72FEeF0c9d587dD283CCF15384cD") as `0x${string}`;

const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});

const PLAY_MARKET_ABI = [
  {
    type: "function",
    name: "createMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "ticker", type: "bytes32" },
      { name: "feed", type: "address" },
      { name: "locksAt", type: "uint64" },
      { name: "resolvesAt", type: "uint64" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
] as const;

/** UTC offset (hours) America/New_York is at for a given instant — -4 (EDT) or -5 (EST). */
function nyOffsetHours(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  }).formatToParts(instant);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const match = /GMT([+-]\d+)/.exec(tz);
  return match ? Number(match[1]) : -5;
}

/** Unix seconds for a wall-clock time in America/New_York, DST-aware. */
function nyWallTimeToUnix(y: number, m: number, d: number, hour: number, minute: number): number {
  const naiveGuess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  const offset = nyOffsetHours(naiveGuess);
  return Math.floor(Date.UTC(y, m - 1, d, hour - offset, minute) / 1000);
}

function addDays(y: number, m: number, d: number, days: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function nextFridayCloseAndMondayOpen(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayWeekday = weekdayMap[get("weekday")];
  const nyHour = Number(get("hour"));

  let daysUntilFriday = (5 - todayWeekday + 7) % 7;
  if (daysUntilFriday === 0 && nyHour >= 16) daysUntilFriday = 7; // this Friday's close already passed

  const friday = addDays(Number(get("year")), Number(get("month")), Number(get("day")), daysUntilFriday);
  const monday = addDays(friday.y, friday.m, friday.d, 3);

  return {
    locksAt: nyWallTimeToUnix(friday.y, friday.m, friday.d, 16, 0),
    resolvesAt: nyWallTimeToUnix(monday.y, monday.m, monday.d, 9, 30),
  };
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const tickers = JSON.parse(readFileSync(join(ROOT, "tickers.json"), "utf8")) as Record<
    string,
    { testnetMock: string }
  >;

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: robinhoodTestnet, transport: http() });
  const publicClient = createPublicClient({ chain: robinhoodTestnet, transport: http() });

  const { locksAt, resolvesAt } = nextFridayCloseAndMondayOpen(new Date());
  console.log(
    `Weekend window: locks ${new Date(locksAt * 1000).toISOString()} (Fri 16:00 ET), resolves ${new Date(resolvesAt * 1000).toISOString()} (Mon 09:30 ET)`,
  );

  for (const [ticker, { testnetMock }] of Object.entries(tickers)) {
    const hash = await walletClient.writeContract({
      address: PLAY_MARKET_ADDRESS,
      abi: PLAY_MARKET_ABI,
      functionName: "createMarket",
      args: [toHex(ticker, { size: 32 }), testnetMock as `0x${string}`, locksAt, resolvesAt],
    });
    await publicClient.waitForTransactionReceipt({ hash }); // avoid nonce races between sequential sends
    console.log(`${ticker}: play weekend market created, tx ${hash}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
