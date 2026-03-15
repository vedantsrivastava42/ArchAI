/**
 * BullMQ worker process for repo indexing. Run alongside the API server.
 * Dev: npm run worker:queue   Production: node dist/worker-queue.js
 * Consumes jobs from repoIndex queue; calls doIndexRepo. Handles retries and sets DB failed when exhausted.
 */
import dns from "node:dns";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

dns.setDefaultResultOrder("ipv4first");
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config();

import { Worker, type Job } from "bullmq";
import * as db from "./db.js";
import { doIndexRepo } from "./worker.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

function parseRedisUrl(url: string): { host: string; port: number } {
  try {
    const u = new URL(url);
    return { host: u.hostname || "localhost", port: u.port ? parseInt(u.port, 10) : 6379 };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

const concurrency = Math.min(4, Math.max(2, parseInt(process.env.INDEX_WORKER_CONCURRENCY ?? "4", 10) || 4));

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[worker-queue] Missing DATABASE_URL");
    process.exit(1);
  }

  await db.initDb();

  const connection = { ...parseRedisUrl(REDIS_URL), maxRetriesPerRequest: null as number | null };

  const worker = new Worker<{ repoId: string }>(
    "repoIndex",
    async (job: Job<{ repoId: string }>) => {
      const { repoId } = job.data;
      if (!repoId) {
        throw new Error("Job data missing repoId");
      }
      await doIndexRepo(repoId);
    },
    {
      connection,
      concurrency,
    }
  );

  worker.on("failed", (job: Job<{ repoId: string }> | undefined, err: Error) => {
    if (!job?.data?.repoId) return;
    const attempts = job.opts.attempts ?? 3;
    if (job.attemptsMade >= attempts) {
      const message = err?.message ?? job.failedReason ?? "Indexing failed.";
      db.setRepoStatus(job.data.repoId, "failed", message).catch((e) =>
        console.error("[worker-queue] setRepoStatus failed", e)
      );
    }
  });

  worker.on("error", (err) => {
    console.error("[worker-queue] worker error", err);
  });

  console.log("[worker-queue] started", { concurrency, redis: REDIS_URL });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
