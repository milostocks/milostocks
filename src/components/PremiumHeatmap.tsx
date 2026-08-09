"use client";

import { useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import TickerIcon from "./TickerIcon";
import type { HeatmapCell } from "@/lib/heatmap";
import { formatPct } from "@/lib/format";
import { PREDICTABLE_TICKERS } from "@/lib/predictContracts";

/** Premium % magnitude that reaches full color saturation. */
const SATURATION_CAP = 6;
const CELL = 30;
const GAP = 4;

type SortMode = "premium" | "alpha";

function cellColor(pct: number): string {
  const intensity = Math.min(1, Math.abs(pct) / SATURATION_CAP);
  const rgb = pct >= 0 ? "0, 113, 227" : "215, 0, 21"; // --accent / --danger
  return `rgba(${rgb}, ${0.1 + intensity * 0.75})`;
}

function shortDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

interface TickerAvg {
  ticker: string;
  name: string;
  icon: string | null;
  avg: number;
  samples: number;
}

interface HoverInfo {
  ticker: string;
  date: string;
  cell: HeatmapCell | undefined;
  x: number;
  y: number;
}

export default function PremiumHeatmap({
  tickers,
  dates,
  cells,
}: {
  tickers: { ticker: string; name: string; icon: string | null }[];
  dates: string[];
  cells: Map<string, HeatmapCell>;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("premium");
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const averages: TickerAvg[] = useMemo(() => {
    return tickers.map(({ ticker, name, icon }) => {
      let total = 0;
      let n = 0;
      for (const date of dates) {
        const c = cells.get(`${ticker}|${date}`);
        if (c) {
          total += c.avgPremiumPct;
          n += 1;
        }
      }
      return { ticker, name, icon, avg: n > 0 ? total / n : 0, samples: n };
    });
  }, [tickers, dates, cells]);

  const sorted = useMemo(() => {
    const copy = [...averages];
    if (sortMode === "alpha") {
      copy.sort((a, b) => a.ticker.localeCompare(b.ticker));
    } else {
      copy.sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg));
    }
    return copy;
  }, [averages, sortMode]);

  const withData = averages.filter((a) => a.samples > 0);
  const bullish = withData.length > 0 ? withData.reduce((m, a) => (a.avg > m.avg ? a : m)) : null;
  const bearish = withData.length > 0 ? withData.reduce((m, a) => (a.avg < m.avg ? a : m)) : null;

  if (dates.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary">
        No history yet — the snapshot cron commits one file per day. Check
        back once a few days of history have landed.
      </div>
    );
  }

  const handleEnter = (e: MouseEvent, ticker: string, date: string) => {
    setHover({ ticker, date, cell: cells.get(`${ticker}|${date}`), x: e.clientX, y: e.clientY });
  };

  return (
    <div className="neo-card p-5 sm:p-6">
      {/* Summary */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="neo-box-sm p-4">
          <p className="text-[10px] font-black uppercase text-[#ebff99]">Tracking</p>
          <p className="mono mt-1 text-base font-black text-white">
            {tickers.length} tickers · {dates.length} day{dates.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="neo-box-sm p-4">
          <p className="text-[10px] font-black uppercase text-[#ebff99]">Most Bullish Avg</p>
          <p className="mono mt-1 text-base font-black">
            {bullish ? (
              <>
                <span className="text-white bg-gradient-to-r from-[#ccff00] to-[#7a9900] px-2 py-0.5 border border-white/20 rounded mr-2">{bullish.ticker}</span>{" "}
                <span className="text-[#d4ff2a]">{formatPct(bullish.avg)}</span>
              </>
            ) : (
              "–"
            )}
          </p>
        </div>
        <div className="neo-box-sm p-4">
          <p className="text-[10px] font-black uppercase text-[#ebff99]">Most Bearish Avg</p>
          <p className="mono mt-1 text-base font-black">
            {bearish ? (
              <>
                <span className="text-white bg-gradient-to-r from-[#7a9900] to-[#f59e0b] px-2 py-0.5 border border-white/20 rounded mr-2">{bearish.ticker}</span>{" "}
                <span className="text-[#ea580c]">{formatPct(bearish.avg)}</span>
              </>
            ) : (
              "–"
            )}
          </p>
        </div>
      </div>

      {/* Legend + sort */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#7a9900]/30 pt-4">
        <div className="flex items-center gap-2 font-black text-xs text-[#f5ffcc]">
          <span>-{SATURATION_CAP}%</span>
          <div
            className="h-3 w-36 rounded-lg border border-white/20 shadow-sm"
            style={{
              background: `linear-gradient(to right, rgba(255,42,109,1), rgba(255,42,109,0.3), #170e2a, rgba(0,240,255,0.3), rgba(0,240,255,1))`,
            }}
          />
          <span>+{SATURATION_CAP}%</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(["premium", "alpha"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`neo-badge cursor-pointer px-3 py-1 text-xs rounded-lg transition-colors ${
                sortMode === mode ? "bg-gradient-to-r from-[#ccff00] to-[#f59e0b] text-white border-white/30" : "bg-[#0c1406] text-[#f5ffcc] hover:bg-[#1f113a]"
              }`}
            >
              {mode === "premium" ? "SORT: BIGGEST GAP" : "SORT: A–Z"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: GAP }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[#0c1406]/90 backdrop-blur-md rounded-l" />
              {dates.map((d) => (
                <th
                  key={d}
                  className="whitespace-nowrap px-0.5 text-[10px] font-black text-[#ebff99]"
                  style={{ width: CELL }}
                >
                  {shortDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ ticker, name, icon }) => (
              <tr key={ticker}>
                <th className="sticky left-0 z-10 bg-[#0c1406]/90 backdrop-blur-md pr-3 text-left align-middle font-normal rounded-l">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/stock/${ticker}`}
                      className="flex items-center gap-2 rounded px-1.5 py-0.5 font-black text-white hover:bg-[#16240d]"
                    >
                      <TickerIcon ticker={ticker} icon={icon} size={18} />
                      <span className="text-xs font-black">{ticker}</span>
                    </Link>
                    {(PREDICTABLE_TICKERS as readonly string[]).includes(ticker) && (
                      <Link
                        href={`/predict/${ticker}`}
                        title={`Bet on ${ticker}`}
                        className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-1.5 py-0.5 text-[9px] text-[#ccff00] hover:bg-[#ccff00]/40"
                      >
                        PREDICT
                      </Link>
                    )}
                  </div>
                  <span className="sr-only">{name}</span>
                </th>
                {dates.map((date) => {
                  const cell = cells.get(`${ticker}|${date}`);
                  const isHovered = hover?.ticker === ticker && hover.date === date;
                  return (
                    <td key={date} className="p-0">
                      <div
                        onMouseEnter={(e) => cell && handleEnter(e, ticker, date)}
                        onMouseMove={(e) => cell && isHovered && handleEnter(e, ticker, date)}
                        onMouseLeave={() => setHover(null)}
                        className={`rounded-sm border border-white/10 transition-transform ${isHovered ? "scale-125 z-20 shadow-[0_0_12px_rgba(0,198,255,0.5)] border-[#ccff00]" : ""}`}
                        style={{
                          width: CELL,
                          height: CELL,
                          background: cell ? cellColor(cell.avgPremiumPct) : "#170e2a",
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating tooltip */}
      {hover?.cell && (
        <div
          className="pointer-events-none fixed z-50 neo-card px-3.5 py-2 text-xs shadow-2xl bg-[#160d2b]/95 backdrop-blur-xl border border-[#7a9900]/40"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-black text-white">
            {hover.ticker} <span className="font-bold text-[#ebff99]">({shortDate(hover.date)})</span>
          </p>
          <p className={`mono mt-0.5 font-black text-sm ${hover.cell.avgPremiumPct >= 0 ? "text-[#d4ff2a]" : "text-[#ea580c]"}`}>
            {formatPct(hover.cell.avgPremiumPct)}
          </p>
          <p className="mt-0.5 font-bold text-[#ebff99]">{hover.cell.samples} snapshots</p>
        </div>
      )}
    </div>
  );
}
