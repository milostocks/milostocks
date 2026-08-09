// Minimal JSON-RPC client for Robinhood Chain mainnet.

export const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

/** AggregatorV3Interface.latestRoundData() selector */
const LATEST_ROUND_DATA = "0xfeaf968c";

export interface FeedReading {
  /** USD price (feed answer / 1e8) */
  price: number;
  /** Unix seconds the feed last updated — frozen at close while market is shut */
  updatedAt: number;
}

let lastFeedsCache = new Map<string, FeedReading>();

/**
 * Reads latestRoundData() from many Chainlink feed proxies in a single
 * batched JSON-RPC request. Returns readings keyed by feed address
 * (lowercase); feeds that revert are omitted.
 */
export async function readFeeds(
  feeds: string[],
): Promise<Map<string, FeedReading>> {
  try {
    const batch = feeds.map((feed, id) => ({
      jsonrpc: "2.0",
      id,
      method: "eth_call",
      params: [{ to: feed, data: LATEST_ROUND_DATA }, "latest"],
    }));

    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`[readFeeds] RPC status ${res.status}, using fallback cache.`);
      return lastFeedsCache;
    }

    const results: { id: number; result?: string }[] = await res.json();
    const out = new Map<string, FeedReading>();
    for (const r of results) {
      const hex = r.result;
      if (!hex || hex.length < 2 + 64 * 5) continue;
      const body = hex.slice(2);
      const answer = BigInt("0x" + body.slice(64, 128));
      const updatedAt = Number(BigInt("0x" + body.slice(192, 256)));
      if (answer <= 0n) continue;
      out.set(feeds[r.id].toLowerCase(), {
        price: Number(answer) / 1e8,
        updatedAt,
      });
    }

    if (out.size > 0) {
      lastFeedsCache = out;
    }
    return out.size > 0 ? out : lastFeedsCache;
  } catch (err) {
    console.warn("[readFeeds] Network/timeout error, using fallback cache:", err);
    return lastFeedsCache;
  }
}
