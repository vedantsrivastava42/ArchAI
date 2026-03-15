import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { extractChunks } from "./chunk.js";
import { embedChunks } from "./embed.js";
import { ensureCollection, upsertChunks } from "./vector.js";

export type ProgressCallback = (filesProcessed: number) => void;

export async function indexRepo(
  repoId: string,
  basePath: string,
  files: string[],
  openai: OpenAI,
  qdrant: QdrantClient,
  onProgress?: ProgressCallback
): Promise<void> {
  console.log("[indexer] step 1: ensureCollection (Qdrant)");
  await ensureCollection(qdrant);
  console.log("[indexer] step 1 done");

  console.log("[indexer] step 2: extractChunks (parse)");
  const chunks = await extractChunks(repoId, basePath, files, onProgress);
  console.log("[indexer] step 2 done", { chunkCount: chunks.length });

  console.log("[indexer] step 3: embedChunks (OpenAI)");
  const embeddings = await embedChunks(openai, chunks);
  console.log("[indexer] step 3 done", { embeddingCount: embeddings.size });

  console.log("[indexer] step 4: upsertChunks (Qdrant)");
  await upsertChunks(qdrant, repoId, chunks, embeddings);
  console.log("[indexer] step 4 done");
}

export { extractChunks } from "./chunk.js";
export { embedChunks, embedQuery, EMBEDDING_DIMENSION } from "./embed.js";
export { ensureCollection, upsertChunks, deleteRepoVectors } from "./vector.js";
export { parseFile } from "./parse.js";
