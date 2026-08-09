import Link from "next/link";
import { notFound } from "next/navigation";
import { isAddress, getAddress } from "viem";
import BetHistoryTable from "@/components/BetHistoryTable";
import { getWalletActivity } from "@/lib/predictBets";
import { formatEth, truncateAddress } from "@/lib/predictFormat";

export const revalidate = 30;

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return { title: `${truncateAddress(address)} — Predict — Implied Open` };
}

export default async function WalletPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: raw } = await params;
  if (!isAddress(raw)) notFound();
  const address = getAddress(raw);

  const activity = await getWalletActivity(address).catch(() => null);
  if (!activity) notFound();

  const { bets, stakedWei, claimedWei, netWei } = activity;

  return (
    <div className="flex w-full flex-col gap-8">
      <Link href="/predict/leaderboard" className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs text-[#ccff00] w-max hover:bg-[#ccff00]/40">
        ← BACK TO LEADERBOARD
      </Link>

      <div className="neo-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-2.5 py-1 text-xs font-black text-[#ccff00]">WALLET ADDRESS</span>
          <h1 className="mono text-base font-black text-white mt-2 sm:text-lg break-all">{address}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/portfolio/${address}`}
            className="neo-btn px-3 py-1.5 text-xs text-white"
          >
            VIEW PORTFOLIO →
          </Link>
          <a
            href={`${EXPLORER}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="neo-btn px-3 py-1.5 text-xs text-white rounded-lg"
          >
            VIEW ON BLOCKSCOUT ↗
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Bets placed" value={String(bets.length)} />
        <Stat label="Staked" value={formatEth(stakedWei)} />
        <Stat label="Claimed" value={formatEth(claimedWei)} />
        <Stat
          label="Net"
          value={`${netWei > 0n ? "+" : ""}${formatEth(netWei)}`}
          tone={netWei > 0n ? "text-[#d4ff2a]" : netWei < 0n ? "text-[#ea580c]" : "text-white"}
        />
      </div>

      <BetHistoryTable bets={bets} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="neo-box-sm p-4">
      <p className="text-xs font-black uppercase text-[#ebff99]">{label}</p>
      <p className={`mono mt-1 text-lg font-black ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}
