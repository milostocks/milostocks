// Mirrors every ticker's real mainnet Chainlink price into its testnet
// MockAggregator (contracts/tickers.json). Run on a schedule — a mock's
// setAnswer timestamp is what GapMarket checks for staleness
// (MAX_PRICE_STALENESS = 30 min). Supersedes the single-ticker
// push-mock-price.ts.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAINNET_RPC = "https://rpc.mainnet.chain.robinhood.com";

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

  const tickers = JSON.parse(readFileSync(join(ROOT, "tickers.json"), "utf8")) as Record<
    string,
    { mainnetFeed: string; testnetMock: string; name: string }
  >;

  const mainnetClient = createPublicClient({ transport: http(MAINNET_RPC) });
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: robinhoodTestnet, transport: http() });
  const testnetPublicClient = createPublicClient({ chain: robinhoodTestnet, transport: http() });

  for (const [ticker, { mainnetFeed, testnetMock }] of Object.entries(tickers)) {
    const [, realAnswer] = await mainnetClient.readContract({
      address: mainnetFeed as `0x${string}`,
      abi: AGGREGATOR_V3_ABI,
      functionName: "latestRoundData",
    });

    const hash = await walletClient.writeContract({
      address: testnetMock as `0x${string}`,
      abi: MOCK_AGGREGATOR_ABI,
      functionName: "setAnswer",
      args: [realAnswer],
    });
    await testnetPublicClient.waitForTransactionReceipt({ hash });

    console.log(`${ticker}: $${Number(realAnswer) / 1e8} -> ${testnetMock} (tx ${hash})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
