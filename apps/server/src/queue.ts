/**
 * BullMQ queue for repo indexing jobs. API adds jobs here; worker-queue processes them.
 * Uses connection options (not an ioredis instance) so BullMQ uses its bundled ioredis.
 * Supports redis:// and rediss:// (TLS), with optional username/password (e.g. Upstash).
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config();

import { Queue } from "bullmq";

const _raw = process.env.REDIS_URL;
if (!_raw) {
  throw new Error("REDIS_URL is required (e.g. Upstash: rediss://default:TOKEN@xxx.upstash.io:6379)");
}
const REDIS_URL: string = _raw;

export type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: object;
  maxRetriesPerRequest: number | null;
};

function parseRedisUrl(url: string): Omit<RedisConnectionOptions, "maxRetriesPerRequest"> {
  try {
    const u = new URL(url);
    const host = u.hostname || "localhost";
    const port = u.port ? parseInt(u.port, 10) : 6379;
    const username = u.username || undefined;
    const password = u.password || undefined;
    const tls = u.protocol === "rediss:" ? {} : undefined;
    return {
      host,
      port,
      ...(username && { username }),
      ...(password && { password }),
      ...(tls && { tls }),
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

/** Connection options for BullMQ Queue/Worker. Export for worker-queue. */
export function getRedisConnectionOptions(maxRetries: number | null = 20): RedisConnectionOptions {
  return { ...parseRedisUrl(REDIS_URL), maxRetriesPerRequest: maxRetries };
}

const connectionOptions = getRedisConnectionOptions(20);

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  timeout: 600_000, // 10 minutes
};

export const repoIndexQueue = new Queue("repoIndex", {
  connection: connectionOptions,
  defaultJobOptions,
});

// Prevent unhandled Redis connection errors when Redis is down (e.g. in dev without docker)
repoIndexQueue.on("error", (err: Error) => {
  console.warn("[queue] Redis connection error:", err.message);
});

/** Ping Redis (e.g. at startup). Uses dynamic import to avoid type conflict with BullMQ's ioredis. */
export async function pingRedis(): Promise<void> {
  const { Redis } = await import("ioredis");
  const opts = getRedisConnectionOptions(1);
  const client = new Redis(opts);
  await client.ping();
  await client.quit();
}

export async function addIndexRepoJob(repoId: string): Promise<void> {
  await repoIndexQueue.add("indexRepo", { repoId });
}
