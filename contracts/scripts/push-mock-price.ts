// Mirrors NVDA's real Chainlink price from Robinhood Chain MAINNET into the
// testnet MockAggregator, so GapMarket resolves against real-looking data
// even though testnet has no real stock feeds. Run this on a schedule
// (every few minutes) — MockAggregator.setAnswer's timestamp is what
// GapMarket checks for staleness (MAX_PRICE_STALENESS = 30 min).
//
// Usage: DEPLOYER_PRIVATE_KEY=0x... node scripts/push-mock-price.ts
import "dotenv/config";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const MAINNET_RPC = "https://rpc.mainnet.chain.robinhood.com";
const NVDA_FEED_MAINNET = "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15";
const MOCK_AGGREGATOR_TESTNET = (process.env.MOCK_AGGREGATOR_ADDRESS ??
  "0x3003F158ff30135f0a9B2536D398CBA127E02b01") as `0x${string}`;

const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});

const AGGREGATOR_V3_ABI = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

const MOCK_AGGREGATOR_ABI = [
  {
    type: "function",
    name: "setAnswer",
    stateMutability: "nonpayable",
    inputs: [{ name: "answer", type: "int256" }],
    outputs: [],
  },
] as const;

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const mainnetClient = createPublicClient({ transport: http(MAINNET_RPC) });
  const [, realAnswer] = await mainnetClient.readContract({
    address: NVDA_FEED_MAINNET,
    abi: AGGREGATOR_V3_ABI,
    functionName: "latestRoundData",
  });

  console.log(`Real NVDA price (mainnet Chainlink): ${Number(realAnswer) / 1e8}`);

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: robinhoodTestnet,
    transport: http(),
  });

  const hash = await walletClient.writeContract({
    address: MOCK_AGGREGATOR_TESTNET,
    abi: MOCK_AGGREGATOR_ABI,
    functionName: "setAnswer",
    args: [realAnswer],
  });

  console.log(`Pushed to testnet MockAggregator (${MOCK_AGGREGATOR_TESTNET}): tx ${hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
