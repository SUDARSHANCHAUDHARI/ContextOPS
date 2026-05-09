import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ParsedSession, WastePattern } from "@contextops/core";
import { ContextOpsStore } from "./index.js";

const makeSession = (id: string, projectPath: string, startedAt: string): ParsedSession => ({
  id,
  toolId: "codex-cli",
  projectPath,
  startedAt,
  endedAt: startedAt,
  sourcePath: `${id}.jsonl`,
  sourceFormat: "jsonl",
  messages: [
    {
      id: `${id}_m1`,
      role: "user",
      content: "Read src/index.ts",
      createdAt: startedAt,
      model: "gpt-4.1",
      tokenEstimate: {
        inputTokens: 100,
        outputTokens: 0,
        totalTokens: 100,
        confidence: 0.9,
        source: "reported",
      },
    },
  ],
  replayEvents: [
    {
      id: `${id}_e1`,
      sessionId: id,
      kind: "prompt",
      timestamp: startedAt,
      label: "Prompt",
      tokens: 100,
    },
  ],
  tokenEstimate: {
    inputTokens: 100,
    outputTokens: 0,
    totalTokens: 100,
    confidence: 0.9,
    source: "reported",
  },
  warnings: [],
});

describe("ContextOpsStore", () => {
  it("initializes schema metadata and reports database health", () => {
    const dir = mkdtempSync(join(tmpdir(), "contextops-storage-health-"));
    const store = new ContextOpsStore(join(dir, "contextops.sqlite"));

    expect(store.health()).toMatchObject({
      ok: true,
      schemaVersion: 1,
      expectedSchemaVersion: 1,
      sessionCount: 0,
      journalMode: "wal",
    });
    expect(store.databasePath()).toContain("contextops.sqlite");

    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("records scan runs with paths and parser warnings", () => {
    const dir = mkdtempSync(join(tmpdir(), "contextops-storage-scan-"));
    const store = new ContextOpsStore(join(dir, "contextops.sqlite"));

    const scanId = store.saveScanRun({
      startedAt: "2026-05-10T01:00:00.000Z",
      completedAt: "2026-05-10T01:00:01.000Z",
      scannedPaths: ["/tmp/codex"],
      warnings: [
        {
          code: "malformed_jsonl",
          message: "Skipped one malformed line.",
          severity: "warning",
          path: "/tmp/codex/session.jsonl",
        },
      ],
    });

    const [scan] = store.listScanRuns(1) as Record<string, string>[];

    expect(scan.id).toBe(scanId);
    expect(JSON.parse(scan.scanned_paths_json)).toEqual(["/tmp/codex"]);
    expect(JSON.parse(scan.warnings_json)).toHaveLength(1);

    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("enforces retention across sessions and replay-linked tables", () => {
    const dir = mkdtempSync(join(tmpdir(), "contextops-storage-retention-"));
    const store = new ContextOpsStore(join(dir, "contextops.sqlite"));

    store.saveSession(makeSession("old", "/work/old", "2026-01-01T01:00:00.000Z"), [
      {
        sessionId: "old",
        model: "gpt-4.1",
        inputTokens: 100,
        outputTokens: 0,
        estimatedUsd: 0.001,
        confidence: 0.9,
      },
    ]);
    store.saveSession(makeSession("fresh", "/work/fresh", "2026-05-09T01:00:00.000Z"));

    const result = store.enforceRetention(30, new Date("2026-05-10T00:00:00.000Z"));

    expect(result).toMatchObject({
      sessionsDeleted: 1,
      messagesDeleted: 1,
      replayEventsDeleted: 1,
      costEstimatesDeleted: 1,
    });
    expect(store.getSession("old")).toBeUndefined();
    expect(store.getSession("fresh")).toBeDefined();

    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("stores sessions and builds filtered reports without inflated totals", () => {
    const dir = mkdtempSync(join(tmpdir(), "contextops-storage-"));
    const store = new ContextOpsStore(join(dir, "contextops.sqlite"));
    const waste: WastePattern = {
      id: "w1",
      sessionId: "s1",
      kind: "retry_chain",
      severity: "high",
      title: "Retry chain",
      explanation: "Retries observed.",
      evidence: ["retry"],
      estimatedWastedTokens: 50,
      confidence: 0.8,
    };

    store.saveSession(
      makeSession("s1", "/work/app", "2026-05-09T01:00:00.000Z"),
      [
        {
          sessionId: "s1",
          model: "gpt-4.1",
          inputTokens: 100,
          outputTokens: 20,
          estimatedUsd: 0.001,
          confidence: 0.9,
        },
        {
          sessionId: "s1",
          model: "gpt-4.1-mini",
          inputTokens: 50,
          outputTokens: 10,
          estimatedUsd: 0.0001,
          confidence: 0.9,
        },
      ],
      [waste],
    );
    store.saveSession(makeSession("s2", "/work/other", "2026-05-10T01:00:00.000Z"), [
      {
        sessionId: "s2",
        model: "gpt-4.1",
        inputTokens: 100,
        outputTokens: 0,
        estimatedUsd: 0.001,
        confidence: 0.9,
      },
    ]);

    expect(store.summary() as Record<string, number>).toMatchObject({
      sessionCount: 2,
      totalTokens: 200,
      wastePatternCount: 1,
    });
    expect(store.summary({ project: ["app"] }) as Record<string, number>).toMatchObject({
      sessionCount: 1,
      totalTokens: 100,
      wastePatternCount: 1,
    });
    expect(store.getSession("s1")?.replayEvents).toHaveLength(1);
    expect(store.dailyBreakdown()).toHaveLength(2);

    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
