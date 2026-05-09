import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const contextopsMeta = sqliteTable("contextops_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tools = sqliteTable("tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  installed: integer("installed", { mode: "boolean" }).notNull(),
  confidence: real("confidence").notNull(),
  detectedAt: text("detected_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  name: text("name").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  toolId: text("tool_id").notNull(),
  projectId: text("project_id"),
  sourcePath: text("source_path").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  totalTokens: integer("total_tokens").notNull(),
  confidence: real("confidence").notNull(),
  warningsJson: text("warnings_json").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  model: text("model"),
  tokenCount: integer("token_count").notNull(),
});

export const replayEvents = sqliteTable("replay_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  kind: text("kind").notNull(),
  timestamp: text("timestamp").notNull(),
  label: text("label").notNull(),
  detail: text("detail"),
  tokens: integer("tokens"),
  filePath: text("file_path"),
  model: text("model"),
});

export const costEstimates = sqliteTable("cost_estimates", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  estimatedUsd: real("estimated_usd").notNull(),
  confidence: real("confidence").notNull(),
});

export const wastePatterns = sqliteTable("waste_patterns", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  kind: text("kind").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  evidenceJson: text("evidence_json").notNull(),
  estimatedWastedTokens: integer("estimated_wasted_tokens").notNull(),
  confidence: real("confidence").notNull(),
});

export const scanRuns = sqliteTable("scan_runs", {
  id: text("id").primaryKey(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  scannedPathsJson: text("scanned_paths_json").notNull(),
  warningsJson: text("warnings_json").notNull(),
});

export const modelUsage = sqliteTable("model_usage", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
});

export const timelineNodes = sqliteTable("timeline_nodes", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  parentId: text("parent_id"),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  timestamp: text("timestamp").notNull(),
});
