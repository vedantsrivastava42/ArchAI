import { Router } from "express";
import * as db from "../db.js";
import { cloneAndListFiles, cleanupTempDir, isValidGitHubUrl } from "@archai/repo-parser";
import { indexRepo } from "@archai/indexer";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import type { RepoStatusResponse } from "@archai/types";

export function createReposRouter(openai: OpenAI, qdrant: QdrantClient): Router {
  const router = Router();

  // POST /api/repos
  router.post("/", async (req, res, next) => {
    try {
      const { url } = req.body as { url?: string };
      if (!url || typeof url !== "string") {
        res.status(400).json({ error: "Invalid request. Provide { url: string }." });
        return;
      }
      if (!isValidGitHubUrl(url)) {
        res.status(400).json({ error: "Invalid GitHub repository URL." });
        return;
      }
      const name = url.replace(/\.git$/, "").split("/").pop() ?? "repo";
      const defaultBranch = "main";
      const repo = await db.createRepo(url.trim().replace(/\.git$/, ""), name, defaultBranch);
      res.status(202).json({ repoId: repo.id, status: repo.status });

      // Run indexing inline (async after response)
      let basePath: string | undefined;
      try {
        await db.setRepoStatus(repo.id, "indexing");
        const { basePath: path, files } = await cloneAndListFiles(repo.github_url);
        basePath = path;
        await indexRepo(
          repo.id,
          path,
          files,
          openai,
          qdrant,
          (n) => void db.setRepoStatus(repo.id, "indexing", null, n)
        );
        await db.setRepoStatus(repo.id, "ready", null, files.length);
      } catch (err) {
        console.error("[indexing failed]", repo.id, err);
        let message = err instanceof Error ? err.message : "Indexing failed.";
        if (message === "fetch failed" && err instanceof Error && "cause" in err) {
          const cause = (err as Error & { cause?: Error }).cause?.message;
          if (cause) message = `Network error: ${cause}. (Is Qdrant running at QDRANT_URL? Is OPENAI_API_KEY valid?)`;
          else message = "Network error: request failed. Check that Qdrant is running (or QDRANT_URL is set) and OPENAI_API_KEY is valid.";
        }
        await db.setRepoStatus(repo.id, "failed", message);
      } finally {
        if (basePath) await cleanupTempDir(basePath).catch(() => {});
      }
    } catch (e) {
      next(e);
    }
  });

  // GET /api/repos/:id
  router.get("/:id", async (req, res, next) => {
    try {
      const repo = await db.getRepo(req.params.id!);
      if (!repo) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }
      const out: RepoStatusResponse = {
        id: repo.id,
        github_url: repo.github_url,
        name: repo.name,
        status: repo.status,
        error_message: repo.error_message,
        files_processed: repo.files_processed,
      };
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/repos/:id/status
  router.get("/:id/status", async (req, res, next) => {
    try {
      const repo = await db.getRepo(req.params.id!);
      if (!repo) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }
      res.json({
        id: repo.id,
        status: repo.status,
        error_message: repo.error_message,
        files_processed: repo.files_processed,
      });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
