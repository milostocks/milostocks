import { NextResponse } from "next/server";
import { getPremiums } from "@/lib/premium";

export const revalidate = 30;

const CORS = { "Access-Control-Allow-Origin": "*" };

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const rows = await getPremiums();
  const row = rows.find((r) => r.stock.ticker === ticker.toUpperCase());

  if (!row) {
    return NextResponse.json({ error: "unknown or unpriced ticker" }, { status: 404, headers: CORS });
  }

  return NextResponse.json(
    {
      ticker: row.stock.ticker,
      name: row.stock.name,
      tokenPrice: row.tokenPrice,
      official: row.official,
      officialUpdatedAt: row.officialUpdatedAt,
      premiumPct: row.premiumPct,
      volume24h: row.volume24h,
      liquid: row.liquid,
      updatedAt: Math.floor(Date.now() / 1000),
    },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS" },
  });
}
