import { simpleGit } from "simple-git";
import { mkdtemp, rm, readdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { filterFiles } from "./filter.js";

/**
 * Walk directory and return relative paths (files only).
 */
export async function walkDir(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = full.slice(base.length).replace(/^[/\\]/, "");
    if (e.isDirectory()) {
      paths.push(...(await walkDir(full, base)));
    } else {
      paths.push(rel);
    }
  }
  return paths;
}

const GITHUB_URL_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\/)?(?:\.[a-z]+)?$/;

export function isValidGitHubUrl(url: string): boolean {
  const trimmed = url.trim().replace(/\.git$/, "");
  return GITHUB_URL_REGEX.test(trimmed);
}

/**
 * Clone repo into a temp dir and return base path + filtered file list.
 * Caller is responsible for cleaning up temp dir after indexing.
 */
export async function cloneAndListFiles(
  url: string
): Promise<{ basePath: string; files: string[] }> {
  const normalized = url.trim().replace(/\.git$/, "");
  const tempDir = await mkdtemp(join(tmpdir(), "archai-"));
  const git = simpleGit({ baseDir: tempDir });
  await git.clone(normalized, tempDir, ["--depth", "1"]);
  const allFiles = await walkDir(tempDir);
  const files = filterFiles(allFiles);
  return { basePath: tempDir, files };
}

/**
 * Remove temp directory (call after indexing).
 */
export async function cleanupTempDir(basePath: string): Promise<void> {
  await rm(basePath, { recursive: true, force: true });
}
