"use client";

import { useState } from "react";
import Link from "next/link";
import TickerIcon from "./TickerIcon";
import PremiumBadge from "./PremiumBadge";
import TimeAgo from "./TimeAgo";
import WatchButton from "./WatchButton";
import MiniSparkline from "./MiniSparkline";
import type { StockPremium } from "@/lib/premium";
import type { SparkPoint } from "@/lib/sparkline";
import { formatCompactUsd, formatUsd } from "@/lib/format";
import { PREDICTABLE_TICKERS } from "@/lib/predictContracts";
import { getSector, type Sector } from "@/lib/sectors";

type SortKey = "premium" | "volume" | "price";

export default function PremiumTable({
  rows,
  sparklines,
}: {
  rows: StockPremium[];
  sparklines?: Record<string, SparkPoint[]>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("premium");
  const [sector, setSector] = useState<Sector | "All">("All");

  const presentSectors = [...new Set(rows.map((r) => getSector(r.stock.ticker)))];

  const filtered = sector === "All" ? rows : rows.filter((r) => getSector(r.stock.ticker) === sector);

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "volume") return (b.volume24h ?? 0) - (a.volume24h ?? 0);
    if (sortKey === "price") return b.tokenPrice - a.tokenPrice;
    return Math.abs(b.premiumPct) - Math.abs(a.premiumPct);
  });

  const sortButton = (key: SortKey, label: string) => (
    <button
      onClick={() => setSortKey(key)}
      className={`cursor-pointer font-black ${
        sortKey === key ? "text-[#ccff00]" : "text-white hover:text-[#ccff00]"
      }`}
    >
      {label}
      {sortKey === key ? " ↓" : ""}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      {presentSectors.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSector("All")}
            className={`neo-badge cursor-pointer px-3 py-1 text-xs transition-all rounded-lg ${
              sector === "All"
                ? "bg-gradient-to-r from-[#d4ff2a] to-[#ccff00] text-[#0d1406] border-white/50"
                : "bg-[#0e1708] text-[#f5ffcc] border-[#ccff00]/30 hover:bg-[#19260e]"
            }`}
          >
            ALL SECTORS
          </button>
          {presentSectors.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSector(s)}
              className={`neo-badge cursor-pointer px-3 py-1 text-xs transition-all rounded-lg ${
                sector === s
                  ? "bg-gradient-to-r from-[#d4ff2a] to-[#ccff00] text-[#0d1406] border-white/50"
                  : "bg-[#0e1708] text-[#f5ffcc] border-[#ccff00]/30 hover:bg-[#19260e]"
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <div className="neo-box overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-[#0e1708]/90 text-left text-xs uppercase font-black text-[#f5ffcc] border-b border-[#ccff00]/35">
              <th className="w-8 px-3 py-3 border-r border-[#ccff00]/30" />
              <th className="px-3 py-3 border-r border-[#ccff00]/30 font-extrabold text-[#ccff00]">Stock</th>
              <th className="px-4 py-3 border-r border-[#ccff00]/30 font-extrabold text-right">
                {sortButton("price", "Token Price")}
              </th>
              <th className="px-4 py-3 border-r border-[#ccff00]/30 font-extrabold text-right text-[#ebff99]">Official Close</th>
              <th className="px-4 py-3 border-r border-[#ccff00]/30 font-extrabold text-right">
                {sortButton("premium", "Premium")}
              </th>
              {sparklines && <th className="px-4 py-3 border-r border-[#ccff00]/30 font-extrabold text-right text-[#ebff99]">Trend</th>}
              <th className="px-4 py-3 border-r border-[#ccff00]/30 font-extrabold text-right">
                {sortButton("volume", "24h Volume")}
              </th>
              <th className="px-4 py-3 font-extrabold text-right text-[#ebff99]">Close Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ccff00]/20">
            {sorted.map((r) => (
              <tr
                key={r.stock.ticker}
                className="bg-[#0c1406]/80 hover:bg-[#163022] transition-colors"
              >
                <td className="px-3 py-3">
                  <WatchButton ticker={r.stock.ticker} size={16} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/stock/${r.stock.ticker}`}
                      className="flex items-center gap-3"
                    >
                      <TickerIcon ticker={r.stock.ticker} icon={r.stock.icon} />
                      <span className="flex flex-col">
                        <span className="font-black text-white">{r.stock.ticker}</span>
                        <span className="max-w-[180px] truncate text-xs font-bold text-[#ebff99]">
                          {r.stock.name}
                        </span>
                      </span>
                    </Link>
                    {(PREDICTABLE_TICKERS as readonly string[]).includes(r.stock.ticker) && (
                      <Link
                        href={`/predict/${r.stock.ticker}`}
                        title={`Bet on ${r.stock.ticker}`}
                        className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-2 py-0.5 text-[10px] text-[#ccff00] hover:bg-[#ccff00]/40"
                      >
                        PREDICT
                      </Link>
                    )}
                  </div>
                </td>
                <td className="mono px-4 py-3 text-right font-black text-white">
                  {formatUsd(r.tokenPrice)}
                </td>
                <td className="mono px-4 py-3 text-right font-bold text-[#f5ffcc]">
                  {formatUsd(r.official)}
                </td>
                <td className="px-4 py-3 text-right">
                  <PremiumBadge pct={r.premiumPct} />
                </td>
                {sparklines && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <MiniSparkline points={sparklines[r.stock.ticker]} />
                    </div>
                  </td>
                )}
                <td className="mono px-4 py-3 text-right font-bold text-[#e0ff66]">
                  {r.volume24h != null ? formatCompactUsd(r.volume24h) : "–"}
                </td>
                <td className="mono px-4 py-3 text-right text-xs font-bold text-[#ebff99]">
                  <TimeAgo unixSeconds={r.officialUpdatedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
