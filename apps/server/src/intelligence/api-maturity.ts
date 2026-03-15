/**
 * Backend APIs (10 pts): Count max 8 (1→1, 5+→2, 10+→3, 20+→4, 40+→5, 50+→6, 60+→7, 70+→8); RESTful +1; validation +1.
 */
import type { ApiRoute } from "@archai/types";
import type { IntelligenceBreakdownItem } from "@archai/types";
import type { RepoReport } from "@archai/types";

const BACKEND_APIS_MAX = 10;

function countPointsFromApiCount(n: number): number {
  if (n >= 70) return 8;
  if (n >= 60) return 7;
  if (n >= 50) return 6;
  if (n >= 40) return 5;
  if (n >= 20) return 4;
  if (n >= 10) return 3;
  if (n >= 5) return 2;
  if (n >= 1) return 1;
  return 0;
}

function hasRestfulVariety(routes: ApiRoute[]): boolean {
  const methods = new Set(routes.map((r) => r.method.toUpperCase()));
  return methods.size >= 2 && (methods.has("GET") || methods.has("POST"));
}

function hasValidationMention(report: RepoReport): boolean {
  const text = [
    report.detailed?.apiSurface ?? "",
    report.detailed?.requestLifecycle ?? "",
    (report.features ?? []).join(" "),
  ].join(" ").toLowerCase();
  return (
    /validat(e|ion)|zod|joi|yup|express-validator|class-validator|schema\.parse/i.test(text)
  );
}

export function scoreBackendApis(
  apiRoutes: ApiRoute[],
  report: RepoReport
): IntelligenceBreakdownItem {
  const n = apiRoutes.length;
  let score = countPointsFromApiCount(n);
  if (hasRestfulVariety(apiRoutes)) score += 1;
  if (hasValidationMention(report)) score += 1;

  const detected: string[] = [];
  if (n > 0) detected.push(`${n} APIs`);
  if (hasRestfulVariety(apiRoutes)) detected.push("RESTful conventions");
  if (hasValidationMention(report)) detected.push("Input validation");

  const missing: string[] = [];
  if (n < 5) missing.push("More API endpoints (5+)");
  if (!hasRestfulVariety(apiRoutes) && n > 0) missing.push("RESTful conventions");
  if (!hasValidationMention(report)) missing.push("Input validation");

  return {
    score: Math.min(score, BACKEND_APIS_MAX),
    max: BACKEND_APIS_MAX,
    detected: detected.length ? detected : undefined,
    missing: missing.length ? missing : undefined,
  };
}
