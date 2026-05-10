# Contributing

Thanks for helping make ContextOps sharper.

ContextOps is a clean-room project. Contributions must be original work and must follow `docs/CLEAN_ROOM_RULES.md`.

## Development

```bash
pnpm install
pnpm verify
```

Useful commands:

```bash
pnpm --filter @contextops/cli dev -- tools
pnpm --filter @contextops/cli dev -- scan
pnpm --filter @contextops/web dev
```

## Contribution Guidelines

- Keep changes local-first and privacy-preserving by default.
- Do not add telemetry, cloud sync, proxy behavior, or API-key requirements without explicit design review.
- Prefer defensive parsing with warnings over hard failures.
- Add fixtures or tests for adapter changes when possible.
- Keep workflow intelligence and replay behavior ahead of decorative UI work.
- Do not copy code, wording, UI layouts, architecture diagrams, names, or branding from other AI observability or coding tools.

## Pull Request Checklist

- [ ] `pnpm verify` passes.
- [ ] New parser behavior includes representative tests or fixtures.
- [ ] Local data and generated artifacts are not committed.
- [ ] Documentation is updated when commands, config, or behavior changes.
- [ ] Clean-room constraints are respected.
