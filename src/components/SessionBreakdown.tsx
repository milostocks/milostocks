import type { SessionStat } from "@/lib/sessionBreakdown";
import { formatPct } from "@/lib/format";

const SESSION_HINT: Record<string, string> = {
  Weekend: "Friday close → Monday open",
  "After hours": "16:00–24:00 ET weekdays",
  "Pre-market": "00:00–9:30 ET weekdays",
  "Regular session": "9:30–16:00 ET — should hover near zero",
};

/** Small bar-per-session breakdown of average premium, shown when there's enough session variety in the history to be meaningful. */
export default function SessionBreakdown({ stats }: { stats: SessionStat[] }) {
  if (stats.length < 2) return null;

  const maxAbs = Math.max(0.01, ...stats.map((s) => Math.abs(s.avgPremiumPct)));

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">
        Average premium by session
      </p>
      <div className="flex flex-col gap-3">
        {stats.map((s) => {
          const width = Math.min(100, (Math.abs(s.avgPremiumPct) / maxAbs) * 100);
          const tone = s.avgPremiumPct >= 0 ? "text-accent" : "text-danger";
          const barColor = s.avgPremiumPct >= 0 ? "bg-accent" : "bg-danger";
          return (
            <div key={s.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-text-secondary">
                  {s.label}
                  <span className="ml-2 text-xs text-text-muted">{SESSION_HINT[s.label]}</span>
                </span>
                <span className={`mono font-semibold ${tone}`}>{formatPct(s.avgPremiumPct)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-primary">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-text-muted">
        Averaged from the same 15-minute snapshots as the chart above.
      </p>
    </div>
  );
}
