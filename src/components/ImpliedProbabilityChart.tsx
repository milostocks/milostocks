"use client";

import { useId, useState, type MouseEvent } from "react";
import type { PoolHistoryPoint } from "@/lib/predictBets";

const WIDTH = 800;
const HEIGHT = 200;
const PAD = 24;

function timeLabel(t: number): string {
  return new Date(t * 1000).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The pari-mutuel analog of Polymarket/Kalshi's probability chart: share of
 * the pool on UP over time, as bets come in. Filled-area SVG line, no
 * charting library — same hand-built conventions as PremiumHistoryChart.
 */
export default function ImpliedProbabilityChart({ points }: { points: PoolHistoryPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();

  if (points.length < 2) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary">
        <p>No bets yet — this fills in as UP/DOWN bets come in.</p>
        <p className="mt-1 text-xs text-text-muted">
          Implied probability = share of the pool on UP, updated with every bet.
        </p>
      </div>
    );
  }

  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const spanT = Math.max(1, maxT - minT);

  const x = (t: number) => PAD + ((t - minT) / spanT) * (WIDTH - PAD * 2);
  const y = (pct: number) => HEIGHT - PAD - (pct / 100) * (HEIGHT - PAD * 2);
  const midY = y(50);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.impliedUpPct).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${x(points[points.length - 1].t).toFixed(1)},${HEIGHT - PAD} L${x(points[0].t).toFixed(1)},${HEIGHT - PAD} Z`;

  const active = hover !== null ? points[hover] : points[points.length - 1];
  const color = active.impliedUpPct >= 50 ? "var(--accent)" : "var(--danger)";

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p.t) - relX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  };

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wide text-text-muted">Implied probability of UP</p>
        <p className="mono text-sm font-semibold" style={{ color }}>
          {active.impliedUpPct.toFixed(1)}%
          <span className="ml-2 font-normal text-text-muted">{timeLabel(active.t)}</span>
        </p>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1={PAD} y1={midY} x2={WIDTH - PAD} y2={midY} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} />
        {hover !== null && (
          <>
            <line
              x1={x(points[hover].t)}
              y1={PAD}
              x2={x(points[hover].t)}
              y2={HEIGHT - PAD}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <circle cx={x(points[hover].t)} cy={y(points[hover].impliedUpPct)} r={4} fill={color} />
          </>
        )}
      </svg>
      <p className="mt-2 flex justify-between text-[11px] text-text-muted">
        <span>DOWN</span>
        <span>50 / 50</span>
        <span>UP</span>
      </p>
    </div>
  );
}
