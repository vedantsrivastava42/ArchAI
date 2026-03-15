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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function useRepo(id: string | undefined) {
  return useQuery({
    queryKey: ["repo", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/repos/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json() as Promise<{
        id: string;
        name: string;
        status: string;
        error_message: string | null;
        files_processed: number;
      }>;
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

  if (error || (!isLoading && !repo)) {
    return (
      <Container py="xl">
        <Alert color="red">Repository not found.</Alert>
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

          <Tabs defaultValue="chat">
            <Tabs.List>
              <Tabs.Tab value="chat">Chat</Tabs.Tab>
            </Tabs.List>
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
