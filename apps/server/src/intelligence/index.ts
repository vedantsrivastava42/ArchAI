/**
 * Project Intelligence Report: orchestrate all scorers and optional LLM.
 */
import type {
  ApiRoute,
  RepoReport,
  ProjectIntelligenceReport,
  ProjectIntelligenceTier,
  IntelligenceBreakdownItem,
} from "@archai/types";
import OpenAI from "openai";
import type { QdrantClient } from "@qdrant/js-client-rest";
import { searchChunksHolistic } from "@archai/retriever";
import { scoreCodebaseScale } from "./scale.js";
import { scoreDevOps } from "./devops.js";
import { scoreBackendApis } from "./api-maturity.js";
import { scoreDataModeling } from "./data-modeling.js";
import { scoreArchitectureFromFiles } from "./architecture.js";
import { scoreAdvancedFeatures } from "./features.js";
import {
  scoreAiIntegrations,
  scoreFromDetectedList,
  INTEGRATION_RULES,
  INTEGRATION_CATEGORIES,
} from "./ai-integrations.js";
import { getDomainSuggestions } from "./domain.js";
import { buildScalingRecommendations } from "./scalability.js";
import {
  fetchIntelligenceFromLLM,
  mergeArchitectureFromLLM,
  mergeLLMFeatureConfirmation,
} from "./llm.js";

export interface ComputeIntelligenceOptions {
  openai?: OpenAI;
  qdrant?: QdrantClient;
  repoId?: string;
}

function tierFromScore(score: number): ProjectIntelligenceTier {
  if (score >= 81) return "Production Ready";
  if (score >= 61) return "Advanced Project";
  if (score >= 41) return "Intermediate Project";
  return "Basic Project";
}

