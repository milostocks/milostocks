"use client";

import { useState, type MouseEvent } from "react";
import type { HistoryPoint } from "@/lib/history";
import { formatPct } from "@/lib/format";

const WIDTH = 800;
const HEIGHT = 260;
const PAD = 24;

/** Distinct hues for overlaid series — a deliberate exception to the accent/danger-only convention, since a compare chart genuinely needs N independent colors, not a signed value. */
export const SERIES_COLORS = ["#00c805", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

function timeLabel(t: number): string {
  return new Date(t * 1000).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Overlaid premium-% history for multiple tickers at once — same hand-built-SVG convention as PremiumHistoryChart, one path per series. */
export default function MultiHistoryChart({
  series,
}: {
  series: { ticker: string; points: HistoryPoint[]; color: string }[];
}) {
  const [hoverT, setHoverT] = useState<number | null>(null);

  const withData = series.filter((s) => s.points.length >= 2);
  if (withData.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary">
        Not enough history yet for these tickers — snapshots are taken every
        15 minutes.
      </div>
    );
  }

  const allPoints = withData.flatMap((s) => s.points);
  const minT = Math.min(...allPoints.map((p) => p.t));
  const maxT = Math.max(...allPoints.map((p) => p.t));
  const spanT = Math.max(1, maxT - minT);

  const values = allPoints.map((p) => p.premiumPct);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(0, ...values);
  const spanV = Math.max(0.01, maxV - minV);

  const x = (t: number) => PAD + ((t - minT) / spanT) * (WIDTH - PAD * 2);
  const y = (v: number) => HEIGHT - PAD - ((v - minV) / spanV) * (HEIGHT - PAD * 2);
  const zeroY = y(0);

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const t = minT + (relX / WIDTH) * spanT;
    setHoverT(t);
  };

  function nearestPoint(points: HistoryPoint[]): HistoryPoint | undefined {
    if (hoverT === null) return points[points.length - 1];
    let best = points[0];
    let bestD = Infinity;
    for (const p of points) {
      const d = Math.abs(p.t - hoverT);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="mb-3 flex flex-wrap gap-3">
        {withData.map((s) => {
          const active = nearestPoint(s.points);
          return (
            <div key={s.ticker} className="flex items-center gap-1.5 text-xs">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="font-semibold text-text-primary">{s.ticker}</span>
              {active && (
                <span className="mono text-text-secondary">{formatPct(active.premiumPct)}</span>
              )}
            </div>
          );
        })}
        {hoverT !== null && (
          <span className="mono ml-auto text-xs text-text-muted">{timeLabel(hoverT)}</span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverT(null)}
      >
        <line x1={PAD} y1={zeroY} x2={WIDTH - PAD} y2={zeroY} stroke="var(--border)" strokeWidth={1} />
        {withData.map((s) => {
          const path = s.points
            .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.premiumPct).toFixed(1)}`)
            .join(" ");
          return <path key={s.ticker} d={path} fill="none" stroke={s.color} strokeWidth={2} />;
        })}
        {hoverT !== null && (
          <line
            x1={x(hoverT)}
            y1={PAD}
            x2={x(hoverT)}
            y2={HEIGHT - PAD}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}
      </svg>
    </div>
  );
}
