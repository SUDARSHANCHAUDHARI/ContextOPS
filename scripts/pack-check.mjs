import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "contextops-pack-"));
const failures = [];

try {
  const cliManifest = JSON.parse(
    readFileSync(join(process.cwd(), "apps/cli/package.json"), "utf8"),
  );
  execFileSync("pnpm", ["pack", "--pack-destination", tmp], {
    cwd: join(process.cwd(), "apps/cli"),
    encoding: "utf8",
    stdio: "pipe",
  });

  const tarball = join(tmp, `contextops-cli-${cliManifest.version}.tgz`);
  const listing = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" }).trim().split("\n");

  for (const expected of [
    "package/package.json",
    "package/dist/index.js",
    "package/dist/index.d.ts",
  ]) {
    if (!listing.includes(expected)) failures.push(`Packed CLI missing ${expected}`);
  }

  for (const forbidden of ["package/src/", ".test.", "package/node_modules/"]) {
    if (listing.some((item) => item.includes(forbidden))) {
      failures.push(`Packed CLI contains forbidden path matching ${forbidden}`);
    }
  }

  const packedManifest = JSON.parse(
    execFileSync("tar", ["-xOf", tarball, "package/package.json"], { encoding: "utf8" }),
  );

  if (packedManifest.bin?.contextops !== "./dist/index.js") {
    failures.push("Packed CLI manifest is missing contextops bin");
  }

  for (const [name, version] of Object.entries(packedManifest.dependencies ?? {})) {
    if (String(version).startsWith("workspace:")) {
      failures.push(`Packed CLI dependency ${name} still uses ${version}`);
    }
  }

  if (failures.length > 0) {
    process.stderr.write(`${failures.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("ContextOps pack check passed\n");
  }
} finally {
  rmSync(tmp, { force: true, recursive: true });
}
