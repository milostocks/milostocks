// Public, unauthenticated JSON API — no rate limiting or API key, deliberately:
// it's just a read of getPremiums() (already cached), meant for embedding /
// scripting against by anyone. Open CORS since there's nothing sensitive here.
import { NextResponse } from "next/server";
import { getPremiums } from "@/lib/premium";

export const revalidate = 30;

function serialize(rows: Awaited<ReturnType<typeof getPremiums>>) {
  return rows.map((r) => ({
    ticker: r.stock.ticker,
    name: r.stock.name,
    tokenPrice: r.tokenPrice,
    official: r.official,
    officialUpdatedAt: r.officialUpdatedAt,
    premiumPct: r.premiumPct,
    volume24h: r.volume24h,
    liquid: r.liquid,
  }));
}

export async function GET() {
  const rows = await getPremiums();
  return NextResponse.json(
    { updatedAt: Math.floor(Date.now() / 1000), stocks: serialize(rows) },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
