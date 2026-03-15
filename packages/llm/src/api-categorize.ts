import type OpenAI from "openai";
import type { ApiRoute, ApiRouteGroup } from "@archai/types";

const MODEL = "gpt-4o";

const SYSTEM_PROMPT = `You are an API analyst. Given a list of HTTP API routes (method + path), group them by feature or domain.

Rules:
- Infer feature names from the path and purpose (e.g. Course, Profile, Payment, Auth, Health).
- Use short, clear category names (one or two words).
- Each route must appear in exactly one group.
- Return only valid JSON, no markdown or explanation.

Output format (JSON array):
[
  { "feature": "CategoryName", "routes": [ { "method": "GET", "path": "/api/..." }, ... ] },
  ...
]`;

function routesToContext(routes: ApiRoute[]): string {
  return routes.map((r) => `${r.method} ${r.path}`).join("\n");
}

/** Extract JSON from response, optionally inside a code block */
function extractJson(text: string): string {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  return trimmed;
}

function parseAndValidate(
  raw: string,
  originalRoutes: ApiRoute[]
): ApiRouteGroup[] {
  const routeKey = (r: ApiRoute) => `${r.method}\t${r.path}`;
  const originalSet = new Set(originalRoutes.map(routeKey));

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const groups: ApiRouteGroup[] = [];
  const assigned = new Set<string>();

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const feature = (item as { feature?: unknown }).feature;
    const routesRaw = (item as { routes?: unknown }).routes;
    if (typeof feature !== "string" || !feature.trim() || !Array.isArray(routesRaw)) continue;

    const routes: ApiRoute[] = [];
    for (const r of routesRaw) {
      if (!r || typeof r !== "object") continue;
      const method = String((r as { method?: unknown }).method ?? "").toUpperCase();
      const path = String((r as { path?: unknown }).path ?? "").trim();
      if (!method || !path) continue;
      const key = `${method}\t${path}`;
      if (originalSet.has(key) && !assigned.has(key)) {
        assigned.add(key);
        routes.push({ method, path });
      }
    }
    if (routes.length > 0) {
      groups.push({ feature: feature.trim(), routes });
    }
  }

  return groups;
}

/**
 * Use LLM to categorize API routes by feature (e.g. Course, Profile, Payment).
 * Returns grouped structure for UI; on failure or empty routes returns [].
 */
export async function categorizeApiRoutes(
  client: OpenAI,
  routes: ApiRoute[]
): Promise<ApiRouteGroup[]> {
  if (routes.length === 0) return [];

  const userContent = `Categorize these API routes by feature. Return only the JSON array.\n\nRoutes:\n${routesToContext(routes)}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });
  const text = response.choices[0]?.message?.content ?? "";
  if (!text.trim()) return [];

  return parseAndValidate(text, routes);
}
