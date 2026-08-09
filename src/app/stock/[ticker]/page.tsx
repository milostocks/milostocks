import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";
import PremiumBadge from "@/components/PremiumBadge";
import HistoryChartToggle from "@/components/HistoryChartToggle";
import ShareButton from "@/components/ShareButton";
import WatchButton from "@/components/WatchButton";
import TickerIcon from "@/components/TickerIcon";
import { STOCK_BY_TICKER } from "@/lib/registry";
import { getPremiums } from "@/lib/premium";
import { getPremiumHistory } from "@/lib/history";
import { getSessionBreakdown } from "@/lib/sessionBreakdown";
import SessionBreakdown from "@/components/SessionBreakdown";
import { getMarketStatus } from "@/lib/market";
import { PREDICTABLE_TICKERS } from "@/lib/predictContracts";
import { formatCompactUsd, formatPct, formatUsd, timeAgo } from "@/lib/format";

export const revalidate = 30;

const BLOCKSCOUT = "https://robinhoodchain.blockscout.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const stock = STOCK_BY_TICKER.get(ticker.toUpperCase());
  if (!stock) return {};

  const rows = await getPremiums().catch(() => []);
  const row = rows.find((r) => r.stock.ticker === stock.ticker);
  const description = row
    ? `${stock.name} (${stock.ticker}) is trading at ${formatPct(row.premiumPct)} vs its official close on Robinhood Chain — 24/7 tokenized stock prices.`
    : `${stock.name} (${stock.ticker}) tokenized stock price on Robinhood Chain.`;

  return {
    title: `${stock.ticker}${row ? ` ${formatPct(row.premiumPct)}` : ""} — Implied Open`,
    description,
    twitter: { card: "summary_large_image" },
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const stock = STOCK_BY_TICKER.get(ticker.toUpperCase());
  if (!stock) notFound();

  const [rows, history] = await Promise.all([
    getPremiums().catch(() => []),
    getPremiumHistory(stock.ticker, 14),
  ]);
  const row = rows.find((r) => r.stock.ticker === stock.ticker);
  const sessionStats = getSessionBreakdown(history);
  const market = getMarketStatus();

  return (
    <div className="flex w-full flex-col gap-8">
      <AutoRefresh seconds={45} />

      <Link href="/" className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs text-[#ccff00] w-max hover:bg-[#ccff00]/40">
        ← ALL STOCKS
      </Link>

      <div className="neo-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TickerIcon ticker={stock.ticker} icon={stock.icon} size={52} />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {stock.ticker}
              <span className="ml-3 text-base font-bold text-[#ebff99]">
                {stock.name}
              </span>
            </h1>
            <p className="mt-1 text-xs font-extrabold text-[#ebff99]">
              {market.open
                ? "US market is open — premium should stay near zero"
                : `US market closed (${market.label.toLowerCase()}) — token is trading ahead of the next open`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WatchButton ticker={stock.ticker} size={20} />
          {(PREDICTABLE_TICKERS as readonly string[]).includes(stock.ticker) && (
            <Link
              href={`/predict/${stock.ticker}`}
              className="neo-btn px-4 py-2 text-xs text-white"
            >
              PREDICT →
            </Link>
          )}
          {row && (
            <ShareButton
              ticker={stock.ticker}
              name={stock.name}
              premiumPct={row.premiumPct}
              marketOpen={market.open}
            />
          )}
        </div>
      </div>

      {row ? (
        <>
          {!row.liquid && (
            <div className="neo-card bg-[#ffb703]/20 border-[#ffb703]/40 px-4 py-3 text-sm font-black text-[#ffb703]">
              ⚠️ Low onchain liquidity — the DEX price (and this premium) may be stale or distorted.
            </div>
          )}
          <div className="neo-card p-6 sm:p-8">
            <p className="text-xs uppercase font-black text-[#ebff99]">
              PREMIUM VS OFFICIAL CLOSE
            </p>
            <div className="mt-2">
              <PremiumBadge pct={row.premiumPct} size="lg" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#f5ffcc] leading-relaxed sm:text-base">
              The onchain market is pricing {stock.ticker} at{" "}
              <span className="mono font-black text-[#ccff00] bg-[#0c1406] px-2 py-0.5 border border-[#ccff00]/40 rounded">
                {formatUsd(row.tokenPrice)}
              </span>{" "}
              against an official close of{" "}
              <span className="mono font-black text-[#f5ffcc] bg-[#0c1406] px-2 py-0.5 border border-white/20 rounded">
                {formatUsd(row.official)}
              </span>
              {" — "}an implied open of{" "}
              <span className="mono font-black text-[#f59e0b] bg-[#0c1406] px-2 py-0.5 border border-[#f59e0b]/40 rounded">
                {formatUsd(row.tokenPrice)}
              </span>
              .
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Token price (24/7)" value={formatUsd(row.tokenPrice)} />
            <Stat label="Official close" value={formatUsd(row.official)} />
            <Stat
              label="Close updated"
              value={timeAgo(row.officialUpdatedAt)}
            />
            <Stat
              label="24h onchain volume"
              value={
                row.volume24h != null ? formatCompactUsd(row.volume24h) : "–"
              }
            />
          </div>

          <HistoryChartToggle points={history} />
          <SessionBreakdown stats={sessionStats} />
        </>
      ) : (
        <div className="neo-card p-6 text-sm font-black text-[#ebff99]">
          No live price data for {stock.ticker} right now.
        </div>
      )}

      <div className="neo-card p-4 text-xs font-black text-[#ebff99] flex flex-col gap-1.5">
        <p>
          Token contract:{" "}
          <a
            className="mono font-black text-[#ccff00] underline hover:text-[#f59e0b]"
            href={`${BLOCKSCOUT}/token/${stock.token}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {stock.token}
          </a>
        </p>
        <p>
          Chainlink feed:{" "}
          <a
            className="mono font-black text-[#ccff00] underline hover:text-[#f59e0b]"
            href={`${BLOCKSCOUT}/address/${stock.feed}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {stock.feed}
          </a>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="neo-box-sm p-4">
      <p className="text-xs font-black uppercase text-[#ebff99]">{label}</p>
      <p className="mono mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
