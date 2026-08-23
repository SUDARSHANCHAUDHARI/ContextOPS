# ContextOps

[![Version](https://img.shields.io/badge/version-0.1.4-blue.svg)](package.json)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15-F69220.svg)](https://pnpm.io/)
[![Release](https://img.shields.io/badge/release-local%20developer%20preview-orange.svg)](RELEASE_MEMORY.md)

ContextOps is a local-first workflow intelligence platform for AI coding tools. It helps developers understand why AI-assisted coding sessions become expensive, repetitive, or inefficient by analyzing local session artifacts, estimating token and cost impact, and building replayable timelines.

The project is intentionally not a proxy, not a telemetry collector, and not a cloud service. The default data path is local SQLite, with defensive parsers for tool logs and session files.

> **Status:** Local developer-preview candidate · `pnpm verify` passed · synthetic demo flow verified · package/release notes still pending

## Table of Contents

- [Key Technical Decisions](#key-technical-decisions)
- [MVP Scope](#mvp-scope)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Screenshots](#screenshots)
- [Local-First Philosophy](#local-first-philosophy)
- [Roadmap](#roadmap)
- [Launch Checklist](#launch-checklist)
- [Beta Testing](#beta-testing)
- [Contributing](#contributing)
- [Launch Status](#launch-status)
- [License](#license)
- [About](#about)

## Key Technical Decisions

**Local-first storage is the core product constraint.** ContextOps reads local AI tool artifacts and stores parsed session data in local SQLite instead of sending coding history to a cloud service.

**Defensive parsers are preferred over brittle exact formats.** Claude Code, Codex, Cursor, and Gemini session files can drift, so adapters should warn and keep scanning instead of crashing.

**Synthetic demos are part of the release path.** Safe fixture data lets the CLI, dashboard, and waste analysis be demonstrated without exposing private session logs.

**`pnpm verify` is the release gate.** The command combines formatting, package checks, lint, typecheck, tests, build, smoke, release check, and pack check.

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

## Quick Start

For the full walkthrough, see `docs/QUICKSTART.md`.

Run the local verification suite:

```bash
pnpm verify
```

Load a safe synthetic demo store:

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm cli demo --reset
CONTEXTOPS_HOME=.contextops-demo pnpm cli summary
CONTEXTOPS_HOME=.contextops-demo pnpm cli waste
```

Inspect available AI coding tool data:

```bash
pnpm cli tools
pnpm cli scan
pnpm cli summary
```

Try the synthetic examples:

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm cli reset
CONTEXTOPS_HOME=.contextops-demo pnpm cli scan --provider codex-cli --path ./examples/sample-logs/codex-session.jsonl
CONTEXTOPS_HOME=.contextops-demo pnpm cli waste
```

Launch the local dashboard:

```bash
pnpm --filter @contextops/web dev
```

The dashboard runs against local project data only. No authentication, cloud account, or API key is required.

## Commands

```bash
contextops tools
contextops scan
contextops demo
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
pnpm cli summary
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

Screenshots will live here once launch captures are finalized:

- Overview dashboard
- Session explorer
- Replay viewer
- Waste analysis
- TUI dashboard

Safe synthetic fixtures for screenshots and onboarding live in `examples/`.

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

- v0.1.0: local scan, parsing, storage, CLI summaries, replay timelines, waste detection, dashboard scaffold.
- v0.2.0: stronger adapter fixtures, richer replay navigation, project rollups, model switching analytics, and budget alerts.
- v0.3.0: IDE-native overlays, prompt optimization recommendations, workflow graph visualization, and opt-in team analytics.

## Launch Checklist

See `docs/LAUNCH_CHECKLIST.md` for the current verification and release checklist.

## Beta Testing

- Use `docs/DEMO_SCRIPT.md` for a short synthetic demo.
- Use `docs/BETA_FEEDBACK.md` to report parser drift, confusing replay output, or workflow intelligence misses without sharing private logs.
- Use `docs/PARSER_FIXTURE_GUIDE.md` when creating safe, minimal parser fixtures.
- Use `docs/ADAPTER_SUPPORT.md` to understand current preview adapter coverage and limits.

## Contributing

Contributions must follow `CONTRIBUTING.md` and the clean-room rules in `docs/CLEAN_ROOM_RULES.md`. Do not copy code, wording, UI layouts, architecture diagrams, naming systems, or branding from other AI observability or coding tools.

## Launch Status

ContextOps is preparing for a v0.1.0 developer preview. The current milestone is intended for local-first evaluation, adapter hardening, and workflow intelligence feedback before broader distribution.

## License

MIT

---

## About

I'm Sudarshan Chaudhari, a Senior Quality Engineer, Test Automation specialist, and AI systems builder based in Bangkok, Thailand.

I have 13+ years of experience in software quality engineering, working across SaaS, fintech, gaming, web, mobile, cloud, and digital signage platforms. My background combines hands-on test automation with QA leadership, test strategy, CI/CD, release quality, production investigation, and cross-platform validation.

Alongside my professional QA career, I run [SudarshanTechLabs](https://sudarshantechlabs.com/), my independent engineering and product lab where I design, build, test, and ship software across Android, web, AI, cybersecurity, developer tooling, and cross-platform applications.

### What I work on

- ⚙️ **Quality Engineering & Test Automation** — Playwright, Selenium, Cypress, Appium, API testing, automation frameworks, end-to-end testing, CI/CD, release gates, GitHub Actions, risk-based testing, and production validation
- 🤖 **AI Systems & Automation** — AI agents, multi-agent orchestration, MCP servers, AI-assisted QA, prompt tooling, developer workflows, automation systems, and Claude Code plugins
- 📱 **Mobile & Cross-Platform Applications** — Android applications built with Kotlin and Jetpack Compose, Google Play releases, automated build and publishing pipelines, and cross-platform development spanning iOS, web, Windows, and macOS
- 🌐 **Web Applications & Platforms** — Full-stack applications using Next.js, TypeScript, Firebase, Cloudflare, REST APIs, and modern web infrastructure
- 🛠️ **Developer Tooling & CLI Engineering** — Rust, Python, TypeScript, CLI utilities, multi-repository tooling, build automation, release tooling, and engineering productivity systems
- 🛡️ **Cybersecurity & Observability** — Threat detection, log analysis, security auditing, vulnerability assessment, monitoring, and security-focused developer tools
- 📺 **Digital Signage & Device Platforms** — Content validation, playback testing, device compatibility, production investigation, monitoring, and QA across diverse hardware and operating-system environments

My work sits at the intersection of quality engineering, automation, AI, and software development. I approach products with a QA mindset from the beginning: understanding failure modes, designing for testability, automating repetitive work, and building release confidence into the engineering process.

Through SudarshanTechLabs, I also build products and tools from idea to production, covering architecture, development, testing, CI/CD, release automation, monitoring, and ongoing maintenance.

🌐 [sudarshantechlabs.com](https://sudarshantechlabs.com/) · 💼 [LinkedIn](https://linkedin.com/in/sudarshan-chaudhari) · 🐙 [GitHub](https://github.com/SUDARSHANCHAUDHARI) · ✉️ [sunny.sudarshan@gmail.com](mailto:sunny.sudarshan@gmail.com)
