import Link from "next/link";
import type { Metadata } from "next";
import CopyTokenAddress from "@/components/CopyTokenAddress";

export const metadata: Metadata = {
  title: "$MILO Token — Stock Vault",
  description: "Official $MILO Token overview, tokenomics, utility, and staking rewards for MILO Stock Vault.",
};

export default function TokenPage() {
  return (
    <div className="flex w-full flex-col gap-8">
      {/* Header Back Button */}
      <Link href="/" className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs text-[#ccff00] w-max hover:bg-[#ccff00]/40">
        ← BACK TO HOME
      </Link>

      {/* Hero Section */}
      <section className="neo-card flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-2.5 py-1 text-xs font-black text-[#ccff00]">
            ROBINHOOD CHAIN
          </span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          $MILO — The Engine Behind MILO Vault
        </h1>

        <p className="max-w-4xl text-sm font-semibold text-[#f5ffcc] leading-relaxed sm:text-base">
          $MILO is the native utility and governance token powering MILO Vault.
          It aligns incentives across 24/7 RWA stock premium tracking, pari-mutuel prediction markets,
          and weekly fETH leaderboard rewards on Robinhood Chain.
        </p>
      </section>

      {/* Key Metrics Grid */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="neo-box-sm p-5">
          <p className="text-xs font-black uppercase text-[#ebff99]">TOKEN SYMBOL</p>
          <p className="mono mt-1 text-2xl font-black text-[#ccff00]">$MILO</p>
        </div>
        <div className="neo-box-sm p-5">
          <p className="text-xs font-black uppercase text-[#ebff99]">TOTAL SUPPLY</p>
          <p className="mono mt-1 text-2xl font-black text-[#f59e0b]">1,000,000,000</p>
        </div>
        <div className="neo-box-sm p-5">
          <p className="text-xs font-black uppercase text-[#ebff99]">NETWORK</p>
          <p className="mono mt-1 text-2xl font-black text-[#7a9900]">Robinhood Chain</p>
        </div>
      </section>

      {/* Contract Address Section */}
      <section className="neo-card p-6 text-sm font-black text-white flex flex-col gap-4">
        <CopyTokenAddress initialAddress="0x0000000000000000000000000000000000000000" />
        <p className="font-semibold text-[#f5ffcc] leading-relaxed text-xs">
          $MILO official contract address on Robinhood Chain. Follow updates on X (<a href="https://x.com/milostocks" target="_blank" rel="noopener noreferrer" className="underline font-black text-[#ccff00] hover:text-[#f59e0b]">@milostocks</a>).
        </p>
      </section>
    </div>
  );
}
