"use client";

import { toggleWatch, useIsWatched } from "@/lib/watchlist";

/** Star toggle for a ticker's watchlist membership — same star glyph as RH Explorer's WatchButton. */
export default function WatchButton({ ticker, size = 18 }: { ticker: string; size?: number }) {
  const watched = useIsWatched(ticker);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWatch(ticker);
      }}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={watched}
      className={`inline-flex shrink-0 items-center justify-center rounded-md p-1 transition-colors ${
        watched ? "text-accent" : "text-text-muted hover:text-accent"
      }`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={watched ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M12 17.3l-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z" />
      </svg>
    </button>
  );
}
