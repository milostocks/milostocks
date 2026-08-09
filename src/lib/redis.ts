// Shared Redis client factory for the app's Redis-backed stores
// (offchainWallet.ts, comments.ts). Accepts both plain UPSTASH_REDIS_REST_URL/
// TOKEN (manual Upstash setup) and the names Vercel's Upstash Marketplace
// integration generates when a custom env-var prefix is applied
// (<PREFIX>_KV_REST_API_URL/TOKEN) — whichever pair is actually set.
import { Redis } from "@upstash/redis";

let client: Redis | null | undefined; // undefined = not checked yet, null = not configured

export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}
