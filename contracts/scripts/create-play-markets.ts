// Owner-only: creates one PlayMarket session market per ticker in
// tickers.json. Mirrors create-markets.ts (GapMarket) — same tickers, same
// MockAggregator feeds, just a different target contract and no ETH ever
// changes hands. Defaults to a 1-hour lock window / 1-hour session.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPublicClient, createWalletClient, http, defineChain, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const PLAY_MARKET_ADDRESS = (process.env.PLAY_MARKET_ADDRESS ??
  "0xa10910C5CA5f72FEeF0c9d587dD283CCF15384cD") as `0x${string}`;
const LOCK_IN_SECONDS = Number(process.env.LOCK_IN_SECONDS ?? 3600);
const SESSION_LENGTH_SECONDS = Number(process.env.SESSION_LENGTH_SECONDS ?? 3600);

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

  const now = Math.floor(Date.now() / 1000);
  const locksAt = now + LOCK_IN_SECONDS;
  const resolvesAt = locksAt + SESSION_LENGTH_SECONDS;

  for (const [ticker, { testnetMock }] of Object.entries(tickers)) {
    const hash = await walletClient.writeContract({
      address: PLAY_MARKET_ADDRESS,
      abi: PLAY_MARKET_ABI,
      functionName: "createMarket",
      args: [toHex(ticker, { size: 32 }), testnetMock as `0x${string}`, locksAt, resolvesAt],
    });
    await publicClient.waitForTransactionReceipt({ hash }); // avoid nonce races between sequential sends
    console.log(`${ticker}: play market created, tx ${hash}`);
  }

  console.log(`locks ${new Date(locksAt * 1000).toISOString()}, resolves ${new Date(resolvesAt * 1000).toISOString()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
