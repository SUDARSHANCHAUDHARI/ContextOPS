import React from "react";
import { Box, render, Text } from "ink";
import { ContextOpsStore } from "@contextops/storage";

const store = new ContextOpsStore();
const summary = store.summary() as Record<string, number>;
const waste = store.listWaste(6) as Record<string, unknown>[];
const sessions = store.listSessions(6) as Record<string, unknown>[];
const projects = store.projectBreakdown({ limit: 6 }) as Record<string, unknown>[];
const models = store.modelBreakdown({ limit: 6 }) as Record<string, unknown>[];
store.close();

const App = () => (
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
    <Text color="yellow">Waste alerts</Text>
    {waste.length === 0 ? (
      <Text dimColor>No waste patterns stored yet. Run contextops scan.</Text>
    ) : null}
    {waste.map((item) => (
      <Text key={String(item.id)}>
        [{String(item.severity)}] {String(item.title)}
      </Text>
    ))}
    <Text color="green">Recent sessions</Text>
    {sessions.length === 0 ? <Text dimColor>No sessions stored yet.</Text> : null}
    {sessions.map((session) => (
      <Text key={String(session.id)}>
        {String(session.started_at)} {String(session.tool_id)} {String(session.total_tokens)} tokens
        ${Number(session.estimatedUsd ?? 0).toFixed(4)}
      </Text>
    ))}
    <Text color="magenta">Projects</Text>
    {projects.map((project) => (
      <Text key={String(project.projectPath)}>
        {String(project.projectName)} {String(project.sessionCount)} sessions $
        {Number(project.estimatedUsd ?? 0).toFixed(4)}
      </Text>
    ))}
    <Text color="blue">Models</Text>
    {models.map((model) => (
      <Text key={String(model.model)}>
        {String(model.model)} {String(model.inputTokens ?? 0)} in /{" "}
        {String(model.outputTokens ?? 0)} out
      </Text>
    ))}
  </Box>
);

render(<App />);
