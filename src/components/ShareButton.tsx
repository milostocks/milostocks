"use client";

interface ShareButtonProps {
  ticker: string;
  name: string;
  premiumPct: number;
  marketOpen: boolean;
}

function buildTweetText({ ticker, name, premiumPct, marketOpen }: ShareButtonProps): string {
  const pct = `${premiumPct >= 0 ? "+" : ""}${premiumPct.toFixed(2)}%`;
  if (!marketOpen) {
    return `Markets are closed, but ${name} (${ticker}) is already trading at ${pct} on Robinhood Chain — the onchain crowd's bet on the next open.`;
  }
  return `${name} (${ticker}) is trading at ${pct} vs its official close on Robinhood Chain — stock tokens, 24/7.`;
}

/** Opens a prefilled X (Twitter) compose window — the user still has to hit Tweet themselves. */
export default function ShareButton(props: ShareButtonProps) {
  const handleShare = () => {
    const text = buildTweetText(props);
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=600,height=420");
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-2 self-start rounded-lg border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7.2l-5.6-6.9L4 22H1l8.2-9.3L1 2h7.4l5 6.2L18.9 2Zm-1.3 18h1.9L7.5 4H5.4l12.2 16Z" />
      </svg>
      Share on X
    </button>
  );
}
