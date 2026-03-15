import OpenAI from "openai";
import type { ChatMessage } from "@archai/types";
import type { ContextChunk } from "./prompt.js";
import { buildSystemPrompt, buildContextBlock } from "./prompt.js";

const MODEL = "gpt-4o";

export interface LLMResult {
  answer: string;
  references?: Array<{ filePath: string; symbolName?: string }>;
}

export async function askOpenAI(
  client: OpenAI,
  query: string,
  chunks: ContextChunk[],
  history?: ChatMessage[]
): Promise<LLMResult> {
  const context = buildContextBlock(chunks);
  const systemContent = `${buildSystemPrompt()}\n\nContext:\n${context}`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
  ];
  if (history && history.length > 0) {
    for (const m of history) {
      messages.push({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      });
    }
  }
  messages.push({ role: "user", content: `User question:\n${query}` });

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages,
  });
  const text = response.choices[0]?.message?.content ?? "";
  const references = chunks.map((c) => ({
    filePath: c.filePath,
    symbolName: c.symbolName,
  }));
  return { answer: text, references };
}
