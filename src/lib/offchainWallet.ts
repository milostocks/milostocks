// Off-chain "internal wallet" for the fETH (fake ETH) play-money side of
// Predict. Chosen over the on-chain PlayMarket contract specifically so
// people can claim/bet fETH without installing a wallet extension — see
// CLAUDE.md §9 "fETH internal wallet" for why. Identity is a random id
// stored in an httpOnly cookie (see getOrCreateWalletId); balances/markets
// live in Upstash Redis (one JSON blob under REDIS_KEY) when
// UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are set, or fall back to a
// local JSON file on disk otherwise — see readStore/writeStore below.
//
// ⚠️ The local-file fallback only works on a single, long-running Node
// process (e.g. `npm run dev`). It will NOT persist across invocations on
// Vercel's serverless functions (ephemeral filesystem, no shared disk between
// instances) — this is exactly why Redis is the real backing store. Don't
// deploy without the two env vars set (add the Upstash integration, or any
// Upstash Redis database, and copy its REST URL + token).
//
// ⚠️ Known scaling gap: all reads/writes go through one JSON blob with a
// read-modify-write cycle (see withStore). An in-process queue serializes
// concurrent requests *within the same server instance*, but two different
// serverless instances writing at the exact same moment could still race
// (lost update). Acceptable at today's traffic for a play-money feature;
// would need per-field atomic ops (Redis hashes/INCR) or a Lua script if
// concurrent bet volume ever gets meaningfully high.
import { cookies } from "next/headers";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { formatEther, parseEther } from "viem";
import { getRedisClient } from "./redis";
import { getPremiums } from "./premium";

const STORE_PATH = join(process.cwd(), "data", "offchain-play.json");
const REDIS_KEY = "rham:offchain-play:v1";
const COOKIE_NAME = "rham_wallet_id";
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 days — the browser-enforced cap on Set-Cookie maxAge

const WEEKLY_FETH = parseEther("0.1");
/** Weekly "prize draw" for the top net winner of the previous week — see rolloverWeekIfNeeded. */
const CHAMPION_BONUS = parseEther("0.05");

const WEEK_SECONDS = 7 * 24 * 60 * 60;
const LOCK_IN_SECONDS = 60 * 60; // matches create-play-markets.ts's on-chain default
const SESSION_LENGTH_SECONDS = 60 * 60;

interface Bet {
  walletId: string;
  up: boolean;
  amount: string; // wei, 18-decimal like formatChips/formatEth expect
  payout: string; // wei, filled once the market resolves; "0" until then
  at: number; // unix seconds bet was placed
}

interface MarketRecord {
  id: string;
  ticker: string;
  locksAt: number;
  resolvesAt: number;
  state: 0 | 1 | 2; // open / locked / resolved
  startPrice?: number;
  endPrice?: number;
  outcome?: 0 | 1 | 2 | 3; // none / up / down / push
  upPool: string;
  downPool: string;
  bets: Bet[];
}

interface WalletRecord {
  id: string;
  balance: string; // wei
  lastClaimedWeek: number | null;
  bonusNextClaim: string; // wei, added on top of the next weekly claim
  createdAt: number;
}

interface Store {
  wallets: Record<string, WalletRecord>;
  marketsByTicker: Record<string, MarketRecord[]>; // history; last entry is current
  lastWeekRolloverWeek: number | null;
}

function emptyStore(): Store {
  return { wallets: {}, marketsByTicker: {}, lastWeekRolloverWeek: null };
}

async function readStore(): Promise<Store> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<Store>(REDIS_KEY);
    return data ?? emptyStore();
  }
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store;
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: Store): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, store);
    return;
  }
  if (!existsSync(dirname(STORE_PATH))) mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// Single-process write queue — request handlers can interleave, so every
