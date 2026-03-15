import type { Chunk } from "@archai/types";
import { parseFile } from "./parse.js";

export type ProgressCallback = (filesProcessed: number) => void;

export async function extractChunks(
  repoId: string,
  basePath: string,
  files: string[],
  onProgress?: ProgressCallback
): Promise<Chunk[]> {
  const allChunks: Chunk[] = [];
  let processed = 0;
  for (const file of files) {
    try {
      const chunks = await parseFile(file, basePath, repoId);
      allChunks.push(...chunks);
    } catch {
      // Skip unsupported or unparseable files
    }
    processed += 1;
    onProgress?.(processed);
  }
  return allChunks;
}
