import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploys the testnet mock oracle + GapMarket. Markets themselves are
// created afterwards via a separate script (owner-only createMarket call),
// not part of this module — the set of live markets changes far more often
// than the contracts do.
export default buildModule("GapMarketModule", (m) => {
  const feed = m.contract("MockAggregator", [
    "NVDA / USD (mock, mirrors mainnet Chainlink)",
    20000000000n, // placeholder $200.00 (8 decimals) — refreshed by push-mock-price.ts
  ]);
  const market = m.contract("GapMarket");

  return { feed, market };
});
