import { Router } from "express";
import * as db from "../db.js";
import { searchChunks } from "@archai/retriever";
import { askOpenAI } from "@archai/llm";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import type { ChatRequest, ChatResponse } from "@archai/types";

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
      const history = Array.isArray(body.history) ? body.history : undefined;
      const chunks = await searchChunks(qdrant, openai, repoId, message, 5);
      const contextChunks = chunks.map((c) => ({
        filePath: c.filePath,
        content: c.content,
        symbolName: c.symbolName,
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
