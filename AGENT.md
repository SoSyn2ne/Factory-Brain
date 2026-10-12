# AGENT.md

## Product Goal

Factory Brain Web is the visual layer of Agent OS. It reads the private Obsidian Factory Brain vault and presents truthful project, graph, and operations state without replacing the vault or inventing status.

## Canonical Sources

- Private memory and project records: `/home/sy/Obsidian/Factory-Brain`
- Loop registry and evidence: `/home/sy/.openclaw/workspace/state/factory-loop-engine/`
- Local collector: `/home/sy/.openclaw/workspace/scripts/factory-brain-project-snapshot.mjs`
- This repository: Quartz/Preact web presentation and public-content boundary

## Non-negotiables

- Do not replace the product with a static showcase page.
- Do not hard-code project counts, status counts, or graph edges.
- Do not expose private vault content in the public `content/` tree.
- Do not mutate the Obsidian vault from the web UI unless an explicit, reviewed write flow exists.
- Missing metadata is `미지정`, not an inferred value.
- Do not report success without the relevant build, data, and interaction evidence.
- Preserve existing Project Galaxy, graph, search, backlinks, dark mode, and public-boundary behavior.

## Current Vertical Slice

`factory-brain-project-snapshot` reads `10-projects/*/INDEX.md` and writes a normalized local JSON snapshot for downstream dashboards. The vault is read-only input; the snapshot is evidence, not a second source of truth.

## Stack

Quartz 5, TypeScript/Preact, dependency-light SVG/browser runtime, SCSS, Node test runner.

## Acceptance Criteria

- The live vault produces a valid snapshot with project records and summary counts.
- Missing status/category metadata is visible as `미지정` and recorded as a warning.
- The loop runner records a `pass` result and JSONL evidence.
- Existing public/private graph boundaries remain intact.
- No secrets or raw private note bodies enter tracked source files.

## Design system contract

Read `DESIGN.md` before changing UI. The Factory Brain visual source of truth is `quartz/styles/custom.scss`; use its `--fb-*` tokens instead of one-off component colors. Keep the editorial workbench direction: warm paper, ink, thin rules, one rust accent, restrained radius/shadow, and no gradients, glow, glass, star fields, or decorative AI control-room patterns. Keep one question per visualization: Galaxy discovers relationships, Portfolio View chooses the next project. Treat a visual change as incomplete until the private live page is checked at desktop and narrow widths with the affected interactions exercised.
