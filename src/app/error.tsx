"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-segment error boundary — catches uncaught exceptions from any page
 * under app/ (e.g. a transient Blockscout/RPC failure that exhausts bsFetch's
 * retries) and shows a themed retry UI instead of falling through to Next's
 * generic black "This page couldn't load" screen. Doesn't cover the root
 * layout itself — see global-error.tsx for that.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-danger">
        Something went wrong
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">
        This page couldn&apos;t load
      </h1>
      <p className="max-w-md text-sm text-text-secondary">
        Usually a hiccup talking to the chain or the public Blockscout API —
        it clears up on its own most of the time.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          Back home
        </Link>
      </div>
      {error.digest && (
        <p className="mono mt-1 text-[11px] text-text-muted">Error {error.digest}</p>
      )}
    </div>
  );
}
