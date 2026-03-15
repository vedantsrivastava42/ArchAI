"use client";

import {
  AppShell,
  Container,
  Title,
  Card,
  Badge,
  Progress,
  Tabs,
  Alert,
  Anchor,
  Stack,
  Text,
  Group,
  Loader,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Chat } from "../../../components/Chat";
import { ReportView } from "../../../components/ReportView";
import { ApisView } from "../../../components/ApisView";
import { DetailedReportView } from "../../../components/DetailedReportView";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function useRepo(id: string | undefined) {
  return useQuery({
    queryKey: ["repo", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/repos/${id}`);
      console.log("[useRepo] fetch", { id, status: res.status, ok: res.ok });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.log("[useRepo] fetch error", { id, status: res.status, body });
        throw new Error("Not found");
      }
      const data = (await res.json()) as {
        id: string;
        name: string;
        status: string;
        error_message: string | null;
        files_processed: number;
      };
      console.log("[useRepo] fetch ok", { id, status: data?.status, error_message: data?.error_message });
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "indexing" ? 2500 : false;
    },
  });
}

export default function RepoPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: repo, error, isLoading } = useRepo(id);

  const isNetworkError =
    error instanceof Error &&
    (error.message === "Failed to fetch" || error.message === "Load failed" || (error as unknown as { cause?: { code?: string } })?.cause?.code === "ECONNREFUSED");

  if (error || (!isLoading && !repo)) {
    return (
      <Container py="xl">
        <Alert color="red">
          {isNetworkError
            ? "Cannot reach the server. Make sure the backend is running (e.g. npm run dev in apps/server)."
            : "Repository not found."}
        </Alert>
        <Anchor component={Link} href="/" mt="md" display="inline-block">
          Back to Home
        </Anchor>
      </Container>
    );
  }

  if (isLoading || !repo) {
    return (
      <Container py="xl">
        <Group>
          <Loader size="sm" />
          <Text>Loading repository…</Text>
        </Group>
      </Container>
    );
  }

  const isIndexing = repo.status === "indexing";
  const isReady = repo.status === "ready";
  const isFailed = repo.status === "failed";

  return (
    <AppShell
      header={{ height: 56 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Anchor component={Link} href="/" size="sm">
              Home
            </Anchor>
            <Title order={4}>{repo.name}</Title>
          </Group>
          <Badge color={isReady ? "green" : isFailed ? "red" : "blue"}>{repo.status}</Badge>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="lg">
          <Card withBorder mb="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Status</Text>
                <Badge color={isReady ? "green" : isFailed ? "red" : "blue"}>{repo.status}</Badge>
              </Group>
              {isIndexing && (
                <Progress value={repo.files_processed ? 50 : 10} size="sm" animated />
              )}
              {isFailed && repo.error_message && (
                <Alert color="red">{repo.error_message}</Alert>
              )}
              {repo.files_processed > 0 && (
                <Text size="sm" c="dimmed">Files processed: {repo.files_processed}</Text>
              )}
            </Stack>
          </Card>

          <Tabs defaultValue="report">
            <Tabs.List>
              <Tabs.Tab value="report">Report</Tabs.Tab>
              <Tabs.Tab value="apis">APIs</Tabs.Tab>
              <Tabs.Tab value="detailed">Detailed analysis</Tabs.Tab>
              <Tabs.Tab value="chat">Chat</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="report" pt="md">
              {isReady ? (
                <ReportView repoId={id} />
              ) : (
                <Alert color="blue">
                  {isIndexing
                    ? "Indexing in progress. Report will be available when ready."
                    : "Complete indexing to see the report."}
                </Alert>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="apis" pt="md">
              {isReady ? (
                <ApisView repoId={id} />
              ) : (
                <Alert color="blue">
                  {isIndexing
                    ? "Indexing in progress. APIs will be available when ready."
                    : "Complete indexing to see APIs."}
                </Alert>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="detailed" pt="md">
              {isReady ? (
                <DetailedReportView repoId={id} />
              ) : (
                <Alert color="blue">
                  {isIndexing
                    ? "Indexing in progress. Detailed analysis will be available when ready."
                    : "Complete indexing to see the detailed analysis."}
                </Alert>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="chat" pt="md">
              {isReady ? (
                <Chat repoId={id} />
              ) : (
                <Alert color="blue">
                  {isIndexing
                    ? "Indexing in progress. Chat will be available when ready."
                    : "Complete indexing to start chatting."}
                </Alert>
              )}
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
