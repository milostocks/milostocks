"use client";

import { useState, type ReactNode } from "react";

/**
 * Switches between the real-money (GapMarket) and fETH (off-chain) sections
 * of a ticker's Predict page. Both sections are pre-rendered by the server
 * (data-fetched there) and just passed in as children — this component only
 * toggles which one is visible, no data of its own. Defaults to fETH: it
 * needs no wallet, so it's the tab most first-time visitors can actually use
 * — defaulting to "real" buried the no-wallet-needed option behind an extra
 * click that people were missing entirely.
 */
export default function RealPlayTabs({ real, play }: { real: ReactNode; play: ReactNode }) {
  const [tab, setTab] = useState<"real" | "play">("play");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 self-start">
        <button
          type="button"
          onClick={() => setTab("real")}
          className={`neo-badge cursor-pointer px-4 py-1.5 text-xs font-black transition-all rounded-lg ${
            tab === "real" ? "bg-gradient-to-r from-[#ccff00] to-[#7a9900] text-white border-white/30" : "bg-[#0c1406] text-[#f5ffcc] border-[#7a9900]/30 hover:bg-[#1f113a]"
          }`}
        >
          ETH (REAL)
        </button>
        <button
          type="button"
          onClick={() => setTab("play")}
          className={`neo-badge cursor-pointer px-4 py-1.5 text-xs font-black transition-all rounded-lg ${
            tab === "play" ? "bg-gradient-to-r from-[#7a9900] to-[#f59e0b] text-white border-white/30" : "bg-[#0c1406] text-[#f5ffcc] border-[#7a9900]/30 hover:bg-[#1f113a]"
          }`}
        >
          fETH (FREE)
        </button>
      </div>

      {/* Unmounted, not just hidden, when inactive — the wagmi hooks inside
          each tab (polling reads, RecentBets' interval) shouldn't run for a
          tab nobody's looking at. */}
      {tab === "real" && <div className="flex flex-col gap-6">{real}</div>}
      {tab === "play" && <div className="flex flex-col gap-6">{play}</div>}
    </div>
  );
}
