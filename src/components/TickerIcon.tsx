"use client";

import { useState } from "react";

/** Stock logo from the Robinhood CDN, falling back to a ticker-letter badge. */
export default function TickerIcon({
  ticker,
  icon,
  size = 28,
}: {
  ticker: string;
  icon: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!icon || failed) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-bg-hover text-[10px] font-semibold text-text-secondary"
        style={{ width: size, height: size }}
      >
        {ticker.slice(0, 4)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-bg-hover"
      onError={() => setFailed(true)}
    />
  );
}
