// Reads GapMarket's BetPlaced/Claimed event logs directly off-chain — there's
// no subgraph or indexer, so "recent bets" and the leaderboard are both just
// eth_getLogs against the public testnet RPC. Confirmed against the live RPC
// that a full fromBlock:0 query works fine and is cheap at current volume
// (a few dozen logs total); revisit with a real start block if that changes.
import { createPublicClient, http, formatEther } from "viem";
import { robinhoodTestnet } from "./chains";
import { GAP_MARKET_ADDRESS } from "./predictContracts";
import { GAPMARKET_ABI } from "./predictAbi";
import { getAllMarkets } from "./predictMarkets";

const client = createPublicClient({ chain: robinhoodTestnet, transport: http() });

export interface BetLog {
  marketId: bigint;
  user: `0x${string}`;
  up: boolean;
  amount: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

export interface ClaimLog {
  marketId: bigint;
  user: `0x${string}`;
  amount: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

/** Plain-serializable mirror of BetLog for the Server→Client Component boundary (bigint props silently fail — see CLAUDE.md). */
export interface SerializableBet {
  marketId: string;
  user: `0x${string}`;
  up: boolean;
  amount: string;
  blockNumber: number;
  txHash: `0x${string}`;
}

export function toSerializableBet(b: BetLog): SerializableBet {
  return {
    marketId: b.marketId.toString(),
    user: b.user,
    up: b.up,
    amount: b.amount.toString(),
    blockNumber: Number(b.blockNumber),
    txHash: b.txHash,
  };
}

async function getAllBetPlacedLogs(): Promise<BetLog[]> {
  const logs = await client.getContractEvents({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    eventName: "BetPlaced",
    fromBlock: 0n,
    toBlock: "latest",
  });
  return logs.map((l) => ({
    marketId: l.args.id!,
    user: l.args.user!,
    up: l.args.up!,
    amount: l.args.amount!,
    blockNumber: l.blockNumber,
    txHash: l.transactionHash,
  }));
}

async function getAllClaimedLogs(): Promise<ClaimLog[]> {
  const logs = await client.getContractEvents({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    eventName: "Claimed",
    fromBlock: 0n,
    toBlock: "latest",
  });
  return logs.map((l) => ({
    marketId: l.args.id!,
    user: l.args.user!,
    amount: l.args.amount!,
    blockNumber: l.blockNumber,
    txHash: l.transactionHash,
  }));
}

/** All bets for one market, newest first. Filters server-side via the indexed `id` topic, not a client-side scan. */
export async function getBetsForMarket(id: bigint, limit = 50): Promise<BetLog[]> {
  const logs = await client.getContractEvents({
    address: GAP_MARKET_ADDRESS,
    abi: GAPMARKET_ABI,
    eventName: "BetPlaced",
    args: { id },
    fromBlock: 0n,
    toBlock: "latest",
  });
  return logs
    .map((l) => ({
      marketId: l.args.id!,
      user: l.args.user!,
      up: l.args.up!,
      amount: l.args.amount!,
      blockNumber: l.blockNumber,
      txHash: l.transactionHash,
    }))
    .sort((a, b) => Number(b.blockNumber - a.blockNumber))
    .slice(0, limit);
}

export interface LeaderboardEntry {
  user: `0x${string}`;
  stakedWei: bigint;
  claimedWei: bigint;
  netWei: bigint;
  betCount: number;
}

/** Every wallet that's ever placed a bet, ranked by claimed − staked (ETH actually reclaimed, not unrealized position value). */
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const [bets, claims] = await Promise.all([getAllBetPlacedLogs(), getAllClaimedLogs()]);

  const rows = new Map<string, { staked: bigint; claimed: bigint; count: number }>();
  for (const b of bets) {
    const key = b.user.toLowerCase();
    const e = rows.get(key) ?? { staked: 0n, claimed: 0n, count: 0 };
    e.staked += b.amount;
    e.count += 1;
    rows.set(key, e);
  }
  for (const c of claims) {
    const key = c.user.toLowerCase();
    const e = rows.get(key) ?? { staked: 0n, claimed: 0n, count: 0 };
    e.claimed += c.amount;
    rows.set(key, e);
  }

