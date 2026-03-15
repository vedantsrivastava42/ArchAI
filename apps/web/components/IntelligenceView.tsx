"use client";

import {
  Stack,
  Title,
  Text,
  Loader,
  Group,
  Card,
  Progress,
  ThemeIcon,
  List,
  Badge,
  Box,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  IconChartPie,
  IconHierarchy2,
  IconPlug,
  IconDatabase,
  IconCloud,
  IconSparkles,
  IconRobot,
  IconGauge,
  IconRocket,
  IconWorld,
  IconBulb,
  IconListCheck,
  IconTool,
} from "@tabler/icons-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface IntelligenceBreakdownItem {
  score: number;
  max: number;
  detected?: string[];
  missing?: string[];
}

interface ProjectIntelligenceReport {
  totalScore: number;
  tier: string;
  breakdown: {
    architecture: IntelligenceBreakdownItem;
    backendApis: IntelligenceBreakdownItem;
    dataModeling: IntelligenceBreakdownItem;
    devOps: IntelligenceBreakdownItem;
    advancedFeatures: IntelligenceBreakdownItem;
    aiIntegrations: IntelligenceBreakdownItem;
    codebaseScale: IntelligenceBreakdownItem;
  };
  scale: { apiCount: number; moduleCount: number; modelCount: number };
  scalabilityEstimate?: string;
  scalabilityReasoning?: string;
  scalingRecommendations?: string[];
  scalingTechnologies?: string[];
  domain?: string;
  domainSuggestions?: string[];
  strengths?: string[];
  suggestedNextFeatures?: string[];
  advancedFeaturesEvidence?: FeatureEvidenceItem[];
  effortIndicators?: string[];
}

interface FeatureEvidenceItem {
  name: string;
  confidence: "signal" | "partial" | "full";
  evidence: {
    dependency?: string;
    import?: string[];
    usage?: string[];
  };
}

interface ReportWithIntelligence {
  intelligence?: ProjectIntelligenceReport;
}

const BREAKDOWN_LABELS: Array<{
  key: keyof ProjectIntelligenceReport["breakdown"];
  label: string;
  icon: React.ElementType;
  color: string;
}> = [
  { key: "architecture", label: "Architecture", icon: IconHierarchy2, color: "violet" },
  { key: "backendApis", label: "Backend APIs", icon: IconPlug, color: "blue" },
  { key: "dataModeling", label: "Data Modeling", icon: IconDatabase, color: "cyan" },
  { key: "devOps", label: "DevOps & Infrastructure", icon: IconCloud, color: "teal" },
  { key: "advancedFeatures", label: "Advanced Features", icon: IconSparkles, color: "pink" },
  { key: "aiIntegrations", label: "AI / Integrations", icon: IconRobot, color: "grape" },
  { key: "codebaseScale", label: "Codebase Scale", icon: IconChartPie, color: "orange" },
];

