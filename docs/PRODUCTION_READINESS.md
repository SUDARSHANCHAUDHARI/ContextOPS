# Production Readiness

ContextOps is local-first software. Production readiness means the project can be installed, scanned, tested, and upgraded without surprising users or leaking local data.

## Release Gates

Before release:

```bash
pnpm install --frozen-lockfile
pnpm package:check
pnpm lint
pnpm test
pnpm build
pnpm smoke
pnpm release:check
pnpm pack:check
```

The same gate is available as:

```bash
pnpm verify
```

## Runtime Guarantees

- No telemetry is enabled by default.
- No proxy is required.
- No API key is required.
- SQLite is stored under `CONTEXTOPS_HOME` or `~/.contextops`.
- Parser failures should become warnings, not process crashes.
- Cursor databases are opened read-only by the adapter package.
- `contextops.config.json` is schema-validated before use.
- SQLite stores a schema version in both `pragma user_version` and `contextops_meta`.
- `contextops doctor` reports database health, journal mode, and schema version.
- Each CLI scan records a `scan_runs` audit row with scanned paths and parser warnings.
- `contextops retention` applies local retention to sessions and replay-linked tables.
- Production builds start from clean generated artifacts and validate the executable CLI output.
- Publishable packages are constrained to compiled `dist` artifacts.
- The CLI package is packed during verification and checked for binary, type, and dependency metadata.

## Known Production Gaps

- Parser compatibility needs validation against more real local data shapes.
- Pricing should be moved to a maintained offline cache or explicit versioned table.
- The web dashboard needs visual regression coverage before broad release.
- Package publishing metadata and installer flow still need final naming decisions.
