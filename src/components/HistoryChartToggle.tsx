"use client";

import { useMemo, useState } from "react";
import type { HistoryPoint } from "@/lib/history";
import { bucketIntoCandles, CANDLE_INTERVALS } from "@/lib/candles";
import PremiumHistoryChart from "./PremiumHistoryChart";
import PremiumCandleChart from "./PremiumCandleChart";

type Mode = "line" | "candles";

/** Wraps the two chart styles behind a Line/Candles toggle, plus a candle-interval picker — client-only since it's local UI state, no new data fetch. */
export default function HistoryChartToggle({ points }: { points: HistoryPoint[] }) {
  const [mode, setMode] = useState<Mode>("line");
  const [intervalSeconds, setIntervalSeconds] = useState<number>(CANDLE_INTERVALS[0].seconds);

  const candles = useMemo(
    () => bucketIntoCandles(points, intervalSeconds),
    [points, intervalSeconds],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("line")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              mode === "line" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Line
          </button>
          <button
            type="button"
            onClick={() => setMode("candles")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              mode === "candles" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Candles
          </button>
        </div>
        {mode === "candles" && (
          <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs">
            {CANDLE_INTERVALS.map((i) => (
              <button
                key={i.label}
                type="button"
                onClick={() => setIntervalSeconds(i.seconds)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  intervalSeconds === i.seconds
                    ? "bg-bg-hover text-accent"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {mode === "line" ? (
        <PremiumHistoryChart points={points} />
      ) : (
        <PremiumCandleChart candles={candles} />
      )}
    </div>
  );
}
