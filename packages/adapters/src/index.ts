import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import {
  type Adapter,
  type AdapterScanResult,
  type ParsedMessage,
  type ParsedSession,
  type ParseWarning,
  type ReplayEvent,
  type SourceFormat,
  type TokenEstimate,
  type ToolDetection,
  type ToolId,
  emptyTokenEstimate,
  makeId,
  nowIso,
} from "@contextops/core";

type AdapterProfile = {
  id: ToolId;
  name: string;
  defaultPaths: string[];
  sessionRoots: string[];
  filenameHints: string[];
};

const home = process.env.HOME ?? ".";

const profiles: AdapterProfile[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    defaultPaths: [join(home, ".claude"), join(home, ".config", "claude")],
    sessionRoots: [join(home, ".claude", "projects")],
    filenameHints: [".jsonl", ".json", ".log", ".txt"],
  },
  {
    id: "codex-cli",
    name: "OpenAI Codex CLI",
    defaultPaths: [join(home, ".codex")],
    sessionRoots: [join(home, ".codex", "sessions")],
    filenameHints: [".jsonl", ".json", ".log", ".txt"],
  },
  {
    id: "cursor",
    name: "Cursor",
    defaultPaths: [join(home, "Library", "Application Support", "Cursor"), join(home, ".cursor")],
    sessionRoots: [
      join(home, "Library", "Application Support", "Cursor", "User", "globalStorage"),
      join(home, ".config", "Cursor", "User", "globalStorage"),
      join(home, ".cursor"),
    ],
    filenameHints: [".json", ".jsonl", ".log", ".sqlite", ".sqlite3", ".db", ".vscdb"],
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    defaultPaths: [join(home, ".gemini")],
    sessionRoots: [join(home, ".gemini")],
    filenameHints: [".jsonl", ".json", ".log", ".txt"],
  },
];

export const createAdapters = (): Adapter[] => profiles.map(createAdapter);
export const getAdapter = (id: ToolId): Adapter | undefined =>
  createAdapters().find((adapter) => adapter.id === id);

export const estimateTextTokens = (text: string, source: TokenEstimate["source"] = "estimated") => {
  const totalTokens = Math.max(0, Math.ceil(text.trim().length / 4));
  return {
    inputTokens: totalTokens,
    outputTokens: 0,
    totalTokens,
    confidence: text.length > 0 ? 0.45 : 0,
    source,
  } satisfies TokenEstimate;
};

const createAdapter = (profile: AdapterProfile): Adapter => ({
  id: profile.id,
  name: profile.name,
  async detect() {
    const paths = [...profile.defaultPaths, ...profile.sessionRoots].filter(
      (path, index, all) => existsSync(path) && all.indexOf(path) === index,
    );
    return {
      id: profile.id,
      name: profile.name,
      installed: paths.length > 0,
      confidence: paths.length > 0 ? 0.75 : 0.15,
      paths,
      warnings: paths.length === 0 ? [`No default ${profile.name} paths found.`] : [],
    } satisfies ToolDetection;
  },
  async scan(paths) {
    const warnings: ParseWarning[] = [];
    const candidates = paths.length > 0 ? paths : profile.sessionRoots;
    const files = collectSessionFiles(candidates, profile.filenameHints, warnings);
    const sessions: ParsedSession[] = [];

    for (const file of files) {
      try {
        if (profile.id === "cursor" && isSqlitePath(file)) {
          sessions.push(...parseCursorDatabase(profile, file, warnings));
        } else {
          sessions.push(await this.parseSession(file));
        }
      } catch (error) {
        warnings.push({
          code: "parse_unhandled",
          message: error instanceof Error ? error.message : String(error),
          severity: "warning",
          path: file,
        });
      }
    }

    return {
      toolId: profile.id,
      scannedPaths: candidates,
      sessions,
      warnings,
    } satisfies AdapterScanResult;
  },
  async parseSession(path) {
    if (profile.id === "cursor" && isSqlitePath(path)) {
      const warnings: ParseWarning[] = [];
      return (
        parseCursorDatabase(profile, path, warnings)[0] ?? emptySession(profile, path, warnings)
      );
    }
    return parseGenericSession(profile, path);
  },
  extractTimeline(session) {
    return buildTimeline(session);
  },
  estimateTokens(text) {
    return estimateTextTokens(text);
  },
});

