import { cache } from "react";
import { STOCKS, type StockEntry } from "./registry";
import { readFeeds } from "./chain";
import { getTokenQuotes } from "./prices";

export interface StockPremium {
  stock: StockEntry;
  /** Official stock price from the Chainlink feed (frozen outside market hours) */
  official: number;
  /** Unix seconds the official price last updated */
  officialUpdatedAt: number;
  /** What the token trades at on Robinhood Chain DEXes right now */
  tokenPrice: number;
  /** 24h onchain trading volume in USD, when Blockscout knows it */
  volume24h: number | null;
  /** (tokenPrice - official) / official, in percent */
  premiumPct: number;
  /**
   * Enough 24h volume to trust the DEX price. Illiquid tokens show absurd
   * "premiums" (a stale pool once printed COIN at +457%) — they're kept out
   * of the main table and the summary stats.
   */
  liquid: boolean;
}

/** Minimum 24h onchain volume (USD) for a DEX price to be trustworthy. */
export const LIQUIDITY_FLOOR_USD = 1000;

/**
 * The core dataset: every official stock token with both an onchain DEX price
 * and a Chainlink feed reading. Stocks where either side is missing are
 * dropped rather than shown with fake numbers.
 */
export const getPremiums = cache(async function getPremiums(): Promise<
  StockPremium[]
> {
  const [feeds, quotes] = await Promise.all([
    readFeeds(STOCKS.map((s) => s.feed)),
    getTokenQuotes(),
  ]);

  const rows: StockPremium[] = [];
  for (const stock of STOCKS) {
    const feed = feeds.get(stock.feed.toLowerCase());
    const quote = quotes.get(stock.token.toLowerCase());
    if (!feed || !quote) continue;
    rows.push({
      stock,
      official: feed.price,
      officialUpdatedAt: feed.updatedAt,
      tokenPrice: quote.price,
      volume24h: quote.volume24h,
      premiumPct: ((quote.price - feed.price) / feed.price) * 100,
      liquid: (quote.volume24h ?? 0) >= LIQUIDITY_FLOOR_USD,
    });
  }
  rows.sort((a, b) => Math.abs(b.premiumPct) - Math.abs(a.premiumPct));
  return rows;
});
