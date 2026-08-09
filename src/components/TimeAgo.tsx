"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

/**
 * `timeAgo()` depends on the current clock, so a server-rendered value and
 * the client's first render differ (seconds have passed in between) — React
 * flags that as a hydration mismatch. Render the server value first, then
 * correct on mount and keep it live; suppressHydrationWarning covers the
 * one-tick gap between the two.
 */
export default function TimeAgo({ unixSeconds }: { unixSeconds: number }) {
  const [text, setText] = useState(() => timeAgo(unixSeconds));

  useEffect(() => {
    // Corrects the server-rendered value immediately on mount (the client's
    // clock has moved on since the server render), then keeps it live.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(timeAgo(unixSeconds));
    const id = setInterval(() => setText(timeAgo(unixSeconds)), 30_000);
    return () => clearInterval(id);
  }, [unixSeconds]);

  return <span suppressHydrationWarning>{text}</span>;
}