const collectSessionFiles = (paths: string[], extensions: string[], warnings: ParseWarning[]) => {
  const files: string[] = [];
  const visit = (path: string, depth: number) => {
    if (depth > 8) return;
    if (!existsSync(path)) {
      warnings.push({
        code: "path_missing",
        message: "Scan path does not exist.",
        severity: "info",
        path,
      });
      return;
    }
    const stats = statSync(path);
    if (stats.isFile() && extensions.includes(extname(path).toLowerCase())) {
      files.push(path);
      return;
    }
    if (!stats.isDirectory()) return;
    for (const entry of safeReadDir(path, warnings)) {
      if (["node_modules", ".git", "Cache", "CachedData", "GPUCache", "logs"].includes(entry))
        continue;
      visit(join(path, entry), depth + 1);
    }
  };

  paths.forEach((path) => visit(path, 0));
  return files.slice(0, 500);
};

const parseCursorDatabase = (
  profile: AdapterProfile,
  path: string,
  warnings: ParseWarning[],
): ParsedSession[] => {
  let db: DatabaseType | undefined;
  try {
    db = new Database(path, { readonly: true, fileMustExist: true });
    const tables = db
      .prepare("select name from sqlite_master where type = 'table'")
      .all() as Array<{ name: string }>;
    const records: Record<string, unknown>[] = [];

    for (const table of tables) {
      if (!/cursor|state|storage|kv|conversation|composer|chat/i.test(table.name)) continue;
      records.push(...readCursorTable(db, table.name, warnings, path));
    }

    if (records.length === 0) {
      warnings.push({
        code: "cursor_sqlite_no_records",
        message: "No session-like records were found in Cursor SQLite database.",
        severity: "info",
        path,
      });
      return [emptySession(profile, path, warnings)];
    }

    return groupCursorRecords(profile, path, records, warnings);
  } catch (error) {
    warnings.push({
      code: "cursor_sqlite_read_failed",
      message: error instanceof Error ? error.message : String(error),
      severity: "warning",
      path,
    });
    return [emptySession(profile, path, warnings)];
  } finally {
    db?.close();
  }
};

const readCursorTable = (
  db: DatabaseType,
  table: string,
  warnings: ParseWarning[],
  path: string,
): Record<string, unknown>[] => {
  try {
    const columns = db.prepare(`pragma table_info(${quoteIdentifier(table)})`).all() as Array<{
      name: string;
    }>;
    const keyColumn = columns.find((column) => /^(key|id)$/i.test(column.name))?.name;
    const valueColumn = columns.find((column) =>
      /^(value|content|data|json)$/i.test(column.name),
    )?.name;
    if (!keyColumn || !valueColumn) return [];

    const rows = db
      .prepare(
        `select ${quoteIdentifier(keyColumn)} as recordKey, ${quoteIdentifier(valueColumn)} as recordValue from ${quoteIdentifier(
          table,
        )} limit 5000`,
      )
      .all() as Array<{ recordKey: unknown; recordValue: unknown }>;

    return rows.flatMap((row) => cursorRowToRecords(row.recordKey, row.recordValue, table));
  } catch (error) {
    warnings.push({
      code: "cursor_table_read_failed",
      message: error instanceof Error ? error.message : String(error),
      severity: "warning",
      path,
    });
    return [];
  }
};

const cursorRowToRecords = (
  recordKey: unknown,
  recordValue: unknown,
  table: string,
): Record<string, unknown>[] => {
  const key = stringifyValue(recordKey);
  if (!/bubble|composer|conversation|chat|message|session|token|usage/i.test(key)) return [];
  const parsed = parseMaybeJson(recordValue);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  return flattenCursorValues(values)
    .filter(isRecord)
    .map((record) => ({
      ...record,
      cursorKey: key,
      cursorTable: table,
      cursorConversationId:
        stringifyValue(record.conversationId ?? record.sessionId ?? record.composerId) ||
        key.match(/(?:conversation|composer|session|bubbleId)[:/|_-]([^:/|_-]+)/i)?.[1] ||
        "cursor-local",
    }));
};

