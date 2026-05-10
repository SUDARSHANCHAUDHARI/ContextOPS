# Adapter Support Matrix

ContextOps adapters are defensive local parsers. They should prefer partial results and warnings over crashes when a tool changes log shape or emits malformed records.

## Current Adapters

| Adapter          | Status  | Common local sources                                      | Formats                          | Notes                                                                                                 |
| ---------------- | ------- | --------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Claude Code      | Preview | `~/.claude`, local project logs                           | JSON, JSONL, plaintext           | Best effort parsing for session-like records, prompts, responses, tool events, and usage fields.      |
| OpenAI Codex CLI | Preview | `~/.codex/sessions`, selected local JSONL files           | JSONL, JSON, plaintext           | Supports synthetic and generic session records with model, usage, tool, retry, and file-read signals. |
| Cursor           | Preview | Cursor workspace/session files and SQLite-derived records | JSON, JSONL, SQLite-derived rows | Handles nested turns, bubbles, messages, usage fields, and conversation grouping where available.     |
| Gemini CLI       | Preview | `~/.gemini`, local CLI logs                               | JSON, JSONL, plaintext           | Best effort parsing for nested content, prompt/response records, and missing token estimates.         |

## Expected Adapter Contract

Each adapter exposes:

- `detect()`: identify likely local paths and confidence.
- `scan()`: collect candidate files and return parsed sessions plus warnings.
- `parseSession()`: parse one file defensively.
- `extractTimeline()`: build replay-ready events from a parsed session.
- `estimateTokens()`: estimate missing token data with confidence.

## Parser Behavior

Adapters should:

- tolerate malformed files
- support JSON, JSONL, and plaintext where practical
- preserve warnings with file paths when parsing is incomplete
- estimate missing token usage instead of dropping the session
- attach confidence scores to estimates
- avoid reading ignored directories and unrelated large caches
- cap broad scans to protect local performance

## Replay Signals

ContextOps attempts to infer:

- user prompts
- assistant responses
- tool calls
- file reads
- retry or failure recovery
- context growth
- model switches
- token usage and estimates

Not every tool records every signal. Missing signals should lower confidence, not fail the scan.

## Known Preview Limits

- Tool log formats can drift without notice.
- Some local stores may require redacted fixtures before support can be hardened.
- Plaintext parsing is intentionally approximate.
- Token and cost estimates are only as strong as available usage fields and pricing metadata.
- Cursor data can appear in nested records or SQLite stores; small fixtures are especially valuable for parser drift.

## Beta Hardening Priorities

1. Add small redacted fixtures for real parser drift.
2. Improve replay event classification when tool calls are nested.
3. Improve model and usage extraction for partially structured records.
4. Add adapter-specific warning examples to documentation.
5. Expand tests around malformed JSONL and mixed plaintext sessions.

See `docs/PARSER_FIXTURE_GUIDE.md` before sharing fixtures.
