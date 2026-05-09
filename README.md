# ContextOps

ContextOps is a local-first workflow intelligence platform for AI coding tools. It helps developers understand why AI-assisted coding sessions become expensive, repetitive, or inefficient by analyzing local session artifacts, estimating token and cost impact, and building replayable timelines.

The project is intentionally not a proxy, not a telemetry collector, and not a cloud service. The default data path is local SQLite, with defensive parsers for tool logs and session files.

## MVP Scope

- Detect Claude Code, OpenAI Codex CLI, Cursor, and Gemini CLI paths.
- Scan local session folders without requiring API keys.
- Parse JSON, JSONL, and plaintext logs with warnings instead of crashes.
- Estimate tokens and cost when reported usage is missing.
- Store sessions, messages, replay events, cost estimates, and waste patterns locally.
- Explain workflow waste such as prompt loops, retry chains, repeated file reads, context bloat, high-cost sessions, and tool overuse.
- Provide CLI, Ink TUI, and Next.js dashboard entry points.

## Installation

```bash
pnpm install
pnpm build
```

## Commands

```bash
contextops tools
contextops scan
contextops summary
contextops sessions
contextops replay ./path/to/session.jsonl
contextops waste
contextops doctor
contextops config
contextops retention --days 90
contextops reset
```

During development:

```bash
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm smoke
pnpm --filter @contextops/web dev
pnpm --filter @contextops/cli dev -- summary
```

## Configuration

ContextOps looks for `contextops.config.json` in the current working directory. Start from `contextops.config.example.json` when you need custom scan paths, disabled adapters, local pricing overrides, budget alerts, replay retention, or ignored directories.

Production verification:

```bash
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` includes package manifest checks, a clean production build, smoke tests against the built CLI, release artifact checks, and a CLI tarball pack check.

## Architecture

ContextOps is a Turborepo monorepo:

- `apps/cli`: Commander.js CLI for scanning, summaries, replay previews, and maintenance.
- `apps/tui`: Ink dashboard for terminal workflows.
- `apps/web`: Next.js local dashboard.
- `packages/core`: shared contracts for adapters, sessions, events, costs, and waste patterns.
- `packages/adapters`: defensive tool adapters.
- `packages/analyzer`: workflow inefficiency and ROI scoring.
- `packages/replay`: replay-first session timeline assembly.
- `packages/pricing`: local cost estimation tables and custom pricing support.
- `packages/storage`: SQLite schema and persistence.
- `packages/config`: `contextops.config.json` loader.
- `packages/telemetry`: explicit local-only telemetry policy.
- `packages/graph`: future workflow graph helpers.
- `packages/ui`: shared UI primitives.

## Screenshots

Screenshots will live here once the dashboard has real local data:

- Overview dashboard
- Session explorer
- Replay viewer
- Waste analysis
- TUI dashboard

## Local-First Philosophy

ContextOps defaults to:

- no telemetry
- no uploads
- no API keys
- no proxy architecture
- local SQLite storage
- user-controlled scan paths
- parser warnings instead of hard failures

## Roadmap

- Hardening adapters with more tool-specific fixtures.
- Rich replay detail pages and timeline navigation.
- Context growth visualizations.
- IDE-native overlays.
- Team analytics with opt-in sync.
- Prompt optimization recommendations.
- Workflow graph visualization.
- Governance and anomaly detection.

## Contributing

Contributions must follow the clean-room rules in `docs/CLEAN_ROOM_RULES.md`. Do not copy code, wording, UI layouts, architecture diagrams, naming systems, or branding from other AI observability or coding tools.
