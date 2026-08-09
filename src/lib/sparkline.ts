// Every ticker's recent premium timeline, for the inline sparkline column in
// PremiumTable — same committed *.jsonl snapshot files as history.ts and
// heatmap.ts, just grouped per ticker as a raw timeline instead of one
// ticker's timeline (history.ts) or a daily average (heatmap.ts).
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface SparkPoint {
  t: number;
  premiumPct: number;
}

interface SnapshotLine {
  t: number;
  rows: { ticker: string; premiumPct: number }[];
}

const HISTORY_DIR = path.join(process.cwd(), "data/premium-history");

/** ticker -> chronological premium points over the last `days` days of committed snapshots. */
export async function getSparklines(days = 3): Promise<Record<string, SparkPoint[]>> {
  let files: string[];
  try {
    files = await readdir(HISTORY_DIR);
  } catch {
    return {};
  }

  const recentFiles = files.filter((f) => f.endsWith(".jsonl")).sort().slice(-days);
  const byTicker: Record<string, SparkPoint[]> = {};

  for (const file of recentFiles) {
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
        (byTicker[row.ticker] ??= []).push({ t: snap.t, premiumPct: row.premiumPct });
      }
    }
  }

  for (const points of Object.values(byTicker)) {
    points.sort((a, b) => a.t - b.t);
  }

  return byTicker;
}
