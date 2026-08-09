import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploys PlayMarket alone — it reads the same per-ticker MockAggregators
// GapMarket already uses (see contracts/tickers.json), so no new oracle
// needs deploying here. Markets are created afterwards via
// scripts/create-play-markets.ts / create-play-weekend-markets.ts.
export default buildModule("PlayMarketModule", (m) => {
  const market = m.contract("PlayMarket");
  return { market };
});
