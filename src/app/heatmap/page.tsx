import { getPremiumHeatmap } from "@/lib/heatmap";
import { STOCKS } from "@/lib/registry";
import PremiumHeatmap from "@/components/PremiumHeatmap";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata = {
  title: "Premium Heatmap — Implied Open",
  description:
    "Every Robinhood Chain stock token's average daily premium vs its official close, day by day — spot which tickers persistently gap up or down.",
};

export default async function HeatmapPage() {
  const heatmap = await getPremiumHeatmap();
  const tickers = [...STOCKS].sort((a, b) => a.ticker.localeCompare(b.ticker));

  return (
    <div className="flex flex-col gap-8">
      <section className="neo-card flex flex-col gap-3 p-6 sm:p-8">
        <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs font-black text-[#ccff00] w-max">
          HISTORICAL ANALYTICS
        </span>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Premium Heatmap</h1>
        <p className="max-w-3xl text-sm font-semibold text-[#f5ffcc] leading-relaxed sm:text-base">
          One cell per stock per day: the average premium (or discount) the
          onchain crowd priced in that day, from the same 15-minute snapshots
          behind each stock&apos;s history chart. Cyan/Blue = trading above the
          official close, Pink/Magenta = below. A ticker that&apos;s consistently one
          color has a persistent gap, not just noise.
        </p>
      </section>
      <PremiumHeatmap tickers={tickers} dates={heatmap.dates} cells={heatmap.cells} />
    </div>
  );
}
