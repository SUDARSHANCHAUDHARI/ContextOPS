# Release Memory: ContextOPS

_Last updated: 2026-06-04_

## Current Status

ContextOPS is a local-first CLI/TUI/Next dashboard for analyzing AI coding workflow sessions and cost/waste patterns.

Known release signal: `pnpm verify` passed on 2026-06-04. It includes format check, package manifest check, lint, typecheck, tests, build, smoke, release check, and pack check.

## Release Target

Package/local-tool release.

## Success Criteria

- `pnpm install --frozen-lockfile` succeeds.
- `pnpm verify` passes.
- Local-only privacy positioning is clear.
- CLI demo flow works on synthetic examples.
- Release notes describe v0.1.x scope.

## Ordered Plan

1. Install dependencies from lockfile.
2. Run `pnpm verify`.
3. Fix any build, smoke, package, or pack failures.
4. Run demo store commands from README.
5. Review docs for privacy and local-only claims.
6. Prepare package/release notes.

## Risks

- Local session parsing can be brittle across tools.
- SQLite/native dependencies may complicate packaging.
- Privacy claims must stay strict and accurate.

## First Task

Prepare release notes and decide whether to publish as a local developer preview package.

## Latest Prep Notes

- Installed dependencies from the lockfile with `pnpm install --frozen-lockfile`.
- Formatted `AGENTS.md` and this release memory file after `pnpm verify` reported Prettier issues.
- Re-ran `pnpm verify`; it passed.
- Ran the local demo flow:
  - `CONTEXTOPS_HOME=.contextops-demo pnpm cli demo --reset`
  - `CONTEXTOPS_HOME=.contextops-demo pnpm cli summary`
  - `CONTEXTOPS_HOME=.contextops-demo pnpm cli waste`
- Demo summary reported 2 sessions, 2,744 estimated tokens, $0.0079 estimated cost, and 2 waste patterns.
- Polished README with badges, local developer-preview status, key technical decisions, release-gate explanation, and author section.
