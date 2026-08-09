"use client";

import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { formatChips, truncateAddress } from "@/lib/predictFormat";
import { WALLET_UPDATED_EVENT, notifyWalletUpdated } from "@/lib/walletEvents";

const WEEKLY_FETH = parseEther("0.1");

interface WalletState {
  id: string;
  address: string;
  balance: string;
  claimedThisWeek: boolean;
  nextResetAt: number;
  pendingBonus: string;
}

function formatTimeLeft(seconds: number): string {
  const s = Math.max(0, seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Claims this week's free 0.1 fETH allowance from the caller's off-chain
 * internal wallet — no MetaMask/wallet-connect needed. Identity + one-claim-
 * per-week are enforced server-side via an httpOnly cookie, see
 * lib/offchainWallet.ts. Resets (not adds) each week, same weekly-reset
 * design as the original on-chain PlayMarket.
 */
export default function ClaimChipsButton() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refreshWallet() {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then(setWallet)
      .catch(() => {});
  }

  useEffect(() => {
    refreshWallet();
    window.addEventListener(WALLET_UPDATED_EVENT, refreshWallet);
    return () => window.removeEventListener(WALLET_UPDATED_EVENT, refreshWallet);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(id);
  }, []);

  async function claim() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/claim", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.alreadyClaimed ? "Already claimed this week." : "Could not claim right now.");
      }
      const fresh = await fetch("/api/wallet").then((r) => r.json());
      setWallet(fresh);
      notifyWalletUpdated();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return (
      <div className="neo-card p-4 text-sm font-bold text-[#ebff99]">
        Setting up your internal wallet…
      </div>
    );
  }

  const hasBonus = wallet.pendingBonus !== "0";

  return (
    <div className="neo-card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-xs uppercase font-black tracking-wide text-[#ebff99]">Your internal wallet</p>
        <p className="mono text-xs font-bold text-[#ebff99]">{truncateAddress(wallet.address)}</p>
        <p className="mono mt-1 text-2xl font-black text-white">{formatChips(BigInt(wallet.balance))}</p>
      </div>
      {wallet.claimedThisWeek ? (
        <div className="text-right text-xs font-bold text-[#ebff99]">
          <p>Already claimed this week</p>
          <p className="text-[#ccff00]">Resets in {formatTimeLeft(wallet.nextResetAt - now)}</p>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={claim}
            className="neo-btn bg-gradient-to-r from-[#ccff00] via-[#7a9900] to-[#f59e0b] px-5 py-2 text-xs font-black text-white rounded-lg shadow-[0_0_12px_rgba(247,37,133,0.4)] hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Claiming…" : `Claim ${hasBonus ? formatChips(BigInt(wallet.pendingBonus) + WEEKLY_FETH) : "0.1 fETH"}`}
          </button>
          {hasBonus && (
            <p className="text-[10px] font-black text-[#ccff00]">includes last week&apos;s champion bonus</p>
          )}
        </div>
      )}
      {error && <p className="w-full text-xs font-black text-[#ea580c] bg-[#ea580c]/15 p-2 rounded-lg border border-[#ea580c]/30">{error}</p>}
    </div>
  );
}
