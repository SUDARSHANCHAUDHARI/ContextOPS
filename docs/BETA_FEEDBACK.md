# Beta Feedback Guide

ContextOps is local-first and privacy-sensitive, so beta feedback should describe behavior without exposing private prompts, source code, customer names, repository paths, tokens, credentials, or raw production logs.

## What To Test

- Tool detection for Claude Code, OpenAI Codex CLI, Cursor, and Gemini CLI.
- Scans against a small local folder first, then a real session folder if comfortable.
- Parser warnings for malformed JSON, JSONL, plaintext logs, and nested session data.
- CLI summaries, session lists, replay output, waste analysis, and local dashboard pages.
- Cost estimates, token estimates, repeated file reads, retry chains, context growth, and model switching signals.

## Safe Feedback Template

```text
ContextOps version:
Operating system:
Node version:
pnpm version:
AI coding tool:
Command run:
Scan path type: default / custom / synthetic fixture

Expected behavior:
Actual behavior:
Warning output:
Approximate session count:
Approximate log format: JSON / JSONL / plaintext / SQLite / unknown

Did the issue reproduce with examples/sample-logs? yes / no
Can you share a redacted fixture? yes / no
```

## Redaction Rules

- Replace private prompts with short summaries such as `[user asked for auth bug fix]`.
- Replace file paths with stable placeholders such as `/repo/packages/api/src/router.ts`.
- Replace customer, company, branch, token, and host names with placeholders.
- Keep timestamps, message roles, event kinds, token counts, model names, warning codes, and structural fields when possible.
- Prefer a tiny synthetic reproduction over a large redacted session.

## Parser Drift Reports

Parser drift happens when a supported tool changes its local log format. Good reports include:

- the tool name and version when available
- the file extension or storage format
- the warning code from ContextOps
- the smallest redacted record that reproduces the issue
- whether the parser skipped the session, estimated tokens incorrectly, or built a confusing replay timeline

## Useful Commands

```bash
pnpm cli doctor
pnpm cli tools
pnpm cli scan --path ./examples/sample-logs/codex-session.jsonl --provider codex-cli
pnpm cli replay ./examples/sample-logs/codex-session.jsonl
pnpm cli waste
```

Use `CONTEXTOPS_HOME=.contextops-demo` when you want a throwaway local database:

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm cli reset
CONTEXTOPS_HOME=.contextops-demo pnpm cli scan --provider codex-cli --path ./examples/sample-logs/codex-session.jsonl
CONTEXTOPS_HOME=.contextops-demo pnpm cli summary
```

## What Not To Share

- API keys, access tokens, SSH keys, cookies, or `.env` values.
- Full private prompts or assistant responses from real projects.
- Customer code, private repository names, or proprietary filenames.
- Raw SQLite databases from real tools unless they have been scrubbed and approved for sharing.
