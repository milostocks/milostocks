import Link from "next/link";
import { getLeaderboard } from "@/lib/predictBets";
import { getLastWeekChampion, getWeeklyLeaderboardView } from "@/lib/offchainWallet";
import LeaderboardTable from "@/components/LeaderboardTable";
import RealPlayTabs from "@/components/RealPlayTabs";
import WalletSearch from "@/components/WalletSearch";
import { formatChips, truncateAddress } from "@/lib/predictFormat";

export const revalidate = 30;

const WEEK_SECONDS = 7 * 24 * 60 * 60;

export const metadata = {
  title: "Leaderboard — Predict — Implied Open",
  description:
    "ETH and fETH Predict leaderboards — ranked by ETH (or fETH) actually reclaimed vs staked. Testnet.",
};

function currentWeekStart(): number {
  return Math.floor(Math.floor(Date.now() / 1000) / WEEK_SECONDS) * WEEK_SECONDS;
}

function weekLabel(): string {
  const start = new Date(currentWeekStart() * 1000);
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function LeaderboardPage() {
  const [realEntries, playEntriesRaw, champion] = await Promise.all([
    getLeaderboard().catch(() => []),
    getWeeklyLeaderboardView().catch(() => []),
    getLastWeekChampion().catch(() => null),
  ]);
  const playEntries = playEntriesRaw.map((e) => ({
    user: e.user as `0x${string}`,
    stakedWei: BigInt(e.stakedWei),
    claimedWei: BigInt(e.claimedWei),
    netWei: BigInt(e.netWei),
    betCount: e.betCount,
  }));

  return (
    <div className="flex w-full flex-col gap-8">
      <Link href="/predict" className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs text-[#ccff00] w-max hover:bg-[#ccff00]/40">
        ← BACK TO PREDICTIONS
      </Link>

      <section className="neo-card flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex max-w-3xl flex-col gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Leaderboard</h1>
            <p className="text-sm font-semibold text-[#f5ffcc] leading-relaxed sm:text-base">
              ETH bets are read straight off GapMarket&apos;s own
              on-chain events — no accounts, no off-chain tracking.{" "}
              <strong className="text-white bg-[#0c1406] px-1.5 py-0.5 border border-[#ccff00]/40 rounded">Net</strong> is actually
              claimed minus staked; open (unclaimed) positions understate a
              wallet&apos;s true standing. fETH bets use an internal,
              wallet-free balance instead — see{" "}
              <Link href="/how-it-works" className="font-black text-[#ccff00] underline underline-offset-4 hover:text-[#f59e0b]">
                How it works
              </Link>
              .
            </p>
          </div>
          <WalletSearch />
        </div>
      </section>

      <RealPlayTabs
        real={
          <>
            <p className="text-xs font-black uppercase text-[#ebff99]">All-time, real ETH.</p>
            <LeaderboardTable entries={realEntries} emptyText="No ETH bets placed yet." />
          </>
        }
        play={
          <>
            {champion && (
              <div className="neo-card bg-gradient-to-r from-[#ccff00]/30 via-[#7a9900]/30 to-[#f59e0b]/30 border-[#ccff00]/50 p-4 text-sm font-bold text-white">
                ★ Last week&apos;s champion:{" "}
                <span className="mono bg-[#0c1406] px-2 py-0.5 border border-[#ccff00]/40 rounded text-[#ccff00]">{truncateAddress(champion.address)}</span>{" "}
                (net {formatChips(BigInt(champion.netWei))}) — their next weekly claim includes a bonus!
              </div>
            )}
            <p className="text-xs font-extrabold text-[#ebff99]">
              This week only (since {weekLabel()} 00:00 UTC) — fETH balances
              and this leaderboard both reset every Thursday 00:00 UTC. The
              top net winner each week gets a bonus added to next week&apos;s
              claim — see{" "}
              <Link href="/how-it-works" className="font-black text-[#ccff00] underline hover:text-[#f59e0b]">
                How it works
              </Link>
              .
            </p>
            <LeaderboardTable
              entries={playEntries}
              emptyText="No fETH bets placed this week yet."
              formatAmount={formatChips}
              linkWallets={false}
            />
          </>
        }
      />
    </div>
  );
}
