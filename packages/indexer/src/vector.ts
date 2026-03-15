import { QdrantClient } from "@qdrant/js-client-rest";
import type { Chunk } from "@archai/types";

const COLLECTION = "codebase_chunks";
const VECTOR_SIZE = 3072;

export async function ensureCollection(client: QdrantClient): Promise<void> {
  const collections = await client.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION);
  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
    });
  }
}

export async function upsertChunks(
  client: QdrantClient,
  repoId: string,
  chunks: Chunk[],
  embeddings: Map<string, number[]>
): Promise<void> {
  const points = chunks
    .filter((c) => embeddings.has(c.id))
    .map((c) => ({
      id: c.id,
      vector: embeddings.get(c.id)!,
      payload: {
        repo_id: repoId,
        file_path: c.filePath,
        symbol_name: c.symbolName,
        symbol_type: c.symbolType,
        chunk_id: c.id,
        content: c.content,
      },
    }));
  if (points.length === 0) return;
  await client.upsert(COLLECTION, {
    wait: true,
    points,
  });
}

export async function deleteRepoVectors(client: QdrantClient, repoId: string): Promise<void> {
  await client.delete(COLLECTION, {
    filter: {
      must: [{ key: "repo_id", match: { value: repoId } }],
    },
  });
}
