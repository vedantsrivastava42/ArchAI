import { Router } from "express";
import * as db from "../db.js";
import { searchChunks } from "@archai/retriever";
import { askOpenAI } from "@archai/llm";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import type { ChatRequest, ChatResponse, RepoReport } from "@archai/types";

const HOLISTIC_PHRASES = [
  "what does this project do",
  "what does it do",
  "overview",
  "main features",
  "architecture",
  "explain this project",
  "describe this codebase",
  "what is this repo",
];

export function isHolisticQuestion(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return HOLISTIC_PHRASES.some((phrase) => normalized.includes(phrase));
}

/** Flatten report sections into one bullet list for chat response */
function reportToOverview(report: RepoReport): string[] {
  const out: string[] = [];
  if (report.purpose?.length) out.push(...report.purpose);
  if (report.features?.length) out.push(...report.features);
  if (report.keyApis?.length) out.push(...report.keyApis);
  if (report.architecture?.length) out.push(...report.architecture);
  if (report.overview?.length && out.length === 0) out.push(...report.overview);
  return out;
}

export function createChatRouter(
  openai: OpenAI,
  qdrant: QdrantClient
): Router {
  const router = Router({ mergeParams: true });

  // POST /api/repos/:id/chat
  router.post("/", async (req, res, next) => {
    try {
      const repoId = (req.params as { id: string }).id;
      const repo = await db.getRepo(repoId);
      if (!repo) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }
      if (repo.status !== "ready") {
        res.status(400).json({
          error: "Repository is not ready for chat. Wait for indexing to complete.",
        });
        return;
      }
      const body = req.body as ChatRequest;
      const message = body?.message;
      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "Invalid request. Provide { message: string }." });
        return;
      }

      if (isHolisticQuestion(message)) {
        const report = await db.getReport(repoId);
        const overview = report ? reportToOverview(report) : [];
        const answer =
          overview.length > 0
            ? "Here's the project overview:\n\n" + overview.map((b) => `• ${b}`).join("\n")
            : "No overview available yet. The report may still be generating.";
        const response: ChatResponse = {
          answer,
          overview: overview.length > 0 ? overview : undefined,
        };
        res.json(response);
        return;
      }

      const history = Array.isArray(body.history) ? body.history : undefined;
      const chunks = await searchChunks(qdrant, openai, repoId, message, 5);
      const contextChunks = chunks.map((c) => ({
        filePath: c.filePath,
        content: c.content,
        symbolName: c.symbolName,
        symbolType: c.symbolType,
      }));
      const { answer, references } = await askOpenAI(openai, message, contextChunks, history);
      const response: ChatResponse = { answer, references };
      res.json(response);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
