// PlayMarket equivalent of predictBets.ts — same event-log-reading approach
// (no subgraph), but for the free-to-play chips contract. The one genuinely
// different piece is the leaderboard: chips reset weekly (see PlayMarket.sol
// and CLAUDE.md), so ranking has to be scoped to the current week's events
// only, not all-time — an all-time chips leaderboard would just reward
// whoever's been claiming longest, not whoever's better at predicting.
import { createPublicClient, http, formatEther } from "viem";
import { robinhoodTestnet } from "./chains";
import { PLAY_MARKET_ADDRESS } from "./predictContracts";
import { PLAYMARKET_ABI } from "./predictAbi";
import { getAllPlayMarkets } from "./predictMarkets";
import type { BetLog, ClaimLog, PoolHistoryPoint } from "./predictBets";

const client = createPublicClient({ chain: robinhoodTestnet, transport: http() });

/** Same week boundary the contract uses: block.timestamp / 7 days. */
const WEEK_SECONDS = 7 * 24 * 60 * 60;

export function currentWeekStart(now: number = Math.floor(Date.now() / 1000)): number {
  return Math.floor(now / WEEK_SECONDS) * WEEK_SECONDS;
}

async function getAllPlayBetPlacedLogs(): Promise<BetLog[]> {
  const logs = await client.getContractEvents({
    address: PLAY_MARKET_ADDRESS,
    abi: PLAYMARKET_ABI,
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

async function getAllPlayClaimedLogs(): Promise<ClaimLog[]> {
  const logs = await client.getContractEvents({
    address: PLAY_MARKET_ADDRESS,
    abi: PLAYMARKET_ABI,
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

/** Block timestamps for a set of logs, fetched once per unique block (same approach as getPoolHistory). */
async function withBlockTimes<T extends { blockNumber: bigint }>(logs: T[]): Promise<(T & { t: number })[]> {
  const uniqueBlocks = [...new Set(logs.map((l) => l.blockNumber))];
  const blockTimes = new Map<bigint, number>(
    await Promise.all(
      uniqueBlocks.map(async (bn) => [bn, Number((await client.getBlock({ blockNumber: bn })).timestamp)] as const),
    ),
  );
  return logs.map((l) => ({ ...l, t: blockTimes.get(l.blockNumber)! }));
}

/** All chip bets for one market, newest first. */
export async function getPlayBetsForMarket(id: bigint, limit = 50): Promise<BetLog[]> {
  const logs = await client.getContractEvents({
    address: PLAY_MARKET_ADDRESS,
    abi: PLAYMARKET_ABI,
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

export interface PlayLeaderboardEntry {
  user: `0x${string}`;
  stakedWei: bigint;
  claimedWei: bigint;
  netWei: bigint;
  betCount: number;
}

/** This week's chip leaderboard — resets every week along with everyone's chip balance, so ranking only counts events since the current week started. */
export async function getPlayLeaderboard(limit = 50): Promise<PlayLeaderboardEntry[]> {
  const [betsRaw, claimsRaw] = await Promise.all([getAllPlayBetPlacedLogs(), getAllPlayClaimedLogs()]);
  const [bets, claims] = await Promise.all([withBlockTimes(betsRaw), withBlockTimes(claimsRaw)]);

  const weekStart = currentWeekStart();
  const thisWeekBets = bets.filter((b) => b.t >= weekStart);
  const thisWeekClaims = claims.filter((c) => c.t >= weekStart);

  const rows = new Map<string, { staked: bigint; claimed: bigint; count: number }>();
  for (const b of thisWeekBets) {
    const key = b.user.toLowerCase();
    const e = rows.get(key) ?? { staked: 0n, claimed: 0n, count: 0 };
    e.staked += b.amount;
    e.count += 1;
    rows.set(key, e);
  }
  for (const c of thisWeekClaims) {
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

export interface PlayWalletBet {
  marketId: bigint;
  ticker: string;
  up: boolean;
  amount: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
  marketState: number;
  marketOutcome: number;
  claimed: boolean;
}

export interface PlayWalletActivity {
  bets: PlayWalletBet[];
  stakedWei: bigint;
  claimedWei: bigint;
  netWei: bigint;
  chipBalance: bigint;
}

/** One wallet's full chip-market history, plus their current live chip balance. */
export async function getPlayWalletActivity(user: `0x${string}`): Promise<PlayWalletActivity> {
  const [betLogs, claimLogs, markets, chipBalance] = await Promise.all([
    client.getContractEvents({
      address: PLAY_MARKET_ADDRESS,
      abi: PLAYMARKET_ABI,
      eventName: "BetPlaced",
      args: { user },
      fromBlock: 0n,
      toBlock: "latest",
    }),
    client.getContractEvents({
      address: PLAY_MARKET_ADDRESS,
      abi: PLAYMARKET_ABI,
      eventName: "Claimed",
      args: { user },
      fromBlock: 0n,
      toBlock: "latest",
    }),
    getAllPlayMarkets(),
    client.readContract({
      address: PLAY_MARKET_ADDRESS,
      abi: PLAYMARKET_ABI,
      functionName: "chipBalance",
      args: [user],
    }),
  ]);

  const marketById = new Map(markets.map((m) => [m.id, m]));
  const claimedIds = new Set(claimLogs.map((l) => l.args.id!.toString()));

  const bets: PlayWalletBet[] = betLogs
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

  return { bets, stakedWei, claimedWei, netWei: claimedWei - stakedWei, chipBalance };
}

/** Site-wide chip-market overview for the Play tab — same shape as PredictOverview. */
export async function getPlayOverview(): Promise<{
  totalMarkets: number;
  activeMarkets: number;
  weeklyPlayers: number;
  weeklyStakedWei: bigint;
}> {
  const [markets, betsRaw] = await Promise.all([getAllPlayMarkets(), getAllPlayBetPlacedLogs()]);
  const bets = await withBlockTimes(betsRaw);
  const weekStart = currentWeekStart();
  const thisWeekBets = bets.filter((b) => b.t >= weekStart);

  return {
    totalMarkets: markets.length,
    activeMarkets: markets.filter((m) => m.state < 2).length,
    weeklyPlayers: new Set(thisWeekBets.map((b) => b.user.toLowerCase())).size,
    weeklyStakedWei: thisWeekBets.reduce((s, b) => s + b.amount, 0n),
  };
}

/** Implied-probability history for one PlayMarket market — identical math to getPoolHistory, different contract. */
export async function getPlayPoolHistory(id: bigint): Promise<PoolHistoryPoint[]> {
  const bets = await getPlayBetsForMarket(id, 1000);
  if (bets.length === 0) return [];

  const chronological = [...bets].sort((a, b) => Number(a.blockNumber - b.blockNumber));
  const withTimes = await withBlockTimes(chronological);

  let up = 0n;
  let down = 0n;
  return withTimes.map((b) => {
    if (b.up) up += b.amount;
    else down += b.amount;
    const total = up + down;
    return {
      t: b.t,
      upTotal: Number(formatEther(up)),
      downTotal: Number(formatEther(down)),
      impliedUpPct: total > 0n ? Number((up * 10000n) / total) / 100 : 50,
    };
  });
}