const flattenCursorValues = (values: unknown[]): unknown[] => {
  const output: unknown[] = [];
  const visit = (value: unknown, inherited: Record<string, unknown> = {}) => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, inherited));
      return;
    }
    if (!isRecord(value)) return;
    const nextInherited = {
      ...inherited,
      workspace: value.workspace ?? inherited.workspace,
      projectPath: value.projectPath ?? inherited.projectPath,
      cwd: value.cwd ?? inherited.cwd,
      conversationId: value.conversationId ?? inherited.conversationId,
      sessionId: value.sessionId ?? inherited.sessionId,
      composerId: value.composerId ?? inherited.composerId,
    };
    const messageLike =
      value.role ||
      value.content ||
      value.text ||
      value.prompt ||
      value.response ||
      value.usage ||
      value.model ||
      value.inputTokens ||
      value.outputTokens;
    if (messageLike) output.push({ ...nextInherited, ...value });
    for (const nestedKey of ["messages", "bubbles", "conversation", "turns", "items", "entries"]) {
      const nested = value[nestedKey];
      if (Array.isArray(nested)) nested.forEach((item) => visit(item, nextInherited));
    }
  };
  values.forEach((value) => visit(value));
  return output;
};

const groupCursorRecords = (
  profile: AdapterProfile,
  path: string,
  records: Record<string, unknown>[],
  warnings: ParseWarning[],
): ParsedSession[] => {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const record of records) {
    const key = stringifyValue(record.cursorConversationId) || "cursor-local";
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return [...groups.entries()].map(([groupId, groupRecords]) => {
    const messages = recordsToMessages(profile, groupRecords, "", warnings);
    const tokenEstimate = combineTokenEstimates(messages.map((message) => message.tokenEstimate));
    const startedAt = messages[0]?.createdAt ?? nowIso();
    const session: ParsedSession = {
      id: makeId(
        profile.id,
        `${path}:${groupId}:${messages.map((message) => message.id).join(":")}`,
      ),
      toolId: profile.id,
      startedAt,
      endedAt: messages.at(-1)?.createdAt,
      sourcePath: path,
      sourceFormat: "unknown",
      projectPath: inferProjectPath(groupRecords),
      messages,
      replayEvents: [],
      tokenEstimate,
      warnings,
      metadata: {
        sourceFile: basename(path),
        recordCount: groupRecords.length,
        adapter: profile.id,
        cursorConversationId: groupId,
      },
    };
    session.replayEvents = buildTimeline(session);
    return session;
  });
};

const emptySession = (
  profile: AdapterProfile,
  path: string,
  warnings: ParseWarning[],
): ParsedSession => ({
  id: makeId(profile.id, `${path}:empty`),
  toolId: profile.id,
  startedAt: nowIso(),
  sourcePath: path,
  sourceFormat: isSqlitePath(path) ? "unknown" : "unknown",
  messages: [],
  replayEvents: [],
  tokenEstimate: emptyTokenEstimate(),
  warnings,
  metadata: { sourceFile: basename(path), recordCount: 0, adapter: profile.id },
});

const safeReadDir = (path: string, warnings: ParseWarning[]) => {
  try {
    return readdirSync(path);
  } catch (error) {
    warnings.push({
      code: "read_dir_failed",
      message: error instanceof Error ? error.message : String(error),
      severity: "warning",
      path,
    });
    return [];
  }
};

const parseGenericSession = (profile: AdapterProfile, path: string): ParsedSession => {
  const warnings: ParseWarning[] = [];
  const raw = safeReadFile(path, warnings);
  const format = detectFormat(path, raw);
  const records = expandGenericRecords(parseRecords(raw, format, warnings, path));
  const messages = recordsToMessages(profile, records, raw, warnings);
  const tokenEstimate = combineTokenEstimates(messages.map((message) => message.tokenEstimate));
  const startedAt = messages[0]?.createdAt ?? nowIso();
  const sessionId = makeId(profile.id, `${path}:${raw.slice(0, 500)}`);
  const session: ParsedSession = {
    id: sessionId,
    toolId: profile.id,
    startedAt,
    endedAt: messages.at(-1)?.createdAt,
    sourcePath: path,
    sourceFormat: format,
    projectPath: inferProjectPath(records),
    messages,
    replayEvents: [],
    tokenEstimate,
    warnings,
    metadata: { sourceFile: basename(path), recordCount: records.length, adapter: profile.id },
  };
  session.replayEvents = buildTimeline(session);
  return session;
};

