import { readFile } from "fs/promises";
import { join } from "path";
import type { FeatureConfidence } from "@archai/types";
import type { FeatureRule } from "./feature-rules.js";
import {
  FEATURE_RULES,
  FILE_PRIORITY_SUBSTRINGS,
} from "./feature-rules.js";

export interface FileContent {
  path: string;
  content: string;
}

const MAX_FILES_TO_SCAN = 120;
const MIN_CONTENT_LENGTH_FOR_PATH = 80;

export async function readPackageJson(
  basePath: string,
  files: string[]
): Promise<Record<string, unknown>> {
  const pkgPath = files.find((f) => f.replace(/\\/g, "/").toLowerCase() === "package.json");
  if (!pkgPath) return {};
  try {
    const raw = await readFile(join(basePath, pkgPath), "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getDependencyNames(pkg: Record<string, unknown>): Set<string> {
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };
  return new Set(Object.keys(deps).map((k) => k.toLowerCase()));
}

/** Prioritize service/worker/routes files, then take up to maxFiles. */
export async function readCodeFiles(
  basePath: string,
  files: string[],
  maxFiles: number = MAX_FILES_TO_SCAN,
  prioritySubstrings: string[] = FILE_PRIORITY_SUBSTRINGS
): Promise<FileContent[]> {
  const codeExt = /\.(ts|tsx|js|jsx|py|go|java)$/i;
  const codeFiles = files.filter((f) => codeExt.test(f));
  const lower = prioritySubstrings.map((s) => s.toLowerCase());
  const pathLower = (p: string) => p.replace(/\\/g, "/").toLowerCase();
  const prioritized = lower.length === 0
    ? codeFiles.slice(0, maxFiles)
    : [
        ...codeFiles.filter((f) => lower.some((sub) => pathLower(f).includes(sub))),
        ...codeFiles.filter((f) => !lower.some((sub) => pathLower(f).includes(sub))),
      ].slice(0, maxFiles);
  const result: FileContent[] = [];
  for (const rel of prioritized) {
    try {
      const content = await readFile(join(basePath, rel), "utf-8");
      result.push({ path: rel, content });
    } catch {
      // skip
    }
  }
  return result;
}

export function findImportsInContent(content: string): Set<string> {
  const found = new Set<string>();
  const requireRe = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = requireRe.exec(content)) !== null) {
    const pkg = m[1]!.split("/")[0]!.toLowerCase();
    if (pkg) found.add(pkg);
  }
  const importRe = /import\s+(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
  while ((m = importRe.exec(content)) !== null) {
    const pkg = m[1]!.split("/")[0]!.toLowerCase();
    if (pkg) found.add(pkg);
  }
  return found;
}

export interface EvaluationResult {
  confidence: FeatureConfidence;
  /** Only set for partial/full; signal has no evidence to reduce noise. */
  evidence: { dependency?: string; import?: string[]; usage?: string[] };
}

/**
 * Evaluate one rule. Path keywords are secondary only: (dep OR import) required, then (usage OR path) for partial/full.
 */
export function evaluateFeature(
  rule: FeatureRule,
  depNames: Set<string>,
  fileContents: FileContent[]
): EvaluationResult {
  const evidence: EvaluationResult["evidence"] = {};
  const depFound = rule.dependencies.length > 0 && rule.dependencies.some((d) => depNames.has(d.toLowerCase()));
  if (depFound) {
    const matched = rule.dependencies.find((d) => depNames.has(d.toLowerCase()));
    if (matched) evidence.dependency = matched;
  }

  const importFiles: string[] = [];
  const usageFiles: string[] = [];
  const pathMatchFiles: string[] = [];

  for (const { path, content } of fileContents) {
    if (rule.importPatterns.length > 0) {
      const fileImports = findImportsInContent(content);
      const ruleDepInFile = rule.dependencies.some((d) => fileImports.has(d.toLowerCase()));
      if (ruleDepInFile) importFiles.push(path);
      else if (rule.importPatterns.some((p) => p.test(content))) importFiles.push(path);
    }
    if (rule.usagePatterns.length > 0 && rule.usagePatterns.some((p) => p.test(content))) {
      usageFiles.push(path);
    }
    if (rule.pathKeywords?.length && content.trim().length >= MIN_CONTENT_LENGTH_FOR_PATH) {
      const pathLower = path.replace(/\\/g, "/").toLowerCase();
      if (rule.pathKeywords.some((k) => pathLower.includes(k.toLowerCase()))) pathMatchFiles.push(path);
    }
  }

  const hasImport = importFiles.length > 0;
  const hasUsage = usageFiles.length > 0;
  const hasPath = pathMatchFiles.length > 0;

  if (importFiles.length > 0) evidence.import = [...new Set(importFiles)].slice(0, 5);
  if (usageFiles.length > 0) evidence.usage = [...new Set(usageFiles)].slice(0, 5);

  let confidence: FeatureConfidence = "signal";

  if (rule.dependencies.length > 0) {
    const primary = depFound || hasImport;
    if (primary && hasUsage) confidence = "full";
    else if (primary && (hasImport || hasPath)) confidence = "partial";
    else if (depFound) confidence = "signal";
  } else {
    if (hasUsage) confidence = "full";
    else if (hasImport || hasPath) confidence = "partial";
  }

  return {
    confidence,
    evidence: confidence === "signal" ? {} : evidence,
  };
}

export function getFeaturePathPriority(): string[] {
  return [...new Set(FEATURE_RULES.flatMap((r) => r.pathKeywords ?? []))];
}
