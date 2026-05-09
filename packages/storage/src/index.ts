import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import type {
  CostEstimate,
  ParseWarning,
  ParsedSession,
  ToolDetection,
  WastePattern,
} from "@contextops/core";
import { makeId, nowIso } from "@contextops/core";

export interface ReportFilters {
  provider?: string;
  project?: string[];
  excludeProject?: string[];
  from?: string;
  to?: string;
  limit?: number;
}

export interface StorageHealth {
  schemaVersion: number;
  expectedSchemaVersion: number;
  ok: boolean;
  tableCount: number;
  sessionCount: number;
  databaseSizeBytes: number;
  journalMode: string;
}

export interface ScanRunInput {
  id?: string;
  startedAt: string;
  completedAt?: string;
  scannedPaths: string[];
  warnings: ParseWarning[];
}

export interface RetentionResult {
  cutoff: string;
  sessionsDeleted: number;
  messagesDeleted: number;
  replayEventsDeleted: number;
  costEstimatesDeleted: number;
  wastePatternsDeleted: number;
  timelineNodesDeleted: number;
  modelUsageDeleted: number;
}

export const CURRENT_SCHEMA_VERSION = 1;

export class ContextOpsStore {
  private db: DatabaseType;
  private path: string;

  constructor(path = defaultDatabasePath()) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.migrate();
  }

  close() {
    this.db.close();
  }

  saveTool(detection: ToolDetection) {
    this.db
      .prepare(
        "insert or replace into tools (id, name, installed, confidence, detected_at) values (?, ?, ?, ?, ?)",
      )
      .run(
        detection.id,
        detection.name,
        detection.installed ? 1 : 0,
        detection.confidence,
        nowIso(),
      );
  }

  saveSession(session: ParsedSession, costs: CostEstimate[] = [], waste: WastePattern[] = []) {
    const transaction = this.db.transaction(() => {
      const projectId = session.projectPath ? makeId("project", session.projectPath) : null;
      if (projectId && session.projectPath) {
        this.db
          .prepare("insert or ignore into projects (id, path, name) values (?, ?, ?)")
          .run(
            projectId,
            session.projectPath,
            session.projectPath.split("/").filter(Boolean).at(-1) ?? "Project",
          );
      }
      this.db
        .prepare(
          `insert or replace into sessions
          (id, tool_id, project_id, source_path, started_at, ended_at, total_tokens, confidence, warnings_json)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          session.id,
          session.toolId,
          projectId,
          session.sourcePath,
          session.startedAt,
          session.endedAt ?? null,
          session.tokenEstimate.totalTokens,
          session.tokenEstimate.confidence,
          JSON.stringify(session.warnings),
        );
      this.db.prepare("delete from messages where session_id = ?").run(session.id);
      this.db.prepare("delete from replay_events where session_id = ?").run(session.id);
      this.db.prepare("delete from cost_estimates where session_id = ?").run(session.id);
      this.db.prepare("delete from waste_patterns where session_id = ?").run(session.id);

      const insertMessage = this.db.prepare(
        "insert into messages (id, session_id, role, content, created_at, model, token_count) values (?, ?, ?, ?, ?, ?, ?)",
      );
      for (const message of session.messages) {
        insertMessage.run(
          message.id,
          session.id,
          message.role,
          message.content,
          message.createdAt,
          message.model ?? null,
          message.tokenEstimate.totalTokens,
        );
      }

      const insertEvent = this.db.prepare(
        "insert into replay_events (id, session_id, kind, timestamp, label, detail, tokens, file_path, model) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      for (const event of session.replayEvents) {
        insertEvent.run(
          event.id,
          session.id,
          event.kind,
          event.timestamp,
          event.label,
          event.detail ?? null,
          event.tokens ?? null,
          event.filePath ?? null,
          event.model ?? null,
        );
      }

      const insertCost = this.db.prepare(
        "insert into cost_estimates (id, session_id, model, input_tokens, output_tokens, estimated_usd, confidence) values (?, ?, ?, ?, ?, ?, ?)",
      );
      for (const cost of costs) {
        insertCost.run(
          makeId("cost", `${cost.sessionId}:${cost.model}`),
          cost.sessionId,
          cost.model,
          cost.inputTokens,
          cost.outputTokens,
          cost.estimatedUsd,
          cost.confidence,
        );
      }

      const insertWaste = this.db.prepare(
        "insert into waste_patterns (id, session_id, kind, severity, title, explanation, evidence_json, estimated_wasted_tokens, confidence) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      for (const item of waste) {
        insertWaste.run(
          item.id,
          item.sessionId,
          item.kind,
          item.severity,
          item.title,
          item.explanation,
          JSON.stringify(item.evidence),
          item.estimatedWastedTokens,
          item.confidence,
        );
      }
    });
    transaction();
  }

  saveScanRun(input: ScanRunInput) {
    const id =
      input.id ??
      makeId(
        "scan",
        `${input.startedAt}:${input.completedAt ?? ""}:${input.scannedPaths.join("|")}`,
      );
    this.db
      .prepare(
        `insert or replace into scan_runs
        (id, started_at, completed_at, scanned_paths_json, warnings_json)
        values (?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.startedAt,
        input.completedAt ?? null,
        JSON.stringify(input.scannedPaths),
        JSON.stringify(input.warnings),
      );
    return id;
  }

  listSessions(limitOrFilters: number | ReportFilters = 20) {
    const filters = typeof limitOrFilters === "number" ? { limit: limitOrFilters } : limitOrFilters;
    const { whereSql, params } = buildSessionWhere(filters);
    return this.db
      .prepare(
        `select sessions.*, coalesce(sum(cost_estimates.estimated_usd), 0) as estimatedUsd
         from sessions
         left join projects on projects.id = sessions.project_id
         left join cost_estimates on cost_estimates.session_id = sessions.id
         ${whereSql}
         group by sessions.id
         order by started_at desc
         limit ?`,
      )
      .all(...params, filters.limit ?? 20);
  }

  listWaste(limit = 50) {
    return this.db
      .prepare("select * from waste_patterns order by estimated_wasted_tokens desc limit ?")
      .all(limit);
  }

  listTools() {
    return this.db.prepare("select * from tools order by name").all();
  }

  listScanRuns(limit = 20) {
    return this.db.prepare("select * from scan_runs order by started_at desc limit ?").all(limit);
  }

  getSession(sessionId: string) {
    const session = this.db
      .prepare(
        `select sessions.*, projects.name as projectName, projects.path as projectPath,
          coalesce(session_costs.estimatedUsd, 0) as estimatedUsd
        from sessions
        left join projects on projects.id = sessions.project_id
        left join (
          select session_id, sum(estimated_usd) as estimatedUsd
          from cost_estimates
          group by session_id
        ) as session_costs on session_costs.session_id = sessions.id
        where sessions.id = ?`,
      )
      .get(sessionId) as Record<string, unknown> | undefined;
    if (!session) return undefined;
    return {
      ...session,
      messages: this.db
        .prepare("select * from messages where session_id = ? order by created_at asc")
        .all(sessionId),
      replayEvents: this.db
        .prepare("select * from replay_events where session_id = ? order by timestamp asc")
        .all(sessionId),
      costs: this.db
        .prepare("select * from cost_estimates where session_id = ? order by estimated_usd desc")
        .all(sessionId),
      waste: this.db
        .prepare(
          "select * from waste_patterns where session_id = ? order by estimated_wasted_tokens desc",
        )
        .all(sessionId),
    };
  }

  dailyBreakdown(filters: ReportFilters = {}) {
    const { whereSql, params } = buildSessionWhere(filters);
    return this.db
      .prepare(
        `select substr(sessions.started_at, 1, 10) as day,
          count(distinct sessions.id) as sessionCount,
          sum(sessions.total_tokens) as totalTokens,
          coalesce(sum(session_costs.estimatedUsd), 0) as estimatedUsd
        from sessions
        left join projects on projects.id = sessions.project_id
        left join (
          select session_id, sum(estimated_usd) as estimatedUsd
          from cost_estimates
          group by session_id
        ) as session_costs on session_costs.session_id = sessions.id
        ${whereSql}
        group by day
        order by day desc`,
      )
      .all(...params);
  }

  summary(filters: ReportFilters = {}) {
    const { whereSql, params } = buildSessionWhere(filters);
    return this.db
      .prepare(
        `with filtered_sessions as (
          select sessions.id, sessions.total_tokens
          from sessions
          left join projects on projects.id = sessions.project_id
          ${whereSql}
        )
        select
          count(distinct filtered_sessions.id) as sessionCount,
          coalesce(sum(filtered_sessions.total_tokens), 0) as totalTokens,
          (
            select coalesce(sum(cost_estimates.estimated_usd), 0)
            from cost_estimates
            join filtered_sessions as cost_sessions on cost_sessions.id = cost_estimates.session_id
          ) as estimatedUsd,
          (
            select count(distinct waste_patterns.id)
            from waste_patterns
            join filtered_sessions as waste_sessions on waste_sessions.id = waste_patterns.session_id
          ) as wastePatternCount
        from filtered_sessions`,
      )
      .get(...params);
  }

  modelBreakdown(filters: ReportFilters = {}) {
    const { whereSql, params } = buildSessionWhere(filters);
    return this.db
      .prepare(
        `select cost_estimates.model,
          sum(cost_estimates.input_tokens) as inputTokens,
          sum(cost_estimates.output_tokens) as outputTokens,
          sum(cost_estimates.estimated_usd) as estimatedUsd,
          count(distinct sessions.id) as sessionCount
        from cost_estimates
        join sessions on sessions.id = cost_estimates.session_id
        left join projects on projects.id = sessions.project_id
        ${whereSql}
        group by cost_estimates.model
        order by estimatedUsd desc`,
      )
      .all(...params);
  }

  projectBreakdown(filters: ReportFilters = {}) {
    const { whereSql, params } = buildSessionWhere(filters);
    return this.db
      .prepare(
        `select coalesce(projects.name, 'Unknown project') as projectName,
          coalesce(projects.path, '') as projectPath,
          count(distinct sessions.id) as sessionCount,
          sum(sessions.total_tokens) as totalTokens,
          coalesce(sum(session_costs.estimatedUsd), 0) as estimatedUsd
        from sessions
        left join projects on projects.id = sessions.project_id
        left join (
          select session_id, sum(estimated_usd) as estimatedUsd
          from cost_estimates
          group by session_id
        ) as session_costs on session_costs.session_id = sessions.id
        ${whereSql}
        group by projectName, projectPath
        order by estimatedUsd desc`,
      )
      .all(...params);
  }

  buildReport(filters: ReportFilters = {}) {
    return {
      summary: this.summary(filters),
      daily: this.dailyBreakdown(filters),
      projects: this.projectBreakdown(filters),
      models: this.modelBreakdown(filters),
      sessions: this.listSessions({ ...filters, limit: filters.limit ?? 50 }),
      scanRuns: this.listScanRuns(20),
      waste: this.listWaste(100),
      tools: this.listTools(),
    };
  }

  health(): StorageHealth {
    const schemaVersion = Number(this.db.pragma("user_version", { simple: true }) ?? 0);
    const integrity = this.db.pragma("quick_check", { simple: true });
    const tableCount = (
      this.db.prepare("select count(*) as count from sqlite_master where type = 'table'").get() as {
        count: number;
      }
    ).count;
    const sessionCount = (
      this.db.prepare("select count(*) as count from sessions").get() as { count: number }
    ).count;
    const pageCount = Number(this.db.pragma("page_count", { simple: true }) ?? 0);
    const pageSize = Number(this.db.pragma("page_size", { simple: true }) ?? 0);
    const journalMode = String(this.db.pragma("journal_mode", { simple: true }) ?? "unknown");

    return {
      schemaVersion,
      expectedSchemaVersion: CURRENT_SCHEMA_VERSION,
      ok: integrity === "ok" && schemaVersion === CURRENT_SCHEMA_VERSION,
      tableCount,
      sessionCount,
      databaseSizeBytes: pageCount * pageSize,
      journalMode,
    };
  }

  databasePath() {
    return this.path;
  }

  enforceRetention(retentionDays: number, now = new Date()): RetentionResult {
    if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
      throw new Error("retentionDays must be a positive integer");
    }
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const sessionIds = (
      this.db
        .prepare("select id from sessions where coalesce(ended_at, started_at) < ?")
        .all(cutoff) as { id: string }[]
    ).map((row) => row.id);

    if (sessionIds.length === 0) {
      return {
        cutoff,
        sessionsDeleted: 0,
        messagesDeleted: 0,
        replayEventsDeleted: 0,
        costEstimatesDeleted: 0,
        wastePatternsDeleted: 0,
        timelineNodesDeleted: 0,
        modelUsageDeleted: 0,
      };
    }

    const transaction = this.db.transaction(() => {
      const messagesDeleted = deleteBySessionIds(this.db, "messages", sessionIds);
      const replayEventsDeleted = deleteBySessionIds(this.db, "replay_events", sessionIds);
      const costEstimatesDeleted = deleteBySessionIds(this.db, "cost_estimates", sessionIds);
      const wastePatternsDeleted = deleteBySessionIds(this.db, "waste_patterns", sessionIds);
      const timelineNodesDeleted = deleteBySessionIds(this.db, "timeline_nodes", sessionIds);
      const modelUsageDeleted = deleteBySessionIds(this.db, "model_usage", sessionIds);
      const sessionsDeleted = deleteByIds(this.db, "sessions", sessionIds);
      this.db
        .prepare("delete from projects where id not in (select distinct project_id from sessions)")
        .run();
      return {
        cutoff,
        sessionsDeleted,
        messagesDeleted,
        replayEventsDeleted,
        costEstimatesDeleted,
        wastePatternsDeleted,
        timelineNodesDeleted,
        modelUsageDeleted,
      };
    });

    return transaction();
  }

  reset() {
    for (const table of [
      "timeline_nodes",
      "model_usage",
      "scan_runs",
      "waste_patterns",
      "cost_estimates",
      "replay_events",
      "messages",
      "sessions",
      "projects",
      "tools",
    ]) {
      this.db.prepare(`delete from ${table}`).run();
    }
  }

  private migrate() {
    this.db.exec(schemaSql);
    this.db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  }
}

export const defaultDatabasePath = () =>
  join(
    process.env.CONTEXTOPS_HOME ?? join(process.env.HOME ?? ".", ".contextops"),
    "contextops.sqlite",
  );

const buildSessionWhere = (filters: ReportFilters) => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.provider) {
    clauses.push("sessions.tool_id = ?");
    params.push(filters.provider);
  }
  if (filters.from) {
    clauses.push("sessions.started_at >= ?");
    params.push(normalizeDate(filters.from, "start"));
  }
  if (filters.to) {
    clauses.push("sessions.started_at <= ?");
    params.push(normalizeDate(filters.to, "end"));
  }
  for (const project of filters.project ?? []) {
    clauses.push("(projects.name like ? or projects.path like ?)");
    params.push(`%${project}%`, `%${project}%`);
  }
  for (const project of filters.excludeProject ?? []) {
    clauses.push(
      "(projects.name is null or (projects.name not like ? and projects.path not like ?))",
    );
    params.push(`%${project}%`, `%${project}%`);
  }

  return {
    whereSql: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
    params,
  };
};

