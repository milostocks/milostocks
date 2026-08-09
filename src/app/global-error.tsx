"use client";

import "./globals.css";

/**
 * Catches errors thrown from the root layout itself (outside error.tsx's
 * reach — e.g. GlobalStatsBar's data fetch, wagmi provider setup). Must
 * define its own <html>/<body> since it replaces the whole root layout when
 * active, and can't use next/font (no access to the layout's font vars).
 */
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-primary px-4 text-center font-sans text-text-primary">
        <p className="text-sm font-semibold uppercase tracking-wide text-danger">
          Something went wrong
        </p>
        <h1 className="text-2xl font-bold tracking-tight">MILO couldn&apos;t load</h1>
        <p className="max-w-md text-sm text-text-secondary">
          Usually a hiccup talking to the chain or the public Blockscout API
          — it clears up on its own most of the time.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-2 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
