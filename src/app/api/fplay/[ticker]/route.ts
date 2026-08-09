import { NextResponse } from "next/server";
import { getMarketView, getOrCreateWalletId, placeFEthBet } from "@/lib/offchainWallet";
import { PREDICTABLE_TICKERS } from "@/lib/predictContracts";

function isPredictable(ticker: string): boolean {
  return (PREDICTABLE_TICKERS as readonly string[]).includes(ticker);
}

/** GET returns the current fETH market for this ticker (lazily locking/resolving it if its window has passed) plus recent bets and the caller's own position. */
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await params;
  const ticker = raw.toUpperCase();
  if (!isPredictable(ticker)) {
    return NextResponse.json({ error: "no fETH market for this ticker" }, { status: 404 });
  }
  const walletId = await getOrCreateWalletId();
  const detail = await getMarketView(ticker, walletId);
  return NextResponse.json(detail);
}

/** POST { up: boolean, amount: string } places a bet from the caller's internal wallet balance — no signature, no gas, since there's no real chain transaction here. */
export async function POST(req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await params;
  const ticker = raw.toUpperCase();
  if (!isPredictable(ticker)) {
    return NextResponse.json({ error: "no fETH market for this ticker" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.up !== "boolean" || typeof body.amount !== "string") {
    return NextResponse.json({ ok: false, error: "expected { up: boolean, amount: string }" }, { status: 400 });
  }

  const walletId = await getOrCreateWalletId();
  const result = await placeFEthBet(ticker, walletId, body.up, body.amount);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
