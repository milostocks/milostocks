/** CoinGecko-dominance-style bar list: share of all ETH ever staked, by ticker. */
export default function PoolDominanceBars({
  rows,
  totalWei,
}: {
  rows: { ticker: string; stakedWei: bigint }[];
  totalWei: bigint;
}) {
  if (totalWei === 0n) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary">
        No bets placed anywhere yet — this fills in as markets get action.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">Where the action is</p>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const pct = Number((r.stakedWei * 10000n) / totalWei) / 100;
          return (
            <div key={r.ticker} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs font-medium text-text-primary">{r.ticker}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-primary">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <span className="mono w-16 shrink-0 text-right text-xs text-text-secondary">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
