/**
 * Re-export from features/ module for backward compatibility.
 * Feature definitions, detection, and scoring live in features/.
 */
export {
  scoreAdvancedFeatures,
  type AdvancedFeaturesResult,
} from "./features/index.js";
