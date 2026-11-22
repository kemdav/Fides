import "server-only";
import { headers } from "next/headers";
import Redis from "ioredis";
import { getServerEnv } from "@/lib/env";

/**
 * Fixed-window rate limiter.
 *
 * With REDIS_URL set, counters live in Redis, so limits hold across restarts and across server instances.
 * Without it (local development) an in-memory counter is used, which only covers one server process.
 * If Redis is configured but unreachable, requests fall back to the in-memory counter instead of failing.
 */
export type RateLimit = { limit: number; windowMs: number };

export const MINUTES = 60_000;

// atomic: count the attempt and start the window on the first one
const INCREMENT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return count
`;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function memoryHit(key: string, { windowMs }: RateLimit): number {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  bucket.count += 1;
  return bucket.count;
}

let client: Redis | null | undefined;
let warned = false;

function warnOnce(message: string) {
  if (warned) return;
  warned = true;
  console.warn(`[rate-limit] ${message}`);
}

function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = getServerEnv().REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") warnOnce("REDIS_URL is not set: rate limits are per server instance only.");
    return (client = null);
  }
  client = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 2000, lazyConnect: true });
  client.on("error", (error) => warnOnce(`Redis error, using in-memory limits: ${error.message}`));
  return client;
}

async function hit(key: string, rule: RateLimit): Promise<number> {
  const store = redis();
  if (store) {
    try {
      if (store.status === "wait") await store.connect();
      return Number(await store.eval(INCREMENT, 1, `fides:rl:${key}`, rule.windowMs));
    } catch (error) {
      warnOnce(`Redis unavailable, using in-memory limits: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return memoryHit(key, rule);
}

/** Records one attempt and returns true when the caller is over the limit. */
export async function isRateLimited(key: string, rule: RateLimit): Promise<boolean> {
  return (await hit(key, rule)) > rule.limit;
}

export async function clientIp(): Promise<string> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() || store.get("x-real-ip") || "unknown";
}

/** Rate limit by caller IP (and optionally an extra key such as an email). */
export async function limitByClient(scope: string, rule: RateLimit, extra?: string): Promise<boolean> {
  const ip = await clientIp();
  return isRateLimited(`${scope}:${ip}${extra ? `:${extra.toLowerCase()}` : ""}`, rule);
}
