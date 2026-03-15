/**
 * Ignore list and allowlist of extensions. Enforce max files per repo.
 * DevOps-related files (.env.example, Dockerfile, docker-compose, .yml) are allowed
 * so they appear in the file list for intelligence and other consumers.
 */

const IGNORE_SEGMENTS = new Set([
  "node_modules",
  "build",
  "dist",
  ".git",
  "out",
  "target",
  "__pycache__",
  ".next",
  ".nuxt",
  "vendor",
]);

const IGNORE_EXTENSIONS = new Set([".log", ".lock"]);
const IGNORE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "composer.lock",
  "Gemfile.lock",
  "poetry.lock",
]);

/** Env config files we allow so DevOps/intelligence can see them. */
const ALLOWED_ENV_NAMES = new Set([".env.example", ".env.sample", "env.example"]);

/** No-extension or special filenames used for DevOps (Dockerfile, CI, etc.). */
const ALLOWED_DEVOPS_NAMES = new Set([
  "dockerfile",
  "jenkinsfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml",
  ".gitlab-ci.yml",
  ".gitlab-ci.yaml",
  "azure-pipelines.yml",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".java",
  ".py",
  ".go",
  ".rb",
  ".yml",
  ".yaml",
  ".example",
  ".sample",
]);

export const MAX_FILES_PER_REPO = 2000;

export function isAllowedExtension(path: string): boolean {
  const lower = path.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
  if (ALLOWED_EXTENSIONS.has(ext)) return true;
  const basename = path.split(/[/\\]/).pop()?.toLowerCase() ?? "";
  return ALLOWED_DEVOPS_NAMES.has(basename);
}

export function shouldIgnorePath(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  const basename = relativePath.split(/[/\\]/).pop() ?? "";
  const basenameLower = basename.toLowerCase();
  if (ALLOWED_ENV_NAMES.has(basenameLower)) return false;
  if (ALLOWED_DEVOPS_NAMES.has(basenameLower)) return false;

  const parts = relativePath.split(/[/\\]/);
  for (const part of parts) {
    if (IGNORE_SEGMENTS.has(part)) return true;
    if (IGNORE_NAMES.has(part)) return true;
  }
  if (lower.endsWith(".env") || lower.includes(".env.")) return true;
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
  if (IGNORE_EXTENSIONS.has(ext)) return true;
  return false;
}

export function filterFiles(files: string[]): string[] {
  const filtered = files.filter((f) => !shouldIgnorePath(f)).filter(isAllowedExtension);
  if (filtered.length > MAX_FILES_PER_REPO) {
    throw new Error(
      `Repository has too many supported files (${filtered.length}). Maximum is ${MAX_FILES_PER_REPO}.`
    );
  }
  return filtered;
}
