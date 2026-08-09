"use client";

import { useEffect, useState } from "react";
import { formatChips, formatCountdown, formatSessionWindow } from "@/lib/predictFormat";
import { WALLET_UPDATED_EVENT, notifyWalletUpdated } from "@/lib/walletEvents";

const STATE_LABEL = ["Open for bets", "Locked — awaiting resolution", "Resolved"] as const;
const STATE_DOT = ["bg-accent", "bg-warning", "bg-text-muted"] as const;
const OUTCOME_LABEL = ["", "UP", "DOWN", "PUSH"] as const;
const OUTCOME_TONE = ["", "text-accent", "text-danger", "text-text-secondary"] as const;

/** Plain-serializable mirror of offchainWallet.ts's MarketView — kept as its own interface here (not imported from the server-only lib), same "Initial*" pattern PredictMarketCard uses for the on-chain Market struct. */
export interface FPlayMarketView {
  id: string;
  ticker: string;
  locksAt: number;
  resolvesAt: number;
  state: 0 | 1 | 2;
  startPrice: number | null;
  endPrice: number | null;
  outcome: 0 | 1 | 2 | 3;
  upPool: string;
  downPool: string;
}

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatUsdPrice(v: number | null): string {
  return v == null
    ? "–"
    : v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PoolBar({ upPool, downPool }: { upPool: string; downPool: string }) {
  const up = BigInt(upPool);
  const down = BigInt(downPool);
  const total = up + down;
  const upShare = total > 0n ? Number((up * 10000n) / total) / 100 : 50;
  return (
    <div className="mt-5">
      <div className="flex h-3.5 overflow-hidden rounded-lg border border-white/20 bg-[#0a1204] shadow-inner">
        <div className="h-full bg-gradient-to-r from-[#ccff00] to-[#d4ff2a] transition-all" style={{ width: `${upShare}%` }} />
        <div className="h-full bg-gradient-to-r from-[#ea580c] to-[#f59e0b] transition-all" style={{ width: `${100 - upShare}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-sm font-black">
        <span className="mono text-[#d4ff2a] bg-[#0c1406] px-2 py-0.5 border border-[#ccff00]/40 rounded">{formatChips(up)} UP ({upShare.toFixed(0)}%)</span>
        <span className="mono text-[#ea580c] bg-[#0c1406] px-2 py-0.5 border border-[#ea580c]/40 rounded">{formatChips(down)} DOWN ({(100 - upShare).toFixed(0)}%)</span>
      </div>
    </div>
  );
}

function CardHeader({ market }: { market: FPlayMarketView }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs text-[#ccff00] font-black">
          TRADING SESSION
        </span>
        <p className="mono text-sm font-black text-white">{formatSessionWindow(market.locksAt, market.resolvesAt)}</p>
      </div>
      <span className="neo-badge flex items-center gap-2 bg-[#0c1406] border-[#7a9900]/30 px-3 py-1 text-xs text-[#f5ffcc]">
        <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor] ${market.state === 0 ? "bg-[#d4ff2a] text-[#d4ff2a]" : market.state === 1 ? "bg-[#ffb703] text-[#ffb703]" : "bg-[#ebff99] text-[#ebff99]"}`} />
        {STATE_LABEL[market.state].toUpperCase()}
      </span>
    </div>
  );
}

function PriceRow({ market, now }: { market: FPlayMarketView; now: number }) {
  const isResolved = market.state === 2;
  return (
    <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#7a9900]/30 pt-4 text-sm font-extrabold">
      <div className="bg-[#0c1406]/80 border border-[#7a9900]/30 p-3 rounded-lg shadow-sm">
        <p className="text-[10px] uppercase font-black tracking-wide text-[#ebff99]">{market.state === 0 ? "LOCKS IN" : "LOCKED AT"}</p>
        <p className="mono text-base font-black text-white mt-0.5" suppressHydrationWarning>
          {market.state === 0 ? formatCountdown(market.locksAt, now) : formatUsdPrice(market.startPrice)}
        </p>
      </div>
      <div className="bg-[#0c1406]/80 border border-[#7a9900]/30 p-3 rounded-lg shadow-sm">
        <p className="text-[10px] uppercase font-black tracking-wide text-[#ebff99]">{market.state < 2 ? "RESOLVES IN" : "OUTCOME"}</p>
        <p className={`mono text-base font-black mt-0.5 ${isResolved ? (market.outcome === 1 ? "text-[#d4ff2a]" : market.outcome === 2 ? "text-[#ea580c]" : "text-white") : "text-white"}`} suppressHydrationWarning>
          {market.state < 2
            ? formatCountdown(market.resolvesAt, now)
            : `${OUTCOME_LABEL[market.outcome]} (${formatUsdPrice(market.endPrice)})`}
        </p>
      </div>
    </div>
  );
}

export function ResolvedFPlayMarket({ market }: { market: FPlayMarketView }) {
  return (
    <div className="neo-card p-6">
      <CardHeader market={market} />
      <PoolBar upPool={market.upPool} downPool={market.downPool} />
    </div>
  );
}

export default function PlayMarketCard({ ticker, initial }: { ticker: string; initial?: FPlayMarketView }) {
  const now = useNow();
  const [market, setMarket] = useState<FPlayMarketView | undefined>(initial);
  const [myPosition, setMyPosition] = useState<{ up: string; down: string }>({ up: "0", down: "0" });
  const [amount, setAmount] = useState("0.01");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/fplay/${ticker}`);
      const data = await res.json();
      setMarket(data.market);
      setMyPosition(data.myPosition);
    } catch {
      // keep showing the last known state
    }
  }

  function refreshBalance() {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((w) => setBalance(w.balance))
      .catch(() => {});
  }

  useEffect(() => {
    refresh();
    refreshBalance();
    window.addEventListener(WALLET_UPDATED_EVENT, refreshBalance);
    const id = setInterval(() => {
      refresh();
      refreshBalance();
    }, 10_000);
    return () => {
      window.removeEventListener(WALLET_UPDATED_EVENT, refreshBalance);
      clearInterval(id);
    };
  }, [ticker]);

  if (!market) return null;

  const canBet = market.state === 0 && now < market.locksAt;
  const hasNoFEth = balance !== null && BigInt(balance) === 0n;
  const hasPosition = BigInt(myPosition.up) > 0n || BigInt(myPosition.down) > 0n;

  async function bet(up: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/fplay/${ticker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ up, amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not place bet.");
      } else {
        setBalance(data.balance);
        notifyWalletUpdated();
      }
      await refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="neo-card p-6">
      <CardHeader market={market} />
      <PoolBar upPool={market.upPool} downPool={market.downPool} />
      <PriceRow market={market} now={now} />

      {balance !== null && (
        <p className="mt-4 text-xs font-black text-white">
          YOUR fETH BALANCE: <span className="mono bg-gradient-to-r from-[#ccff00]/30 to-[#f59e0b]/30 px-2 py-0.5 border border-[#ccff00]/40 rounded text-[#ccff00]">{formatChips(BigInt(balance))}</span>
        </p>
      )}

      {hasNoFEth && canBet && (
        <p className="mt-3 text-xs font-black text-white bg-[#ffb703]/20 border border-[#ffb703]/40 p-2.5 rounded-lg">
          No fETH left — claim this week&apos;s free fETH above to keep playing.
        </p>
      )}

      {canBet && !hasNoFEth && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center neo-input px-2 py-1 rounded-lg">
            <input
              type="number"
              min="0"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24 bg-transparent px-2 py-1 text-sm font-black text-white focus:outline-none"
            />
            <span className="px-2 text-xs font-black text-[#7a9900]">fETH</span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => bet(true)}
            className="neo-btn bg-gradient-to-r from-[#ccff00] to-[#d4ff2a] px-5 py-2 text-sm text-white hover:brightness-110 disabled:opacity-50 rounded-lg shadow-[0_0_12px_rgba(0,198,255,0.3)]"
          >
            BET UP ▲
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => bet(false)}
            className="neo-btn bg-gradient-to-r from-[#ea580c] to-[#f59e0b] px-5 py-2 text-sm text-white hover:brightness-110 disabled:opacity-50 rounded-lg shadow-[0_0_12px_rgba(247,37,133,0.3)]"
          >
            BET DOWN ▼
          </button>
        </div>
      )}

      {!canBet && market.state === 0 && (
        <p className="mt-4 text-xs font-bold text-[#ebff99]">Betting just closed for this session — locking now.</p>
      )}

      {market.state === 1 && (
        <p className="mt-4 text-xs font-bold text-[#ebff99]">
          Locked, awaiting resolution — betting reopens automatically once
          the next session starts.
        </p>
      )}

      {hasPosition && (
        <p className="mt-4 text-xs font-black text-white bg-[#0c1406] border border-[#7a9900]/40 px-3 py-1.5 inline-block rounded-lg">
          YOUR POSITION: <span className="mono text-[#d4ff2a]">{formatChips(BigInt(myPosition.up))} UP</span>
          {" · "}
          <span className="mono text-[#ea580c]">{formatChips(BigInt(myPosition.down))} DOWN</span>
        </p>
      )}

      {market.state === 2 && hasPosition && (
        <p className="mt-3 text-xs font-bold text-[#ebff99]">
          Resolved — any winnings were credited to your internal wallet automatically.
        </p>
      )}

      {error && <p className="mt-3 text-xs font-black text-[#ea580c] bg-[#ea580c]/15 p-2.5 rounded-lg border border-[#ea580c]/30">{error}</p>}
    </div>
  );
}
