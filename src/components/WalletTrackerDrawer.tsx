"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { isAddress, getAddress } from "viem";
import TickerIcon from "./TickerIcon";
import { getWalletActivity, type WalletActivity } from "@/lib/predictBets";
import { formatEth, truncateAddress } from "@/lib/predictFormat";
import { STOCK_BY_TICKER } from "@/lib/registry";

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
const RECENTS_KEY = "rham-recent-wallets";
const MAX_RECENTS = 5;
const MAX_ROWS_SHOWN = 8;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(address: string) {
  try {
    const existing = loadRecents().filter((a) => a.toLowerCase() !== address.toLowerCase());
    const next = [address, ...existing].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode etc.) — not worth failing over
  }
}

export default function WalletTrackerDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [activity, setActivity] = useState<WalletActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    // localStorage/document.body aren't available during SSR — read/portal
    // only after mount, same pattern as TimeAgo's post-mount correction.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(loadRecents());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function lookup(raw: string) {
    const trimmed = raw.trim();
    if (!isAddress(trimmed)) {
      setError("Not a valid address.");
      return;
    }
    const checksummed = getAddress(trimmed);
    setError(null);
    setLoading(true);
    setAddress(checksummed);
    getWalletActivity(checksummed)
      .then((data) => {
        setActivity(data);
        saveRecent(checksummed);
        setRecents(loadRecents());
      })
      .catch(() => setError("Couldn't load that wallet right now — try again."))
      .finally(() => setLoading(false));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    lookup(input);
  }

  function reset() {
    setAddress(null);
    setActivity(null);
    setError(null);
    setInput("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="neo-btn px-3 py-1.5 text-xs text-white font-black rounded-lg"
      >
        <span className="hidden sm:inline">WALLET TRACKER</span>
        <span className="sm:hidden">TRACKER</span>
      </button>

      {mounted &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={() => setOpen(false)}
              className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-300 ${
                open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
            />

            {/* Panel */}
            <aside
              className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[#7a9900]/40 bg-[#120a26]/95 backdrop-blur-xl text-white shadow-2xl transition-transform duration-300 ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#7a9900]/40 bg-gradient-to-r from-[#ccff00]/30 via-[#7a9900]/30 to-[#f59e0b]/30 px-4 py-3">
                <p className="text-base font-black text-white">WALLET TRACKER</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="neo-btn bg-[#ea580c] px-2.5 py-0.5 text-xs text-white rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex items-center neo-input rounded-lg overflow-hidden">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                placeholder="0x… any Predict wallet"
                className="mono w-full bg-transparent px-3 py-2 text-xs font-bold text-white placeholder:text-[#ebff99] focus:outline-none"
              />
              <button
                type="submit"
                className="neo-btn px-4 py-2 text-xs font-black text-white"
              >
                TRACK
              </button>
            </div>
            {error && <p className="text-xs font-black text-[#ea580c] bg-[#ea580c]/15 p-2 rounded-lg border border-[#ea580c]/30">{error}</p>}
          </form>

          {recents.length > 0 && !address && (
            <div className="mt-5 flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase text-[#ebff99]">RECENTLY TRACKED</p>
              <div className="flex flex-wrap gap-2">
                {recents.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => lookup(a)}
                    className="mono neo-badge bg-[#170e2a] border-[#7a9900]/30 px-2.5 py-1 text-xs text-white hover:border-[#ccff00]"
                  >
                    {truncateAddress(a)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!address && (
            <p className="mt-6 text-center text-xs font-extrabold text-[#ebff99] leading-relaxed">
              Paste any wallet address to see every bet it&apos;s placed on
              Predict — read straight from the chain, no login needed.
            </p>
          )}

          {loading && <p className="mt-6 text-center text-sm font-black text-[#ccff00]">LOADING...</p>}

          {address && activity && !loading && (
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 border-b border-[#7a9900]/30 pb-2">
                <p className="mono truncate text-xs font-black text-white">{truncateAddress(address)}</p>
                <button type="button" onClick={reset} className="neo-badge bg-[#ea580c]/30 border-[#ea580c]/50 px-2 py-0.5 text-[10px] text-[#ea580c]">
                  CLEAR
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <DrawerStat label="Bets" value={String(activity.bets.length)} />
                <DrawerStat
                  label="Net"
                  value={`${activity.netWei > 0n ? "+" : ""}${formatEth(activity.netWei)}`}
                  tone={
                    activity.netWei > 0n ? "text-[#d4ff2a]" : activity.netWei < 0n ? "text-[#ea580c]" : "text-white"
                  }
                />
                <DrawerStat label="Staked" value={formatEth(activity.stakedWei)} />
                <DrawerStat label="Claimed" value={formatEth(activity.claimedWei)} />
              </div>

              {activity.bets.length === 0 ? (
                <p className="neo-box-sm p-4 text-center text-xs font-bold text-[#ebff99]">
                  No bets from this wallet yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activity.bets.slice(0, MAX_ROWS_SHOWN).map((b, i) => {
                    const stock = STOCK_BY_TICKER.get(b.ticker);
                    return (
                      <a
                        key={`${b.txHash}-${i}`}
                        href={`${EXPLORER}/tx/${b.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 neo-box-sm px-2.5 py-1.5 text-xs transition-all hover:bg-[#16240d]"
                      >
                        <TickerIcon ticker={b.ticker} icon={stock?.icon ?? null} size={18} />
                        <span className="min-w-0 flex-1 truncate font-black text-white">{b.ticker}</span>
                        <span
                          className={`shrink-0 neo-badge px-1.5 py-0.5 text-[10px] font-black rounded-full ${
                            b.up ? "bg-[#ccff00]/20 text-[#d4ff2a] border-[#ccff00]/40" : "bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/40"
                          }`}
                        >
                          {b.up ? "UP" : "DOWN"}
                        </span>
                        <span className="mono shrink-0 text-xs font-black text-white">{formatEth(b.amount)}</span>
                      </a>
                    );
                  })}
                  <p className="px-1 text-[11px] font-bold text-[#ebff99]">
                    {activity.bets.length > MAX_ROWS_SHOWN
                      ? `Showing ${MAX_ROWS_SHOWN} of ${activity.bets.length} — `
                      : ""}
                    market status on the{" "}
                    <Link
                      href={`/predict/wallet/${address}`}
                      onClick={() => setOpen(false)}
                      className="font-black text-[#ccff00] underline hover:text-[#f59e0b]"
                    >
                      full page →
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}
              </div>
            </aside>
          </>,
          document.body,
        )}
    </>
  );
}

function DrawerStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="neo-box-sm p-2.5">
      <p className="text-[10px] font-black uppercase text-[#ebff99]">{label}</p>
      <p className={`mono mt-0.5 text-sm font-black ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}
