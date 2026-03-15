/**
 * Ignore list and allowlist of extensions. Enforce max files per repo.
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

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".java",
  ".py",
  ".go",
  ".rb",
]);

export const MAX_FILES_PER_REPO = 2000;

export function isAllowedExtension(path: string): boolean {
  const lower = path.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
  return ALLOWED_EXTENSIONS.has(ext);
}

export function shouldIgnorePath(relativePath: string): boolean {
  const parts = relativePath.split(/[/\\]/);
  for (const part of parts) {
    if (IGNORE_SEGMENTS.has(part)) return true;
    if (IGNORE_NAMES.has(part)) return true;
  }
  const lower = relativePath.toLowerCase();
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
