"use client";

import { Stack, Title, Text, List, Loader, Group, Paper } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface RepoReport {
  purpose?: string[];
  features?: string[];
  keyApis?: string[];
  architecture?: string[];
  overview?: string[];
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Stack gap="xs">
      <Title order={5}>{title}</Title>
      <List size="sm" spacing="xs">
        {items.map((item, i) => (
          <List.Item key={i}>{item}</List.Item>
        ))}
      </List>
    </Stack>
  );
}

interface ReportViewProps {
  repoId: string;
}

export function ReportView({ repoId }: ReportViewProps) {
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
      <Group>
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Loading report…</Text>
      </Group>
    );
  }

  if (error || !report) {
    return (
      <Text size="sm" c="dimmed">No report available. It may still be generating after indexing.</Text>
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
      <Text size="sm" c="dimmed">No report content yet. Try again after indexing completes.</Text>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="lg">
        <BulletSection title="Purpose" items={report.purpose ?? []} />
        <BulletSection title="Features" items={report.features ?? []} />
        <BulletSection title="Key APIs / Interfaces" items={report.keyApis ?? []} />
        <BulletSection title="Architecture" items={report.architecture ?? []} />
        {report.overview?.length && !report.purpose?.length && !report.features?.length ? (
          <BulletSection title="Overview" items={report.overview} />
        ) : null}
      </Stack>
    </Paper>
  );
}
