import React, { useState } from "react";
import { Box, render, Text, useInput } from "ink";
import { ContextOpsStore } from "@contextops/storage";

const store = new ContextOpsStore();
const summary = store.summary() as Record<string, number>;
const waste = store.listWaste(6) as Record<string, unknown>[];
const sessions = store.listSessions(6) as Record<string, unknown>[];
const projects = store.projectBreakdown({ limit: 6 }) as Record<string, unknown>[];
const models = store.modelBreakdown({ limit: 6 }) as Record<string, unknown>[];
store.close();

const tabs = ["waste", "sessions", "projects", "models"] as const;
type Tab = (typeof tabs)[number];

const App = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tab = tabs[tabIndex] ?? "waste";
  const rows = rowsFor(tab);

  useInput((input, key) => {
    if (input === "q") process.exit(0);
    if (key.leftArrow || input === "h") {
      setTabIndex((value) => (value + tabs.length - 1) % tabs.length);
      setSelectedIndex(0);
    }
    if (key.rightArrow || input === "l") {
      setTabIndex((value) => (value + 1) % tabs.length);
      setSelectedIndex(0);
    }
    if (key.upArrow || input === "k") setSelectedIndex((value) => Math.max(0, value - 1));
    if (key.downArrow || input === "j")
      setSelectedIndex((value) => Math.min(rows.length - 1, value + 1));
  });

  const selected = rows[selectedIndex];

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="cyanBright" bold>
        ContextOps local workflow intelligence
      </Text>
      <Box gap={4}>
        <Text>Sessions {summary.sessionCount ?? 0}</Text>
        <Text>Tokens {(summary.totalTokens ?? 0).toLocaleString()}</Text>
        <Text>Cost ${Number(summary.estimatedUsd ?? 0).toFixed(4)}</Text>
        <Text>Waste {summary.wastePatternCount ?? 0}</Text>
      </Box>
      <Box gap={2} marginTop={1}>
        {tabs.map((item) => (
          <Text key={item} inverse={item === tab} color={item === tab ? "black" : "cyan"}>
            {item}
          </Text>
        ))}
      </Box>
      <Text dimColor>Use h/l or arrows to switch tabs, j/k to move, q to quit.</Text>
      <Box marginTop={1} flexDirection="column">
        {rows.length === 0 ? <Text dimColor>{emptyText(tab)}</Text> : null}
        {rows.map((row, index) => (
          <Text key={String(row.id ?? row.projectPath ?? row.model ?? index)}>
            <Text color={index === selectedIndex ? "cyanBright" : undefined}>
              {index === selectedIndex ? ">" : " "}
            </Text>{" "}
            {summaryLine(tab, row)}
          </Text>
        ))}
      </Box>
      {selected ? (
        <Box
          borderStyle="round"
          borderColor="gray"
          flexDirection="column"
          marginTop={1}
          paddingX={1}
        >
          <Text color="yellow">Detail</Text>
          {detailLines(tab, selected).map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

const rowsFor = (tab: Tab) =>
  tab === "waste" ? waste : tab === "sessions" ? sessions : tab === "projects" ? projects : models;

const emptyText = (tab: Tab) =>
  tab === "waste"
    ? "No waste patterns stored yet. Run contextops scan."
    : tab === "sessions"
      ? "No sessions stored yet."
      : `No ${tab} data yet.`;

const summaryLine = (tab: Tab, row: Record<string, unknown>) => {
  if (tab === "waste") return `[${row.severity}] ${row.title}`;
  if (tab === "sessions")
    return `${String(row.started_at)} ${String(row.tool_id)} ${String(row.total_tokens)} tokens $${Number(row.estimatedUsd ?? 0).toFixed(4)}`;
  if (tab === "projects")
    return `${String(row.projectName)} ${String(row.sessionCount)} sessions $${Number(row.estimatedUsd ?? 0).toFixed(4)}`;
  return `${String(row.model)} ${String(row.inputTokens ?? 0)} in / ${String(row.outputTokens ?? 0)} out`;
};

const detailLines = (tab: Tab, row: Record<string, unknown>) => {
  if (tab === "waste") {
    return [
      `Kind: ${String(row.kind ?? "")}`,
      `Wasted tokens: ${Number(row.estimated_wasted_tokens ?? 0).toLocaleString()}`,
      `Why: ${String(row.explanation ?? "")}`,
    ];
  }
  if (tab === "sessions") {
    return [
      `ID: ${String(row.id ?? "")}`,
      `Source: ${String(row.source_path ?? "")}`,
      `Confidence: ${String(row.confidence ?? "")}`,
    ];
  }
  if (tab === "projects") {
    return [`Path: ${String(row.projectPath ?? "")}`, `Tokens: ${String(row.totalTokens ?? 0)}`];
  }
  return [
    `Sessions: ${String(row.sessionCount ?? 0)}`,
    `Cost: $${Number(row.estimatedUsd ?? 0).toFixed(4)}`,
  ];
};

render(<App />);
