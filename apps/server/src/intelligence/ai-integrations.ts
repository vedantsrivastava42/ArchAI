/**
 * AI & Integrations (10 pts): Cloud storage (AWS) 4, Cloud storage 2, AI APIs 4, AI pipelines 8. Cap 10.
 * Payment gateway and Basic external APIs removed (payment is in Advanced Features).
 */
import type { IntelligenceBreakdownItem } from "@archai/types";
import { readFile } from "fs/promises";
import { join } from "path";

const AI_INTEGRATIONS_MAX = 10;

export const INTEGRATION_RULES: Record<string, { points: number }> = {
  "Cloud storage (AWS)": { points: 4 },
  "Cloud storage": { points: 2 },
  "AI APIs (OpenAI, etc.)": { points: 4 },
  "AI pipelines / automation": { points: 8 },
};
export const INTEGRATION_CATEGORIES = Object.keys(INTEGRATION_RULES);

/** Compute score and max from a list of detected integration names (only known categories count; cap 10). */
export function scoreFromDetectedList(detected: string[]): { score: number; max: number } {
  let total = 0;
  for (const name of detected) {
    const rule = INTEGRATION_RULES[name];
    if (rule) total += rule.points;
  }
  return {
    score: Math.min(total, AI_INTEGRATIONS_MAX),
    max: AI_INTEGRATIONS_MAX,
  };
}

async function readPackageJson(basePath: string, files: string[]): Promise<Record<string, unknown>> {
  const pkgPath = files.find((f) => f.replace(/\\/g, "/").toLowerCase() === "package.json");
  if (!pkgPath) return {};
  try {
    const raw = await readFile(join(basePath, pkgPath), "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const DEPS_PATTERNS = {
  cloudStorageAws: /\baws\b|aws-sdk|@aws-sdk\/client-s3|multer-s3/i,
  cloudStorageOther: /cloudinary|gcs|google-cloud\/storage/i,
  aiApi: /openai|anthropic|@anthropic-ai|cohere|replicate|together|ollama/i,
  aiPipeline: /langchain|llamaindex|@langchain|vectorstore|embedding/i,
};

function buildDetectedFromDeps(depKeys: string): string[] {
  const detected: string[] = [];
  if (DEPS_PATTERNS.cloudStorageAws.test(depKeys)) {
    detected.push("Cloud storage (AWS)");
  } else if (DEPS_PATTERNS.cloudStorageOther.test(depKeys)) {
    detected.push("Cloud storage");
  }
  if (DEPS_PATTERNS.aiApi.test(depKeys)) detected.push("AI APIs (OpenAI, etc.)");
  if (DEPS_PATTERNS.aiPipeline.test(depKeys)) detected.push("AI pipelines / automation");
  return detected;
}

export async function scoreAiIntegrations(
  basePath: string,
  files: string[]
): Promise<IntelligenceBreakdownItem> {
  const pkg = await readPackageJson(basePath, files);
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };
  const depKeys = Object.keys(deps).join(" ");
  const detected = buildDetectedFromDeps(depKeys);
  const { score, max } = scoreFromDetectedList(detected);

  const missing: string[] = [];
  if (!detected.some((d) => d.includes("AI"))) missing.push("AI APIs or pipelines");

  return {
    score,
    max,
    detected: detected.length ? detected : undefined,
    missing: missing.length ? missing : undefined,
  };
}
