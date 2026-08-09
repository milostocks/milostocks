import { NextResponse } from "next/server";
import { getOrCreateWalletId, getWalletView } from "@/lib/offchainWallet";

/** GET returns (and lazily creates) the caller's internal-wallet view. Must be a Route Handler, not a Server Component read, since establishing a new wallet id sets a cookie. */
export async function GET() {
  const walletId = await getOrCreateWalletId();
  const view = await getWalletView(walletId);
  return NextResponse.json(view);
}
