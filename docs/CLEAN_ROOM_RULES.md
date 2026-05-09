# Clean-Room Rules

ContextOps is an original implementation in the AI coding observability category.

Do not copy code, prose, UI layouts, architecture diagrams, data models, naming schemes, or branding from other projects or products. Inspiration may come from the broad problem space, but implementation decisions must be made from first principles and from this repository's own product goals.

When adding adapters, use locally observed formats, user-provided samples, or original fixtures. Keep parser behavior defensive and document assumptions.

Review checklist:

- Is this implementation original?
- Are docs written in our own words?
- Does the UI avoid cloning another product's layout?
- Are parser fixtures synthetic or explicitly user-provided?
- Is telemetry still off by default?
