"use client";

import { Stack, Title, Text, Table, Loader, Group, Paper } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiRoute {
  method: string;
  path: string;
}

interface ReportForApis {
  apiRoutes?: ApiRoute[];
  detailed?: { apiSurface?: string };
}

interface ApisViewProps {
  repoId: string;
}

export function ApisView({ repoId }: ApisViewProps) {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", repoId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/repos/${repoId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json() as Promise<ReportForApis>;
    },
    enabled: !!repoId,
  });

  if (isLoading) {
    return (
      <Group>
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Loading APIs…</Text>
      </Group>
    );
  }

  if (error || !report) {
    return (
      <Text size="sm" c="dimmed">No report available. It may still be generating after indexing.</Text>
    );
  }

  const routes = report.apiRoutes ?? [];
  const count = routes.length;
  const apiSurfaceText = report.detailed?.apiSurface?.trim();

  return (
    <Stack gap="lg">
      <Paper p="md" withBorder>
        <Title order={5} mb="sm">API routes</Title>
        <Text size="sm" c="dimmed" mb="md">Total: {count} route{count !== 1 ? "s" : ""}</Text>
        {count === 0 ? (
          <Text size="sm" c="dimmed">No API routes detected. The repo may not expose HTTP routes, or they use a pattern we don&apos;t extract yet.</Text>
        ) : (
          <Table striped withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Method</Table.Th>
                <Table.Th>Path</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {routes.map((r, i) => (
                <Table.Tr key={i}>
                  <Table.Td><Text fw={500}>{r.method}</Text></Table.Td>
                  <Table.Td><Text ff="monospace" size="sm">{r.path}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
      {apiSurfaceText ? (
        <Paper p="md" withBorder>
          <Title order={5} mb="sm">API Surface (from analysis)</Title>
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{apiSurfaceText}</Text>
        </Paper>
      ) : null}
    </Stack>
  );
}
