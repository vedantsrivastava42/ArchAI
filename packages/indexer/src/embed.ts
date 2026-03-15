import OpenAI from "openai";
import type { Chunk } from "@archai/types";

const MODEL = "text-embedding-3-large";
const DIMENSION = 3072;
const BATCH_SIZE = 100;

export const EMBEDDING_DIMENSION = DIMENSION;

export async function embedChunks(
  openai: OpenAI,
  chunks: Chunk[]
): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);
    const res = await openai.embeddings.create({
      model: MODEL,
      input: texts,
      dimensions: DIMENSION,
    });
    res.data.forEach((d, idx) => {
      const chunk = batch[idx];
      if (chunk && d.embedding) map.set(chunk.id, d.embedding);
    });
  }
  return map;
}

export async function embedQuery(openai: OpenAI, query: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: MODEL,
    input: query,
    dimensions: DIMENSION,
  });
  return res.data[0]?.embedding ?? [];
}
