# Product Spec

ContextOps helps developers understand the operational shape of AI coding workflows. The primary question is not "how many tokens were used?" but "why did this workflow become costly, slow, or repetitive?"

## Users

- Solo developers using local AI coding tools.
- Teams trying to understand AI tool ROI.
- Engineering leads reviewing workflow friction without exposing code to a vendor.

## Core Jobs

- Detect supported AI coding tools.
- Parse local session artifacts safely.
- Build replay timelines from prompts, responses, tool calls, file reads, retries, and model changes.
- Estimate usage and cost with confidence scores.
- Detect waste patterns and explain root causes.
- Preserve privacy by keeping data local.

## MVP

The MVP prioritizes adapters, parser safety, storage, analyzer logic, replay architecture, CLI workflows, TUI visibility, and then a local dashboard.
