# Changelog

All notable ContextOps changes are tracked here.

## Unreleased

### Added

- Beta feedback guide for privacy-safe parser drift and workflow intelligence reports.
- Demo script for presenting ContextOps with synthetic fixtures and a throwaway local database.

## 0.1.3 - Quickstart And Examples

### Added

- Quickstart documentation with root-level CLI commands and local demo-store guidance.
- Synthetic example logs and representative CLI output for onboarding, screenshots, and parser smoke checks.
- Launch checklist updates for preview verification with safe example fixtures.

## 0.1.2 - Product Surface Polish

### Added

- Navigable TUI tabs for waste, sessions, projects, and models with selected-row detail.
- Web replay event-kind filters and session-level replay metrics.
- Settings page backed by resolved local configuration.
- Local API endpoints for config inspection and report/session export.

## 0.1.0 - Developer Preview

### Added

- Turborepo monorepo with TypeScript packages for core contracts, adapters, analyzer, replay, pricing, storage, config, telemetry, graph, and shared UI.
- Commander.js CLI with local scan, summary, sessions, replay, waste, tools, doctor, config, retention, reset, report, and export entry points.
- Defensive adapters for Claude Code, OpenAI Codex CLI, Cursor, and Gemini CLI.
- JSON, JSONL, and plaintext parsing support with warnings and confidence scores instead of hard failures.
- SQLite schema and local persistence for tools, projects, sessions, messages, replay events, cost estimates, waste patterns, scan runs, model usage, and timeline nodes.
- Analyzer engine for prompt loops, repeated file reads, context bloat, retry chains, high-cost sessions, tool overuse, session efficiency, ROI scoring, and context growth.
- Replay engine for chronological timeline construction, prompt and tool events, retry chains, context growth, file reads, and model switches.
- Ink TUI scaffold and Next.js dashboard scaffold for local workflow intelligence views.
- Production verification pipeline covering formatting, package manifest checks, linting, type checking, tests, build, CLI smoke tests, release checks, and package packing.
- Clean-room documentation, architecture notes, product spec, roadmap, production readiness notes, and future vision.

### Notes

- This release is a developer preview. Adapter behavior should be validated against real local session folders before a wider launch.
- ContextOps does not proxy model traffic, require API keys, or upload local session data by default.

## 0.1.1 - Workflow Intelligence Hardening

### Added

- Cursor JSON and Gemini CLI nested-turn parser fixtures.
- Replay timeline metrics for duration, max context size, context growth, event counts, retry count, and unique files read.
- Analyzer recommendations for each waste pattern kind.
- Web waste views with evidence and recommended next actions.
- CLI first-run hints for empty local stores.

### Changed

- Generic JSON parsing now expands common nested session containers while preserving complete turns as single messages.
