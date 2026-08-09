"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { robinhoodTestnet } from "@/lib/chains";
import { truncateAddress } from "@/lib/predictFormat";

/**
 * Wallet picker. wagmi auto-discovers one connector per installed EIP-6963
 * wallet (MetaMask, Rabby, Phantom, ...) — the generic "injected" fallback
 * just points at window.ethereum, which whichever wallet wrote there last
 * "wins" (e.g. Phantom silently taking over a MetaMask+Rabby setup). With
 * more than one real wallet detected, hide that fallback and show a picker
 * instead so the user connects the one they actually want.
 */
export default function ConnectWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!isConnected) {
    const specific = connectors.filter((c) => c.id !== "injected");
    const options = specific.length > 0 ? specific : connectors;

    if (options.length === 0) {
      return (
        <button
          type="button"
          disabled
          className="neo-btn px-4 py-1.5 text-xs text-white opacity-50 rounded-lg"
        >
          No wallet found
        </button>
      );
    }

    if (options.length === 1) {
      return (
        <button
          type="button"
          onClick={() => connect({ connector: options[0] })}
          disabled={isPending}
          className="neo-btn px-4 py-1.5 text-xs font-black text-white disabled:opacity-50 rounded-lg"
        >
          {isPending ? "CONNECTING..." : "CONNECT WALLET"}
        </button>
      );
    }

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          disabled={isPending}
          className="neo-btn px-4 py-1.5 text-xs font-black text-white disabled:opacity-50 rounded-lg"
        >
          {isPending ? "CONNECTING..." : "CONNECT WALLET"}
        </button>
        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-[#7a9900]/40 bg-[#160d2b]/95 backdrop-blur-xl p-1.5 shadow-2xl">
              {options.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    connect({ connector: c });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-black text-white hover:bg-gradient-to-r hover:from-[#ccff00]/20 hover:to-[#f59e0b]/20 transition-colors border-b border-[#7a9900]/20 last:border-0"
                >
                  {c.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.icon} alt="" className="h-5 w-5 border border-white/20 rounded-md" />
                  )}
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (chainId !== robinhoodTestnet.id) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: robinhoodTestnet.id })}
        disabled={isSwitching}
        className="neo-btn bg-gradient-to-r from-[#ffb703] to-[#ea580c] px-4 py-1.5 text-xs font-black text-white rounded-lg disabled:opacity-50"
      >
        {isSwitching ? "SWITCHING..." : "SWITCH TO TESTNET"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => disconnect()}
      className="mono neo-btn px-4 py-1.5 text-xs font-black text-white rounded-lg border border-white/30"
    >
      {truncateAddress(address!)}
    </button>
  );
}
