import type { DetailedReport } from "@archai/types";

export interface ContextChunk {
  filePath: string;
  content: string;
  symbolName?: string;
  /** e.g. "function" | "class" | "method"; used for TYPE line when includeType is true */
  symbolType?: string;
}

/** Derive display type from path and symbolType for holistic context */
function displayType(chunk: ContextChunk): string {
  const path = chunk.filePath.toLowerCase();
  if (/controller|\.controller\./.test(path)) return "controller";
  if (/service|\.service\./.test(path)) return "service";
  if (/model|\.model\.|repository|\.repository\./.test(path)) return "model";
  if (chunk.symbolType) return chunk.symbolType;
  return "code";
}

export function buildSystemPrompt(): string {
  return `You are an expert software engineer analyzing a codebase. Use only the provided context to answer. Explain clearly and reference file paths.`;
}

export function buildHolisticSystemPrompt(): string {
  return `You are analyzing a software repository. Based only on the provided code snippets, produce a holistic overview.

Output format: bullet points only. No paragraphs. List only the core/main points. Keep each bullet one line.

Structure your response with these sections (use markdown headers and bullets):
## Purpose
- (what the project does, domain problem it solves)

## Features
- (main features or capabilities)

## Key APIs / Interfaces
- (routes, controllers, endpoints, external interfaces)

## Architecture
- (how components are structured and interact, key technologies)

Do not invent features not visible in the code. Use only what the snippets show.`;
}

/** Prompt for deep technical report (10 sections, paragraph-style). */
export function buildDetailedReportSystemPrompt(): string {
  return `You are analyzing a software repository. Based only on the provided code snippets, generate a detailed technical report.

Analyze the repository and explain the system. Do not give generic summaries. Explain based only on the provided code.

Structure your response with exactly these markdown sections (use ## and the exact titles). Write full paragraphs, not bullets:

## 1. Project Overview
Explain what the system actually is.

## 2. Core Problem & Domain
Explain why the project exists and what domain problem it solves.

## 3. Feature Breakdown
Describe functional subsystems and what each does.

## 4. System Architecture
Explain architecture (e.g. serverless, layers, how frontend/backend interact).

## 5. Component Responsibilities
Break down main modules and their roles.

## 6. API Surface
List and explain APIs, routes, or external interfaces with context.

## 7. Data Model & Storage
Explain database structure, models, or persistence.

## 8. External Integrations
What external services, APIs, or third-party integrations are used.

## 9. Request Lifecycle
Describe a representative flow (e.g. from user action to response).

## 10. Advanced Engineering Decisions
Notable technical choices (e.g. serverless, specific libraries, patterns).`;
}

/** Section key to header pattern (number + title). */
const DETAILED_SECTIONS: Array<{ key: keyof DetailedReport; pattern: RegExp }> = [
  { key: "projectOverview", pattern: /##\s*1\.\s*Project Overview/i },
  { key: "coreProblemAndDomain", pattern: /##\s*2\.\s*Core Problem\s*&\s*Domain/i },
  { key: "featureBreakdown", pattern: /##\s*3\.\s*Feature Breakdown/i },
  { key: "systemArchitecture", pattern: /##\s*4\.\s*System Architecture/i },
  { key: "componentResponsibilities", pattern: /##\s*5\.\s*Component Responsibilities/i },
  { key: "apiSurface", pattern: /##\s*6\.\s*API Surface/i },
  { key: "dataModelAndStorage", pattern: /##\s*7\.\s*Data Model\s*&\s*Storage/i },
  { key: "externalIntegrations", pattern: /##\s*8\.\s*External Integrations/i },
  { key: "requestLifecycle", pattern: /##\s*9\.\s*Request Lifecycle/i },
  { key: "advancedEngineeringDecisions", pattern: /##\s*10\.\s*Advanced Engineering Decisions/i },
];

/** Parse LLM detailed report response into 10 sections. */
export function parseDetailedReportResponse(text: string): DetailedReport {
  const result: DetailedReport = {};
  const raw = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < DETAILED_SECTIONS.length; i++) {
    const curr = DETAILED_SECTIONS[i];
    const next = DETAILED_SECTIONS[i + 1];
    const startMatch = raw.match(curr.pattern);
    if (!startMatch || startMatch.index == null) continue;
    const start = startMatch.index + startMatch[0].length;
    const end = next ? (raw.match(next.pattern)?.index ?? raw.length) : raw.length;
    const content = raw.slice(start, end).trim();
    if (content) (result as Record<string, string>)[curr.key as string] = content;
  }
  return result;
}

/** Match bullet line: - or * at start, optional space */
const BULLET_REGEX = /^\s*[-*]\s+(.+)$/;

/** Parse LLM holistic response into sectioned bullet arrays. Expects ## Section headers and - bullets. */
export function parseHolisticResponse(text: string): {
  purpose: string[];
  features: string[];
  keyApis: string[];
  architecture: string[];
  overview: string[];
} {
  const result = {
    purpose: [] as string[],
    features: [] as string[],
    keyApis: [] as string[],
    architecture: [] as string[],
    overview: [] as string[],
  };
  let current: keyof typeof result = "overview";
  const allBullets: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const headerMatch = line.match(/^##\s*(.+)$/);
    if (headerMatch) {
      const name = headerMatch[1].toLowerCase().trim();
      if (name.includes("purpose")) current = "purpose";
      else if (name.includes("feature")) current = "features";
      else if (name.includes("api") || name.includes("interface")) current = "keyApis";
      else if (name.includes("architecture")) current = "architecture";
      continue;
    }
    const bulletMatch = line.match(BULLET_REGEX);
    if (bulletMatch) {
      const bullet = bulletMatch[1].trim();
      if (bullet) {
        result[current].push(bullet);
        allBullets.push(bullet);
      }
    }
  }
  if (result.overview.length === 0 && allBullets.length > 0) {
    result.overview = allBullets;
  }
  return result;
}

export interface BuildContextBlockOptions {
  includeType?: boolean;
}

export function buildContextBlock(
  chunks: ContextChunk[],
  options: BuildContextBlockOptions = {}
): string {
  const includeType = options.includeType === true;
  return chunks
    .map((c) => {
      if (includeType) {
        const type = displayType(c);
        return `FILE: ${c.filePath}${c.symbolName ? ` (${c.symbolName})` : ""}\nTYPE: ${type}\n\nCODE:\n${c.content}`;
      }
      return `FILE: ${c.filePath}${c.symbolName ? ` (${c.symbolName})` : ""}\nCODE:\n${c.content}`;
    })
    .join("\n\n---\n\n");
}
