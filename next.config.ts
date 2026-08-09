import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Next 16's dev-only on-screen route indicator (bottom-left "N" badge) —
  // not shown in production builds, but distracting during dev/screenshots.
  devIndicators: false,
  // data/premium-history/*.jsonl is read at runtime via fs, not imported —
  // Next's static trace analysis won't pick it up on its own, so the stock
  // page's serverless bundle would silently be missing it on Vercel without
  // this. See CLAUDE.md §8.
  outputFileTracingIncludes: {
    "/": ["./data/premium-history/**/*"],
    "/stock/*": ["./data/premium-history/**/*"],
    "/heatmap": ["./data/premium-history/**/*"],
    "/watchlist": ["./data/premium-history/**/*"],
    "/compare": ["./data/premium-history/**/*"],
  },
};

export default nextConfig;
