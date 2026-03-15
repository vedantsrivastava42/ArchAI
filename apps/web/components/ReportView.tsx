"use client";

import React from "react";
import {
  Stack,
  Title,
  Text,
  Loader,
  Group,
  Card,
  Grid,
  ThemeIcon,
  Box,
  Badge,
  Progress,
  Alert,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  IconTarget,
  IconSparkles,
  IconPlug,
  IconHierarchy2,
  IconList,
} from "@tabler/icons-react";
import { ScoreCircle } from "./IntelligenceView";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function StatusBadge({ status }: { status: string }) {
  const isReady = status === "ready";
  const isFailed = status === "failed";
  const pillStyle: React.CSSProperties = {
    background: isReady
      ? "linear-gradient(135deg, #10b981, #059669)"
      : isFailed
        ? "linear-gradient(135deg, #ef4444, #dc2626)"
        : "linear-gradient(135deg, #7c3aed, #4f46e5)",
    color: "#fff",
    border: "none",
    borderRadius: "9999px",
    padding: "4px 14px",
    fontSize: 12,
    fontWeight: 600,
    boxShadow: "0 0 20px rgba(124, 58, 237, 0.35)",
  };
  if (isFailed) (pillStyle as Record<string, string>).boxShadow = "0 0 16px rgba(239, 68, 68, 0.4)";
  if (isReady) (pillStyle as Record<string, string>).boxShadow = "0 0 16px rgba(16, 185, 129, 0.35)";
  return <Badge variant="filled" style={pillStyle}>{status.toUpperCase()}</Badge>;
}

/** Parse **bold** in bullet text and return React nodes (bold segments rendered, asterisks removed) */
function renderBulletWithBold(item: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let s = item;
  let key = 0;
  while (s.length > 0) {
    const open = s.indexOf("**");
    if (open === -1) {
      parts.push(s);
      break;
    }
    if (open > 0) parts.push(s.slice(0, open));
    const afterOpen = s.slice(open + 2);
    const close = afterOpen.indexOf("**");
    if (close === -1) {
      parts.push(s.slice(open));
      break;
    }
    const boldText = afterOpen.slice(0, close);
    parts.push(
      <Text key={key++} component="span" fw={700} inherit>
        {boldText}
      </Text>
    );
    s = afterOpen.slice(close + 2);
  }
  return <>{parts}</>;
}

interface RepoReport {
  purpose?: string[];
  features?: string[];
  keyApis?: string[];
  architecture?: string[];
  overview?: string[];
  intelligence?: { totalScore: number; tier: string };
}

const SECTION_CONFIG: Array<{
  key: keyof RepoReport;
  title: string;
  icon: React.ElementType;
  color: string;
}> = [
  { key: "purpose", title: "Purpose", icon: IconTarget, color: "violet" },
  { key: "features", title: "Features", icon: IconSparkles, color: "indigo" },
  { key: "keyApis", title: "Key APIs / Interfaces", icon: IconPlug, color: "blue" },
  { key: "architecture", title: "Architecture", icon: IconHierarchy2, color: "cyan" },
];

function SectionCard({
  title,
  icon: Icon,
  color,
  items,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  items: string[];
}) {
  if (!items?.length) return null;
  return (
    <Card
      className="archai-glass"
      p="lg"
      radius="md"
      component="section"
      style={{ padding: 24 }}
    >
      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color={color}>
            <Icon size={20} />
          </ThemeIcon>
          <Title order={4}>{title}</Title>
        </Group>
        <Stack gap="xs">
          {items.map((item, i) => (
            <Group key={i} gap="sm" wrap="nowrap" align="flex-start">
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--archai-gradient)",
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              <Text size="sm" style={{ lineHeight: 1.6 }}>
                {renderBulletWithBold(item)}
              </Text>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

function FeatureCard({ text }: { text: string }) {
  const [title, ...rest] = text.split(/[:–-]/);
  const description = rest.join(":").trim() || null;
  return (
    <Card
      className="archai-glass"
      p="md"
      radius="md"
      style={{ padding: 20 }}
    >
      <Stack gap={4}>
        <Text size="sm" fw={600}>
          {renderBulletWithBold(title?.trim() || text)}
        </Text>
        {description && (
          <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
            {renderBulletWithBold(description)}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

interface ReportViewProps {
  repoId: string;
  repoStatus?: { status: string; files_processed: number; error_message: string | null };
}

export function ReportView({ repoId, repoStatus }: ReportViewProps) {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", repoId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/repos/${repoId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json() as Promise<RepoReport>;
    },
    enabled: !!repoId,
  });

  if (isLoading) {
    return (
      <Group gap="sm">
        <Loader size="sm" color="violet" />
        <Text size="sm" c="dimmed">
          Loading report…
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

  const hasAny =
    (report.purpose?.length ?? 0) +
    (report.features?.length ?? 0) +
    (report.keyApis?.length ?? 0) +
    (report.architecture?.length ?? 0) +
    (report.overview?.length ?? 0) >
    0;

  if (!hasAny) {
    return (
      <Text size="sm" c="dimmed">
        No report content yet. Try again after indexing completes.
      </Text>
    );
  }

  const useOverview =
    report.overview?.length &&
    !report.purpose?.length &&
    !report.features?.length;

  const intel = report.intelligence;
  const isReady = repoStatus?.status === "ready";
  const isIndexing = repoStatus?.status === "indexing";
  const isFailed = repoStatus?.status === "failed";
  const showReportContent = repoStatus == null || isReady;

  return (
    <Stack gap="xl" style={{ marginTop: 40 }}>
      {repoStatus != null && (
        <Card
          className="archai-glass"
          p="lg"
          radius="md"
          style={{ padding: 24 }}
        >
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" fw={600} c="dimmed">
                Status
              </Text>
              <StatusBadge status={repoStatus.status} />
            </Group>
            {isIndexing && (
              <Progress
                value={repoStatus.files_processed ? 50 : 10}
                size="sm"
                radius="xl"
                animated
                color="violet"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            )}
            {isFailed && repoStatus.error_message && (
              <Alert color="red" variant="light" radius="md">
                {repoStatus.error_message}
              </Alert>
            )}
            {repoStatus.files_processed > 0 && (
              <Text size="sm" c="dimmed">
                Files processed: {repoStatus.files_processed}
              </Text>
            )}
          </Stack>
        </Card>
      )}
      {repoStatus != null && !isReady && (
        <Alert color="violet" variant="light" radius="md">
          {isIndexing
            ? "Indexing in progress. Report will be available when ready."
            : "Complete indexing to see the report."}
        </Alert>
      )}
      {showReportContent && (
        <>
          {intel != null && (
            <ScoreCircle score={intel.totalScore} max={100} tier={intel.tier} />
          )}
          {SECTION_CONFIG.map(({ key, title, icon, color }) => (
            <SectionCard
              key={key}
              title={title}
              icon={icon}
              color={color}
              items={(report[key] as string[]) ?? []}
            />
          ))}
          {useOverview && (
            <SectionCard
              title="Overview"
              icon={IconList}
              color="gray"
              items={report.overview ?? []}
            />
          )}
          {(report.features?.length ?? 0) > 0 && (
            <>
              <Title order={3} mt="md">
                Feature breakdown
              </Title>
              <Grid gutter="md">
                {(report.features ?? []).map((item, i) => (
                  <Grid.Col key={i} span={{ base: 12, sm: 6 }}>
                    <FeatureCard text={item} />
                  </Grid.Col>
                ))}
              </Grid>
            </>
          )}
        </>
      )}
    </Stack>
  );
}
