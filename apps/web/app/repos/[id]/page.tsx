"use client";

import {
  AppShell,
  Container,
  Title,
  Badge,
  Tabs,
  Alert,
  Anchor,
  Text,
  Group,
  Loader,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Chat } from "../../../components/Chat";
import { ReportView } from "../../../components/ReportView";
import { ApisView } from "../../../components/ApisView";
import { DetailedReportView } from "../../../components/DetailedReportView";
import { IntelligenceView } from "../../../components/IntelligenceView";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function useRepo(id: string | undefined) {
  return useQuery({
    queryKey: ["repo", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/repos/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Not found");
      }
      return res.json() as Promise<{
        id: string;
        name: string;
        status: string;
        error_message: string | null;
        files_processed: number;
      }>;
    },
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "indexing" ? 2500 : false,
  });
}

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

export default function RepoPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: repo, error, isLoading } = useRepo(id);

  const isNetworkError =
    error instanceof Error &&
    (error.message === "Failed to fetch" ||
      error.message === "Load failed" ||
      (error as unknown as { cause?: { code?: string } })?.cause?.code === "ECONNREFUSED");

  if (error || (!isLoading && !repo)) {
    return (
      <Container size="lg" py="xl">
        <Alert color="red" variant="light" radius="md">
          {isNetworkError
            ? "Cannot reach the server. Make sure the backend is running (e.g. npm run dev in apps/server)."
            : "Repository not found."}
        </Alert>
        <Anchor
          component={Link}
          href="/"
          mt="md"
          display="inline-flex"
          size="sm"
          style={{ alignItems: "center", gap: 6 }}
        >
          <IconArrowLeft size={16} />
          Back to Home
        </Anchor>
      </Container>
    );
  }

  if (isLoading || !repo) {
    return (
      <Container size="lg" py="xl">
        <Group gap="sm">
          <Loader size="sm" color="violet" />
          <Text size="sm" c="dimmed">
            Loading repository…
          </Text>
        </Group>
      </Container>
    );
  }

  const isIndexing = repo.status === "indexing";
  const isReady = repo.status === "ready";

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
          <Group gap="lg" wrap="nowrap" style={{ minWidth: 0 }}>
            <Anchor
              component={Link}
              href="/"
              size="sm"
              className="archai-gradient-text"
              style={{ fontSize: 18, fontWeight: 700, textDecoration: "none" }}
            >
              ArchAI
            </Anchor>
            <Title order={4} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {repo.name}
            </Title>
          </Group>
          <StatusBadge status={repo.status} />
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="lg" py="xl" pt={0}>
          <Tabs
            defaultValue="report"
            classNames={{
              list: "archai-tabs-list",
              tab: "archai-tab",
            }}
            styles={{
              panel: { paddingTop: 24 },
            }}
          >
            <Tabs.List grow style={{ maxWidth: 640 }}>
              <Tabs.Tab value="report">Report</Tabs.Tab>
              <Tabs.Tab value="intelligence">Effort Analysis</Tabs.Tab>
              <Tabs.Tab value="apis">APIs</Tabs.Tab>
              <Tabs.Tab value="chat">Chat</Tabs.Tab>
              <Tabs.Tab value="detailed">Detailed</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="report">
              <ReportView
                repoId={id}
                repoStatus={{
                  status: repo.status,
                  files_processed: repo.files_processed,
                  error_message: repo.error_message,
                }}
              />
            </Tabs.Panel>
            <Tabs.Panel value="apis">
              {isReady ? (
                <ApisView repoId={id} />
              ) : (
                <Alert color="violet" variant="light" radius="md">
                  {isIndexing
                    ? "Indexing in progress. APIs will be available when ready."
                    : "Complete indexing to see APIs."}
                </Alert>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="detailed">
              {isReady ? (
                <DetailedReportView repoId={id} />
              ) : (
                <Alert color="violet" variant="light" radius="md">
                  {isIndexing
                    ? "Indexing in progress. Detailed analysis will be available when ready."
                    : "Complete indexing to see the detailed analysis."}
                </Alert>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="intelligence">
              {isReady ? (
                <IntelligenceView repoId={id} />
              ) : (
                <Alert color="violet" variant="light" radius="md">
                  {isIndexing
                    ? "Indexing in progress. Intelligence report will be available when ready."
                    : "Complete indexing to see the Project Intelligence report."}
                </Alert>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="chat">
              {isReady ? (
                <Chat repoId={id} />
              ) : (
                <Alert color="violet" variant="light" radius="md">
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
