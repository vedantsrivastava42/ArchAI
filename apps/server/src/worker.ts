/**
 * Standalone indexing worker. Run as: node dist/worker.js <repoId>
 * Or in dev: npx tsx src/worker.ts <repoId>
 * Uses same env as the server (DATABASE_URL, OPENAI_API_KEY, QDRANT_URL).
 * If this process crashes, the main server stays up.
 *
 * doIndexRepo(repoId) is also used by the BullMQ queue worker (worker-queue.ts).
 */
import dns from "node:dns";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

dns.setDefaultResultOrder("ipv4first");
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config();

import * as db from "./db.js";
import { extractApiRoutes } from "./api-extractor.js";
import { cloneAndListFiles, cleanupTempDir } from "@archai/repo-parser";
import { indexRepo } from "@archai/indexer";
import { searchChunksHolistic } from "@archai/retriever";
import { askOpenAI, parseHolisticResponse, parseDetailedReportResponse, categorizeApiRoutes } from "@archai/llm";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { computeIntelligenceReport } from "./intelligence/index.js";

/**
 * Run the full indexing pipeline for a repo. Caller must have called db.initDb().
 * Sets status to indexing → ready on success; on error sets failed and rethrows (for BullMQ retries).
 */
export async function doIndexRepo(repoId: string): Promise<void> {
  const repo = await db.getRepo(repoId);
  if (!repo) {
    throw new Error(`Repo not found: ${repoId}`);
  }

  const qdrantUrl = process.env.QDRANT_URL ?? "http://localhost:6333";
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const openai = new OpenAI({ apiKey: openaiKey });
  const qdrant = new QdrantClient({ url: qdrantUrl, checkCompatibility: false });

  const debugLog = (step: string, detail?: Record<string, unknown>) =>
    console.log("[worker][clone]", step, detail ?? {});

  let basePath: string | undefined;
  try {
    await db.setRepoStatus(repoId, "indexing");
    console.log("[worker] phase 1: clone", { repoId, url: repo.github_url });

    const { basePath: path, files } = await cloneAndListFiles(repo.github_url, debugLog);
    basePath = path;
    console.log("[worker] phase 1 done", { fileCount: files.length });

    console.log("[worker] phase 2: indexRepo");
    await indexRepo(
      repoId,
      path,
      files,
      openai,
      qdrant,
      (n) => void db.setRepoStatus(repoId, "indexing", null, n)
    );
    await db.setRepoStatus(repoId, "ready", null, files.length);
    console.log("[worker] phase 2 done", { repoId });

    console.log("[worker] phase 3: holistic report");
    const holisticChunks = await searchChunksHolistic(qdrant, openai, repoId);
    const contextChunks = holisticChunks.map((c) => ({
      filePath: c.filePath,
      content: c.content,
      symbolName: c.symbolName,
      symbolType: c.symbolType,
    }));
    const { answer } = await askOpenAI(openai, "Summarize this codebase.", contextChunks, {
      holistic: true,
    });
    const report = parseHolisticResponse(answer);
    await db.saveReport(repoId, report);
    console.log("[worker] phase 3 done", { repoId });

    console.log("[worker] phase 4: API extraction + detailed report");
    const apiRoutes = await extractApiRoutes(path, files);
    let apiRoutesByFeature: { feature: string; routes: { method: string; path: string }[] }[] | undefined;
    if (apiRoutes.length > 0) {
      try {
        apiRoutesByFeature = await categorizeApiRoutes(openai, apiRoutes);
        console.log("[worker] API categorization done", { groupCount: apiRoutesByFeature.length });
      } catch (err) {
        console.warn("[worker] API categorization failed, using flat list", err);
      }
    }
    const detailedChunks = await searchChunksHolistic(qdrant, openai, repoId, {
      maxChunksReturned: 30,
    });
    const detailedContextChunks = detailedChunks.map((c) => ({
      filePath: c.filePath,
      content: c.content,
      symbolName: c.symbolName,
      symbolType: c.symbolType,
    }));
    const { answer: detailedAnswer } = await askOpenAI(
      openai,
      "Generate the detailed technical report.",
      detailedContextChunks,
      { holistic: "detailed" }
    );
    const detailed = parseDetailedReportResponse(detailedAnswer);
    const existing = await db.getReport(repoId);
    const merged = existing
      ? { ...existing, detailed, apiRoutes, apiRoutesByFeature }
      : { detailed, apiRoutes, apiRoutesByFeature };
    await db.saveReport(repoId, merged);
    console.log("[worker] phase 4 done", { repoId, apiRouteCount: apiRoutes.length });

    console.log("[worker] phase 5: Project Intelligence Report");
    try {
      const intelligence = await computeIntelligenceReport(
        path,
        files,
        apiRoutes,
        merged,
        { openai, qdrant, repoId }
      );
      await db.saveReport(repoId, { ...merged, intelligence });
      console.log("[worker] phase 5 done", { repoId, totalScore: intelligence.totalScore });
    } catch (intErr) {
      console.warn("[worker] phase 5 (intelligence) failed, report saved without intelligence", intErr);
    }
  } catch (err) {
    console.error("[worker] failed", repoId, err);
    const message = err instanceof Error ? err.message : "Indexing failed.";
    await db.setRepoStatus(repoId, "failed", message);
    throw err;
  } finally {
    if (basePath) await cleanupTempDir(basePath).catch(() => {});
  }
}

async function main(): Promise<void> {
  const repoId = process.argv[2];
  if (!repoId) {
    console.error("[worker] usage: node dist/worker.js <repoId>");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[worker] Missing DATABASE_URL");
    process.exit(1);
  }

  await db.initDb();
  try {
    await doIndexRepo(repoId);
  } catch {
    process.exit(1);
  }
}

const isRunDirectly =
  process.argv[1]?.endsWith("worker.js") || process.argv[1]?.endsWith("worker.ts");
if (isRunDirectly) {
  main();
}
