"use client";

import { useState, type MouseEvent } from "react";
import type { Candle } from "@/lib/candles";
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

/** Hand-built SVG OHLC candlestick chart of premium % per interval — same conventions as PremiumHistoryChart (hover, accent/danger coloring, no charting library). */
export default function PremiumCandleChart({ candles }: { candles: Candle[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (candles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary">
        Not enough history yet for candles — check back once a few snapshots
        land in this interval.
      </div>
    );
  }

  const minT = candles[0].t;
  const maxT = candles[candles.length - 1].t;
  const spanT = Math.max(1, maxT - minT || 1);

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const minV = Math.min(0, ...lows);
  const maxV = Math.max(0, ...highs);
  const spanV = Math.max(0.01, maxV - minV);

  const x = (t: number) => PAD + ((t - minT) / spanT) * (WIDTH - PAD * 2);
  const y = (v: number) => HEIGHT - PAD - ((v - minV) / spanV) * (HEIGHT - PAD * 2);
  const zeroY = y(0);

  const bodyWidth = Math.max(2, Math.min(14, ((WIDTH - PAD * 2) / candles.length) * 0.6));

  const active = hover !== null ? candles[hover] : candles[candles.length - 1];
  const activeColor = active.close >= active.open ? "var(--accent)" : "var(--danger)";

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    candles.forEach((c, i) => {
      const d = Math.abs(x(c.t) - relX);
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
          Premium candles, last {days}d
        </p>
        <p className="mono text-sm font-semibold" style={{ color: activeColor }}>
          O {formatPct(active.open)} · H {formatPct(active.high)} · L {formatPct(active.low)} · C{" "}
          {formatPct(active.close)}
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
        <line x1={PAD} y1={zeroY} x2={WIDTH - PAD} y2={zeroY} stroke="var(--border)" strokeWidth={1} />
        {candles.map((c, i) => {
          const cx = x(c.t);
          const up = c.close >= c.open;
          const color = up ? "var(--accent)" : "var(--danger)";
          const bodyTop = y(Math.max(c.open, c.close));
          const bodyBottom = y(Math.min(c.open, c.close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);
          return (
            <g key={c.t} opacity={hover === null || hover === i ? 1 : 0.45}>
              <line x1={cx} y1={y(c.high)} x2={cx} y2={y(c.low)} stroke={color} strokeWidth={1.5} />
              <rect
                x={cx - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                fill={color}
                rx={1}
              />
            </g>
          );
        })}
        {hover !== null && (
          <line
            x1={x(candles[hover].t)}
            y1={PAD}
            x2={x(candles[hover].t)}
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
