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
  url: string,
  debugLog?: (step: string, detail?: Record<string, unknown>) => void
): Promise<{ basePath: string; files: string[] }> {
  const log = debugLog ?? (() => {});

  const normalized = url.trim().replace(/\.git$/, "");
  log("clone_step_1_normalize", { url: normalized });

  log("clone_step_2_tempdir", {});
  const tempDir = await mkdtemp(join(tmpdir(), "archai-"));
  log("clone_step_2_done", { tempDir });

  const git = simpleGit({ baseDir: tempDir });
  // Capture git stderr so we can log it if clone fails
  let gitStderr = "";
  git.outputHandler((_cmd, _stdout, stderr) => {
    stderr?.on("data", (chunk: Buffer) => {
      gitStderr += chunk.toString();
    });
  });

  log("clone_step_3_clone_start", { url: normalized, tempDir });
  try {
    await git.clone(normalized, tempDir, ["--depth", "1"]);
  } catch (err) {
    log("clone_step_3_clone_failed", {
      message: err instanceof Error ? err.message : String(err),
      gitStderr: gitStderr || "(no stderr captured)",
    });
    throw err;
  }
  log("clone_step_3_clone_done", {});

  log("clone_step_4_walk_start", {});
  const allFiles = await walkDir(tempDir);
  log("clone_step_4_walk_done", { fileCount: allFiles.length });

  log("clone_step_5_filter_start", {});
  const files = filterFiles(allFiles);
  log("clone_step_5_filter_done", { filteredCount: files.length });

  return { basePath: tempDir, files };
}

/**
 * Remove temp directory (call after indexing).
 */
export async function cleanupTempDir(basePath: string): Promise<void> {
  await rm(basePath, { recursive: true, force: true });
}
