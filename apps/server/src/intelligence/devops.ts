/**
 * DevOps & Infrastructure (15 pts): Dockerfile 5, docker-compose 3, CI/CD 3, env 2, logging 2.
 * Docker/CI/env are detected via filesystem (basePath) so they are found even when the repo
 * filter excludes .yml, Dockerfile, .env* from the code file list (packages/repo-parser filter.ts).
 * Logging uses the filtered file list (paths like sentry.ts, winston.js are allowed).
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { IntelligenceBreakdownItem } from "@archai/types";

const DOCKER_COMPOSE_NAMES = [
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml",
];

/** Dockerfile at repo root or anywhere in the codebase (e.g. backend/Dockerfile, Dockerfile.dev). */
function hasDockerfile(basePath: string, files: string[]): boolean {
  if (existsSync(join(basePath, "Dockerfile"))) return true;
  if (existsSync(join(basePath, "dockerfile"))) return true;
  try {
    const rootEntries = readdirSync(basePath, { withFileTypes: true });
    if (
      rootEntries.some(
        (e) =>
          e.isFile() &&
          e.name.toLowerCase().startsWith("dockerfile")
      )
    )
      return true;
  } catch {
    // ignore
  }
  return files.some((f) => {
    const name = f.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
    return name === "dockerfile" || name.startsWith("dockerfile.");
  });
}

function hasDockerCompose(basePath: string): boolean {
  return DOCKER_COMPOSE_NAMES.some((name) => existsSync(join(basePath, name)));
}

function hasCIPipeline(basePath: string): boolean {
  const workflowsDir = join(basePath, ".github", "workflows");
  if (existsSync(workflowsDir)) {
    try {
      const entries = readdirSync(workflowsDir);
      if (entries.some((e) => e.endsWith(".yml") || e.endsWith(".yaml"))) return true;
    } catch {
      // ignore
    }
  }
  return (
    existsSync(join(basePath, ".gitlab-ci.yml")) ||
    existsSync(join(basePath, ".gitlab-ci.yaml")) ||
    existsSync(join(basePath, "azure-pipelines.yml")) ||
    existsSync(join(basePath, "Jenkinsfile"))
  );
}

/** Env config files are excluded by repo filter (.env*); check filesystem at basePath. */
function hasEnvConfig(basePath: string): boolean {
  if (
    existsSync(join(basePath, ".env.example")) ||
    existsSync(join(basePath, ".env.sample")) ||
    existsSync(join(basePath, "env.example"))
  ) {
    return true;
  }
  const configDir = join(basePath, "config");
  if (existsSync(configDir)) {
    try {
      const entries = readdirSync(configDir);
      if (
        entries.some(
          (e) =>
            e === ".env.example" ||
            e.endsWith(".env.example") ||
            e.endsWith(".example")
        )
      ) {
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

export function scoreDevOps(files: string[], basePath: string): IntelligenceBreakdownItem {
  const lower = files.map((f) => f.replace(/\\/g, "/").toLowerCase());
  let score = 0;
  const detected: string[] = [];

  const DEVOPS_MAX = 15;

  if (hasDockerfile(basePath, files)) {
    score += 5;
    detected.push("Dockerfile");
  }
  if (hasDockerCompose(basePath)) {
    score += 3;
    detected.push("docker-compose");
  }
  if (hasCIPipeline(basePath)) {
    score += 3;
    detected.push("CI/CD pipeline");
  }
  if (hasEnvConfig(basePath)) {
    score += 2;
    detected.push("Environment configuration");
  }
  if (
    lower.some(
      (f) =>
        f.includes("sentry") ||
        f.includes("winston") ||
        f.includes("pino") ||
        f.includes("prometheus") ||
        f.includes("datadog") ||
        f.includes("log4j") ||
        f.includes("monitoring")
    )
  ) {
    score += 2;
    detected.push("Logging / monitoring");
  }

  const missing: string[] = [];
  if (!detected.some((d) => d === "Dockerfile")) missing.push("Dockerfile");
  if (!detected.some((d) => d === "docker-compose")) missing.push("docker-compose");
  if (!detected.some((d) => d === "CI/CD pipeline")) missing.push("CI/CD pipeline");

  return {
    score: Math.min(score, DEVOPS_MAX),
    max: DEVOPS_MAX,
    detected: detected.length ? detected : undefined,
    missing: missing.length ? missing : undefined,
  };
}
