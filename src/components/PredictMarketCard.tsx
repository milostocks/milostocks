"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { GAP_MARKET_ADDRESS } from "@/lib/predictContracts";
import { GAPMARKET_ABI } from "@/lib/predictAbi";
import {
  formatCountdown,
  formatEth,
  formatFeedPrice,
  formatSessionWindow,
  isWeekendGapMarket,
} from "@/lib/predictFormat";

const STATE_LABEL = ["Open for bets", "Locked — awaiting resolution", "Resolved"] as const;
const STATE_DOT = ["bg-accent", "bg-warning", "bg-text-muted"] as const;
const OUTCOME_LABEL = ["", "UP", "DOWN", "PUSH"] as const;
const OUTCOME_TONE = ["", "text-accent", "text-danger", "text-text-secondary"] as const;

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Plain-serializable mirror of the on-chain Market struct — bigints as strings, since bigint can't cross the Server→Client Component prop boundary (silently fails to serialize). Produced by predictMarkets.ts. */
export interface InitialMarket {
  locksAt: number;
  resolvesAt: number;
  startPrice: string;
  endPrice: string;
  upPool: string;
  downPool: string;
  state: number;
  outcome: number;
}

interface MarketData {
  locksAt: number;
  resolvesAt: number;
  startPrice: bigint;
  endPrice: bigint;
  upPool: bigint;
  downPool: bigint;
  state: number;
  outcome: number;
}

function fromInitial(m: InitialMarket): MarketData {
  return {
    locksAt: m.locksAt,
    resolvesAt: m.resolvesAt,
    startPrice: BigInt(m.startPrice),
    endPrice: BigInt(m.endPrice),
    upPool: BigInt(m.upPool),
    downPool: BigInt(m.downPool),
    state: m.state,
    outcome: m.outcome,
  };
}

/**
 * `id` is a string, not bigint, for the same cross-boundary reason as `initial`.
 * `initial` (server-fetched) renders immediately; the wagmi read then takes
 * over once it resolves, so the market stays live without a loading flash.
 */
