"use client";

import { Text, Loader, Group, Paper, Accordion } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SECTIONS: Array<{ key: keyof DetailedReport; title: string }> = [
  { key: "projectOverview", title: "1. Project Overview" },
  { key: "coreProblemAndDomain", title: "2. Core Problem & Domain" },
  { key: "featureBreakdown", title: "3. Feature Breakdown" },
  { key: "systemArchitecture", title: "4. System Architecture" },
  { key: "componentResponsibilities", title: "5. Component Responsibilities" },
  { key: "apiSurface", title: "6. API Surface" },
  { key: "dataModelAndStorage", title: "7. Data Model & Storage" },
  { key: "externalIntegrations", title: "8. External Integrations" },
  { key: "requestLifecycle", title: "9. Request Lifecycle" },
  { key: "advancedEngineeringDecisions", title: "10. Advanced Engineering Decisions" },
];

interface DetailedReport {
  projectOverview?: string;
  coreProblemAndDomain?: string;
  featureBreakdown?: string;
  systemArchitecture?: string;
  componentResponsibilities?: string;
  apiSurface?: string;
  dataModelAndStorage?: string;
  externalIntegrations?: string;
  requestLifecycle?: string;
  advancedEngineeringDecisions?: string;
}

interface ReportForDetailed {
  detailed?: DetailedReport | null;
}

interface DetailedReportViewProps {
  repoId: string;
}

export function DetailedReportView({ repoId }: DetailedReportViewProps) {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", repoId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/repos/${repoId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json() as Promise<ReportForDetailed>;
    },
    enabled: !!repoId,
  });

  if (isLoading) {
    return (
      <Group>
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Loading detailed report…</Text>
      </Group>
    );
  }

  if (error || !report) {
    return (
      <Text size="sm" c="dimmed">No report available. It may still be generating after indexing.</Text>
    );
  }

  const detailed = report.detailed;
  if (!detailed) {
    return (
      <Text size="sm" c="dimmed">No detailed report yet. Re-index the repository to generate the 10-section technical analysis.</Text>
    );
  }

  const hasAny = SECTIONS.some((s) => detailed[s.key]?.trim());
  if (!hasAny) {
    return (
      <Text size="sm" c="dimmed">Detailed report is empty. Re-index the repository to generate the analysis.</Text>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Accordion variant="separated">
        {SECTIONS.map(({ key, title }) => {
          const content = detailed[key]?.trim();
          if (!content) return null;
          return (
            <Accordion.Item key={key} value={key}>
              <Accordion.Control>{title}</Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{content}</Text>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Paper>
  );
}
