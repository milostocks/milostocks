import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";
import PremiumTable from "@/components/PremiumTable";
import HighlightCard from "@/components/HighlightCard";
import { getPremiums } from "@/lib/premium";
import { getSparklines } from "@/lib/sparkline";
import { getMarketStatus } from "@/lib/market";
import { formatPct } from "@/lib/format";

export const revalidate = 30;

export default async function Home() {
  // Artificial 3 second delay for the splash screen
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const [rows, sparklines] = await Promise.all([
    getPremiums().catch(() => []),
    getSparklines().catch(() => ({})),
  ]);
  const market = getMarketStatus();
  const liquid = rows.filter((r) => r.liquid);
  const illiquid = rows.filter((r) => !r.liquid);

  const avg =
    liquid.length > 0
      ? liquid.reduce((s, r) => s + r.premiumPct, 0) / liquid.length
      : 0;
  const top = liquid[0];

  const topGainers = [...liquid].filter((r) => r.premiumPct > 0).sort((a, b) => b.premiumPct - a.premiumPct).slice(0, 5);
  const topLosers = [...liquid].filter((r) => r.premiumPct < 0).sort((a, b) => a.premiumPct - b.premiumPct).slice(0, 5);
  const mostLiquid = [...liquid].sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0)).slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh seconds={45} />

      <section className="neo-card flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="neo-badge px-3 py-1 text-xs font-extrabold text-[#0d1406] bg-gradient-to-r from-[#d4ff2a] to-[#ccff00]">
            MILO — Stock Vault
          </span>
          <span className="neo-badge border-[#ccff00]/50 bg-gradient-to-r from-[#ccff00]/30 to-[#7a9900]/30 px-2.5 py-1 text-xs font-black text-[#ccff00]">
            24/7 RWA SIGNAL
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Where does the market think stocks open next?
        </h1>
        <p className="max-w-3xl text-sm font-semibold text-[#f5ffcc] leading-relaxed sm:text-base">
          Robinhood Chain lets real-world stocks (RWA) trade on-chain 24/7,
          but their &quot;official&quot; price only updates while NYSE is
          open. That leaves a live, constantly-moving gap between what a
          token trades at right now and its last official close — a signal
          that simply didn&apos;t exist before tokenized equities. MILO is
          built entirely around that gap, in two ways.{" "}
          <Link href="/how-it-works" className="inline-block font-black text-[#ccff00] underline underline-offset-4 hover:text-[#d4ff2a]">
            How it works →
          </Link>
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="neo-card flex flex-col justify-between p-6">
          <div>
            <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-2.5 py-1 text-xs text-[#ccff00]">
              01 · WATCH IT
            </span>
            <h2 className="mt-3 text-xl font-black text-white">
              Implied Open
            </h2>
            <p className="mt-2 text-sm font-medium text-[#f5ffcc]">
              The dashboard below — free, no wallet needed. Every tokenized
              stock&apos;s live premium or discount vs. its official close,
              updated continuously. While the market&apos;s shut, it&apos;s the
              on-chain crowd&apos;s running bet on where the stock reopens.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-[#ccff00]/30">
            <span className="text-xs font-black uppercase text-[#ebff99]">Real-Time Data Feed</span>
          </div>
        </div>
        <Link
          href="/predict"
          className="neo-card group flex flex-col justify-between bg-gradient-to-br from-[#1e3012] via-[#273b18] to-[#354d23] border-[#ccff00]/50 p-6 text-white hover:border-[#d4ff2a]"
        >
          <div>
            <span className="neo-badge border-[#ccff00]/50 bg-[#ccff00]/20 px-2.5 py-1 text-xs text-[#ccff00]">
              02 · BET ON IT
            </span>
            <h2 className="mt-3 flex items-center justify-between text-xl font-black text-white">
              <span>Predict Markets</span>
              <span className="neo-badge bg-gradient-to-r from-[#d4ff2a] to-[#ccff00] text-[#0d1406] px-2.5 py-0.5 text-sm transition-transform group-hover:translate-x-1">→</span>
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#f5ffcc]">
              Non-custodial markets, resolved entirely on-chain — bet with real ETH, or with{" "}
              <strong className="bg-[#0e1708] px-1.5 py-0.5 border border-[#ccff00]/40 font-black text-[#ccff00]">free weekly fETH</strong>{" "}
              from an internal site wallet. Two market types: <strong className="bg-[#0e1708] px-1.5 py-0.5 border border-[#ccff00]/40 font-black text-[#d4ff2a]">weekend gap</strong> and{" "}
              <strong className="bg-[#0e1708] px-1.5 py-0.5 border border-[#ccff00]/40 font-black text-[#e0ff66]">trading session</strong>.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-[#ccff00]/30 flex justify-between items-center text-xs font-black text-[#ccff00]">
            <span>START PREDICTING</span>
            <span>0.1 fETH WEEKLY FAUCET</span>
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="neo-card p-5">
          <p className="neo-badge bg-[#0e1708] border-[#ccff00]/30 px-2 py-0.5 text-[10px] text-[#ebff99] w-max">
            US MARKET STATUS
          </p>
          <p className="mt-3 flex items-center gap-2.5 text-xl font-black text-white">
            <span
              className={`inline-block h-3.5 w-3.5 border border-white/20 rounded-full shadow-[0_0_8px_currentColor] ${
                market.open ? "bg-[#ccff00] text-[#ccff00]" : "bg-[#f59e0b] text-[#f59e0b]"
              }`}
            />
            {market.open ? "OPEN NOW" : `CLOSED · ${market.label}`}
          </p>
        </div>
        <div className="neo-card p-5">
          <p className="neo-badge bg-[#0e1708] border-[#ccff00]/30 px-2 py-0.5 text-[10px] text-[#ebff99] w-max">
            AVERAGE PREMIUM ({liquid.length} STOCKS)
          </p>
          <p
            className={`mono mt-3 text-2xl font-black ${
              avg >= 0 ? "text-[#ccff00]" : "text-[#d4ff2a]"
            }`}
          >
            {formatPct(avg)}
          </p>
        </div>
        <div className="neo-card p-5">
          <p className="neo-badge bg-[#0e1708] border-[#ccff00]/30 px-2 py-0.5 text-[10px] text-[#ebff99] w-max">
            BIGGEST GAP NOW
          </p>
          <p className="mono mt-3 text-2xl font-black text-white">
            {top ? (
              <>
                <span className="bg-gradient-to-r from-[#ccff00] to-[#7a9900] border border-white/30 px-2 py-0.5 mr-2 rounded text-[#0d1406]">{top.stock.ticker}</span>{" "}
                <span className={top.premiumPct >= 0 ? "text-[#ccff00]" : "text-[#d4ff2a]"}>
                  {formatPct(top.premiumPct)}
                </span>
              </>
            ) : (
              "–"
            )}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <HighlightCard title="Top Gainers" rows={topGainers} metric="premium" />
        <HighlightCard title="Top Losers" rows={topLosers} metric="premium" />
        <HighlightCard title="Most Liquid" rows={mostLiquid} metric="volume" />
      </section>

      <PremiumTable rows={liquid} sparklines={sparklines} />

      {illiquid.length > 0 && (
        <details className="neo-card p-5">
          <summary className="cursor-pointer font-black text-sm text-[#ffb703] uppercase">
            Low-liquidity tokens ({illiquid.length}) — DEX prices unreliable
          </summary>
          <p className="mt-2 text-xs font-semibold text-[#ebff99]">
            Under ${"1,000"} of 24h onchain volume: a single stale pool print
            can distort the premium percentages. Tracked, but kept off the top dashboard.
          </p>
          <div className="mt-4">
            <PremiumTable rows={illiquid} sparklines={sparklines} />
          </div>
        </details>
      )}

      <p className="text-xs font-extrabold text-neutral-700">
        &quot;Official close&quot; is the Chainlink feed on Robinhood Chain —
        it follows market hours, so outside the session it holds the last
        close. Token prices update 24/7. Auto-refreshes every 45s.
      </p>
    </div>
  );
}
