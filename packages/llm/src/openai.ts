import OpenAI from "openai";
import type { ChatMessage } from "@archai/types";
import type { ContextChunk } from "./prompt.js";
import {
  buildSystemPrompt,
  buildHolisticSystemPrompt,
  buildDetailedReportSystemPrompt,
  buildContextBlock,
} from "./prompt.js";

const MODEL = "gpt-4o";

export interface LLMResult {
  answer: string;
  references?: Array<{ filePath: string; symbolName?: string }>;
}

export interface AskOpenAIOptions {
  history?: ChatMessage[];
  /** true = bullet summary; "detailed" = 10-section technical report */
  holistic?: boolean | "detailed";
}

export async function askOpenAI(
  client: OpenAI,
  query: string,
  chunks: ContextChunk[],
  options?: AskOpenAIOptions | ChatMessage[]
): Promise<LLMResult> {
  const history = Array.isArray(options) ? options : options?.history;
  const holisticOpt = !Array.isArray(options) ? options?.holistic : undefined;
  const holistic = holisticOpt === true;
  const detailed = holisticOpt === "detailed";

  const context = buildContextBlock(chunks, { includeType: holistic || detailed });
  const systemPrompt = detailed
    ? buildDetailedReportSystemPrompt()
    : holistic
      ? buildHolisticSystemPrompt()
      : buildSystemPrompt();
  const systemContent = `${systemPrompt}\n\nContext:\n${context}`;

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
  const userContent = detailed
    ? "Generate the detailed technical report according to the instructions above."
    : holistic
      ? "Summarize this codebase in bullet points according to the instructions above."
      : `User question:\n${query}`;
  messages.push({ role: "user", content: userContent });

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: detailed ? 4096 : 2048,
    messages,
  });
  const text = response.choices[0]?.message?.content ?? "";
  const references = chunks.map((c) => ({
    filePath: c.filePath,
    symbolName: c.symbolName,
  }));
  return { answer: text, references };
}
