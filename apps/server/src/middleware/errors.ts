/**
 * Central Express error middleware — map errors to HTTP status and clear messages.
 */
import type { Request, Response, NextFunction } from "express";

const REPO_TOO_LARGE = "Repository has too many supported files";
const PRIVATE_REPO = "Private repository";
const INVALID_URL = "Invalid GitHub repository URL";
const REPO_NOT_FOUND = "Repository not found";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : "Internal server error";
  if (message.includes(REPO_TOO_LARGE) || message.includes("Maximum is")) {
    res.status(400).json({ error: message });
    return;
  }
  if (message.toLowerCase().includes(PRIVATE_REPO.toLowerCase()) || message.includes("403") || message.includes("Authentication")) {
    res.status(403).json({ error: "Private repository. Add GITHUB_TOKEN for access." });
    return;
  }
  if (message.toLowerCase().includes("clone") || message.includes("git") || message.includes("ENOTFOUND")) {
    res.status(502).json({ error: "Clone failed. Check URL and network." });
    return;
  }
  if (message.includes(INVALID_URL)) {
    res.status(400).json({ error: "Invalid GitHub repository URL." });
    return;
  }
  if (message.includes(REPO_NOT_FOUND)) {
    res.status(404).json({ error: "Repository not found." });
    return;
  }
  res.status(500).json({ error: "Internal server error." });
}
