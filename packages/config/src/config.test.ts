import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig, validateConfig } from "./index.js";

const makeTempDir = () => {
  const path = join(tmpdir(), `contextops-config-${Date.now()}-${Math.random()}`);
  mkdirSync(path, { recursive: true });
  return path;
};

describe("config", () => {
  it("merges valid local config with defaults", () => {
    const cwd = makeTempDir();
    writeFileSync(
      join(cwd, "contextops.config.json"),
      JSON.stringify({
        disabledAdapters: ["cursor"],
        privacyMode: "balanced",
        replayRetentionDays: 14,
      }),
    );

    const config = loadConfig(cwd);

    expect(config.disabledAdapters).toEqual(["cursor"]);
    expect(config.privacyMode).toBe("balanced");
    expect(config.replayRetentionDays).toBe(14);
    expect(config.scanPaths.length).toBeGreaterThan(0);
  });

  it("reports malformed JSON with a ContextOps-specific error", () => {
    const cwd = makeTempDir();
    writeFileSync(join(cwd, "contextops.config.json"), "{ nope");

    expect(() => loadConfig(cwd)).toThrow(/Invalid contextops\.config\.json: malformed JSON/);
  });

  it("validates config objects before callers persist them", () => {
    expect(() => validateConfig({ replayRetentionDays: -1 })).toThrow(/Invalid ContextOps config/);
  });
});
