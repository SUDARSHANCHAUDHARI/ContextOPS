# Security Policy

ContextOps reads local AI coding session files and stores normalized metadata in local SQLite.

## Reporting

Please report security issues privately before opening public issues.

## Defaults

- Telemetry is disabled.
- Cloud sync is not implemented.
- API keys are not required.
- Local parser warnings should not include full secret values.

## Sensitive Data

Session files may contain prompts, code snippets, paths, command output, or tool results. Treat exported JSON and CSV reports as potentially sensitive.
