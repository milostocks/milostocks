import Link from "next/link";
import TickerIcon from "./TickerIcon";
import type { WalletBet } from "@/lib/predictBets";
import { formatEth } from "@/lib/predictFormat";
import { STOCK_BY_TICKER } from "@/lib/registry";

const STATE_LABEL = ["Open for bets", "Locked", "Resolved"] as const;
const OUTCOME_LABEL = ["Undecided", "UP", "DOWN", "Push"] as const;

/** Real-ETH GapMarket bet history table — shared by /predict/wallet/[address] and /portfolio/[address] so both render the exact same rows/markup. */
export default function BetHistoryTable({ bets }: { bets: WalletBet[] }) {
  if (bets.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
        This wallet hasn&apos;t placed any bets yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg-secondary">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3 font-medium">Ticker</th>
            <th className="px-4 py-3 font-medium">Side</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((b, i) => {
            const stock = STOCK_BY_TICKER.get(b.ticker);
            const resolved = b.marketState === 2;
            const won =
              resolved &&
              ((b.marketOutcome === 1 && b.up) || (b.marketOutcome === 2 && !b.up) || b.marketOutcome === 3);
            return (
              <tr key={`${b.txHash}-${i}`} className="border-b border-border last:border-0 hover:bg-bg-hover">
                <td className="px-4 py-3">
                  <Link href={`/predict/${b.ticker}`} className="flex items-center gap-2 hover:text-accent">
                    <TickerIcon ticker={b.ticker} icon={stock?.icon ?? null} size={20} />
                    <span className="font-medium">{b.ticker}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      b.up ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"
                    }`}
                  >
                    {b.up ? "UP" : "DOWN"}
                  </span>
                </td>
                <td className="mono px-4 py-3 text-right text-text-secondary">{formatEth(b.amount)}</td>
                <td className="px-4 py-3 text-right text-xs">
                  {!resolved ? (
                    <span className="text-text-muted">{STATE_LABEL[b.marketState]}</span>
                  ) : b.claimed ? (
                    <span className="text-text-muted">Claimed · {OUTCOME_LABEL[b.marketOutcome]}</span>
                  ) : won ? (
                    <Link href={`/predict/${b.ticker}`} className="font-medium text-accent hover:underline">
                      Unclaimed win →
                    </Link>
                  ) : (
                    <span className="text-text-muted">Lost · {OUTCOME_LABEL[b.marketOutcome]}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
