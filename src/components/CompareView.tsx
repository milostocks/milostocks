"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import TickerIcon from "./TickerIcon";
import PremiumBadge from "./PremiumBadge";
import MultiHistoryChart, { SERIES_COLORS } from "./MultiHistoryChart";
import type { HistoryPoint } from "@/lib/history";
import type { StockPremium } from "@/lib/premium";
import { formatCompactUsd, formatUsd } from "@/lib/format";

const MAX_COMPARE = SERIES_COLORS.length;

export default function CompareView({
  allStocks,
  selected,
  historyByTicker,
  rows,
}: {
  allStocks: { ticker: string; name: string; icon: string | null }[];
  selected: string[];
  historyByTicker: Record<string, HistoryPoint[]>;
  rows: StockPremium[];
}) {
  const router = useRouter();

  function setTickers(next: string[]) {
    router.push(next.length > 0 ? `/compare?tickers=${next.join(",")}` : "/compare");
  }

  function addTicker(ticker: string) {
    if (!ticker || selected.includes(ticker) || selected.length >= MAX_COMPARE) return;
    setTickers([...selected, ticker]);
  }

  function removeTicker(ticker: string) {
    setTickers(selected.filter((t) => t !== ticker));
  }

  const selectedRows = selected
    .map((t) => rows.find((r) => r.stock.ticker === t))
    .filter((r): r is StockPremium => Boolean(r));

  const availableToAdd = allStocks.filter((s) => !selected.includes(s.ticker));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {selected.map((ticker, i) => {
          const stock = allStocks.find((s) => s.ticker === ticker);
          return (
            <span
              key={ticker}
              className="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary py-1 pl-1 pr-2 text-sm"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
              />
              {stock && <TickerIcon ticker={ticker} icon={stock.icon} size={16} />}
              <span className="font-medium">{ticker}</span>
              <button
                type="button"
                onClick={() => removeTicker(ticker)}
                aria-label={`Remove ${ticker}`}
                className="ml-1 text-text-muted hover:text-danger"
              >
                ✕
              </button>
            </span>
          );
        })}
        {selected.length < MAX_COMPARE && availableToAdd.length > 0 && (
          <select
            value=""
            onChange={(e) => addTicker(e.target.value)}
            className="rounded-full border border-dashed border-border bg-transparent px-3 py-1 text-sm text-text-muted focus:border-accent focus:outline-none"
          >
            <option value="">+ Add ticker…</option>
            {availableToAdd
              .slice()
              .sort((a, b) => a.ticker.localeCompare(b.ticker))
              .map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} — {s.name}
                </option>
              ))}
          </select>
        )}
      </div>

      {selected.length >= MAX_COMPARE && (
        <p className="text-xs text-text-muted">Up to {MAX_COMPARE} tickers at a time.</p>
      )}

      <MultiHistoryChart
        series={selected.map((ticker, i) => ({
          ticker,
          points: historyByTicker[ticker] ?? [],
          color: SERIES_COLORS[i % SERIES_COLORS.length],
        }))}
      />

      {selectedRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-bg-secondary">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Token price</th>
                <th className="px-4 py-3 font-medium text-right">Official close</th>
                <th className="px-4 py-3 font-medium text-right">Premium</th>
                <th className="px-4 py-3 font-medium text-right">24h volume</th>
              </tr>
            </thead>
            <tbody>
              {selectedRows.map((r) => (
                <tr key={r.stock.ticker} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-4 py-3">
                    <Link href={`/stock/${r.stock.ticker}`} className="flex items-center gap-2 hover:text-accent">
                      <TickerIcon ticker={r.stock.ticker} icon={r.stock.icon} size={20} />
                      <span className="font-semibold">{r.stock.ticker}</span>
                    </Link>
                  </td>
                  <td className="mono px-4 py-3 text-right">{formatUsd(r.tokenPrice)}</td>
                  <td className="mono px-4 py-3 text-right text-text-secondary">{formatUsd(r.official)}</td>
                  <td className="px-4 py-3 text-right">
                    <PremiumBadge pct={r.premiumPct} />
                  </td>
                  <td className="mono px-4 py-3 text-right text-text-secondary">
                    {r.volume24h != null ? formatCompactUsd(r.volume24h) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
