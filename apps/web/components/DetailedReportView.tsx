"use client";

import {
  Text,
  Loader,
  Group,
  Paper,
  Accordion,
  Transition,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  IconFileDescription,
  IconTarget,
  IconSparkles,
  IconHierarchy2,
  IconComponents,
  IconPlug,
  IconDatabase,
  IconPlugConnected,
  IconRoute,
  IconCode,
} from "@tabler/icons-react";
import { MarkdownContent } from "./MarkdownContent";
import { apiFetch } from "../lib/api";

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

const SECTIONS: Array<{
  key: keyof DetailedReport;
  title: string;
  icon: React.ElementType;
  color: string;
}> = [
  { key: "projectOverview", title: "1. Project Overview", icon: IconFileDescription, color: "violet" },
  { key: "coreProblemAndDomain", title: "2. Core Problem & Domain", icon: IconTarget, color: "indigo" },
  { key: "featureBreakdown", title: "3. Feature Breakdown", icon: IconSparkles, color: "cyan" },
  { key: "systemArchitecture", title: "4. System Architecture", icon: IconHierarchy2, color: "blue" },
  { key: "componentResponsibilities", title: "5. Component Responsibilities", icon: IconComponents, color: "teal" },
  { key: "apiSurface", title: "6. API Surface", icon: IconPlug, color: "violet" },
  { key: "dataModelAndStorage", title: "7. Data Model & Storage", icon: IconDatabase, color: "grape" },
  { key: "externalIntegrations", title: "8. External Integrations", icon: IconPlugConnected, color: "orange" },
  { key: "requestLifecycle", title: "9. Request Lifecycle", icon: IconRoute, color: "lime" },
  { key: "advancedEngineeringDecisions", title: "10. Advanced Engineering Decisions", icon: IconCode, color: "gray" },
];

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
      const res = await apiFetch(`/api/repos/${repoId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json() as Promise<ReportForDetailed>;
    },
    enabled: !!repoId,
  });

  if (isLoading) {
    return (
      <Transition mounted={true} transition="fade" duration={200}>
        {(styles) => (
          <Group style={styles} gap="sm">
            <Loader size="sm" color="violet" />
            <Text size="sm" c="dimmed">
              Loading detailed report…
            </Text>
          </Group>
        )}
      </Transition>
    );
  }

  if (error || !report) {
    return (
      <Text size="sm" c="dimmed">
        No report available. It may still be generating after indexing.
      </Text>
    );
  }

  const detailed = report.detailed;
  if (!detailed) {
    return (
      <Text size="sm" c="dimmed">
        No detailed report yet. Re-index the repository to generate the 10-section
        technical analysis.
      </Text>
    );
  }

  const hasAny = SECTIONS.some((s) => detailed[s.key]?.trim());
  if (!hasAny) {
    return (
      <Text size="sm" c="dimmed">
        Detailed report is empty. Re-index the repository to generate the analysis.
      </Text>
    );
  }

  return (
    <div className="archai-detailed" style={{ marginTop: 40 }}>
      <Paper
        className="archai-glass"
        p="lg"
        radius="md"
        style={{ padding: 24 }}
      >
        <Accordion
          variant="separated"
          transitionDuration={280}
          radius="md"
          classNames={{
            item: "archai-detailed-item",
            control: "archai-detailed-control",
            panel: "archai-detailed-panel",
            content: "archai-detailed-content",
          }}
          styles={{
            item: {
              background: "var(--archai-card)",
              backdropFilter: "blur(10px)",
              border: "1px solid var(--archai-border)",
              borderRadius: "var(--mantine-radius-md)",
              boxShadow: "var(--archai-shadow)",
            },
            control: {
              padding: "20px 24px",
            },
            panel: {
              padding: "0 24px 24px",
            },
            content: {
              padding: 0,
            },
          }}
        >
          {SECTIONS.map(({ key, title, icon: Icon, color }) => {
            const content = detailed[key]?.trim();
            if (!content) return null;
            return (
              <Accordion.Item key={key} value={key}>
                <Accordion.Control>
                  <Group gap="sm">
                    <ThemeIcon size="lg" radius="md" variant="light" color={color}>
                      <Icon size={20} />
                    </ThemeIcon>
                    <Title order={4} style={{ fontWeight: 600 }}>
                      {title}
                    </Title>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <div style={{ lineHeight: 1.7 }}>
                    <MarkdownContent content={content} size="sm" />
                  </div>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      </Paper>
    </div>
  );
}
