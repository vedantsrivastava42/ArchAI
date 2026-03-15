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

  const statusColor = (status: string) =>
    status === "ready" ? "green" : status === "failed" ? "red" : "blue";

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>ArchAI</Title>
        <Text c="dimmed">Analyze a GitHub repository with AI. Paste the repo URL to start.</Text>
        <Paper p="md" withBorder>
          <RepoForm
            value={url}
            onChange={setUrl}
            onSubmit={() => submit.mutate(url)}
            loading={submit.isPending}
            error={submit.error?.message}
          />
        </Paper>

        <Title order={3} mt="md">
          Your repositories
        </Title>
        {reposLoading ? (
          <Group>
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading repos…</Text>
          </Group>
        ) : repos.length === 0 ? (
          <Text size="sm" c="dimmed">No repositories yet. Add one above.</Text>
        ) : (
          <Stack gap="sm">
            {repos.map((repo) => (
              <Card key={repo.id} withBorder padding="sm" radius="md">
                <Group justify="space-between" wrap="nowrap">
                  <Group wrap="nowrap" style={{ minWidth: 0 }}>
                    <Anchor
                      component={Link}
                      href={`/repos/${repo.id}`}
                      size="sm"
                      fw={500}
                      style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {repo.name}
                    </Anchor>
                    <Badge size="sm" color={statusColor(repo.status)} variant="light">
                      {repo.status}
                    </Badge>
                    {repo.files_processed > 0 && (
                      <Text size="xs" c="dimmed">
                        {repo.files_processed} files
                      </Text>
                    )}
                  </Group>
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    loading={deleteRepo.isPending && deleteRepo.variables === repo.id}
                    onClick={() => deleteRepo.mutate(repo.id)}
                  >
                    Delete
                  </Button>
                </Group>
                {repo.error_message && (
                  <Text size="xs" c="red" mt={4}>
                    {repo.error_message}
                  </Text>
                )}
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
