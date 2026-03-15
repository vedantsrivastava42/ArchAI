"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Paper,
  Card,
  Badge,
  Group,
  Button,
  Anchor,
  Loader,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { RepoForm } from "../components/RepoForm";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type RepoItem = {
  id: string;
  github_url: string;
  name: string;
  status: string;
  error_message: string | null;
  files_processed: number;
  created_at: string;
};

function useRepos() {
  return useQuery({
    queryKey: ["repos"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/repos`);
      if (!res.ok) throw new Error("Failed to load repos");
      return res.json() as Promise<RepoItem[]>;
    },
  });
}

function statusColor(status: string): string {
  return status === "ready" ? "green" : status === "failed" ? "red" : "violet";
}

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");

  const { data: repos = [], isLoading: reposLoading } = useRepos();

  const submit = useMutation({
    mutationFn: async (repoUrl: string) => {
      const res = await fetch(`${API_BASE}/api/repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? res.statusText);
      }
      return res.json() as Promise<{ repoId: string; status: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      router.push(`/repos/${data.repoId}`);
    },
  });

  const deleteRepo = useMutation({
    mutationFn: async (repoId: string) => {
      const res = await fetch(`${API_BASE}/api/repos/${repoId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
    },
  });

  return (
    <Container size="lg" py={48}>
      <Stack gap="xl">
        <header>
          <Title
            order={1}
            className="archai-gradient-text"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: 8 }}
          >
            ArchAI
          </Title>
          <Text size="lg" c="dimmed" style={{ maxWidth: 480, lineHeight: 1.6 }}>
            Analyze a GitHub repository with AI. Paste the repo URL to start.
          </Text>
        </header>

        <Paper
          className="archai-glass"
          p="lg"
          radius="md"
          style={{ padding: 24 }}
        >
          <RepoForm
            value={url}
            onChange={setUrl}
            onSubmit={() => submit.mutate(url)}
            loading={submit.isPending}
            error={submit.error?.message}
          />
        </Paper>

        <section style={{ marginTop: 40 }}>
          <Title order={3} mb="md">
            Your repositories
          </Title>
          {reposLoading ? (
            <Group gap="sm">
              <Loader size="sm" color="violet" />
              <Text size="sm" c="dimmed">
                Loading repos…
              </Text>
            </Group>
          ) : repos.length === 0 ? (
            <Text size="sm" c="dimmed">
              No repositories yet. Add one above.
            </Text>
          ) : (
            <Stack gap="md">
              {repos.map((repo) => (
                <Card
                  key={repo.id}
                  className="archai-glass"
                  padding="lg"
                  radius="md"
                  style={{ padding: 24 }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group wrap="nowrap" style={{ minWidth: 0 }} gap="md">
                      <Anchor
                        component={Link}
                        href={`/repos/${repo.id}`}
                        size="sm"
                        fw={600}
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {repo.name}
                      </Anchor>
                      <Badge
                        size="sm"
                        color={statusColor(repo.status)}
                        variant="light"
                        radius="xl"
                      >
                        {repo.status}
                      </Badge>
                      {repo.files_processed > 0 && (
                        <Text size="xs" c="dimmed">
                          {repo.files_processed} files
                        </Text>
                      )}
                    </Group>
                    <Group gap="xs">
                      <Button
                        component={Link}
                        href={`/repos/${repo.id}`}
                        size="xs"
                        variant="light"
                        color="violet"
                        rightSection={<IconArrowRight size={14} />}
                        className="archai-btn-glow"
                      >
                        Open
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        loading={
                          deleteRepo.isPending && deleteRepo.variables === repo.id
                        }
                        onClick={() => deleteRepo.mutate(repo.id)}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Group>
                  {repo.error_message && (
                    <Text size="xs" c="red" mt="xs">
                      {repo.error_message}
                    </Text>
                  )}
                </Card>
              ))}
            </Stack>
          )}
        </section>
      </Stack>
    </Container>
  );
}
