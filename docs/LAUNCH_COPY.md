# Launch Copy

## Short Description

ContextOps is a local-first workflow intelligence platform for AI coding tools. It helps developers understand why AI coding sessions become expensive, repetitive, or inefficient by turning local session artifacts into cost estimates, waste signals, and replayable timelines.

## Launch Post Draft

We are launching the ContextOps v0.1.0 developer preview.

AI coding tools are powerful, but the workflow around them can quietly become expensive: repeated retries, prompt loops, context bloat, repeated file reads, model switching, and sessions that grow without a clear reason.

ContextOps focuses on the "why" behind that waste. It scans local AI coding session artifacts, stores findings in local SQLite, and builds replay-first timelines so developers can inspect what happened across a session without sending data to a cloud service.

The first preview includes adapters for Claude Code, OpenAI Codex CLI, Cursor, and Gemini CLI, plus CLI summaries, waste detection, replay timelines, a TUI scaffold, and a local dashboard scaffold.

The project is local-first by default:

- no telemetry by default
- no proxy architecture
- no API keys required
- no external uploads
- local SQLite storage

This is an early developer preview. The next focus is hardening adapters against real-world session fixtures, improving replay navigation, and turning waste findings into practical workflow recommendations.

## Positioning

ContextOps is not just a token dashboard. It is designed to explain the root causes of inefficient AI coding workflows and make sessions replayable enough to debug.

## Suggested Tags

- AI coding
- developer tools
- local-first
- observability
- workflow intelligence
- TypeScript
- SQLite
