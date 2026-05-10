#!/usr/bin/env node
import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { createAdapters, getAdapter } from "@contextops/adapters";
import { analyzeSession } from "@contextops/analyzer";
import { loadConfig } from "@contextops/config";
import type { ParseWarning, ToolId } from "@contextops/core";
import { nowIso } from "@contextops/core";
import { estimateSessionCost } from "@contextops/pricing";
import { buildReplayTimeline, summarizeReplay } from "@contextops/replay";
import type { ReportFilters } from "@contextops/storage";
import { ContextOpsStore, defaultDatabasePath } from "@contextops/storage";

const program = new Command();

program
  .name("contextops")
  .description("Local-first workflow intelligence for AI coding sessions.")
  .version("0.1.1");

program
  .command("tools")
  .description("Detect supported local AI coding tools.")
  .action(async () => {
    const config = loadConfig();
    const store = new ContextOpsStore();
    const detections = await Promise.all(
      createAdapters()
        .filter((adapter) => !config.disabledAdapters.includes(adapter.id))
        .map((adapter) => adapter.detect()),
    );
    for (const detection of detections) {
      store.saveTool(detection);
      print(
        `${detection.installed ? "found" : "missing"} ${detection.name} (${Math.round(detection.confidence * 100)}%)`,
      );
      detection.paths.forEach((path) => print(`  ${path}`));
    }
    store.close();
  });

program
  .command("scan")
  .description("Scan local sessions and update the SQLite store.")
  .option("-p, --provider <provider>", "Only scan one provider adapter")
  .option("--path <path...>", "Additional or replacement session paths to scan")
  .action(async (options: { provider?: ToolId; path?: string[] }) => {
    const config = loadConfig();
    const store = new ContextOpsStore();
    const startedAt = nowIso();
    const scannedPaths = new Set<string>();
    const warnings: ParseWarning[] = [];
    let sessionCount = 0;
    let warningCount = 0;

    for (const adapter of selectAdapters(options.provider, config.disabledAdapters)) {
      const detection = await adapter.detect();
      store.saveTool(detection);
      const scanPaths = options.path?.length
        ? options.path
        : config.scanPaths.filter(
            (path) => detection.paths.includes(path) || path.includes(adapter.id.split("-")[0]),
          );
      const resolvedScanPaths = scanPaths.length > 0 ? scanPaths : detection.paths;
      resolvedScanPaths.forEach((path) => scannedPaths.add(path));
      const result = await adapter.scan(resolvedScanPaths);
      warningCount += result.warnings.length;
      warnings.push(...result.warnings);
      for (const session of result.sessions) {
        const analysis = analyzeSession(session);
        const costs = estimateSessionCost(session, config.customPricing);
        store.saveSession(session, costs, analysis.patterns);
        sessionCount += 1;
      }
      print(
        `${adapter.name}: ${result.sessions.length} sessions, ${result.warnings.length} warnings`,
      );
    }

    const scanId = store.saveScanRun({
      startedAt,
      completedAt: nowIso(),
      scannedPaths: [...scannedPaths],
      warnings,
    });
    print(`Stored ${sessionCount} sessions in ${defaultDatabasePath()}`);
    print(`Scan run: ${scanId}`);
    if (warningCount > 0) print(`${warningCount} parser warnings recorded without aborting.`);
    store.close();
  });

program
  .command("summary")
  .description("Show local usage and waste summary.")
  .option("-p, --provider <provider>", "Filter by provider")
  .option("--from <date>", "Start date, YYYY-MM-DD or ISO timestamp")
  .option("--to <date>", "End date, YYYY-MM-DD or ISO timestamp")
  .option("--project <name...>", "Include project names or paths containing text")
  .option("--exclude <name...>", "Exclude project names or paths containing text")
  .action((options: ReportOptions) => {
    const store = new ContextOpsStore();
    const summary = store.summary(toFilters(options)) as Record<string, number>;
    print(`Sessions: ${summary.sessionCount ?? 0}`);
    print(`Estimated tokens: ${(summary.totalTokens ?? 0).toLocaleString()}`);
    print(`Estimated cost: $${Number(summary.estimatedUsd ?? 0).toFixed(4)}`);
    print(`Waste patterns: ${summary.wastePatternCount ?? 0}`);
    printFirstRunHint(Number(summary.sessionCount ?? 0));
    store.close();
  });

