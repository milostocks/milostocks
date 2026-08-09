"use client";

// Same shape as RH Explorer's lib/watchlist.ts (sibling project) — localStorage
// list + a custom event so same-tab components re-sync immediately (the
// native "storage" event only fires in *other* tabs, not the one that wrote
// it). Simpler here: just a list of tickers, no type/network fields needed.
import { useEffect, useState } from "react";

const KEY = "rham-watchlist";
const EVENT = "rham-watchlist-change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(tickers: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(tickers));
  window.dispatchEvent(new Event(EVENT));
}

export function toggleWatch(ticker: string) {
  const tickers = read();
  write(tickers.includes(ticker) ? tickers.filter((t) => t !== ticker) : [ticker, ...tickers]);
}

/** Reactive watchlist, synced across tabs/components. */
export function useWatchlist(): string[] {
  const [tickers, setTickers] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setTickers(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return tickers;
}

export function useIsWatched(ticker: string): boolean {
  return useWatchlist().includes(ticker);
}
