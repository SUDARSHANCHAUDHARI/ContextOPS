import { describe, expect, it } from "vitest";
import { buildReplayTimeline, summarizeReplay } from "./index.js";
import type { ParsedSession } from "@contextops/core";

describe("buildReplayTimeline", () => {
  it("calculates replay metrics and summary context", () => {
    const session: ParsedSession = {
      id: "session-1",
      toolId: "codex-cli",
      startedAt: "2026-05-09T10:00:00.000Z",
      endedAt: "2026-05-09T10:10:00.000Z",
      sourcePath: "fixture.jsonl",
      sourceFormat: "jsonl",
      messages: [],
      tokenEstimate: {
        inputTokens: 1300,
        outputTokens: 0,
        totalTokens: 1300,
        confidence: 0.8,
        source: "reported",
      },
      warnings: [],
      replayEvents: [
        {
          id: "e1",
          sessionId: "session-1",
          kind: "prompt",
          timestamp: "2026-05-09T10:00:00.000Z",
          label: "Prompt",
          tokens: 300,
        },
        {
          id: "e2",
          sessionId: "session-1",
          kind: "file_read",
          timestamp: "2026-05-09T10:01:00.000Z",
          label: "File referenced",
          filePath: "src/index.ts",
          tokens: 500,
        },
        {
          id: "e3",
          sessionId: "session-1",
          kind: "retry",
          timestamp: "2026-05-09T10:02:00.000Z",
          label: "Retry signal",
          detail: "error, retry",
          tokens: 500,
        },
      ],
    };

    const timeline = buildReplayTimeline(session);

    expect(timeline.metrics.durationMinutes).toBe(10);
    expect(timeline.metrics.maxContextSize).toBe(1300);
    expect(timeline.metrics.uniqueFilesRead).toBe(1);
    expect(timeline.metrics.retryEventCount).toBe(1);
    expect(summarizeReplay(timeline).at(-1)).toContain("max context tokens");
  });
});
