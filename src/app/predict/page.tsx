import Link from "next/link";
import TickerIcon from "@/components/TickerIcon";
import PremiumBadge from "@/components/PremiumBadge";
import MiniSparkline from "@/components/MiniSparkline";
import PoolDominanceBars from "@/components/PoolDominanceBars";
import { getLatestMarketPerTicker } from "@/lib/predictMarkets";
import { getPredictOverview } from "@/lib/predictBets";
import { getPremiums } from "@/lib/premium";
import { getSparklines, type SparkPoint } from "@/lib/sparkline";
import { STOCK_BY_TICKER } from "@/lib/registry";
import { formatEth } from "@/lib/predictFormat";

export const dynamic = "force-dynamic";
export const revalidate = 15;

const STATE_LABEL = ["Open for bets", "Locked", "Resolved"] as const;
const STATE_TONE = [
  "border-accent/40 text-accent",
  "border-warning/40 text-warning",
  "border-border text-text-muted",
] as const;

export const metadata = {
  title: "Predict — Implied Open",
  description:
    "Bet whether a Robinhood Chain tokenized stock rises or falls during regular market hours. Non-custodial, testnet only.",
};

export default async function PredictIndexPage() {
  const [markets, overview, premiums, sparklines] = await Promise.all([
    getLatestMarketPerTicker().catch(() => []),
    getPredictOverview().catch(() => ({
      totalMarkets: 0,
      activeMarkets: 0,
      activeBettors: 0,
      totalStakedWei: 0n,
      stakedByTicker: [],
    })),
    getPremiums().catch(() => []),
    getSparklines().catch(() => ({}) as Record<string, SparkPoint[]>),
  ]);
  const premiumByTicker = new Map(premiums.map((r) => [r.stock.ticker, r]));

  return (
    <div className="flex flex-col gap-8">
      <section className="neo-card flex flex-col gap-3 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Predict: bet on the session, not the weekend
          </h1>
          <Link
            href="/predict/leaderboard"
            className="neo-btn px-4 py-1.5 text-xs text-white"
          >
            LEADERBOARD →
          </Link>
        </div>
        <p className="max-w-3xl text-sm font-semibold text-[#f5ffcc] leading-relaxed sm:text-base">
          Non-custodial pari-mutuel markets: bet on whether a tokenized stock
          rises or falls during regular market hours. Resolved by reading the
          same on-chain price feed at session start and session end — nobody,
          including us, decides the outcome. Robinhood Chain testnet only.
        </p>
      </section>

      <section className="neo-card flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#ccff00]/30 via-[#7a9900]/30 to-[#f59e0b]/30 border-[#ccff00]/50 p-6 text-white">
        <div>
          <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-2.5 py-1 text-xs text-[#ccff00] font-black">NEW FEATURE</span>
          <h2 className="mt-2 text-xl font-black text-white">Free Weekly fETH — No Wallet Needed</h2>
          <p className="mt-1 max-w-2xl text-sm font-bold text-[#f5ffcc]">
            Every ticker below has two tabs — <strong className="bg-[#0c1406] px-1.5 py-0.5 border border-[#ccff00]/40 font-black text-[#ccff00]">ETH</strong> (needs a wallet) and <strong className="bg-[#0c1406] px-1.5 py-0.5 border border-[#f59e0b]/40 font-black text-[#f59e0b]">fETH</strong> (fake ETH, internal wallet — no MetaMask). fETH resets to 0.1 free every week!
          </p>
        </div>
        <Link
          href="/predict/leaderboard"
          className="neo-btn px-5 py-2.5 text-xs text-white"
        >
          SEE LEADERBOARDS →
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Markets" value={String(overview.activeMarkets)} sub={`${overview.totalMarkets} all-time`} />
        <Stat label="Tickers" value={String(markets.length)} />
        <Stat label="Total Staked" value={formatEth(overview.totalStakedWei)} />
        <Stat label="Bettors" value={String(overview.activeBettors)} />
      </section>

      {markets.length === 0 ? (
        <div className="neo-box p-10 text-center text-sm font-black text-white">
          No markets yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {markets.map((m) => {
            const stock = STOCK_BY_TICKER.get(m.ticker);
            const premiumRow = premiumByTicker.get(m.ticker);
            const totalPool = m.upPool + m.downPool;
            const upShare = totalPool > 0n ? Number((m.upPool * 10000n) / totalPool) / 100 : 50;

            return (
              <Link
                key={m.ticker}
                href={`/predict/${m.ticker}`}
                className="neo-card flex flex-col justify-between gap-4 p-5"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#7a9900]/30 pb-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TickerIcon ticker={m.ticker} icon={stock?.icon ?? null} size={32} />
                    <div className="flex min-w-0 flex-col">
                      <span className="font-black text-base text-white">{m.ticker}</span>
                      <span className="truncate text-xs font-bold text-[#ebff99]">{stock?.name ?? ""}</span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 neo-badge px-2 py-0.5 text-[10px] font-black rounded-full ${
                      m.state === 0 ? "border-[#ccff00]/40 bg-[#ccff00]/20 text-[#d4ff2a]" : m.state === 1 ? "border-[#ffb703]/40 bg-[#ffb703]/20 text-[#ffb703]" : "border-white/20 bg-white/10 text-white"
                    }`}
                  >
                    {STATE_LABEL[m.state].toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {premiumRow ? (
                    <PremiumBadge pct={premiumRow.premiumPct} />
                  ) : (
                    <span className="text-xs font-bold text-[#ebff99]">–</span>
                  )}
                  <MiniSparkline points={sparklines[m.ticker]} />
                </div>

                <div>
                  <div className="flex h-3 overflow-hidden rounded-lg border border-white/20 bg-[#0a1204]">
                    <div className="h-full bg-gradient-to-r from-[#ccff00] to-[#d4ff2a]" style={{ width: `${upShare}%` }} />
                    <div className="h-full bg-gradient-to-r from-[#ea580c] to-[#f59e0b]" style={{ width: `${100 - upShare}%` }} />
                  </div>
                  <div className="mono mt-1.5 flex justify-between text-[10px] font-black text-white">
                    <span className="text-[#d4ff2a]">{formatEth(m.upPool)} UP</span>
                    <span className="text-[#ea580c]">{formatEth(m.downPool)} DOWN</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <PoolDominanceBars rows={overview.stakedByTicker} totalWei={overview.totalStakedWei} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="neo-card p-5">
      <p className="text-[10px] font-black uppercase text-[#ebff99]">{label}</p>
      <p className="mono mt-1 text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-[11px] font-extrabold text-[#ebff99] mt-0.5">{sub}</p>}
    </div>
  );
}
