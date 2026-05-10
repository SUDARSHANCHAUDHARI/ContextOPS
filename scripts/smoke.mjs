import { mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdapters } from "../packages/adapters/dist/index.js";
import { analyzeSession } from "../packages/analyzer/dist/index.js";
import { estimateSessionCost } from "../packages/pricing/dist/index.js";
import { ContextOpsStore } from "../packages/storage/dist/index.js";

const fixturePath = new URL(
  "../packages/adapters/src/fixtures/codex-rollout-events.jsonl",
  import.meta.url,
).pathname;
const tmp = mkdtempSync(join(tmpdir(), "contextops-smoke-"));
const dbPath = join(tmp, "contextops.sqlite");
const cliPath = new URL("../apps/cli/dist/index.js", import.meta.url).pathname;

try {
  const adapter = createAdapters().find((item) => item.id === "codex-cli");
  if (!adapter) throw new Error("Codex adapter missing");

  const session = await adapter.parseSession(fixturePath);
  const analysis = analyzeSession(session);
  const costs = estimateSessionCost(session);

  const store = new ContextOpsStore(dbPath);
  store.saveSession(session, costs, analysis.patterns);
  const report = store.buildReport();
  const stored = store.getSession(session.id);
  store.close();

  const summary = report.summary;
  if (summary.sessionCount !== 1)
    throw new Error(`Expected one session, got ${summary.sessionCount}`);
  if (!stored) throw new Error("Stored session was not retrievable");
  if (stored.replayEvents.length === 0) throw new Error("Replay events missing");

  const cliEnv = { ...process.env, CONTEXTOPS_HOME: tmp };
  const version = execFileSync("node", [cliPath, "--version"], {
    encoding: "utf8",
    env: cliEnv,
  }).trim();
  if (!/^\d+\.\d+\.\d+/.test(version)) throw new Error(`Unexpected CLI version: ${version}`);

  const doctor = execFileSync("node", [cliPath, "doctor"], {
    encoding: "utf8",
    env: cliEnv,
  });
  if (!doctor.includes("Telemetry: disabled by default")) {
    throw new Error("CLI doctor output did not include privacy posture");
  }

  const scan = execFileSync(
    "node",
    [cliPath, "scan", "--provider", "codex-cli", "--path", fixturePath],
    {
      encoding: "utf8",
      env: cliEnv,
    },
  );
  if (!scan.includes("Scan run:")) throw new Error("CLI scan did not record a scan run");

  const demo = execFileSync("node", [cliPath, "demo", "--reset"], {
    encoding: "utf8",
    env: cliEnv,
  });
  if (!demo.includes("Loaded 2 demo sessions")) {
    throw new Error("CLI demo did not load synthetic sessions");
  }

  const demoSummary = execFileSync("node", [cliPath, "summary"], {
    encoding: "utf8",
    env: cliEnv,
  });
  if (!demoSummary.includes("Sessions: 2")) {
    throw new Error("CLI summary did not include demo sessions");
  }

  const retention = execFileSync("node", [cliPath, "retention", "--days", "3650"], {
    encoding: "utf8",
    env: cliEnv,
  });
  if (!retention.includes("Sessions deleted:")) {
    throw new Error("CLI retention did not report deletion counts");
  }

  process.stdout.write("ContextOps smoke passed\n");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
