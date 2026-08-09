"use client";

import { useState, type MouseEvent } from "react";
import type { HistoryPoint } from "@/lib/history";
import { formatPct } from "@/lib/format";

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

/** Hand-built SVG line chart of premium % over time — no charting library, matches project conventions. */
export default function PremiumHistoryChart({ points }: { points: HistoryPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary">
        Not enough history yet — snapshots are taken every 15 minutes. Check
        back soon for a chart of how this traded over the weekend.
      </div>
    );
  }

  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const spanT = Math.max(1, maxT - minT);

  const values = points.map((p) => p.premiumPct);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(0, ...values);
  const spanV = Math.max(0.01, maxV - minV);

  const x = (t: number) => PAD + ((t - minT) / spanT) * (WIDTH - PAD * 2);
  const y = (v: number) =>
    HEIGHT - PAD - ((v - minV) / spanV) * (HEIGHT - PAD * 2);
  const zeroY = y(0);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.premiumPct).toFixed(1)}`)
    .join(" ");

  const active = hover !== null ? points[hover] : points[points.length - 1];
  const lineColor = active.premiumPct >= 0 ? "var(--accent)" : "var(--danger)";

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

  const days = Math.max(1, Math.round(spanT / 86400));

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          Premium, last {days}d
        </p>
        <p
          className={`mono text-sm font-semibold ${active.premiumPct >= 0 ? "text-accent" : "text-danger"}`}
        >
          {formatPct(active.premiumPct)}
          <span className="ml-2 font-normal text-text-muted">
            {timeLabel(active.t)}
          </span>
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
        <line
          x1={PAD}
          y1={zeroY}
          x2={WIDTH - PAD}
          y2={zeroY}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} />
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
            <circle
              cx={x(points[hover].t)}
              cy={y(points[hover].premiumPct)}
              r={4}
              fill={lineColor}
            />
          </>
        )}
      </svg>
    </div>
  );
}
