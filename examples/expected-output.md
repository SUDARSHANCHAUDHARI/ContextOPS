# Expected Example Output

Exact values can change as analyzers improve, but a small fixture scan should produce output in this shape.

## `contextops tools`

```text
found OpenAI Codex CLI (high confidence)
missing Claude Code
missing Cursor
missing Gemini CLI
```

## `contextops summary`

```text
ContextOps summary

Sessions: 2
Estimated tokens: 30k
Estimated cost: $0.04
Top waste patterns: repeated file reads, retry chains, context growth
```

## `contextops waste`

```text
Waste patterns

[high] Retry chain detected
  Explanation: retry chains spend tokens recovering instead of progressing.
  Recommendation: capture the failing command, error, and intended fix before asking for another attempt.

[medium] Fast context growth
  Explanation: rapid context expansion can bury relevant state.
  Recommendation: split the session and carry forward only the active plan, touched files, and unresolved errors.

[medium] Repeated file reads
  Explanation: packages/storage/src/storage.ts appears repeatedly in the replay timeline.
  Recommendation: keep a compact file summary instead of re-reading it every turn.
```

## `contextops replay`

```text
Replay timeline

30 replay frames
4 file reference events
8 retry or error recovery events
0 model switches

09:00:00 user prompt
09:00:22 file read packages/storage/src/storage.ts
09:00:45 repeated file read packages/storage/src/storage.ts
09:00:58 repeated file read packages/storage/src/storage.ts
09:01:04 repeated file read packages/storage/src/storage.ts
09:01:42 test command failed
09:02:18 retry succeeded
09:02:40 assistant summary
```
