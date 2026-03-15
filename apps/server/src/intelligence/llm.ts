/**
 * LLM calls for intelligence: architecture blurbs, domain, scalability estimate, feature confirmation, integration verification.
 */
import OpenAI from "openai";
import type { RepoReport } from "@archai/types";
import type { IntelligenceBreakdownItem } from "@archai/types";
import type { FeatureEvidenceItem } from "@archai/types";
import { INTEGRATION_CATEGORIES } from "./ai-integrations.js";

export interface IntelligenceLLMResult {
  architecture?: { detected: string[]; missing: string[] };
  domain?: string;
  scalabilityEstimate?: string;
  scalabilityReasoning?: string;
  /** LLM-confirmed features: name + confirmed (actually implemented in code) */
  advancedFeaturesConfirmation?: Array<{ name: string; confirmed: boolean }>;
  /** LLM-confirmed integrations from code: only confirmed true when real usage exists; evidence for debugging/UI */
  integrationsConfirmation?: Array<{ name: string; confirmed: boolean; evidence?: string }>;
}

function buildReportSummary(report: RepoReport): string {
  const parts: string[] = [];
  if (report.purpose?.length) parts.push(`Purpose: ${report.purpose.join("; ")}`);
  if (report.features?.length) parts.push(`Features: ${report.features.join("; ")}`);
  if (report.architecture?.length) parts.push(`Architecture: ${report.architecture.join("; ")}`);
  if (report.detailed?.systemArchitecture) parts.push(`System: ${report.detailed.systemArchitecture.slice(0, 500)}`);
  if (report.detailed?.dataModelAndStorage) parts.push(`Data: ${report.detailed.dataModelAndStorage.slice(0, 300)}`);
  return parts.join("\n");
}

export async function fetchIntelligenceFromLLM(
  openai: OpenAI,
  report: RepoReport,
  contextChunks: Array<{ filePath: string; content: string; symbolName?: string; symbolType?: string }>,
  detectedFeatureNames?: string[]
): Promise<IntelligenceLLMResult> {
  const summary = buildReportSummary(report);
  const contextBlock = contextChunks
    .slice(0, 15)
    .map(
      (c) =>
        `FILE: ${c.filePath}${c.symbolName ? ` (${c.symbolName})` : ""}\nCODE:\n${c.content.slice(0, 800)}`
    )
    .join("\n\n---\n\n");

  const featuresBlurb =
    detectedFeatureNames?.length ?
      `\nDetected features (from dependency/import/usage scan) to verify: ${detectedFeatureNames.join(", ")}.\nFor each feature that is actually implemented with real usage in the code above, set "confirmed": true. Otherwise false.`
      : "";

  const integrationCategoriesList = INTEGRATION_CATEGORIES.map((c) => `"${c}"`).join(", ");
  const integrationsBlurb = `

Integration verification (use only the code context above). Categories: ${integrationCategoriesList}.
For each category, set "confirmed": true ONLY if:
- The SDK/API is imported AND used in executable code AND appears in runtime logic (not in comments or test-only usage).
Do NOT confirm if: dependency only; import only; comment or variable name merely mentioning the integration.
When confirmed is true, set "evidence" to a short string (e.g. "stripe.paymentIntents.create in services/payment.ts").`;

  const systemPrompt = `You are analyzing a codebase for a Project Intelligence Report. Use only the provided context and summary. Reply with valid JSON only, no markdown.

Summary of existing report:
${summary}

Code context:
${contextBlock}
${featuresBlurb}
${integrationsBlurb}

Respond with a single JSON object with these optional keys (use null if unsure):
- "architecture": { "detected": string[], "missing": string[] } — e.g. detected: ["Controller-service pattern"], missing: ["Dependency injection"]
- "domain": string — one of: EdTech, E-commerce, Social Platform, SaaS, DevTools, or a short label (e.g. "CRM")
- "scalabilityEstimate": string — e.g. "500–1500 concurrent users"
- "scalabilityReasoning": string — 1–2 sentences on why (e.g. "Single backend instance, no caching")
- "advancedFeaturesConfirmation": [ { "name": string, "confirmed": boolean } ] — for each detected feature, confirm if it is actually implemented with real usage in the code (match name to detected list). Only set confirmed true when you see real integration (e.g. Redis client used, queue.add called), not just comments or variable names.
- "integrationsConfirmation": [ { "name": string, "confirmed": boolean, "evidence": string | null } ] — for each integration category (${integrationCategoriesList}), confirm only if you see real usage in the code; when confirmed true include a short evidence string (file/symbol or call site).`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Output the JSON object only.",
        },
      ],
      max_tokens: 600,
      temperature: 0.2,
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw.replace(/^```json?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as IntelligenceLLMResult;
    return parsed;
  } catch (err) {
    console.warn("[intelligence] LLM call failed", err);
    return {};
  }
}

export function mergeArchitectureFromLLM(
  fileItem: IntelligenceBreakdownItem,
  llm: IntelligenceLLMResult["architecture"]
): IntelligenceBreakdownItem {
  if (!llm?.detected?.length && !llm?.missing?.length) return fileItem;
  return {
    ...fileItem,
    detected: llm.detected?.length
      ? [...new Set([...(fileItem.detected ?? []), ...llm.detected])]
      : fileItem.detected,
    missing: llm.missing?.length ? llm.missing : fileItem.missing,
  };
}

/** Upgrade feature confidence when LLM confirms real implementation */
export function mergeLLMFeatureConfirmation(
  evidenceList: FeatureEvidenceItem[],
  confirmation: Array<{ name: string; confirmed: boolean }>
): FeatureEvidenceItem[] {
  const confirmedSet = new Set(
    confirmation.filter((c) => c.confirmed).map((c) => c.name.toLowerCase().trim())
  );
  return evidenceList.map((item) => {
    if (!confirmedSet.has(item.name.toLowerCase().trim())) return item;
    const next: FeatureEvidenceItem = { ...item, evidence: { ...item.evidence } };
    if (item.confidence === "signal") next.confidence = "partial";
    else if (item.confidence === "partial") next.confidence = "full";
    return next;
  });
}
