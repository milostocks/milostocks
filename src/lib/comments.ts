// Flat (non-threaded), Redis-backed comment list per ticker on /predict/[ticker]
// — no accounts, reuses the same cookie-based fETH identity as offchainWallet.ts
// (getOrCreateWalletId/pseudoAddress) so commenting needs no wallet-connect.
// Same Redis-with-local-file-fallback pattern as offchainWallet.ts — see that
// file's header comment for the Vercel-serverless-persistence caveat.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { getRedisClient } from "./redis";
import { pseudoAddress } from "./offchainWallet";

const STORE_PATH = join(process.cwd(), "data", "comments.json");
const REDIS_KEY = "rham:comments:v1";

const MAX_LENGTH = 280;
const MIN_POST_INTERVAL_SECONDS = 20;
const MAX_PER_TICKER = 200;

interface CommentRecord {
  id: string;
  walletId: string;
  text: string;
  at: number;
}

interface Store {
  byTicker: Record<string, CommentRecord[]>;
  lastPostAt: Record<string, number>;
}

function emptyStore(): Store {
  return { byTicker: {}, lastPostAt: {} };
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

// Same single-process write queue as offchainWallet.ts's withStore — see that
// file for the remaining cross-instance race this doesn't cover.
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

export interface CommentView {
  id: string;
  address: string;
  text: string;
  at: number;
}

function toView(c: CommentRecord): CommentView {
  return { id: c.id, address: pseudoAddress(c.walletId), text: c.text, at: c.at };
}

export async function getComments(ticker: string): Promise<CommentView[]> {
  return withStore((store) => {
    const list = store.byTicker[ticker] ?? [];
    return [...list].sort((a, b) => b.at - a.at).map(toView);
  });
}

export interface PostCommentResult {
  ok: boolean;
  error?: string;
  comment?: CommentView;
}

export async function postComment(ticker: string, walletId: string, rawText: string): Promise<PostCommentResult> {
  return withStore((store) => {
    const text = rawText.trim().slice(0, MAX_LENGTH);
    if (!text) return { ok: false, error: "Comment can't be empty." };

    const now = Math.floor(Date.now() / 1000);
    const last = store.lastPostAt[walletId] ?? 0;
    if (now - last < MIN_POST_INTERVAL_SECONDS) {
      return { ok: false, error: `Wait ${MIN_POST_INTERVAL_SECONDS - (now - last)}s before commenting again.` };
    }

    const record: CommentRecord = { id: randomUUID(), walletId, text, at: now };
    const list = store.byTicker[ticker] ?? [];
    list.push(record);
    if (list.length > MAX_PER_TICKER) list.splice(0, list.length - MAX_PER_TICKER);
    store.byTicker[ticker] = list;
    store.lastPostAt[walletId] = now;

    return { ok: true, comment: toView(record) };
  });
}
