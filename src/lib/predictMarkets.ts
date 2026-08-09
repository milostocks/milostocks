// Server-side reads of GapMarket — no wallet needed, just a public RPC call.
// Used by /predict (index) and /predict/[ticker] for the initial fast paint;
// client components re-read live via wagmi once a wallet is connected.
import { createPublicClient, http } from "viem";
import { robinhoodTestnet } from "./chains";
import { GAP_MARKET_ADDRESS, PLAY_MARKET_ADDRESS } from "./predictContracts";
import { GAPMARKET_ABI, PLAYMARKET_ABI } from "./predictAbi";
import { tickerFromBytes32 } from "./predictFormat";
import type { InitialMarket } from "@/components/PredictMarketCard";

const client = createPublicClient({ chain: robinhoodTestnet, transport: http() });

export interface MarketInfo {
  id: bigint;
  ticker: string;
  feed: `0x${string}`;
  locksAt: number;
  resolvesAt: number;
  startPrice: bigint;
  endPrice: bigint;
  upPool: bigint;
  downPool: bigint;
  state: number;
  outcome: number;
}

export async function getAllMarkets(): Promise<MarketInfo[]> {
  const count = await client.readContract({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    functionName: "marketCount",
  });

  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i));
  const markets = await Promise.all(
    ids.map((id) =>
      client.readContract({
        address: GAP_MARKET_ADDRESS,
        abi: GAPMARKET_ABI,
        functionName: "markets",
        args: [id],
      }),
    ),
  );

  return markets.map((m, i) => ({
    id: ids[i],
    ticker: tickerFromBytes32(m[0]),
    feed: m[1],
    locksAt: Number(m[2]),
    resolvesAt: Number(m[3]),
    startPrice: m[4],
    endPrice: m[5],
    upPool: m[6],
    downPool: m[7],
    state: m[8],
    outcome: m[9],
  }));
}

/** Serializable mirror for passing across the Server→Client Component boundary — see PredictMarketCard. */
export function toInitialMarket(m: MarketInfo): InitialMarket {
  return {
    locksAt: m.locksAt,
    resolvesAt: m.resolvesAt,
    startPrice: m.startPrice.toString(),
    endPrice: m.endPrice.toString(),
    upPool: m.upPool.toString(),
    downPool: m.downPool.toString(),
    state: m.state,
    outcome: m.outcome,
  };
}

/** Latest (highest-id) market per ticker. */
export async function getLatestMarketPerTicker(): Promise<MarketInfo[]> {
  const markets = await getAllMarkets();
  const latest = new Map<string, MarketInfo>();
  for (const m of markets) {
    const prev = latest.get(m.ticker);
    if (!prev || m.id > prev.id) latest.set(m.ticker, m);
  }
  return [...latest.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/**
 * PlayMarket equivalents of the two functions above — same Market struct
 * shape, different contract (chips, not ETH). Duplicated rather than
 * parametrized: the two contracts' ABIs are distinct literal types, and
 * this project prefers duplication over fighting generic ABI inference for
 * a two-contract case (same reasoning as scripts/create-play-markets.ts).
 */
export async function getAllPlayMarkets(): Promise<MarketInfo[]> {
  const count = await client.readContract({
    address: PLAY_MARKET_ADDRESS,
    abi: PLAYMARKET_ABI,
    functionName: "marketCount",
  });

  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i));
  const markets = await Promise.all(
    ids.map((id) =>
      client.readContract({
        address: PLAY_MARKET_ADDRESS,
        abi: PLAYMARKET_ABI,
        functionName: "markets",
        args: [id],
      }),
    ),
  );

  return markets.map((m, i) => ({
    id: ids[i],
    ticker: tickerFromBytes32(m[0]),
    feed: m[1],
    locksAt: Number(m[2]),
    resolvesAt: Number(m[3]),
    startPrice: m[4],
    endPrice: m[5],
    upPool: m[6],
    downPool: m[7],
    state: m[8],
    outcome: m[9],
  }));
}

export async function getLatestPlayMarketPerTicker(): Promise<MarketInfo[]> {
  const markets = await getAllPlayMarkets();
  const latest = new Map<string, MarketInfo>();
  for (const m of markets) {
    const prev = latest.get(m.ticker);
    if (!prev || m.id > prev.id) latest.set(m.ticker, m);
  }
  return [...latest.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
}
