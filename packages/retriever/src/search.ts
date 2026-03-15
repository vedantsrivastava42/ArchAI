import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { embedQuery } from "@archai/indexer";

const COLLECTION = "codebase_chunks";

const TOPK_PER_QUERY = 4;
const MAX_CHUNKS_RETURNED = 20;
const MAX_CHUNKS_PER_FILE = 2;
const MAX_CHUNKS_PER_FOLDER = 4;

/** 10 fixed semantic queries for holistic overview (architecture, flows, domain, integrations) */
export const HOLISTIC_QUERIES = [
  "What is the main purpose of this project and what domain problem does it solve",
  "Where does the application start and what are the main entry points of the system",
  "What major features or capabilities are implemented in this project",
  "What APIs, controllers, or external interfaces are implemented in this project",
  "What core services, business logic modules, or processing components exist in this project",
  "How does the project structure and manage its data models and persistence layer",
  "What external services, APIs, or third party integrations are used in this project",
  "What background jobs, queues, or asynchronous processing workflows exist in this project",
  "What authentication, authorization, or security mechanisms are implemented in this project",
  "How are the main components of the system structured and how do they interact with each other",
];

export interface SearchResult {
  filePath: string;
  symbolName: string;
  symbolType: string;
  content: string;
  chunkId: string;
}

function pointToResult(p: { payload?: Record<string, unknown> | null }): SearchResult {
  const payload = p.payload ?? {};
  return {
    filePath: (payload.file_path as string) ?? "",
    symbolName: (payload.symbol_name as string) ?? "",
    symbolType: (payload.symbol_type as string) ?? "",
    content: (payload.content as string) ?? "",
    chunkId: (payload.chunk_id as string) ?? "",
  };
}

export async function searchChunks(
  qdrant: QdrantClient,
  openai: OpenAI,
  repoId: string,
  query: string,
  topK = 5
): Promise<SearchResult[]> {
  const vector = await embedQuery(openai, query);
  const points = await qdrant.search(COLLECTION, {
    vector,
    limit: topK,
    filter: {
      must: [{ key: "repo_id", match: { value: repoId } }],
    },
    with_payload: true,
  });
  return points.map(pointToResult);
}

export interface SearchChunksHolisticOptions {
  topKPerQuery?: number;
  maxChunksReturned?: number;
  maxChunksPerFile?: number;
  maxChunksPerFolder?: number;
  preferChunksWithSymbols?: boolean;
}

/** Multi-query retrieval: 10 queries, merge, dedupe, diversity filter, return up to 20 chunks. */
export async function searchChunksHolistic(
  qdrant: QdrantClient,
  openai: OpenAI,
  repoId: string,
  options: SearchChunksHolisticOptions = {}
): Promise<SearchResult[]> {
  const topKPerQuery = options.topKPerQuery ?? TOPK_PER_QUERY;
  const maxChunksReturned = options.maxChunksReturned ?? MAX_CHUNKS_RETURNED;
  const maxChunksPerFile = options.maxChunksPerFile ?? MAX_CHUNKS_PER_FILE;
  const maxChunksPerFolder = options.maxChunksPerFolder ?? MAX_CHUNKS_PER_FOLDER;
  const preferChunksWithSymbols = options.preferChunksWithSymbols ?? true;

  const allResults: SearchResult[] = [];
  const seenChunkIds = new Set<string>();

  for (const query of HOLISTIC_QUERIES) {
    const vector = await embedQuery(openai, query);
    const points = await qdrant.search(COLLECTION, {
      vector,
      limit: topKPerQuery,
      filter: {
        must: [{ key: "repo_id", match: { value: repoId } }],
      },
      with_payload: true,
    });
    for (const p of points) {
      const r = pointToResult(p);
      if (!seenChunkIds.has(r.chunkId)) {
        seenChunkIds.add(r.chunkId);
        allResults.push(r);
      }
    }
  }

  let ordered = allResults;
  if (preferChunksWithSymbols) {
    ordered = [...allResults].sort((a, b) => {
      const aHas = a.symbolName?.trim() ? 1 : 0;
      const bHas = b.symbolName?.trim() ? 1 : 0;
      return bHas - aHas;
    });
  }

  const byFile = new Map<string, SearchResult[]>();
  for (const r of ordered) {
    const list = byFile.get(r.filePath) ?? [];
    if (list.length < maxChunksPerFile) {
      list.push(r);
      byFile.set(r.filePath, list);
    }
  }
  const afterFileCap: SearchResult[] = [];
  for (const list of byFile.values()) afterFileCap.push(...list);

  const getFolder = (filePath: string) =>
    filePath.split(/[/\\]/).slice(0, -1).join("/") || "/";
  const byFolder = new Map<string, SearchResult[]>();
  for (const r of afterFileCap) {
    const folder = getFolder(r.filePath);
    const list = byFolder.get(folder) ?? [];
    if (list.length < maxChunksPerFolder) {
      list.push(r);
      byFolder.set(folder, list);
    }
  }
  const afterFolderCap: SearchResult[] = [];
  for (const list of byFolder.values()) afterFolderCap.push(...list);

  return afterFolderCap.slice(0, maxChunksReturned);
}
