import AutoRefresh from "@/components/AutoRefresh";
import WatchlistTable from "@/components/WatchlistTable";
import { getPremiums } from "@/lib/premium";
import { getSparklines } from "@/lib/sparkline";

export const revalidate = 30;

export const metadata = {
  title: "Watchlist — Implied Open",
  description: "Your starred Robinhood Chain stock tokens' live premium vs official close, in one place.",
};

export default async function WatchlistPage() {
  const [rows, sparklines] = await Promise.all([
    getPremiums().catch(() => []),
    getSparklines().catch(() => ({})),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={45} />

      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
        <p className="max-w-2xl text-sm text-text-secondary">
          Tickers you&apos;ve starred, saved locally in this browser — nothing
          is sent anywhere, so a different device or browser starts empty.
        </p>
      </section>

      <WatchlistTable rows={rows} sparklines={sparklines} />
    </div>
  );
}
