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
  await ensureCollection(qdrant);
  const chunks = await extractChunks(repoId, basePath, files, onProgress);
  const embeddings = await embedChunks(openai, chunks);
  await upsertChunks(qdrant, repoId, chunks, embeddings);
}

export { extractChunks } from "./chunk.js";
export { embedChunks, embedQuery, EMBEDDING_DIMENSION } from "./embed.js";
export { ensureCollection, upsertChunks, deleteRepoVectors } from "./vector.js";
export { parseFile } from "./parse.js";
