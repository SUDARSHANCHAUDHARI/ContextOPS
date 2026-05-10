# Parser Fixture Guide

Parser fixtures help ContextOps keep up with AI coding tools as their local session formats change. The best fixture is small, synthetic or heavily redacted, and focused on one parser behavior.

## Good Fixture Goals

- Reproduce one adapter issue or replay confusion.
- Preserve structure, roles, event kinds, timestamps, model names, token fields, and warning-triggering shapes.
- Remove private prompts, proprietary source code, customer names, hostnames, secrets, and raw local paths.
- Stay small enough to review in a pull request.

## Preferred Fixture Types

- JSONL session with 3 to 10 records.
- JSON session with nested turns, messages, tool calls, or usage fields.
- Plaintext log with representative prompt/tool/error lines.
- SQLite-derived excerpt converted to JSON when possible.

Avoid adding binary databases or full production logs unless there is no smaller reproduction.

## Redaction Pattern

Keep shape, replace content:

```json
{
  "timestamp": "2026-05-10T09:00:00.000Z",
  "role": "user",
  "content": "[redacted: user asked agent to fix a failing auth test]",
  "model": "example-model",
  "usage": {
    "inputTokens": 1200,
    "outputTokens": 240
  }
}
```

For file paths, prefer stable placeholders:

```text
/repo/packages/api/src/router.ts
/repo/apps/web/app/page.tsx
```

## Fixture Checklist

- [ ] The fixture contains no secrets, keys, tokens, cookies, or `.env` values.
- [ ] Private prompts and assistant answers are summarized or replaced.
- [ ] Project names and customer names are generic.
- [ ] File paths are placeholders unless they are already public.
- [ ] The fixture is small and focused.
- [ ] The expected behavior is documented.
- [ ] The current warning or failure is documented.

## Where Fixtures Live

Use adapter package fixtures for parser tests:

```text
packages/adapters/src/fixtures/
```

Use public demo fixtures for onboarding:

```text
examples/sample-logs/
```

Do not mix real-world beta reproductions into `examples/` unless they have been rewritten as synthetic demo data.

## Suggested Pull Request Shape

```text
Title: test(adapters): add redacted Cursor nested turn fixture

Summary:
- Adds a minimal redacted fixture for Cursor nested turn parsing.
- Covers a parser drift case where usage data is nested under tool call entries.

Verification:
- pnpm --filter @contextops/adapters test
- pnpm verify
```

## Minimal Issue Shape

If you cannot open a pull request, report:

```text
Adapter:
Tool version:
File format:
ContextOps command:
Warning code:
Expected behavior:
Actual behavior:
Can provide redacted fixture: yes / no
```

Use `docs/BETA_FEEDBACK.md` for the broader tester report format.
