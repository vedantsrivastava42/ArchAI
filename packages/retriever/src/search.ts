import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { embedQuery } from "@archai/indexer";

const COLLECTION = "codebase_chunks";

export interface SearchResult {
  filePath: string;
  symbolName: string;
  symbolType: string;
  content: string;
  chunkId: string;
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
  return points.map((p) => {
    const payload = p.payload ?? {};
    return {
      filePath: (payload.file_path as string) ?? "",
      symbolName: (payload.symbol_name as string) ?? "",
      symbolType: (payload.symbol_type as string) ?? "",
      content: (payload.content as string) ?? "",
      chunkId: (payload.chunk_id as string) ?? "",
    };
  });
}
