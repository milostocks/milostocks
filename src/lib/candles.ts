// Buckets the 15-minute HistoryPoint snapshots (history.ts) into fixed-size
// OHLC candles of premiumPct — same source data as PremiumHistoryChart's line,
// just aggregated so a viewer can see intra-interval range (high/low), not
// only the level at each snapshot.
import type { HistoryPoint } from "./history";

export interface Candle {
  /** Unix seconds — start of the bucket */
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function bucketIntoCandles(points: HistoryPoint[], intervalSeconds: number): Candle[] {
  if (points.length === 0) return [];
  const buckets = new Map<number, HistoryPoint[]>();
  for (const p of points) {
    const bucketStart = Math.floor(p.t / intervalSeconds) * intervalSeconds;
    const list = buckets.get(bucketStart);
    if (list) list.push(p);
    else buckets.set(bucketStart, [p]);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, pts]) => {
      const sorted = [...pts].sort((a, b) => a.t - b.t);
      const values = sorted.map((p) => p.premiumPct);
      return {
        t,
        open: values[0],
        close: values[values.length - 1],
        high: Math.max(...values),
        low: Math.min(...values),
      };
    });
}

/** Common candle intervals for the chart's period picker. */
export const CANDLE_INTERVALS = [
  { label: "1h", seconds: 3600 },
  { label: "4h", seconds: 4 * 3600 },
  { label: "1d", seconds: 24 * 3600 },
] as const;
