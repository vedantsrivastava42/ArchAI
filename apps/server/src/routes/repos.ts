import { Router } from "express";
import * as db from "../db.js";
import { addIndexRepoJob } from "../queue.js";
import { isValidGitHubUrl } from "@archai/repo-parser";
import { deleteRepoVectors } from "@archai/indexer";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import type { RepoStatusResponse } from "@archai/types";

export function createReposRouter(_openai: OpenAI, qdrant: QdrantClient): Router {
  const router = Router();

  // GET /api/repos — list all repos (must be before /:id)
  router.get("/", async (_req, res, next) => {
    try {
      const repos = await db.listRepos();
      res.json(
        repos.map((r) => ({
          id: r.id,
          github_url: r.github_url,
          name: r.name,
          status: r.status,
          error_message: r.error_message,
          files_processed: r.files_processed,
          created_at: r.created_at,
        }))
      );
    } catch (e) {
      next(e);
    }
  });

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
      console.log("[repos] created repo", { id: repo.id, github_url: repo.github_url, status: repo.status });
      res.status(202).json({ repoId: repo.id, status: repo.status });

      await addIndexRepoJob(repo.id);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/repos/:id
  router.get("/:id", async (req, res, next) => {
    try {
      const id = req.params.id!;
      const repo = await db.getRepo(id);
      console.log("[repos] GET by id", { id, found: !!repo, status: repo?.status });
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

  // GET /api/repos/:id/report — holistic overview (bullets) stored at index time
  router.get("/:id/report", async (req, res, next) => {
    try {
      const id = req.params.id!;
      const repo = await db.getRepo(id);
      if (!repo) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }
      const report = await db.getReport(id);
      res.json(report ?? { overview: [] });
    } catch (e) {
      next(e);
    }
  });

  // GET /api/repos/:id/status
  router.get("/:id/status", async (req, res, next) => {
    try {
      const id = req.params.id!;
      const repo = await db.getRepo(id);
      console.log("[repos] GET status by id", { id, found: !!repo, status: repo?.status });
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

  // DELETE /api/repos/:id
  router.delete("/:id", async (req, res, next) => {
    try {
      const id = req.params.id!;
      const repo = await db.getRepo(id);
      if (!repo) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }
      try {
        await deleteRepoVectors(qdrant, id);
      } catch (e) {
        console.warn("[repos] deleteRepoVectors failed (continuing)", id, e);
      }
      const deleted = await db.deleteRepo(id);
      if (!deleted) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  });

  return router;
}
