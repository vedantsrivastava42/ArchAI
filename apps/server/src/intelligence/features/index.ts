/**
 * Advanced features: rules, detection, scoring.
 * Entry point for computeIntelligenceReport.
 */
export { scoreAdvancedFeatures, type AdvancedFeaturesResult } from "./feature-scoring.js";
export { FEATURE_RULES, ADVANCED_FEATURES_MAX } from "./feature-rules.js";
export type { FeatureRule, FeatureImpact } from "./feature-rules.js";
export {
  readPackageJson,
  getDependencyNames,
  readCodeFiles,
  evaluateFeature,
  getFeaturePathPriority,
} from "./feature-detector.js";
export type { FileContent, EvaluationResult } from "./feature-detector.js";