function ScoreCircle({ score, max, tier }: { score: number; max: number; tier: string }) {
  const pct = max ? (score / max) * 100 : 0;
  return (
    <Card
      className="archai-glass"
      p="xl"
      radius="md"
      style={{ padding: 32, textAlign: "center" }}
    >
      <Stack align="center" gap="md">
        <Box
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: `conic-gradient(rgba(124, 58, 237, 0.9) 0deg ${pct * 3.6}deg, rgba(255,255,255,0.08) ${pct * 3.6}deg 360deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: "rgba(18,18,22,0.95)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Title order={2} className="archai-gradient-text" style={{ fontSize: 36, lineHeight: 1.2 }}>
              {score}
            </Title>
            <Text size="sm" c="dimmed">
              / {max}
            </Text>
          </Box>
        </Box>
        <div>
          <Text size="lg" fw={600} c="dimmed">
            Project Intelligence Score
          </Text>
          <Badge
            variant="light"
            size="lg"
            mt="xs"
            style={{
              background: "rgba(124, 58, 237, 0.2)",
              color: "var(--mantine-color-violet-3)",
              fontSize: 12,
            }}
          >
            {tier}
          </Badge>
        </div>
      </Stack>
    </Card>
  );
}

function BreakdownBar({
  label,
  item,
  icon: Icon,
  color,
}: {
  label: string;
  item: IntelligenceBreakdownItem;
  icon: React.ElementType;
  color: string;
}) {
  const pct = item.max ? (item.score / item.max) * 100 : 0;
  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="sm" radius="sm" variant="light" color={color}>
            <Icon size={14} />
          </ThemeIcon>
          <Text size="sm" fw={500}>
            {label}
          </Text>
        </Group>
        <Text size="sm" c="dimmed">
          {item.score} / {item.max}
        </Text>
      </Group>
      <Progress
        value={pct}
        size="sm"
        radius="xl"
        color={color}
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      {(item.detected?.length ?? 0) > 0 && (
        <Group gap="xs" wrap="wrap">
          {item.detected?.slice(0, 4).map((d, i) => (
            <Badge key={i} size="xs" variant="light" color="green">
              {d}
            </Badge>
          ))}
        </Group>
      )}
      {(item.missing?.length ?? 0) > 0 && (
        <Group gap="xs" wrap="wrap">
          {item.missing?.slice(0, 3).map((m, i) => (
            <Badge key={i} size="xs" variant="outline" color="gray">
              Missing: {m}
            </Badge>
          ))}
        </Group>
      )}
    </Stack>
  );
}

interface IntelligenceViewProps {
  repoId: string;
}

export function IntelligenceView({ repoId }: IntelligenceViewProps) {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", repoId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/repos/${repoId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json() as Promise<ReportWithIntelligence>;
    },
    enabled: !!repoId,
  });

  if (isLoading) {
    return (
      <Group gap="sm">
        <Loader size="sm" color="violet" />
        <Text size="sm" c="dimmed">
          Loading Intelligence report…
        </Text>
      </Group>
    );
  }

  if (error || !report) {
    return (
      <Text size="sm" c="dimmed">
        No report available. It may still be generating after indexing.
      </Text>
    );
  }

  const intel = report.intelligence;
  if (!intel) {
    return (
      <Card className="archai-glass" p="lg" radius="md">
        <Stack gap="md">
          <Title order={4}>Project Intelligence Report</Title>
          <Text size="sm" c="dimmed">
            Intelligence report not available. Re-index the repo to generate it.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="xl" style={{ marginTop: 24 }}>
      <ScoreCircle
        score={intel.totalScore}
        max={100}
        tier={intel.tier}
      />

      <Card className="archai-glass" p="lg" radius="md">
        <Stack gap="lg">
          <Title order={4}>Category Score Bars</Title>
          {BREAKDOWN_LABELS.map(({ key, label, icon, color }) => (
            <BreakdownBar
              key={key}
              label={label}
              item={intel.breakdown[key]}
              icon={icon}
              color={color}
            />
          ))}
        </Stack>
      </Card>

      {(intel.advancedFeaturesEvidence?.length ?? 0) > 0 && (
        <Card className="archai-glass" p="lg" radius="md">
          <Stack gap="md">
            <Group gap="sm" justify="space-between" wrap="nowrap">
              <Group gap="sm">
                <ThemeIcon size="lg" radius="md" variant="light" color="pink">
                  <IconSparkles size={20} />
                </ThemeIcon>
                <Title order={4}>Advanced Features — Integration Verification</Title>
              </Group>
              {intel.breakdown.advancedFeatures != null && (
                <Text size="sm" fw={600} c="dimmed">
                  {intel.breakdown.advancedFeatures.score ?? 0} / {intel.breakdown.advancedFeatures.max ?? 20}
                </Text>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              Confidence: Signal (keyword/dep only) → Partial (dep + import) → Full (dep + import + usage)
            </Text>
            <Stack gap="md">
              {intel.advancedFeaturesEvidence?.map((feat, i) => {
                const confidenceLabel =
                  feat.confidence === "full" ? "High" : feat.confidence === "partial" ? "Medium" : "Signal";
                const confidenceColor =
                  feat.confidence === "full" ? "green" : feat.confidence === "partial" ? "yellow" : "gray";
                const hasEvidence =
                  feat.evidence?.dependency ||
                  (feat.evidence?.import?.length ?? 0) > 0 ||
                  (feat.evidence?.usage?.length ?? 0) > 0;
                return (
                  <Stack key={i} gap="xs">
                    <Group gap="sm" wrap="nowrap">
                      <Text size="sm" fw={600}>
                        {feat.name}
                      </Text>
                      <Badge size="sm" variant="light" color={confidenceColor}>
                        {confidenceLabel}
                      </Badge>
                    </Group>
                    {hasEvidence && (
                      <List size="xs" spacing={2} style={{ marginLeft: 16 }}>
                        {feat.evidence?.dependency && (
                          <List.Item>
                            <strong>dependency:</strong> {feat.evidence.dependency}
                          </List.Item>
                        )}
                        {(feat.evidence?.import?.length ?? 0) > 0 && (
                          <List.Item>
                            <strong>import:</strong> {feat.evidence.import!.slice(0, 3).join(", ")}
                            {feat.evidence.import!.length > 3 && " …"}
                          </List.Item>
                        )}
                        {(feat.evidence?.usage?.length ?? 0) > 0 && (
                          <List.Item>
                            <strong>usage:</strong> {feat.evidence.usage!.slice(0, 3).join(", ")}
                            {feat.evidence.usage!.length > 3 && " …"}
                          </List.Item>
                        )}
                      </List>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </Card>
      )}

      {(intel.effortIndicators?.length ?? 0) > 0 && (
        <Card className="archai-glass" p="lg" radius="md">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="orange">
                <IconTool size={20} />
              </ThemeIcon>
              <Title order={4}>High Engineering Effort</Title>
            </Group>
            <List size="sm" spacing="xs">
              {intel.effortIndicators!.map((label, i) => (
                <List.Item key={i}>{label}</List.Item>
              ))}
            </List>
          </Stack>
        </Card>
      )}

      <Card className="archai-glass" p="lg" radius="md">
        <Stack gap="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="violet">
              <IconChartPie size={20} />
            </ThemeIcon>
            <Title order={4}>Codebase Scale</Title>
          </Group>
          <Group gap="xl">
            <Text size="sm">
              <strong>APIs:</strong> {intel.scale.apiCount}
            </Text>
            <Text size="sm">
              <strong>Modules:</strong> {intel.scale.moduleCount}
            </Text>
            <Text size="sm">
              <strong>Models:</strong> {intel.scale.modelCount}
            </Text>
          </Group>
        </Stack>
      </Card>

      {(intel.scalabilityEstimate || intel.scalabilityReasoning) && (
        <Card className="archai-glass" p="lg" radius="md">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                <IconGauge size={20} />
              </ThemeIcon>
              <Title order={4}>Scalability Analysis</Title>
            </Group>
            {intel.scalabilityEstimate && (
              <Text size="sm">
                <strong>Estimated capacity:</strong> {intel.scalabilityEstimate}
              </Text>
            )}
            {intel.scalabilityReasoning && (
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {intel.scalabilityReasoning}
              </Text>
            )}
          </Stack>
        </Card>
      )}

      {(intel.scalingRecommendations?.length ?? 0) > 0 && (
        <Card className="archai-glass" p="lg" radius="md">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                <IconRocket size={20} />
              </ThemeIcon>
              <Title order={4}>Scaling Recommendations</Title>
            </Group>
            <List size="sm" spacing="xs">
              {intel.scalingRecommendations?.map((r, i) => (
                <List.Item key={i}>{r}</List.Item>
              ))}
            </List>
            {(intel.scalingTechnologies?.length ?? 0) > 0 && (
              <Group gap="xs" mt="xs">
                <Text size="xs" c="dimmed">
                  Suggested technologies:
                </Text>
                {intel.scalingTechnologies?.map((t, i) => (
                  <Badge key={i} size="sm" variant="light" color="teal">
                    {t}
                  </Badge>
                ))}
              </Group>
            )}
          </Stack>
        </Card>
      )}

      {intel.domain && (
        <Card className="archai-glass" p="lg" radius="md">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="grape">
                <IconWorld size={20} />
              </ThemeIcon>
              <Title order={4}>Domain Detection</Title>
            </Group>
            <Badge size="lg" variant="light" color="grape">
              {intel.domain}
            </Badge>
          </Stack>
        </Card>
      )}

      {(intel.domainSuggestions?.length ?? 0) > 0 && (
        <Card className="archai-glass" p="lg" radius="md">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="indigo">
                <IconBulb size={20} />
              </ThemeIcon>
              <Title order={4}>Domain Upgrade Suggestions</Title>
            </Group>
            <List size="sm" spacing="xs">
              {intel.domainSuggestions?.map((s, i) => (
                <List.Item key={i}>{s}</List.Item>
              ))}
            </List>
          </Stack>
        </Card>
      )}

      {(intel.strengths?.length ?? 0) > 0 && (
        <Card className="archai-glass" p="lg" radius="md">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="green">
                <IconSparkles size={20} />
              </ThemeIcon>
              <Title order={4}>Unique Project Strengths</Title>
            </Group>
            <Group gap="xs">
              {intel.strengths?.map((s, i) => (
                <Badge key={i} size="md" variant="light" color="green">
                  {s}
                </Badge>
              ))}
            </Group>
          </Stack>
        </Card>
      )}

      {(intel.suggestedNextFeatures?.length ?? 0) > 0 && (
        <Card className="archai-glass" p="lg" radius="md">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="violet">
                <IconListCheck size={20} />
              </ThemeIcon>
              <Title order={4}>Suggested Next Features</Title>
            </Group>
            <List size="sm" spacing="xs">
              {intel.suggestedNextFeatures?.map((f, i) => (
                <List.Item key={i}>{f}</List.Item>
              ))}
            </List>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
