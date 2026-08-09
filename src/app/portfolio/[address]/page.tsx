import Link from "next/link";
import { notFound } from "next/navigation";
import { isAddress, getAddress } from "viem";
import TickerIcon from "@/components/TickerIcon";
import PremiumBadge from "@/components/PremiumBadge";
import BetHistoryTable from "@/components/BetHistoryTable";
import { getPortfolioHoldings } from "@/lib/portfolio";
import { getWalletActivity } from "@/lib/predictBets";
import { formatEth, truncateAddress } from "@/lib/predictFormat";
import { formatUsd } from "@/lib/format";

export const revalidate = 30;

const EXPLORER_MAINNET = "https://robinhoodchain.blockscout.com";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return { title: `${truncateAddress(address)} — Portfolio — Implied Open` };
}

export default async function PortfolioPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: raw } = await params;
  if (!isAddress(raw)) notFound();
  const address = getAddress(raw);

  const [portfolio, activity] = await Promise.all([
    getPortfolioHoldings(address),
    getWalletActivity(address).catch(() => null),
  ]);

  return (
    <div className="flex w-full flex-col gap-8">
      <Link href="/portfolio" className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs text-[#ccff00] w-max hover:bg-[#ccff00]/40">
        ← LOOK UP ANOTHER WALLET
      </Link>

      <div className="neo-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-2.5 py-1 text-xs font-black text-[#ccff00]">PORTFOLIO</span>
          <h1 className="mono text-base font-black text-white mt-2 sm:text-lg break-all">{address}</h1>
        </div>
        <a
          href={`${EXPLORER_MAINNET}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="neo-btn px-3 py-1.5 text-xs text-white rounded-lg"
        >
          VIEW ON BLOCKSCOUT ↗
        </a>
      </div>

      <section className="flex flex-col gap-4">
        <div className="neo-box-sm p-5">
          <p className="text-xs font-black uppercase text-[#ebff99]">TOKENIZED-STOCK HOLDINGS</p>
          <p className="mono mt-1 text-3xl font-black text-white">{formatUsd(portfolio.totalValueUsd)}</p>
        </div>

        {portfolio.holdings.length === 0 ? (
          <div className="neo-card p-10 text-center text-sm font-black text-[#ebff99]">
            No holdings of a tracked Robinhood stock token — or its 24/7 DEX
            balance is currently zero.
          </div>
        ) : (
          <div className="neo-box overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-[#0c1406] text-left text-xs uppercase font-black text-[#f5ffcc] border-b border-[#7a9900]/30">
                  <th className="px-4 py-3 border-r border-[#7a9900]/30 text-[#ccff00]">Stock</th>
                  <th className="px-4 py-3 border-r border-[#7a9900]/30 text-right">Balance</th>
                  <th className="px-4 py-3 border-r border-[#7a9900]/30 text-right">Price</th>
                  <th className="px-4 py-3 border-r border-[#7a9900]/30 text-right">Value</th>
                  <th className="px-4 py-3 text-right">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7a9900]/20">
                {portfolio.holdings.map((h) => (
                  <tr key={h.ticker} className="bg-[#170e2a]/80 hover:bg-[#16240d] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/stock/${h.ticker}`} className="flex items-center gap-2 font-black text-[#ccff00] hover:text-[#f59e0b] w-max px-1 py-0.5 rounded">
                        <TickerIcon ticker={h.ticker} icon={h.icon} size={20} />
                        <span>{h.ticker}</span>
                      </Link>
                    </td>
                    <td className="mono px-4 py-3 text-right font-black text-white">
                      {h.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                    </td>
                    <td className="mono px-4 py-3 text-right font-bold text-[#f5ffcc]">{formatUsd(h.price)}</td>
                    <td className="mono px-4 py-3 text-right font-black text-white">{formatUsd(h.valueUsd)}</td>
                    <td className="px-4 py-3 text-right">
                      <PremiumBadge pct={h.premiumPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <p className="text-xs font-black uppercase text-[#ebff99]">PREDICT BET HISTORY (TESTNET)</p>
        {activity ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Bets placed" value={String(activity.bets.length)} />
              <Stat label="Staked" value={formatEth(activity.stakedWei)} />
              <Stat label="Claimed" value={formatEth(activity.claimedWei)} />
              <Stat
                label="Net"
                value={`${activity.netWei > 0n ? "+" : ""}${formatEth(activity.netWei)}`}
                tone={
                  activity.netWei > 0n ? "text-[#d4ff2a]" : activity.netWei < 0n ? "text-[#ea580c]" : "text-white"
                }
              />
            </div>
            <BetHistoryTable bets={activity.bets} />
          </>
        ) : (
          <div className="neo-card p-6 text-center text-sm font-black text-[#ebff99]">
            Couldn&apos;t load Predict activity right now.
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="neo-box-sm p-4">
      <p className="text-xs font-black uppercase text-[#ebff99]">{label}</p>
      <p className={`mono mt-1 text-lg font-black ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}