// store mutation (including the lazy lock/resolve transitions inside
// ensureMarket) goes through this to avoid a read-modify-write race clobbering
// another request's change *within this instance*. See the file-level
// comment above for the remaining cross-instance race once this runs on
// multiple serverless instances against Redis.
let queue: Promise<unknown> = Promise.resolve();
function withStore<T>(fn: (store: Store) => Promise<T> | T): Promise<T> {
  const run = async () => {
    const store = await readStore();
    const value = await fn(store);
    await writeStore(store);
    return value;
  };
  const result = queue.then(run, run);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function currentWeek(now: number = Math.floor(Date.now() / 1000)): number {
  return Math.floor(now / WEEK_SECONDS);
}
function weekStartOf(week: number): number {
  return week * WEEK_SECONDS;
}

/** Deterministic MetaMask-style fake address for a wallet id — cosmetic only, not a real key. */
export function pseudoAddress(walletId: string): string {
  return `0x${createHash("sha256").update(walletId).digest("hex").slice(0, 40)}`;
}

function getOrInitWallet(store: Store, id: string): WalletRecord {
  let w = store.wallets[id];
  if (!w) {
    w = { id, balance: "0", lastClaimedWeek: null, bonusNextClaim: "0", createdAt: Math.floor(Date.now() / 1000) };
    store.wallets[id] = w;
  }
  return w;
}

/**
 * Reads (and lazily creates) the caller's internal-wallet id from an httpOnly
 * cookie. httpOnly means client JS can't read or overwrite it, so clearing
 * localStorage alone can't get someone a fresh identity/claim — only
 * actually clearing cookies (or an incognito window) resets it, which is the
 * accepted, best-effort level of anti-abuse for a play-money feature (see
 * CLAUDE.md). Only callable from a Route Handler / Server Action (cookie
 * writes aren't allowed during Server Component rendering) — use
 * peekWalletId() from a Server Component instead.
 */
export async function getOrCreateWalletId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = randomUUID();
  jar.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return id;
}

/** Read-only peek at the wallet cookie, safe to call from a Server Component (can't set cookies there). */
export async function peekWalletId(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value;
}

interface LedgerRow {
  walletId: string;
  stakedWei: bigint;
  payoutWei: bigint;
  netWei: bigint;
  betCount: number;
}

function computeLeaderboardForWeek(store: Store, week: number): LedgerRow[] {
  const start = weekStartOf(week);
  const end = start + WEEK_SECONDS;
  const rows = new Map<string, { staked: bigint; payout: bigint; count: number }>();
  for (const markets of Object.values(store.marketsByTicker)) {
    for (const m of markets) {
      for (const b of m.bets) {
        if (b.at < start || b.at >= end) continue;
        const e = rows.get(b.walletId) ?? { staked: 0n, payout: 0n, count: 0 };
        e.staked += BigInt(b.amount);
        e.payout += BigInt(b.payout || "0");
        e.count += 1;
        rows.set(b.walletId, e);
      }
    }
  }
  return [...rows.entries()]
    .map(([walletId, e]) => ({
      walletId,
      stakedWei: e.staked,
      payoutWei: e.payout,
      netWei: e.payout - e.staked,
      betCount: e.count,
    }))
    .sort((a, b) => (a.netWei === b.netWei ? 0 : a.netWei < b.netWei ? 1 : -1));
}

/**
 * Runs (at most once per week, the first time anyone hits the store after the
 * week boundary) a "weekly prize draw": the previous week's #1 net winner
 * gets a bonus credited on top of their *next* weekly claim. Symbolic, not a
 * real payout — fETH can never leave the site either way — but it gives the
 * weekly leaderboard a reason to exist beyond bragging rights. See
 * CLAUDE.md's "How it works" copy.
 */
function rolloverWeekIfNeeded(store: Store) {
  const week = currentWeek();
  if (store.lastWeekRolloverWeek === week) return;
  if (store.lastWeekRolloverWeek !== null) {
    const board = computeLeaderboardForWeek(store, week - 1);
    const champion = board.find((r) => r.netWei > 0n);
    if (champion) {
      const w = getOrInitWallet(store, champion.walletId);
      w.bonusNextClaim = (BigInt(w.bonusNextClaim || "0") + CHAMPION_BONUS).toString();
    }
  }
  store.lastWeekRolloverWeek = week;
}

async function livePrice(ticker: string): Promise<number | undefined> {
  const rows = await getPremiums().catch(() => []);
  return rows.find((r) => r.stock.ticker === ticker)?.tokenPrice;
}

function newMarket(ticker: string, now: number): MarketRecord {
  const locksAt = now + LOCK_IN_SECONDS;
  return {
    id: `${ticker}-${locksAt}`,
    ticker,
    locksAt,
    resolvesAt: locksAt + SESSION_LENGTH_SECONDS,
    state: 0,
    upPool: "0",
    downPool: "0",
    bets: [],
  };
}

/** Pari-mutuel settlement, same math as GapMarket.sol/PlayMarket.sol's claimableOf — credits every bettor's wallet balance directly instead of requiring a separate claim step (no gas concept off-chain, so no reason to make users click twice). */
function settleMarket(store: Store, m: MarketRecord): 1 | 2 | 3 {
  const start = m.startPrice ?? 0;
  const end = m.endPrice ?? start;
  const upPool = BigInt(m.upPool);
  const downPool = BigInt(m.downPool);

  const outcome: 1 | 2 | 3 = end === start ? 3 : end > start ? 1 : 2;
  const winningPool = outcome === 1 ? upPool : outcome === 2 ? downPool : 0n;
  const losingPool = outcome === 1 ? downPool : outcome === 2 ? upPool : 0n;

  for (const b of m.bets) {
    const stake = BigInt(b.amount);
    let payout: bigint;
    if (outcome === 3 || winningPool === 0n) {
      // Push, or a decisive outcome nobody bet on — refund everyone in full.
      payout = stake;
    } else if ((outcome === 1) === b.up) {
      payout = stake + (stake * losingPool) / winningPool;
    } else {
      payout = 0n;
    }
    b.payout = payout.toString();
    if (payout > 0n) {
      const w = getOrInitWallet(store, b.walletId);
      w.balance = (BigInt(w.balance) + payout).toString();
    }
  }
  return outcome;
}