const expandGenericRecords = (records: Record<string, unknown>[]) => {
  const output: Record<string, unknown>[] = [];
  const visit = (value: unknown, inherited: Record<string, unknown> = {}) => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, inherited));
      return;
    }
    if (!isRecord(value)) return;
    const nextInherited = {
      ...inherited,
      cwd: value.cwd ?? inherited.cwd,
      workspace: value.workspace ?? inherited.workspace,
      projectPath: value.projectPath ?? inherited.projectPath,
      sessionId: value.sessionId ?? value.id ?? inherited.sessionId,
      conversationId: value.conversationId ?? inherited.conversationId,
      model: value.model ?? value.modelName ?? inherited.model,
    };
    const nestedKeys = [
      "messages",
      "bubbles",
      "turns",
      "entries",
      "items",
      "events",
      "conversation",
    ];
    const contentKeys = ["candidates", "parts", "content", "contents"];
    const hasNested = nestedKeys.some((key) => Array.isArray(value[key]) || isRecord(value[key]));
    const hasNestedContent = contentKeys.some(
      (key) => Array.isArray(value[key]) || isRecord(value[key]),
    );
    if (isMessageLike(value)) {
      output.push({ ...nextInherited, ...value });
      return;
    }
    if (!hasNested && !hasNestedContent) output.push({ ...nextInherited, ...value });
    for (const key of nestedKeys) {
      const nested = value[key];
      if (Array.isArray(nested)) nested.forEach((item) => visit(item, nextInherited));
      else if (isRecord(nested)) visit(nested, nextInherited);
    }
    for (const key of contentKeys) {
      const nested = value[key];
      if (Array.isArray(nested)) nested.forEach((item) => visit(item, nextInherited));
      else if (isRecord(nested)) visit(nested, nextInherited);
    }
  };
  records.forEach((record) => visit(record));
  return output;
};

const safeReadFile = (path: string, warnings: ParseWarning[]) => {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    warnings.push({
      code: "read_file_failed",
      message: error instanceof Error ? error.message : String(error),
      severity: "error",
      path,
    });
    return "";
  }
};

const detectFormat = (path: string, raw: string): SourceFormat => {
  if (extname(path) === ".jsonl") return "jsonl";
  if (extname(path) === ".json") return "json";
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.split("\n").some((line) => line.trim().startsWith("{"))) return "jsonl";
  return raw.length > 0 ? "plaintext" : "unknown";
};

const parseRecords = (
  raw: string,
  format: SourceFormat,
  warnings: ParseWarning[],
  path: string,
): Record<string, unknown>[] => {
  if (format === "json") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.filter(isRecord);
      if (isRecord(parsed)) return [parsed];
    } catch (error) {
      warnings.push({
        code: "invalid_json",
        message: error instanceof Error ? error.message : String(error),
        severity: "warning",
        path,
      });
    }
  }
  if (format === "jsonl") {
    return raw
      .split("\n")
      .map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return undefined;
        try {
          const parsed = JSON.parse(trimmed) as unknown;
          return isRecord(parsed) ? parsed : undefined;
        } catch {
          warnings.push({
            code: "invalid_jsonl_line",
            message: `Line ${index + 1} is not valid JSON.`,
            severity: "warning",
            path,
          });
          return undefined;
        }
      })
      .filter(isRecord);
  }
  if (raw.trim()) return [{ role: "unknown", content: raw, timestamp: nowIso() }];
  return [];
};

const recordsToMessages = (
  profile: AdapterProfile,
  records: Record<string, unknown>[],
  raw: string,
  warnings: ParseWarning[],
): ParsedMessage[] => {
  const source = records.length > 0 ? records : [{ content: raw, role: "unknown" }];
  return source.flatMap((record, index) => {
    if (isMetadataOnlyRecord(record)) return [];
    if (isTokenOnlyRecord(record)) return [];
    const messageObject = isRecord(record.message) ? record.message : record;
    const content = extractContent(messageObject);
    if (!content) {
      warnings.push({
        code: "message_content_missing",
        message: `Message ${index + 1} has no recognizable text field.`,
        severity: "info",
      });
    }
    const usage = extractUsage(record, messageObject);
    const reportedInput = usage.inputTokens;
    const reportedOutput = usage.outputTokens;
    const estimated = estimateTextTokens(content);
    const tokenEstimate =
      reportedInput + reportedOutput > 0
        ? {
            inputTokens: reportedInput,
            outputTokens: reportedOutput,
            totalTokens: reportedInput + reportedOutput,
            confidence: 0.9,
            source: "reported" as const,
          }
        : estimated;

    return {
      id: makeId("msg", `${profile.id}:${index}:${content.slice(0, 120)}`),
      role: roleValue(messageObject.role ?? record.role ?? record.author ?? record.type),
      content,
      createdAt: normalizeTimestamp(
        record.timestamp ?? record.createdAt ?? record.time ?? messageObject.timestamp,
      ),
      tokenEstimate,
      model: normalizeModel(
        stringifyValue(messageObject.model ?? record.model ?? record.modelName),
      ),
      toolName:
        stringifyValue(
          record.tool ?? record.toolName ?? record.name ?? inferToolName(messageObject),
        ) || undefined,
      metadata: record,
    };
  });
};

