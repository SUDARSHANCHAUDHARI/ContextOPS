import { rmSync } from "node:fs";
import { join } from "node:path";

const generatedPaths = [
  "apps/cli/dist",
  "apps/tui/dist",
  "apps/web/.next",
  "packages/adapters/dist",
  "packages/analyzer/dist",
  "packages/config/dist",
  "packages/core/dist",
  "packages/graph/dist",
  "packages/pricing/dist",
  "packages/replay/dist",
  "packages/storage/dist",
  "packages/telemetry/dist",
  "packages/ui/dist",
];

for (const path of generatedPaths) {
  rmSync(join(process.cwd(), path), { force: true, recursive: true });
}