/** Lazy lock/resolve, mirroring GapMarket's permissionless lockMarket/resolveMarket — whoever reads the market first past the timestamp triggers the transition, using the live token price at that moment. Rolls straight into a fresh open market once the current one resolves, so there's always something to bet on. */
async function ensureMarket(store: Store, ticker: string): Promise<MarketRecord> {
  const now = Math.floor(Date.now() / 1000);
  let list = store.marketsByTicker[ticker];
  if (!list || list.length === 0) {
    list = [newMarket(ticker, now)];
    store.marketsByTicker[ticker] = list;
  }
  let current = list[list.length - 1];

  if (current.state === 0 && now >= current.locksAt) {
    current.startPrice = await livePrice(ticker);
    current.state = 1;
  }
  if (current.state === 1 && now >= current.resolvesAt) {
    current.endPrice = await livePrice(ticker);
    current.outcome = settleMarket(store, current);
    current.state = 2;
  }
  if (current.state === 2) {
    current = newMarket(ticker, now);
    list.push(current);
  }
  return current;
}

export interface WalletView {
  id: string;
  address: string;
  balance: string;
  claimedThisWeek: boolean;
  nextResetAt: number;
  pendingBonus: string;
}

export async function getWalletView(walletId: string): Promise<WalletView> {
  return withStore((store) => {
    rolloverWeekIfNeeded(store);
    const w = getOrInitWallet(store, walletId);
    const week = currentWeek();
    return {
      id: w.id,
      address: pseudoAddress(w.id),
      balance: w.balance,
      claimedThisWeek: w.lastClaimedWeek === week,
      nextResetAt: weekStartOf(week + 1),
      pendingBonus: w.bonusNextClaim,
    };
  });
}

export interface ClaimResult {
  ok: boolean;
  alreadyClaimed: boolean;
  balance: string;
  bonusApplied: string;
}

export async function claimWeeklyFEth(walletId: string): Promise<ClaimResult> {
  return withStore((store) => {
    rolloverWeekIfNeeded(store);
    const w = getOrInitWallet(store, walletId);
    const week = currentWeek();
    if (w.lastClaimedWeek === week) {
      return { ok: false, alreadyClaimed: true, balance: w.balance, bonusApplied: "0" };
    }
    const bonus = BigInt(w.bonusNextClaim || "0");
    w.balance = (WEEKLY_FETH + bonus).toString();
    w.lastClaimedWeek = week;
    w.bonusNextClaim = "0";
    return { ok: true, alreadyClaimed: false, balance: w.balance, bonusApplied: bonus.toString() };
  });
}

export interface MarketView {
  id: string;
  ticker: string;
  locksAt: number;
  resolvesAt: number;
  state: 0 | 1 | 2;
  startPrice: number | null;
  endPrice: number | null;
  outcome: 0 | 1 | 2 | 3;
  upPool: string;
  downPool: string;
}

export interface BetView {
  address: string;
  up: boolean;
  amount: string;
  at: number;
}

function toMarketView(m: MarketRecord): MarketView {
  return {
    id: m.id,
    ticker: m.ticker,
    locksAt: m.locksAt,
    resolvesAt: m.resolvesAt,
    state: m.state,
    startPrice: m.startPrice ?? null,
    endPrice: m.endPrice ?? null,
    outcome: m.outcome ?? 0,
    upPool: m.upPool,
    downPool: m.downPool,
  };
}

function toBetView(b: Bet): BetView {
  return { address: pseudoAddress(b.walletId), up: b.up, amount: b.amount, at: b.at };
}

export interface MarketDetail {
  market: MarketView;
  bets: BetView[];
  myPosition: { up: string; down: string };
  history: MarketView[];
}

