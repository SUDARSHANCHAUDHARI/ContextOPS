import { chmodSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const [, , target] = process.argv;

if (!target) {
  throw new Error("Usage: node scripts/ensure-bin.mjs <path>");
}

const path = resolve(target);
const content = readFileSync(path, "utf8");

if (!content.startsWith("#!/usr/bin/env node")) {
  throw new Error(`${target} is missing the Node.js shebang`);
}

const mode = statSync(path).mode | 0o755;
chmodSync(path, mode);
