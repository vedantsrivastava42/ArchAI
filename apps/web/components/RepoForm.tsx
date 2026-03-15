"use client";

import { TextInput, Button, Group, Alert } from "@mantine/core";

interface RepoFormProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  error?: string;
}

export function RepoForm({ value, onChange, onSubmit, loading, error }: RepoFormProps) {
  return (
    <>
      <Group align="flex-end" wrap="nowrap">
        <TextInput
          label="Repository URL"
          placeholder="https://github.com/owner/repo"
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button onClick={onSubmit} loading={loading}>
          Analyze
        </Button>
      </Group>
      {error && (
        <Alert color="red" mt="sm">
          {error}
        </Alert>
      )}
    </>
  );
}