const normalizeDate = (value: string, edge: "start" | "end") => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return edge === "start" ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`;
  }
  return value;
};

const deleteBySessionIds = (db: DatabaseType, table: string, sessionIds: string[]) =>
  db
    .prepare(`delete from ${table} where session_id in (${sessionIds.map(() => "?").join(", ")})`)
    .run(...sessionIds).changes;

const deleteByIds = (db: DatabaseType, table: string, ids: string[]) =>
  db.prepare(`delete from ${table} where id in (${ids.map(() => "?").join(", ")})`).run(...ids)
    .changes;

const schemaSql = `
create table if not exists contextops_meta (key text primary key, value text not null, updated_at text not null);
create table if not exists tools (id text primary key, name text not null, installed integer not null, confidence real not null, detected_at text not null);
create table if not exists projects (id text primary key, path text not null, name text not null);
create table if not exists sessions (id text primary key, tool_id text not null, project_id text, source_path text not null, started_at text not null, ended_at text, total_tokens integer not null, confidence real not null, warnings_json text not null);
create table if not exists messages (id text primary key, session_id text not null, role text not null, content text not null, created_at text not null, model text, token_count integer not null);
create table if not exists replay_events (id text primary key, session_id text not null, kind text not null, timestamp text not null, label text not null, detail text, tokens integer, file_path text, model text);
create table if not exists cost_estimates (id text primary key, session_id text not null, model text not null, input_tokens integer not null, output_tokens integer not null, estimated_usd real not null, confidence real not null);
create table if not exists waste_patterns (id text primary key, session_id text not null, kind text not null, severity text not null, title text not null, explanation text not null, evidence_json text not null, estimated_wasted_tokens integer not null, confidence real not null);
create table if not exists scan_runs (id text primary key, started_at text not null, completed_at text, scanned_paths_json text not null, warnings_json text not null);
create table if not exists model_usage (id text primary key, session_id text not null, model text not null, input_tokens integer not null, output_tokens integer not null);
create table if not exists timeline_nodes (id text primary key, session_id text not null, parent_id text, kind text not null, label text not null, timestamp text not null);
insert or replace into contextops_meta (key, value, updated_at) values ('schema_version', '${CURRENT_SCHEMA_VERSION}', datetime('now'));
`;

export * from "./schema.js";
