"use client";

import {
  Stack,
  ScrollArea,
  Paper,
  Textarea,
  Button,
  Group,
  Badge,
  Loader,
  List,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import type { ChatResponse } from "@archai/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
  overview?: string[];
}

interface ChatProps {
  repoId: string;
}

export function Chat({ repoId }: ChatProps) {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const send = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`${API_BASE}/api/repos/${repoId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history.map((h) => ({ role: h.role, content: h.content })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? res.statusText);
      }
      return res.json() as Promise<ChatResponse>;
    },
    onSuccess: (data, text) => {
      setHistory((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: data.answer, overview: data.overview },
      ]);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["repo", repoId] });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history]);

  return (
    <Stack gap="md">
      <ScrollArea viewportRef={scrollRef} h={400} type="auto">
        <Stack gap="sm">
          {history.length === 0 && (
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Badge variant="light">Tip</Badge>
                Ask about the codebase: &quot;Where is X defined?&quot;, &quot;How does Y work?&quot; Or ask for an overview: &quot;What does this project do?&quot;
              </Stack>
            </Paper>
          )}
          {history.map((m, i) => (
            <Paper
              key={i}
              p="md"
              withBorder
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "90%",
              }}
            >
              <Stack gap="xs">
                <Badge size="sm" color={m.role === "user" ? "blue" : "gray"}>
                  {m.role}
                </Badge>
                {m.overview?.length ? (
                  <MessageContent content={m.content} overview={m.overview} />
                ) : (
                  <MessageContent content={m.content} />
                )}
              </Stack>
            </Paper>
          ))}
          {send.isPending && (
            <Paper p="md" withBorder>
              <Group>
                <Loader size="sm" />
                <span>Thinking…</span>
              </Group>
            </Paper>
          )}
        </Stack>
      </ScrollArea>
      <Group align="flex-end" wrap="nowrap">
        <Textarea
          placeholder="Ask about the codebase…"
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          minRows={1}
          maxRows={4}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (message.trim()) send.mutate(message.trim());
            }
          }}
        />
        <Button onClick={() => message.trim() && send.mutate(message.trim())} loading={send.isPending}>
          Send
        </Button>
      </Group>
    </Stack>
  );
}

function MessageContent({ content, overview }: { content: string; overview?: string[] }) {
  if (overview?.length) {
    return (
      <Stack gap="xs">
        <List size="sm" spacing="xs">
          {overview.map((item, i) => (
            <List.Item key={i}>{item}</List.Item>
          ))}
        </List>
      </Stack>
    );
  }
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const match = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
          const lang = match?.[1] ?? "";
          const code = match?.[2] ?? part.slice(3, -3);
          return (
            <CodeHighlight key={i} code={code} language={lang || "text"} withCopyButton />
          );
        }
        return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
      })}
    </>
  );
}
