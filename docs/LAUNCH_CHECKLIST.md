# Launch Checklist

This checklist is for the v0.1.0 developer preview launch.

## Required Before Public Launch

- [ ] Confirm repository visibility and package name strategy.
- [ ] Choose and add a license before making the repository broadly public.
- [ ] Capture dashboard and TUI screenshots with safe demo data.
- [ ] Re-run `pnpm install --frozen-lockfile`.
- [ ] Re-run `pnpm verify`.
- [ ] Run CLI smoke commands against a small local fixture directory.
- [ ] Confirm no generated artifacts are staged.
- [ ] Confirm no secrets, private logs, or personal session files are staged.
- [ ] Confirm README quick start works from a fresh clone.
- [ ] Tag the release after the launch PR is merged.

## Suggested Launch Flow

1. Merge launch preparation PR.
2. Create a fresh clone and run `pnpm install --frozen-lockfile`.
3. Run `pnpm verify`.
4. Start the web app with `pnpm --filter @contextops/web dev`.
5. Capture screenshots using demo data only.
6. Publish a v0.1.0 GitHub release.
7. Share the launch post with a clear developer-preview label.
8. Collect adapter fixture issues and replay feedback.

## Launch Risk Notes

- Parser support is intentionally defensive and broad, but real-world tool log formats may drift.
- Cost estimates depend on available model metadata and local pricing configuration.
- The product is local-first by default; any future sync or team feature must remain opt-in.
- License selection is a launch decision, not an implementation detail.
