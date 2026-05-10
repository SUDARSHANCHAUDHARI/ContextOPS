# Quickstart

This guide gets ContextOps running against local data in a few minutes. It uses local files only and does not require API keys, proxies, or cloud accounts.

## 1. Install

```bash
pnpm install
pnpm build
```

For a clean verification pass:

```bash
pnpm verify
```

## 2. Detect Local Tools

```bash
pnpm cli tools
```

ContextOps checks for supported local AI coding tools and records detection results in local SQLite storage.

## 3. Scan Sessions

Scan the default local locations:

```bash
pnpm cli scan
```

Scan a specific safe fixture or local folder:

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm cli reset
CONTEXTOPS_HOME=.contextops-demo pnpm cli scan --provider codex-cli --path ./examples/sample-logs/codex-session.jsonl
CONTEXTOPS_HOME=.contextops-demo pnpm cli scan --provider cursor --path ./examples/sample-logs/cursor-session.json
```

Parsers are defensive by design. Malformed records should produce warnings instead of crashing the scan.

## 4. Review Workflow Intelligence

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm cli summary
CONTEXTOPS_HOME=.contextops-demo pnpm cli sessions
CONTEXTOPS_HOME=.contextops-demo pnpm cli waste
```

Use these commands to inspect token estimates, cost estimates, expensive sessions, repeated file reads, retry chains, context bloat, and other workflow inefficiencies.

## 5. Replay A Session

```bash
pnpm cli replay ./examples/sample-logs/codex-session.jsonl
```

Replay output is built from chronological events: prompts, tool calls, retries, context growth, file reads, and model changes where available.

## 6. Open The Dashboard

```bash
pnpm --filter @contextops/web dev
```

Then open the printed localhost URL. The dashboard reads local SQLite data and exposes overview, session, replay, project, tool, waste, and settings views.

## 7. Configure Scan Behavior

Copy the example config when you need custom paths or privacy controls:

```bash
cp contextops.config.example.json contextops.config.json
```

Common settings include custom scan paths, disabled adapters, ignored directories, local pricing overrides, budget alerts, and replay retention.

## Troubleshooting

Run the doctor command first:

```bash
pnpm cli doctor
```

If scans return no sessions, check configured paths and confirm the target folder contains JSON, JSONL, or plaintext logs. If parsing produces warnings, keep the warning output with the fixture when filing an adapter issue.
