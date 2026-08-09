import type { SparkPoint } from "@/lib/sparkline";

const W = 64;
const H = 24;

/** Tiny non-interactive premium trend line, CoinGecko-style — colored by direction over the shown window, no axes/hover (the full chart on the stock page has those). */
export default function MiniSparkline({ points }: { points: SparkPoint[] | undefined }) {
  if (!points || points.length < 2) {
    return <span className="text-xs text-text-muted">–</span>;
  }

  const values = points.map((p) => p.premiumPct);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.01, max - min);

  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / span) * H;

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.premiumPct).toFixed(1)}`).join(" ");
  const trendingUp = points[points.length - 1].premiumPct >= points[0].premiumPct;
  const color = trendingUp ? "var(--accent)" : "var(--danger)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
