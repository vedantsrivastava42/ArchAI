/**
 * Express entry — load env, create app, attach routes, start server.
 * Env must be loaded before any code that reads process.env (e.g. db).
 */
import dns from "node:dns";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

dns.setDefaultResultOrder("ipv4first");
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config();

// Log unhandled rejections and uncaught errors so we see what kills the process
process.on("unhandledRejection", (reason, promise) => {
  console.error("[process] unhandledRejection – this may crash the server", { reason, promise });
  if (reason instanceof Error) console.error("[process] stack", reason.stack);
});
process.on("uncaughtException", (err) => {
  console.error("[process] uncaughtException – server may exit", err);
  console.error("[process] stack", err.stack);
});

import express from "express";
import cors from "cors";
import { createReposRouter } from "./routes/repos.js";
import { createChatRouter } from "./routes/chat.js";
import { initDb, runMigrations } from "./db.js";
import { pingRedis } from "./queue.js";
import { errorHandler } from "./middleware/errors.js";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

const PORT = Number(process.env.PORT) || 3001;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const qdrantUrl = process.env.QDRANT_URL ?? "http://localhost:6333";
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!databaseUrl) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }
  if (!openaiKey) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }

  await initDb();
  await runMigrations();

  const openai = new OpenAI({ apiKey: openaiKey });
  const qdrant = new QdrantClient({ url: qdrantUrl, checkCompatibility: false });

  try {
    await qdrant.getCollections();
    console.log("Qdrant OK at", qdrantUrl);
  } catch (e) {
    console.warn("Qdrant not reachable at", qdrantUrl, "- indexing and chat will fail until it is running.");
  }

  try {
    await pingRedis();
    console.log("Redis OK (indexing queue ready)");
  } catch (e) {
    console.warn(
      "Redis not reachable - indexing jobs will not be processed until Redis is running and the queue worker is started."
    );
  }

  const app = express();
  // Production: set CORS_ORIGIN to your frontend URL (e.g. https://your-app.vercel.app). Dev: omit to allow any origin.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      origin: corsOrigin
        ? corsOrigin.split(",").map((o) => o.trim())
        : true,
    })
  );
  app.use(express.json());

  app.use("/api/repos", createReposRouter(openai, qdrant));
  app.use("/api/repos/:id/chat", createChatRouter(openai, qdrant));

  app.use(errorHandler);

  // Listen on 0.0.0.0 so the server accepts connections from the internet (e.g. when deployed on EC2).
  const host = process.env.HOST ?? "0.0.0.0";
  app.listen(PORT, host, () => {
    console.log(`Server listening on http://${host}:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
