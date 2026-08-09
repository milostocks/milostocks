// Deploys one MockAggregator per ticker (skipping any already in
// tickers.json) seeded with that ticker's real current mainnet Chainlink
// price, then writes contracts/tickers.json — the shared config
// push-mock-prices.ts and create-markets.ts read from.
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAINNET_RPC = "https://rpc.mainnet.chain.robinhood.com";

const TICKERS = ["NVDA", "AAPL", "TSLA", "AMZN", "MSFT", "GOOGL", "META", "AMD"];

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

const MOCK_AGGREGATOR_BYTECODE_ARTIFACT = "artifacts/contracts/MockAggregator.sol/MockAggregator.json";

async function main() {
  const registry = JSON.parse(readFileSync(join(ROOT, "../src/lib/registry.json"), "utf8")) as {
    ticker: string;
    name: string;
    feed: string;
  }[];

  const tickersJsonPath = join(ROOT, "tickers.json");
  const existing: Record<string, { mainnetFeed: string; testnetMock: string; name: string }> = existsSync(
    tickersJsonPath,
  )
    ? JSON.parse(readFileSync(tickersJsonPath, "utf8"))
    : {};

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const mainnetClient = createPublicClient({ transport: http(MAINNET_RPC) });
  const testnetPublicClient = createPublicClient({ chain: robinhoodTestnet, transport: http() });
  const testnetWallet = createWalletClient({ account, chain: robinhoodTestnet, transport: http() });

  const { abi: mockAbi, bytecode: mockBytecode } = JSON.parse(
    readFileSync(join(ROOT, MOCK_AGGREGATOR_BYTECODE_ARTIFACT), "utf8"),
  );

  for (const ticker of TICKERS) {
    if (existing[ticker]) {
      console.log(`${ticker}: already deployed at ${existing[ticker].testnetMock}, skipping`);
      continue;
    }
    const stock = registry.find((s) => s.ticker === ticker);
    if (!stock) {
      console.warn(`${ticker}: not found in registry.json, skipping`);
      continue;
    }

    const [, realAnswer] = await mainnetClient.readContract({
      address: stock.feed as `0x${string}`,
      abi: AGGREGATOR_V3_ABI,
      functionName: "latestRoundData",
    });

    const hash = await testnetWallet.deployContract({
      abi: mockAbi,
      bytecode: mockBytecode,
      args: [`${ticker} / USD (mock, mirrors mainnet Chainlink)`, realAnswer],
    });
    const receipt = await testnetPublicClient.waitForTransactionReceipt({ hash });
    const address = receipt.contractAddress!;

    existing[ticker] = { mainnetFeed: stock.feed, testnetMock: address, name: stock.name };
    console.log(`${ticker}: deployed MockAggregator at ${address} (seeded $${Number(realAnswer) / 1e8})`);
  }

  writeFileSync(tickersJsonPath, JSON.stringify(existing, null, 2) + "\n");
  console.log(`written ${tickersJsonPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
