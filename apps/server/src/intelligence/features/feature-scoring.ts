/**
 * Feature scoring: partial = 60% of maxPoints, full = 100%. Cap at ADVANCED_FEATURES_MAX.
 */
import type { IntelligenceBreakdownItem, RepoReport, FeatureEvidenceItem, FeatureConfidence } from "@archai/types";
import type { FeatureRule } from "./feature-rules.js";
import { FEATURE_RULES, ADVANCED_FEATURES_MAX } from "./feature-rules.js";
import {
  readPackageJson,
  getDependencyNames,
  readCodeFiles,
  evaluateFeature,
  getFeaturePathPriority,
} from "./feature-detector.js";

const PARTIAL_POINTS_RATIO = 0.6;

/** Partial = 60% of maxPoints, full = 100%. Signal = 0. */
export function pointsForRule(rule: FeatureRule, confidence: FeatureConfidence): number {
  if (confidence === "signal") return 0;
  if (confidence === "full") return rule.maxPoints;
  if (confidence === "partial") return Math.round(rule.maxPoints * PARTIAL_POINTS_RATIO);
  return 0;
}

export interface AdvancedFeaturesResult {
  item: IntelligenceBreakdownItem;
  evidence: FeatureEvidenceItem[];
}

export async function scoreAdvancedFeatures(
  basePath: string,
  files: string[],
  _report: RepoReport
): Promise<AdvancedFeaturesResult> {
  void _report;
  const pkg = await readPackageJson(basePath, files);
  const depNames = getDependencyNames(pkg);
  const pathPriority = getFeaturePathPriority();
  const prioritySubstrings = [...new Set([...pathPriority, "service", "services", "worker", "queue", "routes", "api"])];
  const fileContents = await readCodeFiles(basePath, files, 120, prioritySubstrings);

  const evidenceList: FeatureEvidenceItem[] = [];
  let totalScore = 0;
  const detected: string[] = [];

  for (const rule of FEATURE_RULES) {
    const { confidence, evidence } = evaluateFeature(rule, depNames, fileContents);
    const points = pointsForRule(rule, confidence);
    if (points > 0) {
      totalScore += points;
      detected.push(rule.name);
      evidenceList.push({
        name: rule.name,
        confidence,
        evidence: Object.keys(evidence).length ? evidence : {},
      });
    }
    // Signal: do not add to evidenceList (reduce noise)
  }

  const missing: string[] = [];
  if (!detected.some((d) => d.toLowerCase().includes("auth"))) missing.push("Authentication");
  if (!detected.some((d) => d.toLowerCase().includes("caching") || d.toLowerCase().includes("redis"))) {
    missing.push("Caching layer");
  }
  if (!detected.some((d) => d.toLowerCase().includes("queue") || d.toLowerCase().includes("background"))) {
    missing.push("Message queues / background jobs");
  }

  return {
    item: {
      score: Math.min(totalScore, ADVANCED_FEATURES_MAX),
      max: ADVANCED_FEATURES_MAX,
      detected: detected.length ? detected : undefined,
      missing: missing.length ? missing : undefined,
    },
    evidence: evidenceList,
  };
}