const buildTimeline = (session: ParsedSession): ReplayEvent[] =>
  session.messages.flatMap((message, index, messages) => {
    const base = {
      id: makeId("evt", `${session.id}:${message.id}:${index}`),
      sessionId: session.id,
      timestamp: message.createdAt,
      tokens: message.tokenEstimate.totalTokens,
      model: message.model,
    };
    const kind =
      message.role === "assistant"
        ? "assistant_response"
        : message.role === "tool"
          ? "tool_call"
          : "prompt";
    const events: ReplayEvent[] = [
      {
        ...base,
        kind,
        label: message.toolName ?? labelForRole(message.role),
        detail: message.content.slice(0, 600),
        filePath: inferFilePath(message.content),
      },
    ];
    const filePath = inferFilePath(message.content);
    if (filePath) {
      events.push({
        ...base,
        id: `${base.id}_file`,
        kind: "file_read",
        label: "File referenced",
        filePath,
        detail: filePath,
      });
    }
    if (
      index > 0 &&
      message.model &&
      messages[index - 1]?.model &&
      message.model !== messages[index - 1]?.model
    ) {
      events.push({
        ...base,
        id: `${base.id}_model`,
        kind: "model_switch",
        label: "Model switch",
        detail: `${messages[index - 1]?.model} -> ${message.model}`,
      });
    }
    if (/retry|try again|failed|error/i.test(message.content)) {
      events.push({
        ...base,
        id: `${base.id}_retry`,
        kind: "retry",
        label: "Retry signal",
        detail: message.content.slice(0, 240),
      });
    }
    if (message.tokenEstimate.totalTokens > 0) {
      events.push({
        ...base,
        id: `${base.id}_context`,
        kind: "context_growth",
        label: "Context growth",
        detail: `${message.tokenEstimate.totalTokens} tokens observed for this turn`,
      });
    }
    return events;
  });

const combineTokenEstimates = (estimates: TokenEstimate[]): TokenEstimate => {
  if (estimates.length === 0) return emptyTokenEstimate();
  const inputTokens = estimates.reduce((sum, value) => sum + value.inputTokens, 0);
  const outputTokens = estimates.reduce((sum, value) => sum + value.outputTokens, 0);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    confidence: estimates.reduce((sum, value) => sum + value.confidence, 0) / estimates.length,
    source: estimates.some((value) => value.source === "reported") ? "reported" : "estimated",
  };
};

const labelForRole = (role: ParsedMessage["role"]) =>
  role === "user" ? "Prompt" : role === "assistant" ? "Assistant response" : "Message";

const inferProjectPath = (records: Record<string, unknown>[]) =>
  records
    .map((record) =>
      stringifyValue(record.cwd ?? record.projectPath ?? record.workspace ?? record.cwdPath),
    )
    .find(Boolean);

