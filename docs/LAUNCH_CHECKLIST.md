# Launch Checklist

This checklist is for private preview and developer-preview launches.

## Required Before Launch

- [x] Confirm license and clean-room contribution rules are present.
- [x] Confirm README links to quickstart, examples, architecture, and roadmap.
- [ ] Re-run the quickstart from a fresh clone.
- [ ] Re-run `pnpm install --frozen-lockfile`.
- [ ] Re-run `pnpm verify`.
- [ ] Run CLI smoke commands against `examples/sample-logs` with `CONTEXTOPS_HOME=.contextops-demo`.
- [ ] Confirm no generated artifacts are staged.
- [ ] Confirm no secrets, private logs, or personal session files are staged.
- [ ] Confirm dashboard starts with `pnpm --filter @contextops/web dev`.
- [ ] Confirm release notes match `CHANGELOG.md`.
- [ ] Tag the release after the release PR is merged.

## Suggested Launch Flow

1. Merge launch preparation PR.
2. Create a fresh clone and run `pnpm install --frozen-lockfile`.
3. Run `pnpm verify`.
4. Run `CONTEXTOPS_HOME=.contextops-demo pnpm cli reset`, then scan the example fixture.
5. Start the web app with `pnpm --filter @contextops/web dev`.
6. Capture screenshots using demo data only when needed.
7. Publish a GitHub release from the merged release commit.
8. Share the launch post with a clear preview label.
9. Collect adapter fixture issues and replay feedback.

## Launch Risk Notes

- Parser support is intentionally defensive and broad, but real-world tool log formats may drift.
- Cost estimates depend on available model metadata and local pricing configuration.
- The product is local-first by default; any future sync or team feature must remain opt-in.
- Example fixtures are synthetic and should not be treated as performance benchmarks.
