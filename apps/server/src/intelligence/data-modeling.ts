/**
 * Data Modeling (10 pts): Count max 7 (1→1, 3+→2, 5+→3, 10+→4, 15+→5, 20+→6, 25+→7); relationships +2; indexes +1.
 */
import type { IntelligenceBreakdownItem } from "@archai/types";
import type { RepoReport } from "@archai/types";
import { countDataModelFiles } from "./scale.js";

const DATA_MODELING_MAX = 10;

function countPointsFromModelCount(modelCount: number): number {
  if (modelCount >= 25) return 7;
  if (modelCount >= 20) return 6;
  if (modelCount >= 15) return 5;
  if (modelCount >= 10) return 4;
  if (modelCount >= 5) return 3;
  if (modelCount >= 3) return 2;
  if (modelCount >= 1) return 1;
  return 0;
}

function hasRelationships(report: RepoReport, modelCount: number): boolean {
  if (modelCount >= 3) {
    const text = [
      report.detailed?.dataModelAndStorage ?? "",
      (report.architecture ?? []).join(" "),
    ].join(" ").toLowerCase();
    return (
      /relation|foreign.?key|reference|belongs.?to|has.?many|join|@relation|@many|@one/i.test(text)
    );
  }
  return false;
}

function hasIndexes(report: RepoReport, modelCount: number): boolean {
  if (modelCount >= 1) {
    const text = [
      report.detailed?.dataModelAndStorage ?? "",
      (report.architecture ?? []).join(" "),
    ].join(" ").toLowerCase();
    return (
      /@index|create\s+index|unique\s+index|\.index\s*\(|addIndex|createIndex/i.test(text)
    );
  }
  return false;
}

export function scoreDataModeling(
  files: string[],
  report: RepoReport
): IntelligenceBreakdownItem {
  const modelCount = countDataModelFiles(files);
  let score = countPointsFromModelCount(modelCount);
  if (hasRelationships(report, modelCount)) score += 2;
  if (hasIndexes(report, modelCount)) score += 1;

  const detected: string[] = [];
  if (modelCount > 0) detected.push(`${modelCount} model/schema file(s)`);
  if (hasRelationships(report, modelCount)) detected.push("Relationships detected");
  if (hasIndexes(report, modelCount)) detected.push("Indexes detected");

  const missing: string[] = [];
  if (modelCount < 3) missing.push("More data models (3+)");
  if (!hasRelationships(report, modelCount) && modelCount >= 2) missing.push("Defined relationships");

  return {
    score: Math.min(score, DATA_MODELING_MAX),
    max: DATA_MODELING_MAX,
    detected: detected.length ? detected : undefined,
    missing: missing.length ? missing : undefined,
  };
}
