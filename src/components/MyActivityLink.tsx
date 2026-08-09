"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

/** Shows a link to the connected wallet's own tracker page — nothing when disconnected. */
export default function MyActivityLink() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) return null;

  return (
    <Link href={`/predict/wallet/${address}`} className="text-sm text-text-secondary transition-colors hover:text-accent">
      My bets →
    </Link>
  );
}
