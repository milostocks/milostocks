// Live stock-token prices (what the tokens actually trade at on Robinhood
// Chain DEXes) via the public Blockscout API. Blockscout's `exchange_rate`
// tracks the token's onchain market price, which keeps moving 24/7 while the
// official Chainlink feed is frozen outside market hours — that spread is the
// whole product.

const BLOCKSCOUT = "https://robinhoodchain.blockscout.com/api/v2";

interface BlockscoutToken {
  address_hash: string;
  name: string | null;
  symbol: string | null;
  type: string;
  exchange_rate: string | null;
  volume_24h: string | null;
}

interface TokensPage {
  items: BlockscoutToken[];
  next_page_params: Record<string, string | number> | null;
}

export interface TokenQuote {
  /** USD price the token trades at right now */
  price: number;
  volume24h: number | null;
}

let lastQuotesCache = new Map<string, TokenQuote>();

/**
 * One paginated Blockscout search returns every official stock token with its
 * live price — far cheaper than 34 per-token requests. Keyed by token address
 * (lowercase).
 */
export async function getTokenQuotes(): Promise<Map<string, TokenQuote>> {
  try {
    const out = new Map<string, TokenQuote>();
    let extra = "";
    for (let page = 0; page < 10; page++) {
      const res = await fetch(
        `${BLOCKSCOUT}/tokens?q=Robinhood%20Token${extra}`,
        {
          next: { revalidate: 30 },
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!res.ok) break;
      const data: TokensPage = await res.json();
      for (const t of data.items) {
        if (!(t.name || "").includes("• Robinhood Token")) continue;
        const price = t.exchange_rate ? Number(t.exchange_rate) : NaN;
        if (!Number.isFinite(price) || price <= 0) continue;
        const key = t.address_hash.toLowerCase();
        if (out.has(key)) continue;
        out.set(key, {
          price,
          volume24h: t.volume_24h ? Number(t.volume_24h) : null,
        });
      }
      if (!data.next_page_params) break;
      extra = "&" + new URLSearchParams(
        Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)]),
      ).toString();
    }

    if (out.size > 0) {
      lastQuotesCache = out;
    }
    return out.size > 0 ? out : lastQuotesCache;
  } catch (err) {
    console.warn("[getTokenQuotes] Blockscout fetch error/timeout, using fallback cache:", err);
    return lastQuotesCache;
  }
}
