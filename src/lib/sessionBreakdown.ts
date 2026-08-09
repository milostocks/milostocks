// Buckets a ticker's premium-history points by which NYSE session they fell
// in (reusing market.ts's DST-aware session classifier) and averages each
// bucket — surfaces things a single timeline chart doesn't, e.g. "the gap is
// biggest right after Friday close and compresses through the weekend."
import type { HistoryPoint } from "./history";
import { getMarketStatus } from "./market";

export interface SessionStat {
  label: string;
  avgPremiumPct: number;
  samples: number;
}

/** Session labels in a fixed, meaningful display order (not alphabetical). */
const SESSION_ORDER = ["Weekend", "After hours", "Pre-market", "Regular session"];

export function getSessionBreakdown(points: HistoryPoint[]): SessionStat[] {
  const groups = new Map<string, number[]>();
  for (const p of points) {
    const { label } = getMarketStatus(new Date(p.t * 1000));
    const arr = groups.get(label) ?? [];
    arr.push(p.premiumPct);
    groups.set(label, arr);
  }

  return SESSION_ORDER.filter((label) => groups.has(label)).map((label) => {
    const arr = groups.get(label)!;
    return {
      label,
      avgPremiumPct: arr.reduce((s, v) => s + v, 0) / arr.length,
      samples: arr.length,
    };
  });
}
