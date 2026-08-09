// Aggregates the committed premium-history snapshots (see history.ts) into a
// ticker × day grid — each cell is that ticker's average premium % for that
// UTC day. Reuses the same data/premium-history/*.jsonl files, just grouped
// differently (by day per ticker instead of a single ticker's timeline).
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface HeatmapCell {
  ticker: string;
  date: string; // YYYY-MM-DD (UTC), matches the snapshot filename
  avgPremiumPct: number;
  samples: number;
}

export interface Heatmap {
  dates: string[]; // ascending, oldest first
  cells: Map<string, HeatmapCell>; // key: `${ticker}|${date}`
}

interface SnapshotLine {
  t: number;
  rows: { ticker: string; premiumPct: number }[];
}

const HISTORY_DIR = path.join(process.cwd(), "data/premium-history");

export function heatmapKey(ticker: string, date: string): string {
  return `${ticker}|${date}`;
}

/** Every ticker's daily-average premium over the last `days` committed snapshot files. */
export async function getPremiumHeatmap(days = 60): Promise<Heatmap> {
  let files: string[];
  try {
    files = await readdir(HISTORY_DIR);
  } catch {
    return { dates: [], cells: new Map() };
  }

  const dateFiles = files
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .slice(-days);

  const sums = new Map<string, { total: number; count: number }>();

  for (const file of dateFiles) {
    const date = file.replace(/\.jsonl$/, "");
    const text = await readFile(path.join(HISTORY_DIR, file), "utf8").catch(() => "");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let snap: SnapshotLine;
      try {
        snap = JSON.parse(line);
      } catch {
        continue;
      }
      for (const row of snap.rows) {
        const key = heatmapKey(row.ticker, date);
        const e = sums.get(key) ?? { total: 0, count: 0 };
        e.total += row.premiumPct;
        e.count += 1;
        sums.set(key, e);
      }
    }
  }

  const cells = new Map<string, HeatmapCell>();
  for (const [key, { total, count }] of sums) {
    const [ticker, date] = key.split("|");
    cells.set(key, { ticker, date, avgPremiumPct: total / count, samples: count });
  }

  return { dates: dateFiles.map((f) => f.replace(/\.jsonl$/, "")), cells };
}
