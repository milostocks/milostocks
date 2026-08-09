// A bare, iframe-able HTML card for a single ticker's live premium — no React
// tree, no root layout (a Route Handler skips both entirely), just a small
// self-contained document so this can sit on someone else's site. Styling is
// inlined rather than pulled from globals.css since Tailwind's compiled CSS
// isn't available outside the Next page render pipeline.
import { getPremiums } from "@/lib/premium";
import { STOCK_BY_TICKER } from "@/lib/registry";
import { formatPct, formatUsd } from "@/lib/format";

export const revalidate = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://milostocks.com";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await params;
  const ticker = raw.toUpperCase();
  const stock = STOCK_BY_TICKER.get(ticker);

  if (!stock) {
    return new Response(notFoundHtml(ticker), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const rows = await getPremiums().catch(() => []);
  const row = rows.find((r) => r.stock.ticker === ticker);

  return new Response(cardHtml(stock, row), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function cardHtml(
  stock: { ticker: string; name: string; icon: string | null },
  row: Awaited<ReturnType<typeof getPremiums>>[number] | undefined,
): string {
  const pct = row ? row.premiumPct : null;
  const color = pct == null ? "#6e6e73" : pct >= 0 ? "#0071e3" : "#d70015";
  const pctText = pct == null ? "No data" : formatPct(pct);
  const priceLine = row
    ? `${escapeHtml(formatUsd(row.tokenPrice))} vs official ${escapeHtml(formatUsd(row.official))}`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  body { font-family: system-ui, -apple-system, sans-serif; }
  a { text-decoration: none; }
  .card {
    display: flex; flex-direction: column; gap: 8px;
    width: 280px; padding: 14px 16px; border-radius: 22px;
    background: #ffffff; border: 1px solid #e5e5ea; color: #1d1d1f;
  }
  .row { display: flex; align-items: center; gap: 8px; }
  .icon { width: 24px; height: 24px; border-radius: 999px; background: #f5f5f7; }
  .ticker { font-weight: 700; font-size: 14px; }
  .name { font-size: 11px; color: #86868b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pct { font-family: ui-monospace, monospace; font-size: 26px; font-weight: 700; color: ${color}; }
  .price { font-family: ui-monospace, monospace; font-size: 11px; color: #6e6e73; }
  .brand { font-size: 10px; color: #86868b; }
  .brand b { color: #0071e3; }
</style></head>
<body>
  <a class="card" href="${SITE_URL}/stock/${stock.ticker}" target="_blank" rel="noopener noreferrer">
    <div class="row">
      ${stock.icon ? `<img class="icon" src="${escapeHtml(stock.icon)}" alt="" onerror="this.style.display='none'">` : ""}
      <div>
        <div class="ticker">${escapeHtml(stock.ticker)}</div>
        <div class="name">${escapeHtml(stock.name)}</div>
      </div>
    </div>
    <div class="pct">${pctText}</div>
    <div class="price">${priceLine}</div>
    <div class="brand">via <b>MILO</b> — Implied Open</div>
  </a>
</body></html>`;
}

function notFoundHtml(ticker: string): string {
  return `<!doctype html><html><body style="margin:0;padding:14px;font-family:system-ui,sans-serif;background:#ffffff;color:#6e6e73;font-size:12px;border:1px solid #e5e5ea;border-radius:22px;">Unknown ticker: ${escapeHtml(ticker)}</body></html>`;
}
