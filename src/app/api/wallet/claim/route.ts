import { NextResponse } from "next/server";
import { claimWeeklyFEth, getOrCreateWalletId } from "@/lib/offchainWallet";

/** POST claims this week's free 0.1 fETH (plus any pending champion bonus) — rejects if already claimed this week. */
export async function POST() {
  const walletId = await getOrCreateWalletId();
  const result = await claimWeeklyFEth(walletId);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
