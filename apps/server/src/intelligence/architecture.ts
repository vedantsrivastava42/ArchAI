/**
 * Architecture & System Design (20 pts): Controller-Service 4, Layered 4, Repository 3, Modular 3, DI 3, Config 3.
 */
import type { IntelligenceBreakdownItem } from "@archai/types";

function hasControllerService(files: string[]): boolean {
  const lower = files.map((f) => f.replace(/\\/g, "/").toLowerCase());
  const hasController = lower.some(
    (f) =>
      f.includes("controller") ||
      f.includes("controllers/") ||
      f.endsWith(".controller.ts") ||
      f.endsWith(".controller.js")
  );
  const hasService = lower.some(
    (f) =>
      f.includes("service") ||
      f.includes("services/") ||
      f.endsWith(".service.ts") ||
      f.endsWith(".service.js")
  );
  return hasController && hasService;
}

function hasRepositoryLayer(files: string[]): boolean {
  const lower = files.map((f) => f.replace(/\\/g, "/").toLowerCase());
  return lower.some(
    (f) =>
      f.includes("repository") ||
      f.includes("repositories/") ||
      f.includes("repository/")
  );
}

function hasLayeredStructure(files: string[]): boolean {
  const lower = files.map((f) => f.replace(/\\/g, "/").toLowerCase());
  const hasService = lower.some(
    (f) =>
      f.includes("services/") ||
      f.includes("/service/") ||
      f.endsWith(".service.ts") ||
      f.endsWith(".service.js")
  );
  return hasService && lower.some((f) => f.includes("model") || f.includes("entity"));
}

function hasModularFolders(files: string[]): boolean {
  const dirs = new Set<string>();
  for (const f of files) {
    const norm = f.replace(/\\/g, "/");
    const parts = norm.split("/");
    if (parts.length >= 2) dirs.add(parts[0]!);
  }
  return dirs.size >= 5;
}

function hasConfigManagement(files: string[]): boolean {
  const lower = files.map((f) => f.replace(/\\/g, "/").toLowerCase());
  return lower.some(
    (f) =>
      f === ".env.example" ||
      f === ".env.sample" ||
      f.includes("config/") ||
      f.includes("env.")
  );
}

function hasDIPattern(files: string[]): boolean {
  const lower = files.map((f) => f.replace(/\\/g, "/").toLowerCase());
  return lower.some(
    (f) =>
      f.includes("inject") ||
      f.includes("dependency") ||
      f.includes("container") ||
      f.includes("module.ts") ||
      f.includes("providers")
  );
}

const ARCHITECTURE_MAX = 20;

export function scoreArchitectureFromFiles(
  files: string[],
  detected?: string[],
  missing?: string[]
): IntelligenceBreakdownItem {
  let score = 0;
  const fileDetected: string[] = [];

  if (hasControllerService(files)) {
    score += 4;
    fileDetected.push("Controller-service pattern");
  }
  if (hasLayeredStructure(files)) {
    score += 4;
    fileDetected.push("Layered architecture");
  }
  if (hasRepositoryLayer(files)) {
    score += 3;
    fileDetected.push("Repository/Data access abstraction");
  }
  if (hasModularFolders(files)) {
    score += 3;
    fileDetected.push("Modular folder structure");
  }
  if (hasDIPattern(files)) {
    score += 3;
    fileDetected.push("Dependency injection / clean structure");
  }
  if (hasConfigManagement(files)) {
    score += 3;
    fileDetected.push("Configuration management");
  }

  const mergedDetected = detected?.length ? [...new Set([...fileDetected, ...detected])] : fileDetected.length ? fileDetected : undefined;
  const defaultMissing: string[] = [];
  if (score < ARCHITECTURE_MAX && mergedDetected) {
    if (!mergedDetected.some((d) => d.includes("Dependency injection") || d.includes("DI"))) defaultMissing.push("Dependency injection");
    if (!mergedDetected.some((d) => d.includes("Layered"))) defaultMissing.push("Layered structure");
    if (!mergedDetected.some((d) => d.includes("Repository"))) defaultMissing.push("Repository/Data access abstraction");
  }
  const mergedMissing = missing?.length ? missing : score < ARCHITECTURE_MAX && defaultMissing.length > 0 ? defaultMissing : undefined;

  return {
    score: Math.min(score, ARCHITECTURE_MAX),
    max: ARCHITECTURE_MAX,
    detected: mergedDetected,
    missing: mergedMissing?.length ? mergedMissing : undefined,
  };
}
