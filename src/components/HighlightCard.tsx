import Link from "next/link";
import TickerIcon from "./TickerIcon";
import type { StockPremium } from "@/lib/premium";
import { formatCompactUsd, formatPct } from "@/lib/format";

/** CoinGecko-style "highlights" box: a short ranked list of tickers with one metric each. */
export default function HighlightCard({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: StockPremium[];
  metric: "premium" | "volume";
}) {
  const headerBg =
    title.includes("Gainers")
      ? "border-[#ccff00]/50 text-[#ccff00]"
      : title.includes("Losers")
      ? "border-[#ea580c]/50 text-[#ea580c]"
      : "border-[#d4ff2a]/50 text-[#d4ff2a]";

  return (
    <div className="neo-card p-5">
      <div className={`neo-badge ${headerBg} mb-4 inline-block px-3 py-1 text-xs font-black shadow-md`}>
        {title.toUpperCase()}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs font-bold text-[#ebff99]">Not enough data yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r, idx) => (
            <Link
              key={r.stock.ticker}
              href={`/stock/${r.stock.ticker}`}
              className="flex items-center gap-2.5 rounded-lg border border-[#ccff00]/30 bg-[#0c1406]/80 px-2.5 py-2 text-sm transition-all hover:bg-[#16240d] hover:border-[#ccff00]/50 hover:shadow-[0_0_12px_rgba(204,255,0,0.3)]"
            >
              <span className="font-mono text-xs font-black text-[#ebff99]">{idx + 1}.</span>
              <TickerIcon ticker={r.stock.ticker} icon={r.stock.icon} size={20} />
              <span className="min-w-0 flex-1 truncate font-black text-white">{r.stock.ticker}</span>
              {metric === "premium" ? (
                <span className={`mono shrink-0 text-xs font-black px-2 py-0.5 rounded border border-white/20 ${r.premiumPct >= 0 ? "bg-[#ccff00]/20 text-[#ccff00] border-[#ccff00]/40" : "bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/40"}`}>
                  {formatPct(r.premiumPct)}
                </span>
              ) : (
                <span className="mono shrink-0 text-xs font-black text-[#ccff00] bg-[#060a03] px-2 py-0.5 rounded border border-[#ccff00]/30">
                  {r.volume24h != null ? formatCompactUsd(r.volume24h) : "–"}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
