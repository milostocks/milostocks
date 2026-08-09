// Reads an address's onchain balances of the 34 registered stock tokens
// (mainnet — see registry.ts) via the same public Blockscout API prices.ts
// already depends on, then prices them with getPremiums() so a portfolio's
// numbers always match what the rest of the site shows for that ticker.
import { getPremiums } from "./premium";

const BLOCKSCOUT = "https://robinhoodchain.blockscout.com/api/v2";

interface BlockscoutBalance {
  token: { address_hash: string; decimals: string | null };
  value: string; // raw integer balance, string (can exceed Number safe range)
}

export interface PortfolioHolding {
  ticker: string;
  name: string;
  icon: string | null;
  balance: number;
  price: number;
  valueUsd: number;
  premiumPct: number;
}

export interface PortfolioSummary {
  holdings: PortfolioHolding[];
  totalValueUsd: number;
}

/** Every registered stock token this address holds a nonzero balance of, priced via getPremiums(). Tokens with no live premium data (feed/DEX price missing) are skipped rather than shown with a fake price. */
export async function getPortfolioHoldings(address: string): Promise<PortfolioSummary> {
  const [balancesRes, premiumRows] = await Promise.all([
    fetch(`${BLOCKSCOUT}/addresses/${address}/tokens?type=ERC-20`, {
      next: { revalidate: 30 },
    }).catch(() => null),
    getPremiums().catch(() => []),
  ]);

  const holdings: PortfolioHolding[] = [];
  if (balancesRes?.ok) {
    const data: { items: BlockscoutBalance[] } = await balancesRes.json();
    const priceByToken = new Map(premiumRows.map((r) => [r.stock.token.toLowerCase(), r]));

    for (const item of data.items) {
      const tokenAddr = item.token.address_hash.toLowerCase();
      const priced = priceByToken.get(tokenAddr);
      if (!priced) continue; // not one of our 34 tracked tickers, or no live price right now

      const decimals = Number(item.token.decimals ?? 18);
      const balance = Number(BigInt(item.value)) / 10 ** decimals;
      if (balance <= 0) continue;

      holdings.push({
        ticker: priced.stock.ticker,
        name: priced.stock.name,
        icon: priced.stock.icon,
        balance,
        price: priced.tokenPrice,
        valueUsd: balance * priced.tokenPrice,
        premiumPct: priced.premiumPct,
      });
    }
  }

  holdings.sort((a, b) => b.valueUsd - a.valueUsd);
  return {
    holdings,
    totalValueUsd: holdings.reduce((s, h) => s + h.valueUsd, 0),
  };
}
