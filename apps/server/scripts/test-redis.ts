/**
 * Quick Redis connection test. Loads .env from repo root and pings Redis.
 * Run from repo root: npx tsx apps/server/scripts/test-redis.ts
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config();

const url = process.env.REDIS_URL;
if (!url) {
  console.error("REDIS_URL is required in .env (e.g. Upstash: rediss://default:TOKEN@xxx.upstash.io:6379)");
  process.exit(1);
}
console.log("REDIS_URL:", url.replace(/:[^:@]+@/, ":****@"));

const { pingRedis } = await import("../src/queue.js");
try {
  await pingRedis();
  console.log("Redis connection OK.");
} catch (err) {
  console.error("Redis connection failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