  return [...rows.entries()]
    .map(([user, e]) => ({
      user: user as `0x${string}`,
      stakedWei: e.staked,
      claimedWei: e.claimed,
      netWei: e.claimed - e.staked,
      betCount: e.count,
    }))
    .sort((a, b) => (a.netWei === b.netWei ? 0 : a.netWei < b.netWei ? 1 : -1))
    .slice(0, limit);
}

export interface WalletBet {
  marketId: bigint;
  ticker: string;
  up: boolean;
  amount: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
  marketState: number; // 0 Created, 1 Locked, 2 Resolved
  marketOutcome: number; // 0 Undecided, 1 Up, 2 Down, 3 Push
  claimed: boolean;
}

export interface WalletActivity {
  bets: WalletBet[];
  stakedWei: bigint;
  claimedWei: bigint;
  netWei: bigint;
}

/** Every bet + claim for one wallet, joined against current market state (ticker, resolved/outcome) for display — the wallet tracker page. */
export async function getWalletActivity(user: `0x${string}`): Promise<WalletActivity> {
  const [betLogs, claimLogs, markets] = await Promise.all([
    client.getContractEvents({
      address: GAP_MARKET_ADDRESS,
      abi: GAPMARKET_ABI,
      eventName: "BetPlaced",
      args: { user },
      fromBlock: 0n,
      toBlock: "latest",
    }),
    client.getContractEvents({
      address: GAP_MARKET_ADDRESS,
      abi: GAPMARKET_ABI,
      eventName: "Claimed",
      args: { user },
      fromBlock: 0n,
      toBlock: "latest",
    }),
    getAllMarkets(),
  ]);

  const marketById = new Map(markets.map((m) => [m.id, m]));
  const claimedIds = new Set(claimLogs.map((l) => l.args.id!.toString()));

  const bets: WalletBet[] = betLogs
    .map((l) => {
      const id = l.args.id!;
      const market = marketById.get(id);
      return {
        marketId: id,
        ticker: market?.ticker ?? "?",
        up: l.args.up!,
        amount: l.args.amount!,
        blockNumber: l.blockNumber,
        txHash: l.transactionHash,
        marketState: market?.state ?? 0,
        marketOutcome: market?.outcome ?? 0,
        claimed: claimedIds.has(id.toString()),
      };
    })
    .sort((a, b) => Number(b.blockNumber - a.blockNumber));

  const stakedWei = betLogs.reduce((s, l) => s + l.args.amount!, 0n);
  const claimedWei = claimLogs.reduce((s, l) => s + l.args.amount!, 0n);

  return { bets, stakedWei, claimedWei, netWei: claimedWei - stakedWei };
}

export interface PredictOverview {
  totalMarkets: number;
  activeMarkets: number;
  activeBettors: number;
  totalStakedWei: bigint;
  /** Total currently staked, grouped by ticker — for the "where the action is" bar list. */
  stakedByTicker: { ticker: string; stakedWei: bigint }[];
}

/** Site-wide Predict stats for the /predict index — same event logs as the leaderboard, aggregated differently. */
export async function getPredictOverview(): Promise<PredictOverview> {
  const [markets, bets] = await Promise.all([getAllMarkets(), getAllBetPlacedLogs()]);

  const marketById = new Map(markets.map((m) => [m.id, m]));
  const bettors = new Set(bets.map((b) => b.user.toLowerCase()));

  const byTicker = new Map<string, bigint>();
  let totalStakedWei = 0n;
  for (const b of bets) {
    totalStakedWei += b.amount;
    const ticker = marketById.get(b.marketId)?.ticker ?? "?";
    byTicker.set(ticker, (byTicker.get(ticker) ?? 0n) + b.amount);
  }

  return {
    totalMarkets: markets.length,
    activeMarkets: markets.filter((m) => m.state < 2).length,
    activeBettors: bettors.size,
    totalStakedWei,
    stakedByTicker: [...byTicker.entries()]
      .map(([ticker, stakedWei]) => ({ ticker, stakedWei }))
      .sort((a, b) => (a.stakedWei === b.stakedWei ? 0 : a.stakedWei < b.stakedWei ? 1 : -1)),
  };
}

export interface PoolHistoryPoint {
  t: number;
  upTotal: number;
  downTotal: number;
  impliedUpPct: number;
}

/**
 * Running UP/DOWN pool totals over time for one market, for the implied-
 * probability chart — the pari-mutuel analog of Polymarket/Kalshi's
 * probability line. BetPlaced only carries a block number, so this fetches
 * each unique block's timestamp once (cheap at current bet volume; revisit
 * if that stops being true, same caveat as the rest of this file).
 */
export async function getPoolHistory(id: bigint): Promise<PoolHistoryPoint[]> {
  const bets = await getBetsForMarket(id, 1000);
  if (bets.length === 0) return [];

  const chronological = [...bets].sort((a, b) => Number(a.blockNumber - b.blockNumber));
  const uniqueBlocks = [...new Set(chronological.map((b) => b.blockNumber))];
  const blockTimes = new Map<bigint, number>(
    await Promise.all(
      uniqueBlocks.map(async (bn) => [bn, Number((await client.getBlock({ blockNumber: bn })).timestamp)] as const),
    ),
  );

  let up = 0n;
  let down = 0n;
  return chronological.map((b) => {
    if (b.up) up += b.amount;
    else down += b.amount;
    const total = up + down;
    return {
      t: blockTimes.get(b.blockNumber)!,
      upTotal: Number(formatEther(up)),
      downTotal: Number(formatEther(down)),
      impliedUpPct: total > 0n ? Number((up * 10000n) / total) / 100 : 50,
    };
  });
}