program
  .command("sessions")
  .description("List recent sessions.")
  .option("-p, --provider <provider>", "Filter by provider")
  .option("--from <date>", "Start date, YYYY-MM-DD or ISO timestamp")
  .option("--to <date>", "End date, YYYY-MM-DD or ISO timestamp")
  .option("--project <name...>", "Include project names or paths containing text")
  .option("--exclude <name...>", "Exclude project names or paths containing text")
  .option("-l, --limit <number>", "Maximum sessions to show", "30")
  .action((options: ReportOptions & { limit?: string }) => {
    const store = new ContextOpsStore();
    const rows = store.listSessions({
      ...toFilters(options),
      limit: numberOption(options.limit, 30),
    }) as Record<string, unknown>[];
    if (rows.length === 0) printFirstRunHint(0);
    for (const row of rows) {
      print(
        `${row.started_at} ${row.tool_id} ${row.total_tokens} tokens $${Number(row.estimatedUsd ?? 0).toFixed(4)} ${row.id}`,
      );
    }
    store.close();
  });

program
  .command("report")
  .description("Show a structured local report with sessions, projects, and model breakdowns.")
  .option("-p, --provider <provider>", "Filter by provider")
  .option("--from <date>", "Start date, YYYY-MM-DD or ISO timestamp")
  .option("--to <date>", "End date, YYYY-MM-DD or ISO timestamp")
  .option("--project <name...>", "Include project names or paths containing text")
  .option("--exclude <name...>", "Exclude project names or paths containing text")
  .option("--format <format>", "table or json", "table")
  .action((options: ReportOptions & { format?: string }) => {
    const store = new ContextOpsStore();
    const filters = toFilters(options);
    const report = store.buildReport({ ...filters, limit: 20 });
    store.close();
    if (options.format === "json") {
      print(JSON.stringify(report, null, 2));
      return;
    }
    print("Summary");
    print(JSON.stringify(report.summary, null, 2));
    print("\nProjects");
    printRows(report.projects as Record<string, unknown>[], [
      "projectName",
      "sessionCount",
      "totalTokens",
      "estimatedUsd",
    ]);
    print("\nModels");
    printRows(report.models as Record<string, unknown>[], [
      "model",
      "sessionCount",
      "inputTokens",
      "outputTokens",
      "estimatedUsd",
    ]);
  });

program
  .command("export")
  .description("Export local report data as JSON or CSV.")
  .option("-p, --provider <provider>", "Filter by provider")
  .option("--from <date>", "Start date, YYYY-MM-DD or ISO timestamp")
  .option("--to <date>", "End date, YYYY-MM-DD or ISO timestamp")
  .option("--project <name...>", "Include project names or paths containing text")
  .option("--exclude <name...>", "Exclude project names or paths containing text")
  .option("--format <format>", "json or csv", "csv")
  .option("-o, --output <path>", "Write export to a file instead of stdout")
  .action((options: ReportOptions & { format?: string; output?: string }) => {
    const store = new ContextOpsStore();
    const report = store.buildReport(toFilters(options));
    store.close();
    const output =
      options.format === "json"
        ? JSON.stringify(report, null, 2)
        : toCsv(report.sessions as Record<string, unknown>[]);
    if (options.output) {
      writeFileSync(options.output, output);
      print(`Exported ${options.format ?? "csv"} report to ${options.output}`);
      return;
    }
    print(output);
  });

program
  .command("waste")
  .description("List waste patterns.")
  .action(() => {
    const store = new ContextOpsStore();
    const rows = store.listWaste(50) as Record<string, unknown>[];
    if (rows.length === 0) {
      print("No waste patterns stored yet.");
      print("Run contextops scan, then inspect contextops replay or contextops report.");
    }
    for (const row of rows) {
      print(`[${row.severity}] ${row.title}: ${row.explanation}`);
    }
    store.close();
  });