const inferFilePath = (content: string) =>
  content.match(
    /(?:read|open|edit|write|path|file)\s*[:=]?\s*([./~\w-][^\s:'",)]+\.[\w]+)/i,
  )?.[1] ??
  content.match(
    /([./~][^\s:'",)]+\.(?:ts|tsx|js|jsx|json|md|py|go|rs|java|css|html|yml|yaml))/i,
  )?.[1];

const extractContent = (record: Record<string, unknown>): string => {
  const content =
    record.content ??
    record.message ??
    record.text ??
    record.prompt ??
    record.response ??
    record.output ??
    record.arguments ??
    record.input ??
    record.parts ??
    record.path ??
    record.delta;
  if (Array.isArray(content)) return content.map(contentBlockToText).filter(Boolean).join("\n");
  if (isRecord(content)) return extractContent(content) || stringifyValue(content);
  return stringifyValue(content);
};

const contentBlockToText = (block: unknown): string => {
  if (typeof block === "string") return block;
  if (!isRecord(block)) return "";
  const type = stringifyValue(block.type);
  if (type.includes("tool") || block.name || block.input) {
    return [`tool:${stringifyValue(block.name) || type}`, stringifyValue(block.input)]
      .filter(Boolean)
      .join(" ");
  }
  return stringifyValue(block.text ?? block.content ?? block.message ?? block.path ?? "");
};

const extractUsage = (...records: Record<string, unknown>[]) => {
  for (const record of records) {
    const usage = isRecord(record.usage)
      ? record.usage
      : isRecord(record.usageMetadata)
        ? record.usageMetadata
        : isRecord(record.tokenUsage)
          ? record.tokenUsage
          : record;
    const inputTokens = numberValue(
      usage.input_tokens ??
        usage.inputTokens ??
        usage.prompt_tokens ??
        usage.promptTokens ??
        usage.promptTokenCount ??
        usage.cache_creation_input_tokens ??
        usage.cacheReadInputTokens,
    );
    const outputTokens = numberValue(
      usage.output_tokens ??
        usage.outputTokens ??
        usage.completion_tokens ??
        usage.completionTokens ??
        usage.candidatesTokenCount,
    );
    const totalTokens = numberValue(
      usage.total_tokens ?? usage.totalTokens ?? usage.totalTokenCount ?? usage.tokens,
    );
    if (inputTokens + outputTokens + totalTokens > 0) {
      return totalTokens > 0 && inputTokens + outputTokens === 0
        ? { inputTokens: totalTokens, outputTokens: 0 }
        : { inputTokens, outputTokens };
    }
  }
  return { inputTokens: 0, outputTokens: 0 };
};

const isMessageLike = (record: Record<string, unknown>) =>
  Boolean(
    record.role ??
    record.author ??
    textualValue(record.content) ??
    record.text ??
    record.prompt ??
    record.response ??
    record.output ??
    record.input ??
    record.parts ??
    record.functionCall ??
    record.functionResponse ??
    record.inputTokens ??
    record.outputTokens,
  );

const textualValue = (value: unknown) =>
  typeof value === "string" || Array.isArray(value) ? value : undefined;

const isTokenOnlyRecord = (record: Record<string, unknown>) => {
  const type = stringifyValue(record.type ?? record.event);
  return /token/i.test(type) && !record.content && !record.message && !record.text;
};

const isMetadataOnlyRecord = (record: Record<string, unknown>) => {
  const type = stringifyValue(record.type ?? record.event);
  return (
    /meta|session/i.test(type) &&
    !record.content &&
    !record.message &&
    !record.text &&
    !record.arguments
  );
};

const inferToolName = (record: Record<string, unknown>) => {
  const content = record.content;
  if (isRecord(record.functionCall)) return stringifyValue(record.functionCall.name);
  if (isRecord(record.functionResponse)) return stringifyValue(record.functionResponse.name);
  if (!Array.isArray(content)) return "";
  return (
    content
      .map((block) => (isRecord(block) ? stringifyValue(block.name ?? block.toolName) : ""))
      .find(Boolean) ?? ""
  );
};

const normalizeModel = (value: string) => (value ? value.toLowerCase() : undefined);

const normalizeTimestamp = (value: unknown) => {
  const text = stringifyValue(value);
  if (!text) return nowIso();
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? nowIso() : date.toISOString();
};

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return { content: value };
  }
};

const quoteIdentifier = (value: string) => `"${value.replaceAll('"', '""')}"`;

const isSqlitePath = (path: string) =>
  [".sqlite", ".sqlite3", ".db", ".vscdb"].includes(extname(path).toLowerCase());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringifyValue = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);

const numberValue = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const roleValue = (value: unknown): ParsedMessage["role"] => {
  if (value === "user" || value === "assistant" || value === "system" || value === "tool")
    return value;
  if (value === "human") return "user";
  if (value === "model" || value === "ai") return "assistant";
  if (value === "function" || value === "function_call" || value === "tool_result") return "tool";
  return "unknown";
};