export default function PredictMarketCard({
  id: idStr,
  initial,
}: {
  id: string;
  initial?: InitialMarket;
}) {
  const id = BigInt(idStr);
  const now = useNow();
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("0.01");

  const { data: liveMarket, refetch: refetchMarket } = useReadContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    functionName: "markets",
    args: [id],
  });

  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    functionName: "claimableOf",
    args: address ? [id, address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: myUp, refetch: refetchUp } = useReadContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    functionName: "upBets",
    args: address ? [id, address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: myDown, refetch: refetchDown } = useReadContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    functionName: "downBets",
    args: address ? [id, address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed) return;
    refetchMarket();
    refetchClaimable();
    refetchUp();
    refetchDown();
  }, [isConfirmed, refetchMarket, refetchClaimable, refetchUp, refetchDown]);

  const market: MarketData | undefined = liveMarket
    ? {
        locksAt: Number(liveMarket[2]),
        resolvesAt: Number(liveMarket[3]),
        startPrice: liveMarket[4],
        endPrice: liveMarket[5],
        upPool: liveMarket[6],
        downPool: liveMarket[7],
        state: liveMarket[8],
        outcome: liveMarket[9],
      }
    : initial
      ? fromInitial(initial)
      : undefined;

  if (!market) return null;

  const { locksAt, resolvesAt, startPrice, endPrice, upPool, downPool, state, outcome } = market;
  const busy = isPending || isConfirming;

  const canBet = state === 0 && now < Number(locksAt);
  const canLock = state === 0 && now >= Number(locksAt);
  const canResolve = state === 1 && now >= Number(resolvesAt);
  const isResolved = state === 2;

  const totalPool = upPool + downPool;
  const upShare = totalPool > 0n ? Number((upPool * 10000n) / totalPool) / 100 : 50;
  const isWeekend = isWeekendGapMarket(locksAt, resolvesAt);

  function bet(up: boolean) {
    writeContract({
      address: GAP_MARKET_ADDRESS,
      abi: GAPMARKET_ABI,
      functionName: "placeBet",
      args: [id, up],
      value: parseEther(amount || "0"),
    });
  }

  return (
    <div className="neo-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`neo-badge px-3 py-1 text-xs font-black border-white/20 ${
              isWeekend ? "bg-gradient-to-r from-[#7a9900] to-[#f59e0b] text-white" : "bg-gradient-to-r from-[#ccff00] to-[#7a9900] text-white"
            }`}
          >
            {isWeekend ? "WEEKEND GAP" : "TRADING SESSION"}
          </span>
          <p className="mono text-sm font-black text-white">{formatSessionWindow(Number(locksAt), Number(resolvesAt))}</p>
        </div>
        <span className="neo-badge flex items-center gap-2 bg-[#0c1406] border-[#7a9900]/30 px-3 py-1 text-xs text-white">
          <span className={`h-2.5 w-2.5 border border-white/40 rounded-full ${STATE_DOT[state]}`} />
          {STATE_LABEL[state].toUpperCase()}
        </span>
      </div>

      {/* Pool split bar */}
      <div className="mt-5">
        <div className="flex h-3.5 overflow-hidden rounded-lg border border-white/20 bg-[#0a1204] shadow-inner">
          <div className="h-full bg-gradient-to-r from-[#ccff00] to-[#d4ff2a] transition-all" style={{ width: `${upShare}%` }} />
          <div className="h-full bg-gradient-to-r from-[#ea580c] to-[#f59e0b] transition-all" style={{ width: `${100 - upShare}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm font-black">
          <span className="mono text-[#d4ff2a] bg-[#0c1406] px-2 py-0.5 border border-[#ccff00]/40 rounded">{formatEth(upPool)} UP ({upShare.toFixed(0)}%)</span>
          <span className="mono text-[#ea580c] bg-[#0c1406] px-2 py-0.5 border border-[#ea580c]/40 rounded">{formatEth(downPool)} DOWN ({(100 - upShare).toFixed(0)}%)</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#7a9900]/30 pt-4 text-sm font-extrabold">
        <div className="bg-[#0c1406]/80 border border-[#7a9900]/30 p-3 rounded-lg shadow-sm">
          <p className="text-[10px] uppercase font-black tracking-wide text-[#ebff99]">
            {state === 0 ? "LOCKS IN" : "LOCKED AT"}
          </p>
          <p className="mono text-base font-black text-white mt-0.5">
            {state === 0 ? formatCountdown(Number(locksAt), now) : formatFeedPrice(startPrice)}
          </p>
        </div>
        <div className="bg-[#0c1406]/80 border border-[#7a9900]/30 p-3 rounded-lg shadow-sm">
          <p className="text-[10px] uppercase font-black tracking-wide text-[#ebff99]">
            {state < 2 ? "RESOLVES IN" : "OUTCOME"}
          </p>
          <p className={`mono text-base font-black mt-0.5 ${isResolved ? (outcome === 1 ? "text-[#d4ff2a]" : outcome === 2 ? "text-[#ea580c]" : "text-white") : "text-white"}`}>
            {state < 2 ? formatCountdown(Number(resolvesAt), now) : `${OUTCOME_LABEL[outcome]} (${formatFeedPrice(endPrice)})`}
          </p>
        </div>
      </div>

      {!isConnected && (
        <p className="mt-4 font-bold text-xs text-[#ebff99]">Connect a wallet above to bet or claim.</p>
      )}

      {isConnected && canBet && (
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
            <span className="px-2 text-xs font-black text-[#7a9900]">ETH</span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => bet(true)}
            className="neo-btn bg-[#ccff00] px-5 py-2 text-sm font-black text-white rounded-lg hover:brightness-110 disabled:opacity-50"
          >
            BET UP ▲
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => bet(false)}
            className="neo-btn bg-[#ea580c] px-5 py-2 text-sm font-black text-white rounded-lg hover:brightness-110 disabled:opacity-50"
          >
            BET DOWN ▼
          </button>
        </div>
      )}

      {isConnected && state === 0 && !canBet && (
        <p className="mt-4 text-xs font-bold text-[#ebff99]">
          Betting just closed for this session — locking now.
        </p>
      )}

      {isConnected && state === 1 && !canResolve && (
        <p className="mt-4 text-xs font-bold text-[#ebff99]">
          Locked, awaiting resolution — betting reopens automatically once
          the next session starts.
        </p>
      )}

      {isConnected && (Boolean(myUp) || Boolean(myDown)) && (
        <p className="mt-4 text-xs font-black text-white bg-[#0c1406] border border-[#7a9900]/40 px-3 py-1.5 inline-block rounded-lg">
          YOUR POSITION: <span className="mono text-[#d4ff2a]">{formatEth(myUp ?? 0n)} UP</span>
          {" · "}
          <span className="mono text-[#ea580c]">{formatEth(myDown ?? 0n)} DOWN</span>
        </p>
      )}

      {canLock && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            writeContract({ address: GAP_MARKET_ADDRESS, abi: GAPMARKET_ABI, functionName: "lockMarket", args: [id] })
          }
          className="mt-4 neo-btn bg-[#CCFF00] px-4 py-2 text-sm disabled:opacity-50"
        >
          LOCK MARKET (READS START PRICE)
        </button>
      )}

      {canResolve && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            writeContract({ address: GAP_MARKET_ADDRESS, abi: GAPMARKET_ABI, functionName: "resolveMarket", args: [id] })
          }
          className="mt-4 neo-btn bg-[#00e5ff] px-4 py-2 text-sm disabled:opacity-50"
        >
          RESOLVE MARKET (READS END PRICE)
        </button>
      )}

      {isResolved && isConnected && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={busy || !claimable}
            onClick={() =>
              writeContract({ address: GAP_MARKET_ADDRESS, abi: GAPMARKET_ABI, functionName: "claim", args: [id] })
            }
            className="neo-btn bg-[#CCFF00] px-5 py-2 text-sm disabled:opacity-50"
          >
            {claimable ? `CLAIM ${formatEth(claimable)}` : "NOTHING TO CLAIM"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs font-black text-red-600 bg-red-100 p-2 border border-black">{error.message.split("\n")[0]}</p>}
    </div>
  );
}
