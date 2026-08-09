// Appends one premium snapshot line to data/premium-history/<UTC-date>.jsonl.
// Run standalone (no Next.js runtime) — invoked on a schedule by
// .github/workflows/snapshot-premiums.yml. Duplicates the fetch logic in
// src/lib/chain.ts + src/lib/prices.ts rather than importing them, because
// those are .ts files using Next-specific `fetch(..., { next: { revalidate }})`
// options this plain Node script doesn't need. Stock list comes from
// src/lib/registry.json (the plain-data mirror gen-registry.mjs writes
// alongside registry.ts — see that script for why).
import { readFileSync, mkdirSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT = "https://robinhoodchain.blockscout.com/api/v2";
const LATEST_ROUND_DATA = "0xfeaf968c";
const LIQUIDITY_FLOOR_USD = 1000;

const STOCKS = JSON.parse(
  readFileSync(join(ROOT, "src/lib/registry.json"), "utf8"),
);

async function readFeeds(feeds) {
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
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const results = await res.json();

  const out = new Map();
  for (const r of results) {
    const hex = r.result;
    if (!hex || hex.length < 2 + 64 * 5) continue;
    const body = hex.slice(2);
    const answer = BigInt("0x" + body.slice(64, 128));
    if (answer <= 0n) continue;
    out.set(feeds[r.id].toLowerCase(), Number(answer) / 1e8);
  }
  return out;
}

async function getTokenQuotes() {
  const out = new Map();
  let extra = "";
  for (let page = 0; page < 10; page++) {
    const res = await fetch(`${BLOCKSCOUT}/tokens?q=Robinhood%20Token${extra}`);
    if (!res.ok) break;
    const data = await res.json();
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
    extra =
      "&" +
      new URLSearchParams(
        Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)]),
      ).toString();
  }
  return out;
}

const [officials, quotes] = await Promise.all([
  readFeeds(STOCKS.map((s) => s.feed)),
  getTokenQuotes(),
]);

const rows = [];
for (const stock of STOCKS) {
  const official = officials.get(stock.feed.toLowerCase());
  const quote = quotes.get(stock.token.toLowerCase());
  if (official == null || !quote) continue;
  if ((quote.volume24h ?? 0) < LIQUIDITY_FLOOR_USD) continue; // same liquidity floor as the live dashboard
  rows.push({
    ticker: stock.ticker,
    premiumPct:
      Math.round(((quote.price - official) / official) * 100 * 100) / 100,
    tokenPrice: quote.price,
    official,
  });
}

const snapshot = { t: Math.floor(Date.now() / 1000), rows };
const date = new Date().toISOString().slice(0, 10); // UTC date
const dir = join(ROOT, "data/premium-history");
mkdirSync(dir, { recursive: true });
appendFileSync(join(dir, `${date}.jsonl`), JSON.stringify(snapshot) + "\n");

console.log(`snapshot: ${rows.length}/${STOCKS.length} stocks -> data/premium-history/${date}.jsonl`);
