// Owner-only: creates a market on the deployed GapMarket. Defaults to a
// short-fuse NVDA market (locks in 3 min, resolves 5 min after that) so the
// full bet -> lock -> resolve -> claim flow can be exercised without waiting
// for a real NYSE session. Pass env vars to override for a real-session market.
//
// Usage: DEPLOYER_PRIVATE_KEY=0x... node scripts/create-market.ts
import "dotenv/config";
import { createWalletClient, http, defineChain, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const GAP_MARKET_ADDRESS = (process.env.GAP_MARKET_ADDRESS ??
  "0x7c2E182234d65D3eB34ec7a19527908D13bB65b3") as `0x${string}`;
const MOCK_AGGREGATOR_ADDRESS = (process.env.MOCK_AGGREGATOR_ADDRESS ??
  "0x3003F158ff30135f0a9B2536D398CBA127E02b01") as `0x${string}`;
const TICKER = process.env.MARKET_TICKER ?? "NVDA";
const LOCK_IN_SECONDS = Number(process.env.LOCK_IN_SECONDS ?? 180);
const SESSION_LENGTH_SECONDS = Number(process.env.SESSION_LENGTH_SECONDS ?? 300);

const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});

const GAP_MARKET_ABI = [
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

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: robinhoodTestnet,
    transport: http(),
  });

  const now = Math.floor(Date.now() / 1000);
  const locksAt = now + LOCK_IN_SECONDS;
  const resolvesAt = locksAt + SESSION_LENGTH_SECONDS;

  const hash = await walletClient.writeContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAP_MARKET_ABI,
    functionName: "createMarket",
    args: [toHex(TICKER, { size: 32 }), MOCK_AGGREGATOR_ADDRESS, locksAt, resolvesAt],
  });

  console.log(`Created ${TICKER} market: locks ${new Date(locksAt * 1000).toISOString()}, resolves ${new Date(resolvesAt * 1000).toISOString()}`);
  console.log(`tx ${hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
