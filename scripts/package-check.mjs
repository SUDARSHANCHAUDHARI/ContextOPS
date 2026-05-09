import { readFileSync } from "node:fs";
import { join } from "node:path";

const publishablePackages = [
  "apps/cli/package.json",
  "packages/adapters/package.json",
  "packages/analyzer/package.json",
  "packages/config/package.json",
  "packages/core/package.json",
  "packages/graph/package.json",
  "packages/pricing/package.json",
  "packages/replay/package.json",
  "packages/storage/package.json",
  "packages/telemetry/package.json",
  "packages/ui/package.json",
];

const privateApps = ["apps/tui/package.json", "apps/web/package.json"];

const failures = [];

for (const manifestPath of publishablePackages) {
  const manifest = readManifest(manifestPath);
  if (manifest.private) failures.push(`${manifest.name} should not be private`);
  if (manifest.type !== "module") failures.push(`${manifest.name} must be ESM`);
  if (manifest.main !== "dist/index.js") failures.push(`${manifest.name} missing dist main`);
  if (manifest.types !== "dist/index.d.ts") failures.push(`${manifest.name} missing dist types`);
  if (manifest.exports?.["."] !== "./dist/index.js") {
    failures.push(`${manifest.name} missing root dist export`);
  }
  if (!Array.isArray(manifest.files) || !manifest.files.includes("dist")) {
    failures.push(`${manifest.name} must publish dist only`);
  }
  if (!manifest.scripts?.build || !manifest.scripts?.typecheck || !manifest.scripts?.test) {
    failures.push(`${manifest.name} missing required lifecycle scripts`);
  }
}

for (const manifestPath of privateApps) {
  const manifest = readManifest(manifestPath);
  if (manifest.private !== true) failures.push(`${manifest.name} should be private`);
}

const cli = readManifest("apps/cli/package.json");
if (cli.bin?.contextops !== "./dist/index.js") {
  failures.push("@contextops/cli missing contextops bin");
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("ContextOps package check passed\n");
}

function readManifest(path) {
  return JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));
}
