import Link from "next/link";
import { formatEth, truncateAddress } from "@/lib/predictFormat";

export interface LeaderboardRow {
  user: `0x${string}`;
  stakedWei: bigint;
  claimedWei: bigint;
  netWei: bigint;
  betCount: number;
}

/**
 * Shared table shape for both the real-money and play-money leaderboards —
 * pass `formatChips` for the play one so amounts don't read as real ETH.
 * `linkWallets` disables the `/predict/wallet/[address]` link for fETH rows:
 * those addresses are cosmetic pseudo-addresses derived from an internal
 * wallet id (see lib/offchainWallet.ts), not real on-chain accounts, so a
 * wallet-activity lookup there would just come back empty.
 */
export default function LeaderboardTable({
  entries,
  emptyText,
  formatAmount = formatEth,
  linkWallets = true,
}: {
  entries: LeaderboardRow[];
  emptyText: string;
  formatAmount?: (wei: bigint) => string;
  linkWallets?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="neo-card p-10 text-center text-sm font-black text-[#ebff99]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="neo-box overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-[#0c1406] text-left text-xs uppercase font-black text-[#f5ffcc] border-b border-[#7a9900]/30">
            <th className="px-4 py-3 border-r border-[#7a9900]/30 text-[#ccff00]">#</th>
            <th className="px-4 py-3 border-r border-[#7a9900]/30 text-[#ccff00]">Wallet</th>
            <th className="px-4 py-3 border-r border-[#7a9900]/30 text-right">Bets</th>
            <th className="px-4 py-3 border-r border-[#7a9900]/30 text-right">Staked</th>
            <th className="px-4 py-3 border-r border-[#7a9900]/30 text-right">Claimed</th>
            <th className="px-4 py-3 text-right">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#7a9900]/20">
          {entries.map((e, i) => (
            <tr key={e.user} className="bg-[#170e2a]/80 hover:bg-[#16240d] transition-colors">
              <td className="mono px-4 py-3 font-black text-[#ebff99]">{i + 1}</td>
              <td className="px-4 py-3">
                {linkWallets ? (
                  <Link href={`/predict/wallet/${e.user}`} className="mono font-black text-[#ccff00] underline hover:text-[#f59e0b]">
                    {truncateAddress(e.user)}
                  </Link>
                ) : (
                  <span className="mono font-black text-white">{truncateAddress(e.user)}</span>
                )}
              </td>
              <td className="mono px-4 py-3 text-right font-black text-white">{e.betCount}</td>
              <td className="mono px-4 py-3 text-right font-bold text-[#f5ffcc]">{formatAmount(e.stakedWei)}</td>
              <td className="mono px-4 py-3 text-right font-bold text-[#f5ffcc]">{formatAmount(e.claimedWei)}</td>
              <td
                className={`mono px-4 py-3 text-right font-black ${
                  e.netWei > 0n ? "text-[#d4ff2a]" : e.netWei < 0n ? "text-[#ea580c]" : "text-white"
                }`}
              >
                {e.netWei > 0n ? "+" : ""}
                {formatAmount(e.netWei)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