program
  .command("replay")
  .argument("[target]", "Stored session id or local session file.")
  .action(async (target?: string) => {
    if (!target) {
      print("Pass a stored session id or a local session file path.");
      return;
    }
    const store = new ContextOpsStore();
    const stored = store.getSession(target);
    store.close();
    if (stored) {
      const events = stored.replayEvents as Record<string, unknown>[];
      print(`${events.length} replay events`);
      for (const event of events.slice(0, 40)) {
        print(`${event.timestamp} ${event.kind} ${event.label} ${event.tokens ?? ""}`);
      }
      return;
    }

    const adapter = inferAdapterForPath(target) ?? createAdapters()[0];
    const session = await adapter.parseSession(target);
    const timeline = buildReplayTimeline(session);
    summarizeReplay(timeline).forEach(print);
    timeline.frames
      .slice(0, 20)
      .forEach((frame) =>
        print(
          `${frame.index + 1}. ${frame.timestamp} ${frame.title} (${frame.cumulativeTokens} tokens)`,
        ),
      );
  });

program
  .command("doctor")
  .description("Check local ContextOps setup.")
  .action(() => {
    const store = new ContextOpsStore();
    const health = store.health();
    print(`Database: ${store.databasePath()}`);
    print(`Database health: ${health.ok ? "ok" : "needs attention"}`);
    print(`Schema: ${health.schemaVersion}/${health.expectedSchemaVersion}`);
    print(`Journal: ${health.journalMode}`);
    print(`Sessions: ${health.sessionCount}`);
    print("Telemetry: disabled by default");
    print("Config: contextops.config.json optional");
    store.close();
  });

program
  .command("config")
  .description("Show resolved configuration.")
  .action(() => {
    print(JSON.stringify(loadConfig(), null, 2));
  });

program
  .command("retention")
  .description("Apply local replay/session retention from config or an explicit day count.")
  .option("--days <number>", "Retention window in days")
  .action((options: { days?: string }) => {
    const config = loadConfig();
    const retentionDays = numberOption(options.days, config.replayRetentionDays);
    const store = new ContextOpsStore();
    const result = store.enforceRetention(retentionDays);
    store.close();
    print(`Retention cutoff: ${result.cutoff}`);
    print(`Sessions deleted: ${result.sessionsDeleted}`);
    print(`Replay events deleted: ${result.replayEventsDeleted}`);
    print(`Messages deleted: ${result.messagesDeleted}`);
    print(`Cost estimates deleted: ${result.costEstimatesDeleted}`);
    print(`Waste patterns deleted: ${result.wastePatternsDeleted}`);
  });

program
  .command("reset")
  .description("Clear local ContextOps tables.")
  .action(() => {
    const store = new ContextOpsStore();
    store.reset();
    store.close();
    print("Local ContextOps data reset.");
  });

const print = (line: string) => process.stdout.write(`${line}\n`);

const printFirstRunHint = (sessionCount: number) => {
  if (sessionCount > 0) return;
  print("No sessions stored yet. Run contextops tools, then contextops scan.");
  print("Tip: set CONTEXTOPS_HOME=.contextops to keep the SQLite database in this project.");
};

type ReportOptions = {
  provider?: string;
  from?: string;
  to?: string;
  project?: string[];
  exclude?: string[];
};

const selectAdapters = (provider: ToolId | undefined, disabledAdapters: ToolId[]) => {
  if (provider) {
    const adapter = getAdapter(provider);
    if (!adapter) throw new Error(`Unknown provider: ${provider}`);
    return [adapter];
  }
  return createAdapters().filter((item) => !disabledAdapters.includes(item.id));
};

const toFilters = (options: ReportOptions): ReportFilters => ({
  provider: options.provider,
  from: options.from,
  to: options.to,
  project: options.project,
  excludeProject: options.exclude,
});

const numberOption = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const printRows = (rows: Record<string, unknown>[], columns: string[]) => {
  if (rows.length === 0) {
    print("No data.");
    return;
  }
  print(columns.join("\t"));
  for (const row of rows) {
    print(columns.map((column) => String(row[column] ?? "")).join("\t"));
  }
};

const toCsv = (rows: Record<string, unknown>[]) => {
  const columns = [
    "id",
    "started_at",
    "ended_at",
    "tool_id",
    "project_id",
    "source_path",
    "total_tokens",
    "confidence",
    "estimatedUsd",
  ];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
};

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const inferAdapterForPath = (path: string) => {
  const lower = path.toLowerCase();
  if (lower.includes("codex")) return getAdapter("codex-cli");
  if (lower.includes("cursor")) return getAdapter("cursor");
  if (lower.includes("gemini")) return getAdapter("gemini-cli");
  if (lower.includes("claude")) return getAdapter("claude-code");
  return undefined;
};

try {
  await program.parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ContextOps error: ${message}\n`);
  process.exitCode = 1;
}
