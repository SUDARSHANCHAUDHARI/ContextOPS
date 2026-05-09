import { describe, expect, it } from "vitest";
import { detectPromptLoops } from "./index.js";
import type { ParsedSession } from "@contextops/core";

describe("detectPromptLoops", () => {
  it("flags repeated user prompts", () => {
    const session = {
      id: "s1",
      toolId: "codex-cli",
      startedAt: new Date().toISOString(),
      sourcePath: "sample.jsonl",
      sourceFormat: "jsonl",
      replayEvents: [],
      tokenEstimate: {
        inputTokens: 300,
        outputTokens: 0,
        totalTokens: 300,
        confidence: 0.5,
        source: "estimated",
      },
      warnings: [],
      messages: [0, 1, 2].map((index) => ({
        id: `m${index}`,
        role: "user",
        content: "Please fix the failing test in the adapter parser",
        createdAt: new Date().toISOString(),
        tokenEstimate: {
          inputTokens: 100,
          outputTokens: 0,
          totalTokens: 100,
          confidence: 0.5,
          source: "estimated",
        },
      })),
    } satisfies ParsedSession;

    expect(detectPromptLoops(session)).toHaveLength(1);
  });
});