export async function getMarketView(ticker: string, walletId?: string): Promise<MarketDetail> {
  return withStore(async (store) => {
    const current = await ensureMarket(store, ticker);
    const list = store.marketsByTicker[ticker] ?? [current];

    let myUp = 0n;
    let myDown = 0n;
    if (walletId) {
      for (const b of current.bets) {
        if (b.walletId !== walletId) continue;
        if (b.up) myUp += BigInt(b.amount);
        else myDown += BigInt(b.amount);
      }
    }

    return {
      market: toMarketView(current),
      bets: [...current.bets]
        .sort((a, b) => b.at - a.at)
        .slice(0, 50)
        .map(toBetView),
      myPosition: { up: myUp.toString(), down: myDown.toString() },
      history: list
        .slice(0, -1)
        .reverse()
        .map(toMarketView),
    };
  });
}

export interface PlaceBetResult {
  ok: boolean;
  error?: string;
  balance: string;
}

export async function placeFEthBet(ticker: string, walletId: string, up: boolean, amountStr: string): Promise<PlaceBetResult> {
  return withStore(async (store) => {
    const market = await ensureMarket(store, ticker);
    const w = getOrInitWallet(store, walletId);
    const now = Math.floor(Date.now() / 1000);

    if (market.state !== 0 || now >= market.locksAt) {
      return { ok: false, error: "This market is no longer open for bets.", balance: w.balance };
    }

    let amount: bigint;
    try {
      amount = parseEther(amountStr || "0");
    } catch {
      return { ok: false, error: "Invalid amount.", balance: w.balance };
    }
    if (amount <= 0n) return { ok: false, error: "Enter a positive amount.", balance: w.balance };
    if (BigInt(w.balance) < amount) return { ok: false, error: "Not enough fETH — claim this week's free fETH above.", balance: w.balance };

    w.balance = (BigInt(w.balance) - amount).toString();
    market.bets.push({ walletId, up, amount: amount.toString(), payout: "0", at: now });
    if (up) market.upPool = (BigInt(market.upPool) + amount).toString();
    else market.downPool = (BigInt(market.downPool) + amount).toString();

    return { ok: true, balance: w.balance };
  });
}

export interface LeaderboardEntryView {
  user: string;
  stakedWei: string;
  claimedWei: string;
  netWei: string;
  betCount: number;
}

/** This week's fETH leaderboard — resets along with everyone's balance, same weekly cycle as claimWeeklyFEth. */
export async function getWeeklyLeaderboardView(limit = 50): Promise<LeaderboardEntryView[]> {
  return withStore((store) => {
    rolloverWeekIfNeeded(store);
    return computeLeaderboardForWeek(store, currentWeek())
      .slice(0, limit)
      .map((r) => ({
        user: pseudoAddress(r.walletId),
        stakedWei: r.stakedWei.toString(),
        claimedWei: r.payoutWei.toString(),
        netWei: r.netWei.toString(),
        betCount: r.betCount,
      }));
  });
}

export interface PoolHistoryPoint {
  t: number;
  upTotal: number;
  downTotal: number;
  impliedUpPct: number;
}

/** Implied-probability history for the ticker's current market — same shape/math as playBets.ts's getPlayPoolHistory, computed from the in-process bet list instead of on-chain events. */
export async function getPoolHistoryView(ticker: string): Promise<PoolHistoryPoint[]> {
  return withStore(async (store) => {
    const current = await ensureMarket(store, ticker);
    const chronological = [...current.bets].sort((a, b) => a.at - b.at);
    let up = 0n;
    let down = 0n;
    return chronological.map((b) => {
      if (b.up) up += BigInt(b.amount);
      else down += BigInt(b.amount);
      const total = up + down;
      return {
        t: b.at,
        upTotal: Number(formatEther(up)),
        downTotal: Number(formatEther(down)),
        impliedUpPct: total > 0n ? Number((up * 10000n) / total) / 100 : 50,
      };
    });
  });
}

export interface GlobalFEthOverview {
  players: number;
  stakedWei: string;
}

/** This week's fETH activity across every ticker at once — for the site-wide stats bar, not one ticker's page. */
export async function getGlobalFEthWeeklyOverview(): Promise<GlobalFEthOverview> {
  return withStore((store) => {
    rolloverWeekIfNeeded(store);
    const rows = computeLeaderboardForWeek(store, currentWeek());
    const stakedWei = rows.reduce((s, r) => s + r.stakedWei, 0n);
    return { players: rows.length, stakedWei: stakedWei.toString() };
  });
}

/** Last week's #1 net winner, if anyone actually finished positive — surfaced as a "🏆 Champion" banner. */
export async function getLastWeekChampion(): Promise<{ address: string; netWei: string } | null> {
  return withStore((store) => {
    const board = computeLeaderboardForWeek(store, currentWeek() - 1);
    const top = board.find((r) => r.netWei > 0n);
    return top ? { address: pseudoAddress(top.walletId), netWei: top.netWei.toString() } : null;
  });
}
