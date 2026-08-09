import Link from "next/link";
import { notFound } from "next/navigation";
import TickerIcon from "@/components/TickerIcon";
import PremiumBadge from "@/components/PremiumBadge";
import ConnectWallet from "@/components/ConnectWallet";
import MyActivityLink from "@/components/MyActivityLink";
import PredictMarketCard from "@/components/PredictMarketCard";
import PlayMarketCard, { ResolvedFPlayMarket } from "@/components/PlayMarketCard";
import ClaimChipsButton from "@/components/ClaimChipsButton";
import RecentBets from "@/components/RecentBets";
import RealPlayTabs from "@/components/RealPlayTabs";
import PremiumHistoryChart from "@/components/PremiumHistoryChart";
import ImpliedProbabilityChart from "@/components/ImpliedProbabilityChart";
import CommentSection from "@/components/CommentSection";
import { getAllMarkets, toInitialMarket } from "@/lib/predictMarkets";
import { getBetsForMarket, getPoolHistory, toSerializableBet } from "@/lib/predictBets";
import { getMarketView, getPoolHistoryView, peekWalletId } from "@/lib/offchainWallet";
import { getComments } from "@/lib/comments";
import { getPremiums } from "@/lib/premium";
import { getPremiumHistory } from "@/lib/history";
import { STOCK_BY_TICKER } from "@/lib/registry";
import { PREDICTABLE_TICKERS } from "@/lib/predictContracts";
import { formatChips, formatEth } from "@/lib/predictFormat";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const stock = STOCK_BY_TICKER.get(t);
  return {
    title: `${t} — Predict — Implied Open`,
    description: stock
      ? `Bet whether ${stock.name} (${t}) rises or falls during the trading session on Robinhood Chain — real ETH or free weekly fETH, no wallet needed for fETH.`
      : `Bet on ${t} during the trading session on Robinhood Chain.`,
  };
}

export default async function PredictTickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  const stock = STOCK_BY_TICKER.get(ticker);
  const isFEthTicker = (PREDICTABLE_TICKERS as readonly string[]).includes(ticker);

  const allMarkets = await getAllMarkets().catch(() => []);
  const marketsForTicker = allMarkets.filter((m) => m.ticker === ticker).sort((a, b) => Number(b.id - a.id));

  if (!stock && marketsForTicker.length === 0 && !isFEthTicker) notFound();

  const latestMarket = marketsForTicker[0];
  const walletId = await peekWalletId();

  const [latestBets, poolHistory, fplayDetail, fplayPoolHistory, premiums, premiumHistory, comments] =
    await Promise.all([
      latestMarket ? getBetsForMarket(latestMarket.id).catch(() => []) : Promise.resolve([]),
      latestMarket ? getPoolHistory(latestMarket.id).catch(() => []) : Promise.resolve([]),
      isFEthTicker ? getMarketView(ticker, walletId).catch(() => null) : Promise.resolve(null),
      isFEthTicker ? getPoolHistoryView(ticker).catch(() => []) : Promise.resolve([]),
      getPremiums().catch(() => []),
      stock ? getPremiumHistory(stock.ticker, 14) : Promise.resolve([]),
      getComments(ticker).catch(() => []),
    ]);

  const premiumRow = premiums.find((r) => r.stock.ticker === ticker);

  const realSection = (
    <>
      <MarketStats market={latestMarket} bets={latestBets} label="real ETH" formatAmount={formatEth} />
      <ImpliedProbabilityChart points={poolHistory} />
      {latestMarket ? (
        <>
          <PredictMarketCard id={latestMarket.id.toString()} initial={toInitialMarket(latestMarket)} />
          <RecentBets marketId={latestMarket.id.toString()} initial={latestBets.map(toSerializableBet)} />
          {marketsForTicker.length > 1 && (
            <details className="rounded-xl border border-border bg-bg-secondary/50 px-4 py-3">
              <summary className="cursor-pointer text-sm text-text-secondary">
                Past sessions ({marketsForTicker.length - 1})
              </summary>
              <div className="mt-3 flex flex-col gap-4">
                {marketsForTicker.slice(1).map((m) => (
                  <PredictMarketCard key={m.id.toString()} id={m.id.toString()} initial={toInitialMarket(m)} />
                ))}
              </div>
            </details>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
          No ETH markets for {ticker} yet.
        </div>
      )}
    </>
  );

  const playSection = (
    <>
      <ClaimChipsButton />
      {fplayDetail ? (
        <>
          <MarketStats
            market={{ upPool: BigInt(fplayDetail.market.upPool), downPool: BigInt(fplayDetail.market.downPool) }}
            bets={fplayDetail.bets.map((b) => ({ user: b.address as `0x${string}` }))}
            label="fETH"
            formatAmount={formatChips}
          />
          <ImpliedProbabilityChart points={fplayPoolHistory} />
          <PlayMarketCard ticker={ticker} initial={fplayDetail.market} />
          <RecentBets ticker={ticker} initialFPlayBets={fplayDetail.bets} mode="play" />
          {fplayDetail.history.length > 0 && (
            <details className="rounded-xl border border-border bg-bg-secondary/50 px-4 py-3">
              <summary className="cursor-pointer text-sm text-text-secondary">
                Past sessions ({fplayDetail.history.length})
              </summary>
              <div className="mt-3 flex flex-col gap-4">
                {fplayDetail.history.map((m) => (
                  <ResolvedFPlayMarket key={m.id} market={m} />
                ))}
              </div>
            </details>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
          No fETH market for {ticker} yet.
        </div>
      )}
    </>
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <Link href="/predict" className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs text-[#ccff00] w-max hover:bg-[#ccff00]/40">
        ← ALL PREDICTIONS
      </Link>

      <div className="neo-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TickerIcon ticker={ticker} icon={stock?.icon ?? null} size={48} />
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {ticker}
              {premiumRow && <PremiumBadge pct={premiumRow.premiumPct} />}
            </h1>
            {stock && <p className="text-sm font-bold text-[#ebff99]">{stock.name}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {stock && (
            <Link
              href={`/stock/${ticker}`}
              className="neo-btn px-4 py-2 text-xs font-black text-white rounded-lg"
            >
              VIEW PREMIUM →
            </Link>
          )}
          <MyActivityLink />
          <ConnectWallet />
        </div>
      </div>

      <PremiumHistoryChart points={premiumHistory} />

      <RealPlayTabs real={realSection} play={playSection} />

      <CommentSection ticker={ticker} initial={comments} />
    </div>
  );
}

function MarketStats({
  market,
  bets,
  label,
  formatAmount,
}: {
  market: { upPool: bigint; downPool: bigint } | undefined;
  bets: { user: `0x${string}` }[];
  label: string;
  formatAmount: (wei: bigint) => string;
}) {
  const totalPool = market ? market.upPool + market.downPool : 0n;
  const bettors = new Set(bets.map((b) => b.user.toLowerCase()));

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Stat label={`Pool (${label})`} value={formatAmount(totalPool)} />
      <Stat label="Bettors" value={String(bettors.size)} />
      <Stat label="Total bets" value={String(bets.length)} />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="neo-box-sm p-4">
      <p className="text-xs uppercase font-black tracking-wide text-[#ebff99]">{label}</p>
      <p className="mono mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}
