/**
 * Extract API routes from repo files (Express and Next.js App Router).
 * Used at index time to populate report.apiRoutes for the APIs tab.
 */
import { readFile } from "fs/promises";
import { join } from "path";
import type { ApiRoute } from "@archai/types";

const ROUTE_EXT = /\.(ts|tsx|js|jsx)$/;

/** Express: router.METHOD("path") or app.METHOD("path") */
const EXPRESS_ROUTE_REGEX =
  /(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/g;

/** Next.js App Router: export async function GET/POST etc. in route.ts/js */
const NEXT_METHOD_REGEX = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/gi;

/**
 * Derive path from Next.js app directory file path.
 * e.g. app/api/bookmarks/route.ts -> /api/bookmarks
 */
function nextAppRoutePath(relPath: string): string | null {
  const normalized = relPath.replace(/\\/g, "/");
  const match = normalized.match(/^app(\/api\/[^/]+(?:\/[^/]+)*)\/route\.(ts|tsx|js|jsx)$/i);
  if (match) return match[1];
  const matchPages = normalized.match(/^pages(\/api[^/]*)\/(?:index)?\.(ts|tsx|js|jsx)$/i);
  if (matchPages) return matchPages[1].replace(/\/index$/, "") || "/api";
  return null;
}

/**
 * Extract API routes from cloned repo. Scans route-like files for Express and Next.js patterns.
 */
export async function extractApiRoutes(
  basePath: string,
  files: string[]
): Promise<ApiRoute[]> {
  const routeFiles = files.filter(
    (f) => ROUTE_EXT.test(f) && (f.includes("route") || f.includes("router") || f.includes("routes") || f.includes("api") || f.includes("index"))
  );
  const seen = new Set<string>();
  const routes: ApiRoute[] = [];

  for (const rel of routeFiles) {
    const full = join(basePath, rel);
    let content: string;
    try {
      content = await readFile(full, "utf-8");
    } catch {
      continue;
    }

    const normRel = rel.replace(/\\/g, "/");

    // Next.js App Router: app/api/.../route.ts
    const nextPath = nextAppRoutePath(normRel);
    if (nextPath) {
      const methods = [...content.matchAll(NEXT_METHOD_REGEX)].map((m) => m[1].toUpperCase());
      if (methods.length === 0) methods.push("GET");
      for (const method of methods) {
        const key = `${method} ${nextPath}`;
        if (!seen.has(key)) {
          seen.add(key);
          routes.push({ method, path: nextPath });
        }
      }
      continue;
    }

    // Next.js Pages: pages/api/...
    if (normRel.startsWith("pages/api/")) {
      const pathMatch = normRel.match(/^pages(\/api[^/]*)(?:\/index)?\.(ts|tsx|js|jsx)$/i);
      const path = pathMatch ? (pathMatch[1].replace(/\/index$/, "") || "/api") : "/api";
      const methods = [...content.matchAll(NEXT_METHOD_REGEX)].map((m) => m[1].toUpperCase());
      if (methods.length === 0) methods.push("GET");
      for (const method of methods) {
        const key = `${method} ${path}`;
        if (!seen.has(key)) {
          seen.add(key);
          routes.push({ method, path });
        }
      }
      continue;
    }

    // Express: router.METHOD("path") or app.METHOD("path")
    for (const m of content.matchAll(EXPRESS_ROUTE_REGEX)) {
      const method = m[1].toUpperCase();
      let path = m[2].trim();
      if (!path.startsWith("/")) path = `/${path}`;
      const key = `${method} ${path}`;
      if (!seen.has(key)) {
        seen.add(key);
        routes.push({ method, path });
      }
    }
  }

  routes.sort((a, b) => {
    const p = a.path.localeCompare(b.path);
    if (p !== 0) return p;
    return a.method.localeCompare(b.method);
  });
  return routes;
}
