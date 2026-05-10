# ContextOps Examples

This folder contains synthetic fixtures and sample output for evaluating ContextOps without using private AI coding logs.

## Contents

- `sample-logs/codex-session.jsonl`: a small JSONL session with prompts, tool activity, repeated file reads, retry behavior, and token usage.
- `sample-logs/cursor-session.json`: a nested JSON session shaped to exercise defensive parsing.
- `expected-output.md`: representative CLI output for a small local scan.

## Try It

```bash
CONTEXTOPS_HOME=.contextops-demo pnpm cli reset
CONTEXTOPS_HOME=.contextops-demo pnpm cli scan --provider codex-cli --path ./examples/sample-logs/codex-session.jsonl
CONTEXTOPS_HOME=.contextops-demo pnpm cli scan --provider cursor --path ./examples/sample-logs/cursor-session.json
CONTEXTOPS_HOME=.contextops-demo pnpm cli summary
CONTEXTOPS_HOME=.contextops-demo pnpm cli waste
pnpm cli replay ./examples/sample-logs/codex-session.jsonl
```

The fixtures are intentionally small. They are meant for onboarding, parser smoke testing, and documentation screenshots, not benchmarking.

## Privacy Note

Do not add real user prompts, customer code, private repository paths, API keys, access tokens, or raw production logs to this folder. Keep examples synthetic and minimal.
