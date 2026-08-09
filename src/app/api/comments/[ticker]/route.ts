import { NextResponse } from "next/server";
import { getComments, postComment } from "@/lib/comments";
import { getOrCreateWalletId } from "@/lib/offchainWallet";

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const comments = await getComments(ticker.toUpperCase());
  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const walletId = await getOrCreateWalletId();
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";

  const result = await postComment(ticker.toUpperCase(), walletId, text);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
