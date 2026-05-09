import { accessSync, constants, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const requiredFiles = [
  "README.md",
  "SECURITY.md",
  "contextops.config.example.json",
  "docs/PRODUCTION_READINESS.md",
  "apps/cli/dist/index.js",
  "apps/cli/dist/index.d.ts",
  "apps/tui/dist/index.js",
  "packages/core/dist/index.js",
  "packages/adapters/dist/index.js",
  "packages/analyzer/dist/index.js",
  "packages/replay/dist/index.js",
  "packages/storage/dist/index.js",
  "packages/pricing/dist/index.js",
  "packages/config/dist/index.js",
];

const failures = [];

for (const file of requiredFiles) {
  try {
    accessSync(join(process.cwd(), file), constants.R_OK);
  } catch {
    failures.push(`Missing release artifact: ${file}`);
  }
}

const cliPath = join(process.cwd(), "apps/cli/dist/index.js");
try {
  const cli = readFileSync(cliPath, "utf8");
  if (!cli.startsWith("#!/usr/bin/env node")) {
    failures.push("CLI binary is missing the Node.js shebang");
  }
  if ((statSync(cliPath).mode & 0o111) === 0) {
    failures.push("CLI binary is not executable");
  }
} catch {
  failures.push("CLI binary could not be inspected");
}

for (const file of [
  "packages/adapters/dist/adapters.test.js",
  "packages/storage/dist/storage.test.js",
]) {
  try {
    accessSync(join(process.cwd(), file), constants.F_OK);
    failures.push(`Test file leaked into dist: ${file}`);
  } catch {
    // Good: build output should not include tests.
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("ContextOps release check passed\n");
}
