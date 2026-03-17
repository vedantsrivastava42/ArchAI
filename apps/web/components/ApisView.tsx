"use client";

import {
  Stack,
  Title,
  Text,
  Loader,
  Group,
  Card,
  Badge,
  Grid,
  ThemeIcon,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { IconPlug, IconFileAnalytics } from "@tabler/icons-react";
import { MarkdownContent } from "./MarkdownContent";
import { apiFetch } from "../lib/api";

interface ApiRoute {
  method: string;
  path: string;
}

interface ApiRouteGroup {
  feature: string;
  routes: ApiRoute[];
}

interface ReportForApis {
  apiRoutes?: ApiRoute[];
  apiRoutesByFeature?: ApiRouteGroup[];
  detailed?: { apiSurface?: string };
}

interface ApisViewProps {
  repoId: string;
}

function methodColor(method: string): string {
  const m = method.toUpperCase();
  if (m === "GET") return "blue";
  if (m === "POST") return "violet";
  if (m === "PUT" || m === "PATCH") return "yellow";
  if (m === "DELETE") return "red";
  return "gray";
}

function ApiEndpointCard({ method, path }: { method: string; path: string }) {
  return (
    <Card
      className="archai-glass"
      p="md"
      radius="md"
      style={{ padding: 20 }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Badge
          size="sm"
          variant="light"
          color={methodColor(method)}
          style={{ flexShrink: 0, textTransform: "uppercase" }}
        >
          {method}
        </Badge>
        <Text
          ff="monospace"
          size="sm"
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {path}
        </Text>
      </Group>
    </Card>
  );
}

export function ApisView({ repoId }: ApisViewProps) {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", repoId],
    queryFn: async () => {
      const res = await apiFetch(`/api/repos/${repoId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json() as Promise<ReportForApis>;
    },
    enabled: !!repoId,
  });

  if (isLoading) {
    return (
      <Group gap="sm">
        <Loader size="sm" color="violet" />
        <Text size="sm" c="dimmed">
          Loading APIs…
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

  const routes = report.apiRoutes ?? [];
  const byFeature = report.apiRoutesByFeature ?? [];
  const useGrouped = byFeature.length > 0;
  const totalCount = useGrouped
    ? byFeature.reduce((n, g) => n + g.routes.length, 0)
    : routes.length;
  const apiSurfaceText = report.detailed?.apiSurface?.trim();

  return (
    <Stack gap="xl" style={{ marginTop: 40 }}>
      <Card
        className="archai-glass"
        p="lg"
        radius="md"
        style={{ padding: 24 }}
      >
        <Stack gap="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="blue">
              <IconPlug size={20} />
            </ThemeIcon>
            <div>
              <Title order={4}>API routes</Title>
              <Text size="sm" c="dimmed">
                {totalCount} route{totalCount !== 1 ? "s" : ""} detected
                {useGrouped ? ` in ${byFeature.length} categor${byFeature.length !== 1 ? "ies" : "y"}` : ""}
              </Text>
            </div>
          </Group>
          {totalCount === 0 ? (
            <Text size="sm" c="dimmed">
              No API routes detected. The repo may not expose HTTP routes, or they
              use a pattern we don&apos;t extract yet.
            </Text>
          ) : useGrouped ? (
            <Stack gap="lg">
              {byFeature.map((group, gi) => (
                <Stack key={gi} gap="xs">
                  <Title order={5} c="dimmed" style={{ textTransform: "capitalize" }}>
                    {group.feature}
                  </Title>
                  <Grid gutter="sm">
                    {group.routes.map((r, i) => (
                      <Grid.Col key={i} span={{ base: 12, sm: 6 }}>
                        <ApiEndpointCard method={r.method} path={r.path} />
                      </Grid.Col>
                    ))}
                  </Grid>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Grid gutter="sm">
              {routes.map((r, i) => (
                <Grid.Col key={i} span={{ base: 12, sm: 6 }}>
                  <ApiEndpointCard method={r.method} path={r.path} />
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Stack>
      </Card>

      {apiSurfaceText && (
        <Card
          className="archai-glass"
          p="lg"
          radius="md"
          style={{ padding: 24 }}
        >
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="violet">
                <IconFileAnalytics size={20} />
              </ThemeIcon>
              <Title order={4}>API Surface (from analysis)</Title>
            </Group>
            <MarkdownContent content={apiSurfaceText} size="sm" />
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