export async function computeIntelligenceReport(
  basePath: string,
  files: string[],
  apiRoutes: ApiRoute[],
  report: RepoReport,
  options?: ComputeIntelligenceOptions
): Promise<ProjectIntelligenceReport> {
  const { scale, item: codebaseScaleItem } = scoreCodebaseScale(files, apiRoutes, report);
  const devOps = scoreDevOps(files, basePath);
  const backendApis = scoreBackendApis(apiRoutes, report);
  const dataModeling = scoreDataModeling(files, report);
  const architectureFromFiles = scoreArchitectureFromFiles(files);
  const advancedFeaturesResult = await scoreAdvancedFeatures(basePath, files, report);
  const advancedFeatures = advancedFeaturesResult.item;
  let advancedFeaturesEvidence = advancedFeaturesResult.evidence;
  let aiIntegrations = await scoreAiIntegrations(basePath, files);

  let architecture: IntelligenceBreakdownItem = architectureFromFiles;
  let domain: string | undefined;
  let scalabilityEstimate: string | undefined;
  let scalabilityReasoning: string | undefined;

  if (options?.openai && options?.qdrant && options?.repoId) {
    try {
      const chunks = await searchChunksHolistic(
        options.qdrant,
        options.openai,
        options.repoId,
        { maxChunksReturned: 15 }
      );
      const contextChunks = chunks.map((c) => ({
        filePath: c.filePath,
        content: c.content,
        symbolName: c.symbolName,
        symbolType: c.symbolType,
      }));
      const llmResult = await fetchIntelligenceFromLLM(
        options.openai,
        report,
        contextChunks,
        advancedFeaturesEvidence.map((e) => e.name)
      );
      architecture = mergeArchitectureFromLLM(architectureFromFiles, llmResult.architecture);
      domain = llmResult.domain;
      scalabilityEstimate = llmResult.scalabilityEstimate;
      scalabilityReasoning = llmResult.scalabilityReasoning;
      if (llmResult.advancedFeaturesConfirmation?.length) {
        advancedFeaturesEvidence = mergeLLMFeatureConfirmation(
          advancedFeaturesEvidence,
          llmResult.advancedFeaturesConfirmation
        );
      }
      if (llmResult.integrationsConfirmation?.length) {
        const confirmed = llmResult.integrationsConfirmation.filter((c) => c.confirmed);
        const finalDetected = confirmed
          .map((c) => c.name)
          .filter((name) => name in INTEGRATION_RULES);
        const useRuleBasedFallback =
          finalDetected.length === 0 && (aiIntegrations.detected?.length ?? 0) > 0;
        if (!useRuleBasedFallback) {
          const { score, max } = scoreFromDetectedList(finalDetected);
          const meaningfulMissing = INTEGRATION_CATEGORIES.filter(
            (cat) => !finalDetected.includes(cat)
          ).slice(0, 3);
          aiIntegrations = {
            score,
            max,
            detected: finalDetected.length ? finalDetected : undefined,
            missing: meaningfulMissing.length ? meaningfulMissing : undefined,
          };
          console.info("[intelligence] LLM integration verification applied", {
            repoId: options.repoId,
            detected: finalDetected,
            score,
          });
        }
        // When useRuleBasedFallback: keep existing aiIntegrations (no change)
      }
    } catch (err) {
      console.warn("[intelligence] LLM phase failed", err);
    }
  }

  const breakdown = {
    architecture,
    backendApis,
    dataModeling,
    devOps,
    advancedFeatures,
    aiIntegrations,
    codebaseScale: codebaseScaleItem,
  };

  const totalScore = Math.min(
    100,
    architecture.score +
      backendApis.score +
      dataModeling.score +
      devOps.score +
      advancedFeatures.score +
      aiIntegrations.score +
      codebaseScaleItem.score
  );

  const { recommendations: scalingRecommendations, technologies: scalingTechnologies } =
    buildScalingRecommendations(breakdown);

  if (!scalabilityEstimate && totalScore > 0) {
    scalabilityEstimate = "500–1500 concurrent users (estimate)";
    scalabilityReasoning = "Single backend instance; add caching and horizontal scaling to increase.";
  }

  const domainSuggestions = getDomainSuggestions(domain);

  const strengths: string[] = [];
  [
    architecture.detected,
    advancedFeatures.detected,
    aiIntegrations.detected,
    devOps.detected,
  ].forEach((d) => {
    if (d) strengths.push(...d.slice(0, 2));
  });
  const strengthsUnique = [...new Set(strengths)].slice(0, 5);

  const suggestedNextFeatures: string[] = [];
  const missing = [
    ...(architecture.missing ?? []),
    ...(advancedFeatures.missing ?? []),
    ...(devOps.missing ?? []),
  ];
  suggestedNextFeatures.push(...missing.slice(0, 3));
  suggestedNextFeatures.push(...scalingRecommendations.slice(0, 3));
  suggestedNextFeatures.push(...domainSuggestions.slice(0, 2));
  const suggestedUnique = [...new Set(suggestedNextFeatures)].slice(0, 7);

  const effortLabels = new Set<string>([
    "Modular folder structure",
    "Layered architecture",
    "Dependency injection / clean structure",
    "Repository/Data access abstraction",
    "Dockerfile",
    "docker-compose",
    "CI/CD pipeline",
    "Caching layer (Redis)",
    "Message queues",
    "Background job processing",
    "Event-driven architecture",
  ]);
  const effortIndicators = [
    ...(architecture.detected ?? []).filter((d) => effortLabels.has(d)),
    ...(devOps.detected ?? []).filter((d) => effortLabels.has(d)),
    ...(advancedFeatures.detected ?? []).filter((d) => effortLabels.has(d)),
  ];
  const effortIndicatorsUnique = [...new Set(effortIndicators)].slice(0, 8);

  return {
    totalScore,
    tier: tierFromScore(totalScore),
    breakdown,
    scale,
    scalabilityEstimate,
    scalabilityReasoning,
    scalingRecommendations,
    scalingTechnologies,
    domain,
    domainSuggestions,
    strengths: strengthsUnique.length ? strengthsUnique : undefined,
    suggestedNextFeatures: suggestedUnique.length ? suggestedUnique : undefined,
    advancedFeaturesEvidence:
      advancedFeaturesEvidence.length > 0 ? advancedFeaturesEvidence : undefined,
    effortIndicators: effortIndicatorsUnique.length ? effortIndicatorsUnique : undefined,
  };
}
