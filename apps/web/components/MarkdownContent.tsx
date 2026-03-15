"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Text, Code, List, Title } from "@mantine/core";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function MarkdownContent({ content, size = "sm", className }: MarkdownContentProps) {
  const components: Components = {
    p: ({ children }) => (
      <Text
        size={size}
        component="p"
        mb="xs"
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          minWidth: 0,
        }}
      >
        {children}
      </Text>
    ),
    strong: ({ children }) => (
      <Text component="strong" fw={700} inherit>
        {children}
      </Text>
    ),
    em: ({ children }) => (
      <Text component="em" fs="italic" inherit>
        {children}
      </Text>
    ),
    code: ({ className, children, ...props }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <Code fz={size} {...props}>
            {String(children).replace(/\n$/, "")}
          </Code>
        );
      }
      return (
        <Code block fz={size} {...props}>
          {String(children).replace(/\n$/, "")}
        </Code>
      );
    },
    ul: ({ children }) => (
      <List size={size} spacing="xs" mb="sm" style={{ listStyleType: "disc" }}>
        {children}
      </List>
    ),
    ol: ({ children }) => (
      <List size={size} spacing="xs" type="ordered" mb="sm">
        {children}
      </List>
    ),
    li: ({ children }) => (
      <List.Item>
        <Text size={size} component="span" inherit>
          {children}
        </Text>
      </List.Item>
    ),
    h1: ({ children }) => (
      <Title order={1} size={size} mb="xs" mt="md">
        {children}
      </Title>
    ),
    h2: ({ children }) => (
      <Title order={2} size={size} mb="xs" mt="md">
        {children}
      </Title>
    ),
    h3: ({ children }) => (
      <Title order={3} size={size} mb="xs" mt="sm">
        {children}
      </Title>
    ),
    h4: ({ children }) => (
      <Title order={4} size={size} mb="xs" mt="sm">
        {children}
      </Title>
    ),
    h5: ({ children }) => (
      <Title order={5} size={size} mb="xs" mt="xs">
        {children}
      </Title>
    ),
    h6: ({ children }) => (
      <Title order={6} size={size} mb="xs" mt="xs">
        {children}
      </Title>
    ),
  };

  return (
    <div
      className={className}
      style={{
        boxSizing: "border-box",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
