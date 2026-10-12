# Private project snapshot panel

## Scope and data contract

Add one read-only panel to the existing private Factory Brain dashboard. The collector's schema v1 snapshot remains the project-state evidence; the vault remains authoritative. Keep Project Galaxy and the existing Quartz graph model intact.

- Read `FACTORY_BRAIN_PROJECT_SNAPSHOT` only on the build server, only after the root note declares `factory_brain_scope: private-full`. No default absolute path and no browser filesystem access.
- Validate the snapshot contract and summary totals before rendering. Do not infer status, category, or next actions from graph tags or fallback notes.
- Resolve project/index and related note links against Quartz's existing parsed source files. Show unavailable targets as text rather than inventing routes.
- Render collection time, source scope, status/category counts, real next actions, and metadata warnings. Explicitly distinguish empty, missing, invalid, and available data. Static output reflects collection/build time and requires a fresh collection and rebuild to refresh.
- Never copy snapshot or vault data into public `content/`, tracked fixtures, or a new database. A public build ignores the environment variable entirely.

## Implementation sequence

1. Inspect contracts, git status, existing dashboard/graph, private runtime, and collector (completed before edits).
2. Add synthetic contract/model tests, then a minimal snapshot decoder and private build loader.
3. Add an accessible responsive panel using existing dashboard styles and Quartz links; preserve existing interactions.
4. Run collector/loop gates, TypeScript, tests, scoped formatting, diff check, public-boundary check, and public/private builds.
5. Use an isolated loopback preview for browser evidence: data parity, navigation, search, graph/Galaxy interactions, dark mode, narrow viewport, missing/empty snapshot. Do not deploy or restart the existing service.
6. Independently review changes and verification, record evidence in Factory Brain, link the session log from the owning INDEX, and document repeatable pitfalls.

## Stop condition

The slice passes code and browser verification, is independently reviewed and logged, and leaves existing unrelated work intact. Do not commit, push, publish, or expand into metadata editing, background refresh, or integrations.

## Verified result

Completed implementation, independent review, and Factory Brain logging. The full suite passes 189 tests; TypeScript, changed-file formatting, whitespace, public boundary, public/private builds, and four browser data states pass. The ready browser run records 14 interaction/data checks, including Project Galaxy and 375px containment, with no console/page/request errors.

Evidence is local and ignored at `private/snapshot-panel-verification/`. The session log is `40-session-logs/2026-10-06-factory-brain-project-snapshot-panel.md` in the vault, linked from `10-projects/main/INDEX.md`.

Existing limitations remain explicit: seven unrelated files fail repository-wide Prettier; the optional Excalidraw plugin emits a pre-existing warning; the configured private service was already inactive. The verified preview is on loopback port 8096. No commit, push, deployment, metadata mutation, or additional feature slice was performed.
