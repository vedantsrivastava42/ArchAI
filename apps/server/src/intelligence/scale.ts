/**
 * Project Structure & Breadth (10 pts): modules only 3+→2, 5+→4, 8+→6, 12+→8 (max 8); multi-layer +2.
 * Module count = max(API feature groups from categorization, top-level dirs) so we don't undercount.
 */
import type { ApiRoute } from "@archai/types";
import type { IntelligenceBreakdownItem } from "@archai/types";
import type { RepoReport } from "@archai/types";

const PROJECT_BREADTH_MAX = 10;
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  ".next",
  ".nuxt",
  "vendor",
]);

/** Top-level dirs (modules/domains). */
export function countModules(files: string[]): number {
  const topLevel = new Set<string>();
  for (const f of files) {
    const norm = f.replace(/\\/g, "/");
    const parts = norm.split("/");
    const first = parts[0]?.toLowerCase() ?? "";
    if (IGNORE_DIRS.has(first) || first.startsWith(".")) continue;
    if (parts.length >= 2) {
      topLevel.add(first);
    } else if (parts.length === 1 && /\.(ts|tsx|js|jsx|py|go|java)$/i.test(parts[0] ?? "")) {
      topLevel.add("root");
    }
  }
  return Math.max(1, topLevel.size);
}

/** Detect multi-layer architecture: at least 2 of controllers, services, repositories, workers, jobs, events in paths. */
function hasMultiLayerArchitecture(files: string[]): boolean {
  const layerPatterns = [
    /controllers?\//i,
    /services?\//i,
    /repositories?\//i,
    /workers?\//i,
    /jobs?\//i,
    /events?\//i,
  ];
  const foundLayers = new Set<number>();
  for (const f of files) {
    const norm = f.replace(/\\/g, "/").toLowerCase();
    for (let i = 0; i < layerPatterns.length; i++) {
      if (layerPatterns[i].test(norm)) foundLayers.add(i);
    }
    if (foundLayers.size >= 4) return true;
  }
  return false;
}

export function countDataModelFiles(files: string[]): number {
  const patterns = [
    /schema\.prisma$/i,
    /schema\.(ts|tsx|js|jsx)$/i,
    /models?\/([^/]+)\.(ts|tsx|js|jsx)$/i,
    /migrations\/.*\.sql$/i,
    /entities?\/([^/]+)\.(ts|tsx|js|jsx)$/i,
    /drizzle\/.*\.(ts|sql)$/i,
  ];
  const matched = new Set<string>();
  for (const f of files) {
    const norm = f.replace(/\\/g, "/");
    for (const p of patterns) {
      if (p.test(norm)) {
        matched.add(norm);
        break;
      }
    }
  }
  return matched.size || 1;
}

function countPointsFromModuleCount(moduleCount: number): number {
  if (moduleCount >= 12) return 8;
  if (moduleCount >= 8) return 6;
  if (moduleCount >= 5) return 4;
  if (moduleCount >= 3) return 2;
  if (moduleCount >= 1) return 1;
  return 0;
}

export function scoreCodebaseScale(
  files: string[],
  apiRoutes: ApiRoute[],
  report?: RepoReport
): { scale: { apiCount: number; moduleCount: number; modelCount: number }; item: IntelligenceBreakdownItem } {
  const apiCount = apiRoutes.length;
  const dirModuleCount = countModules(files);
  const categorizedFeatureCount = report?.apiRoutesByFeature?.length ?? 0;
  const moduleCount = Math.max(categorizedFeatureCount, dirModuleCount);
  const modelCount = countDataModelFiles(files);

  let score = countPointsFromModuleCount(moduleCount);
  if (hasMultiLayerArchitecture(files)) score += 2;
  score = Math.min(score, PROJECT_BREADTH_MAX);

  const detected: string[] = [];
  if (moduleCount > 0) detected.push(`${moduleCount} modules`);
  if (hasMultiLayerArchitecture(files)) detected.push("Multi-layer architecture");

  const item: IntelligenceBreakdownItem = {
    score,
    max: PROJECT_BREADTH_MAX,
    detected: detected.length ? detected : undefined,
  };
  return {
    scale: { apiCount, moduleCount, modelCount },
    item,
  };
}
