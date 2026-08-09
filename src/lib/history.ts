// Reads the JSONL snapshots that .github/workflows/snapshot-premiums.yml
// commits to data/premium-history/. Server-only (node:fs) — see next.config.ts
// for why /stock/* needs outputFileTracingIncludes to ship these files on Vercel.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface HistoryPoint {
  /** Unix seconds */
  t: number;
  premiumPct: number;
  tokenPrice: number;
  official: number;
}

interface SnapshotLine {
  t: number;
  rows: { ticker: string; premiumPct: number; tokenPrice: number; official: number }[];
}

const HISTORY_DIR = path.join(process.cwd(), "data/premium-history");

/** Every snapshot for one ticker from the last `days` days of committed history. */
export async function getPremiumHistory(
  ticker: string,
  days = 4,
): Promise<HistoryPoint[]> {
  let files: string[];
  try {
    files = await readdir(HISTORY_DIR);
  } catch {
    return []; // no history yet — first workflow run hasn't landed
  }

  const cutoff = Date.now() / 1000 - days * 86400;
  // +1 file of slack so a UTC day boundary doesn't clip the start of the window.
  const recentFiles = files
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .slice(-(days + 1));

  const points: HistoryPoint[] = [];
  for (const file of recentFiles) {
    const text = await readFile(path.join(HISTORY_DIR, file), "utf8").catch(
      () => "",
    );
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let snap: SnapshotLine;
      try {
        snap = JSON.parse(line);
      } catch {
        continue; // a partially-written line from a crashed run, skip it
      }
      if (snap.t < cutoff) continue;
      const row = snap.rows.find((r) => r.ticker === ticker);
      if (row) {
        points.push({
          t: snap.t,
          premiumPct: row.premiumPct,
          tokenPrice: row.tokenPrice,
          official: row.official,
        });
      }
    }
  }
  points.sort((a, b) => a.t - b.t);
  return points;
}
