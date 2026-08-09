"use client";

import PremiumTable from "./PremiumTable";
import { useWatchlist } from "@/lib/watchlist";
import type { StockPremium } from "@/lib/premium";
import type { SparkPoint } from "@/lib/sparkline";

/** Filters the server-fetched premium rows down to whatever's starred in this browser's localStorage. */
export default function WatchlistTable({
  rows,
  sparklines,
}: {
  rows: StockPremium[];
  sparklines: Record<string, SparkPoint[]>;
}) {
  const watched = useWatchlist();
  const filtered = rows.filter((r) => watched.includes(r.stock.ticker));

  if (watched.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
        Your watchlist is empty — click the star on any ticker to add it here.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-10 text-center text-sm text-text-secondary">
        No live price data for your watched tickers right now.
      </div>
    );
  }

  return <PremiumTable rows={filtered} sparklines={sparklines} />;
}
