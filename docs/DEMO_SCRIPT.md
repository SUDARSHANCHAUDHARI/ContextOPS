# Demo Script

This script shows ContextOps as workflow intelligence, not just a token dashboard. It uses synthetic fixtures from `examples/` and a throwaway local database.

## Setup

```bash
pnpm install
pnpm build
CONTEXTOPS_HOME=.contextops-demo pnpm cli reset
```

## 1. Show The Product Promise

Say:

```text
ContextOps reads local AI coding session artifacts and explains where workflow cost comes from: repeated reads, retry chains, context growth, and expensive sessions.
```

Run:

```bash
pnpm cli tools
```

Point out that ContextOps detects local tools without proxying model traffic or asking for API keys.

## 2. Scan Synthetic Sessions

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm cli scan --provider codex-cli --path ./examples/sample-logs/codex-session.jsonl
CONTEXTOPS_HOME=.contextops-demo pnpm cli scan --provider cursor --path ./examples/sample-logs/cursor-session.json
```

Point out parser behavior:

- JSON and JSONL are accepted.
- Missing data is estimated.
- Parser problems should become warnings instead of crashes.

## 3. Show The Summary

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm cli summary
```

Expected talking point:

```text
The summary gives a fast local read on sessions, estimated tokens, estimated cost, and stored waste patterns.
```

## 4. Show Waste Detection

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm cli waste
```

Call out the three useful signals in the fixture:

- retry chain
- fast context growth
- repeated file reads

## 5. Show Replay

```bash
pnpm cli replay ./examples/sample-logs/codex-session.jsonl
```

Expected talking point:

```text
Replay turns raw logs into a timeline of prompts, tool calls, file references, retries, context growth, and model activity.
```

## 6. Open The Dashboard

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm --filter @contextops/web dev
```

Open the printed localhost URL and visit:

- `/`
- `/sessions`
- `/replay`
- `/waste`
- `/settings`

Point out that everything reads local state and no authentication or cloud account is required.

## 7. Close With The Beta Ask

Say:

```text
The beta goal is parser hardening: run ContextOps on real local AI coding histories, report warning codes and confusing replay output, and share only redacted or synthetic fixtures.
```

Link testers to `docs/BETA_FEEDBACK.md`.
