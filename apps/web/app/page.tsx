"use client";

import { Container, Title, Text, Stack, Paper } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RepoForm } from "../components/RepoForm";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");

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
      router.push(`/repos/${data.repoId}`);
    },
  });

  return (
    <Container size="sm" py="xl">
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
      </Stack>
    </Container>
  );
}
