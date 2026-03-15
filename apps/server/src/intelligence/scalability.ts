/**
 * Scalability: rule-based recommendations and optional LLM estimate.
 */
import type { ProjectIntelligenceReport } from "@archai/types";

export function buildScalingRecommendations(
  breakdown: ProjectIntelligenceReport["breakdown"],
  scalingTechnologies?: string[]
): { recommendations: string[]; technologies: string[] } {
  const recs: string[] = [];
  const tech = new Set<string>(scalingTechnologies ?? []);

  if (
    !breakdown.advancedFeatures.detected?.some(
      (d: string) => d.toLowerCase().includes("caching") || d.toLowerCase().includes("redis")
    )
  ) {
    recs.push("Add Redis caching for frequent queries");
    tech.add("Redis");
  }
  if (
    !breakdown.advancedFeatures.detected?.some(
      (d: string) => d.toLowerCase().includes("queue") || d.toLowerCase().includes("background")
    )
  ) {
    recs.push("Introduce background job workers");
    recs.push("Use message queues for async tasks");
    tech.add("RabbitMQ");
    tech.add("Kafka");
  }
  recs.push("Add load balancer");
  tech.add("Load balancer");
  recs.push("Use CDN for static content");
  tech.add("Cloudflare CDN");
  if (!breakdown.devOps.detected?.some((d: string) => d.toLowerCase().includes("docker"))) {
    recs.push("Dockerize deployment for consistency");
  }

  return {
    recommendations: [...new Set(recs)].slice(0, 8),
    technologies: [...tech].slice(0, 6),
  };
}
