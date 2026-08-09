import Link from "next/link";
import { getPremiums } from "@/lib/premium";
import { getGlobalFEthWeeklyOverview } from "@/lib/offchainWallet";
import { formatChips } from "@/lib/predictFormat";
import { formatCompactUsd, formatPct } from "@/lib/format";

/**
 * CoinGecko-style thin stats strip under the header nav, on every page —
 * tokens tracked, average premium, 24h volume, and this week's fETH
 * activity, plus a leaderboard quick-link. Deliberately global-market
 * numbers only (getPremiums(), already ISR-cached everywhere; the fETH
 * overview is one cheap Redis/JSON read) — NOT the real-money Predict
 * overview, which scans on-chain event logs and would be too expensive to
 * run on every single page load site-wide (see CLAUDE.md §9's note on
 * getLeaderboard's unfiltered log scan).
 */
export default async function GlobalStatsBar() {
  const [rows, fEthOverview] = await Promise.all([
    getPremiums().catch(() => []),
    getGlobalFEthWeeklyOverview().catch(() => ({ players: 0, stakedWei: "0" })),
  ]);

  const liquid = rows.filter((r) => r.liquid);
  const avgPremium = liquid.length > 0 ? liquid.reduce((s, r) => s + r.premiumPct, 0) / liquid.length : 0;
  const totalVolume = liquid.reduce((s, r) => s + (r.volume24h ?? 0), 0);

  return (
    <div className="border-b border-[#7a9900]/30 bg-gradient-to-r from-[#170e2a] via-[#1f113a] to-[#25103a] text-white font-extrabold">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap px-4 py-2 text-xs sm:gap-4 sm:px-6 lg:px-8">
        <span className="whitespace-nowrap rounded-lg border border-[#7a9900]/40 bg-[#091104]/80 px-2.5 py-1 shadow-sm">
          <strong className="text-[#ccff00]">{rows.length}</strong> TOKENS TRACKED
        </span>
        <span className="whitespace-nowrap rounded-lg border border-[#7a9900]/40 bg-[#091104]/80 px-2.5 py-1 shadow-sm">
          AVG PREMIUM:{" "}
          <strong className={avgPremium >= 0 ? "text-[#d4ff2a]" : "text-[#ea580c]"}>{formatPct(avgPremium)}</strong>
        </span>
        <span className="whitespace-nowrap rounded-lg border border-[#7a9900]/40 bg-[#091104]/80 px-2.5 py-1 shadow-sm">
          24H VOLUME: <strong className="text-[#f59e0b]">{formatCompactUsd(totalVolume)}</strong>
        </span>
        <span className="whitespace-nowrap rounded-lg border border-[#7a9900]/40 bg-[#091104]/80 px-2.5 py-1 shadow-sm">
          fETH PLAYERS: <strong className="text-white">{fEthOverview.players}</strong> · STAKED:{" "}
          <strong className="text-[#7a9900]">{formatChips(BigInt(fEthOverview.stakedWei))}</strong>
        </span>
        <Link
          href="/predict/leaderboard"
          className="ml-auto shrink-0 whitespace-nowrap rounded-lg border border-white/20 bg-gradient-to-r from-[#ccff00] to-[#f59e0b] px-3 py-1 text-white shadow-[0_0_12px_rgba(247,37,133,0.4)] hover:brightness-110 transition-all"
        >
          LEADERBOARD →
        </Link>
      </div>
    </div>
  );
}
