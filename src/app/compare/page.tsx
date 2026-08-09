import type { Metadata } from "next";
import CompareView from "@/components/CompareView";
import { getPremiums } from "@/lib/premium";
import { getPremiumHistory } from "@/lib/history";
import { STOCKS, STOCK_BY_TICKER } from "@/lib/registry";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export const metadata: Metadata = {
  title: "Compare — Implied Open",
  description: "Overlay the live premium history of up to 5 Robinhood Chain tokenized stocks side by side.",
};

const DEFAULT_COUNT = 3;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ tickers?: string }>;
}) {
  const { tickers: raw } = await searchParams;
  const rows = await getPremiums().catch(() => []);

  let selected = (raw ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter((t) => STOCK_BY_TICKER.has(t));
  selected = [...new Set(selected)].slice(0, 5);

  if (selected.length === 0) {
    selected = [...rows]
      .sort((a, b) => Math.abs(b.premiumPct) - Math.abs(a.premiumPct))
      .slice(0, DEFAULT_COUNT)
      .map((r) => r.stock.ticker);
  }

  const historyEntries = await Promise.all(
    selected.map(async (ticker) => [ticker, await getPremiumHistory(ticker, 4)] as const),
  );
  const historyByTicker = Object.fromEntries(historyEntries);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
        <p className="max-w-2xl text-sm text-text-secondary">
          Overlay up to {5} tickers&apos; premium history at once — see whose
          gap is widening, whose is closing, and who&apos;s moving together.
        </p>
      </section>

      <CompareView
        allStocks={STOCKS.map((s) => ({ ticker: s.ticker, name: s.name, icon: s.icon }))}
        selected={selected}
        historyByTicker={historyByTicker}
        rows={rows}
      />
    </div>
  );
}
