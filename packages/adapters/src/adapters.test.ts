import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { estimateTextTokens, getAdapter } from "./index.js";

describe("estimateTextTokens", () => {
  it("returns a bounded estimate with confidence", () => {
    const estimate = estimateTextTokens("read src/index.ts and explain the flow");
    expect(estimate.totalTokens).toBeGreaterThan(0);
    expect(estimate.confidence).toBeGreaterThan(0);
  });

  it("parses nested Claude-style content blocks and usage", async () => {
    const adapter = getAdapter("claude-code");
    const path = fileURLToPath(new URL("./fixtures/claude-session.jsonl", import.meta.url));
    const session = await adapter!.parseSession(path);

    expect(session.toolId).toBe("claude-code");
    expect(session.projectPath).toBe("/work/contextops");
    expect(session.messages).toHaveLength(3);
    expect(session.tokenEstimate.totalTokens).toBeGreaterThan(3000);
    expect(session.replayEvents.some((event) => event.kind === "file_read")).toBe(true);
  });

  it("parses Codex-style function calls and skips token-only records", async () => {
    const adapter = getAdapter("codex-cli");
    const path = fileURLToPath(new URL("./fixtures/codex-session.jsonl", import.meta.url));
    const session = await adapter!.parseSession(path);

    expect(session.toolId).toBe("codex-cli");
    expect(session.messages).toHaveLength(3);
    expect(session.messages[1]?.role).toBe("tool");
    expect(session.messages[1]?.toolName).toBe("exec_command");
    expect(session.replayEvents.some((event) => event.kind === "retry")).toBe(true);
  });

  it("parses richer Codex rollout events with model switches and file references", async () => {
    const adapter = getAdapter("codex-cli");
    const path = fileURLToPath(new URL("./fixtures/codex-rollout-events.jsonl", import.meta.url));
    const session = await adapter!.parseSession(path);

    expect(session.projectPath).toBe("/work/contextops");
    expect(session.messages).toHaveLength(4);
    expect(session.replayEvents.some((event) => event.kind === "model_switch")).toBe(true);
    expect(session.replayEvents.some((event) => event.kind === "file_read")).toBe(true);
  });

  it("keeps malformed Codex JSONL recoverable with actionable warnings", async () => {
    const adapter = getAdapter("codex-cli");
    const path = fileURLToPath(
      new URL("./fixtures/codex-malformed-session.jsonl", import.meta.url),
    );
    const session = await adapter!.parseSession(path);

    expect(session.toolId).toBe("codex-cli");
    expect(session.projectPath).toBe("/work/codex-messy");
    expect(session.messages).toHaveLength(6);
    expect(session.warnings.map((warning) => warning.code)).toContain("invalid_jsonl_line");
    expect(session.warnings.map((warning) => warning.code)).toContain("message_content_missing");
    expect(session.tokenEstimate.source).toBe("reported");
    expect(session.tokenEstimate.confidence).toBeGreaterThanOrEqual(0.75);
    expect(session.replayEvents.some((event) => event.kind === "retry")).toBe(true);
    expect(session.replayEvents.some((event) => event.kind === "file_read")).toBe(true);
  });

  it("scans Cursor SQLite key-value records read-only", async () => {
    const adapter = getAdapter("cursor");
    const dir = mkdtempSync(join(tmpdir(), "contextops-cursor-"));
    const dbPath = join(dir, "state.vscdb");
    const db = new Database(dbPath);
    db.exec("create table cursorDiskKV (key text primary key, value text not null)");
    db.prepare("insert into cursorDiskKV (key, value) values (?, ?)").run(
      "composer:local-1",
      JSON.stringify({
        composerId: "local-1",
        workspace: "/work/cursor-app",
        messages: [
          {
            role: "user",
            content: "Open src/page.tsx and explain the error.",
            createdAt: "2026-05-09T04:00:00.000Z",
            inputTokens: 300,
            model: "cursor-small",
          },
          {
            role: "assistant",
            content: "I read src/page.tsx and found the retry loop.",
            createdAt: "2026-05-09T04:00:05.000Z",
            inputTokens: 700,
            outputTokens: 160,
            model: "cursor-small",
          },
        ],
      }),
    );
    db.close();

    const result = await adapter!.scan([dbPath]);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.toolId).toBe("cursor");
    expect(result.sessions[0]?.projectPath).toBe("/work/cursor-app");
    expect(result.sessions[0]?.messages).toHaveLength(2);
    expect(result.sessions[0]?.replayEvents.some((event) => event.kind === "file_read")).toBe(true);
  });

  it("parses Cursor JSON exports with human and ai role aliases", async () => {
    const adapter = getAdapter("cursor");
    const path = fileURLToPath(new URL("./fixtures/cursor-session.json", import.meta.url));
    const session = await adapter!.parseSession(path);

    expect(session.toolId).toBe("cursor");
    expect(session.projectPath).toBe("/work/cursor-json");
    expect(session.messages).toHaveLength(2);
    expect(session.messages[0]?.role).toBe("user");
    expect(session.messages[1]?.role).toBe("assistant");
    expect(session.replayEvents.some((event) => event.kind === "file_read")).toBe(true);
  });

  it("parses nested Cursor conversation bubbles with author aliases", async () => {
    const adapter = getAdapter("cursor");
    const path = fileURLToPath(
      new URL("./fixtures/cursor-nested-conversation.json", import.meta.url),
    );
    const session = await adapter!.parseSession(path);

    expect(session.toolId).toBe("cursor");
    expect(session.projectPath).toBe("/work/cursor-nested");
    expect(session.messages).toHaveLength(3);
    expect(session.messages[0]?.role).toBe("user");
    expect(session.messages[1]?.role).toBe("assistant");
    expect(session.messages[2]?.role).toBe("tool");
    expect(session.tokenEstimate.source).toBe("reported");
    expect(session.replayEvents.some((event) => event.kind === "file_read")).toBe(true);
  });

  it("parses Gemini CLI nested turns and usage metadata", async () => {
    const adapter = getAdapter("gemini-cli");
    const path = fileURLToPath(new URL("./fixtures/gemini-session.json", import.meta.url));
    const session = await adapter!.parseSession(path);

    expect(session.toolId).toBe("gemini-cli");
    expect(session.projectPath).toBe("/work/gemini-app");
    expect(session.messages).toHaveLength(3);
    expect(session.messages[1]?.role).toBe("assistant");
    expect(session.tokenEstimate.totalTokens).toBe(2700);
    expect(session.replayEvents.some((event) => event.kind === "retry")).toBe(true);
  });
});
