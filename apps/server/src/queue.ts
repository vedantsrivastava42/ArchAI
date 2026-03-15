/**
 * BullMQ queue for repo indexing jobs. API adds jobs here; worker-queue processes them.
 * Uses connection options (not an ioredis instance) so BullMQ uses its bundled ioredis.
 */
import { Queue } from "bullmq";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

function parseRedisUrl(url: string): { host: string; port: number } {
  try {
    const u = new URL(url);
    return { host: u.hostname || "localhost", port: u.port ? parseInt(u.port, 10) : 6379 };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

const connectionOptions = { ...parseRedisUrl(REDIS_URL), maxRetriesPerRequest: 20 };

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
  const client = new Redis(REDIS_URL, { maxRetriesPerRequest: 1 });
  await client.ping();
  await client.quit();
}

export async function addIndexRepoJob(repoId: string): Promise<void> {
  await repoIndexQueue.add("indexRepo", { repoId });
}
