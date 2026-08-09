import { ImageResponse } from "next/og";
import { STOCK_BY_TICKER } from "@/lib/registry";
import { getPremiums } from "@/lib/premium";
import { getMarketStatus } from "@/lib/market";
import { formatPct, formatUsd } from "@/lib/format";

export const alt = "Implied Open premium";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// The Chainlink RPC call inside getPremiums() is an uncached POST — without
// this, the image route re-hits the public RPC on every single request
// (unlike the page, which caches via its own `revalidate` export).
export const revalidate = 30;

const BG = "#ffffff";
const BORDER = "#e5e5ea";
const TEXT_PRIMARY = "#1d1d1f";
const TEXT_SECONDARY = "#6e6e73";
const TEXT_MUTED = "#86868b";
const ACCENT = "#0071e3";
const DANGER = "#d70015";

export default async function Image({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const stock = STOCK_BY_TICKER.get(ticker.toUpperCase());
  const rows = stock ? await getPremiums().catch(() => []) : [];
  const row = rows.find((r) => r.stock.ticker === stock?.ticker);
  const market = getMarketStatus();

  const pct = row?.premiumPct ?? 0;
  const color =
    !row || Math.abs(pct) < 0.15
      ? TEXT_SECONDARY
      : pct > 0
        ? ACCENT
        : DANGER;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: ACCENT }}>
            Implied Open
          </div>
          <div style={{ display: "flex", fontSize: 22, color: TEXT_MUTED }}>
            {market.open ? "Market open" : `Market closed · ${market.label}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: TEXT_PRIMARY }}>
              {stock?.ticker ?? ticker.toUpperCase()}
            </div>
            <div style={{ display: "flex", fontSize: 32, color: TEXT_SECONDARY }}>
              {stock?.name ?? ""}
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 130, fontWeight: 800, color }}>
            {row ? formatPct(pct) : "–"}
          </div>

          <div style={{ display: "flex", fontSize: 26, color: TEXT_SECONDARY }}>
            {market.open
              ? "Premium vs official close"
              : "the onchain crowd's bet on where it opens next"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 18, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>
              Token price (24/7)
            </div>
            <div style={{ display: "flex", fontSize: 30, color: TEXT_PRIMARY, fontWeight: 600 }}>
              {row ? formatUsd(row.tokenPrice) : "–"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 18, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>
              Official close
            </div>
            <div style={{ display: "flex", fontSize: 30, color: TEXT_PRIMARY, fontWeight: 600 }}>
              {row ? formatUsd(row.official) : "–"}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
