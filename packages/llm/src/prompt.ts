export interface ContextChunk {
  filePath: string;
  content: string;
  symbolName?: string;
}

export function buildSystemPrompt(): string {
  return `You are an expert software engineer analyzing a codebase. Use only the provided context to answer. Explain clearly and reference file paths.`;
}

export function buildContextBlock(chunks: ContextChunk[]): string {
  return chunks
    .map(
      (c) =>
        `FILE: ${c.filePath}${c.symbolName ? ` (${c.symbolName})` : ""}\nCODE:\n${c.content}`
    )
    .join("\n\n---\n\n");
}
