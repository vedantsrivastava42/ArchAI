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
  Transition,
  Text,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import type { ChatResponse } from "@archai/types";
import { MarkdownContent } from "./MarkdownContent";
import { apiFetch } from "../lib/api";

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
      const res = await apiFetch(`/api/repos/${repoId}/chat`, {
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

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage("");
    send.mutate(trimmed);
  };

  return (
    <div className="archai-chat" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
      <ScrollArea viewportRef={scrollRef} h={400} type="auto" style={{ flex: "1 1 auto" }}>
        <Stack gap="sm">
          {history.length === 0 && (
            <Paper className="archai-glass" p="lg" radius="md" style={{ padding: 24 }}>
              <Stack gap="xs">
                <Badge variant="light" color="violet">Tip</Badge>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Ask about the codebase: &quot;Where is X defined?&quot;, &quot;How does Y work?&quot; Or ask for an overview: &quot;What does this project do?&quot;
                </Text>
              </Stack>
            </Paper>
          )}
          {history.map((m, i) => (
            <Transition key={i} mounted={true} transition="fade" duration={220}>
              {(styles) => (
                <Paper
                  className="archai-glass"
                  p="lg"
                  radius="md"
                  style={{
                    ...styles,
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "90%",
                    minWidth: 0,
                    padding: 20,
                    borderLeftWidth: 3,
                    borderLeftColor: m.role === "user" ? "var(--mantine-color-violet-6)" : "rgba(255,255,255,0.2)",
                  }}
                >
                  <Stack gap="xs">
                    <Badge size="sm" color={m.role === "user" ? "violet" : "gray"} variant="light">
                      {m.role}
                    </Badge>
                {m.overview?.length ? (
                      <MessageContent content={m.content} overview={m.overview} />
                    ) : (
                      <MessageContent content={m.content} />
                    )}
                  </Stack>
                </Paper>
              )}
            </Transition>
          ))}
          {send.isPending && (
            <Transition mounted={send.isPending} transition="fade" duration={180}>
              {(styles) => (
                <Paper className="archai-glass" p="md" radius="md" style={styles}>
                  <Group gap="sm">
                    <Loader size="sm" color="violet" />
                    <span>Thinking…</span>
                  </Group>
                </Paper>
              )}
            </Transition>
          )}
        </Stack>
      </ScrollArea>
      <Group align="flex-end" wrap="nowrap" gap="sm" style={{ minWidth: 0 }}>
        <Textarea
          placeholder="Ask about the codebase…"
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          minRows={1}
          maxRows={4}
          style={{ flex: 1, minWidth: 0 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          color="violet"
          onClick={handleSend}
          loading={send.isPending}
          className="archai-btn-glow"
        >
          Send
        </Button>
      </Group>
    </Stack>
    </div>
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
            <div key={i} style={{ maxWidth: "100%", overflowX: "auto", minWidth: 0 }}>
              <CodeHighlight code={code} language={lang || "text"} withCopyButton />
            </div>
          );
        }
        return <MarkdownContent key={i} content={part} size="sm" />;
      })}
    </>
  );
}
