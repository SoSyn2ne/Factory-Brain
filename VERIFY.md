# VERIFY.md

## Factory Brain Project Snapshot

Run from `/home/sy/.openclaw/workspace`:

```bash
node --check scripts/factory-brain-project-snapshot.mjs
node scripts/factory-brain-project-snapshot.mjs
node scripts/factory-loop-engine.mjs run factory-brain-project-snapshot
node scripts/factory-loop-engine.mjs status --json
```

The snapshot must satisfy:

- `schemaVersion` is `1`.
- `projects.length === summary.projectCount`.
- Every project has `id`, `title`, and `path`.
- Status and category totals equal `summary.projectCount`.
- Missing frontmatter is represented as `미지정` with a warning.
- Generic placeholder text is not reported as a real next action.
- The loop result is `pass` and includes `collect-project-indexes: pass`.
- The collector only reads the vault and writes the local snapshot/evidence paths.

## Web Regression Gates

When the web surface changes, also run:

```bash
npm run check
npm run test
npx quartz build
```

Then verify the intended private/public runtime, graph interactions, project navigation, and narrow viewport containment. Build success alone is not sufficient for interactive graph work.

## Hard Failures

- Public content includes private vault paths or raw private notes.
- Counts are hard-coded or disagree between model, chart, and table.
- A worker claims success without command/browser evidence.
- The web UI silently writes or rewrites the vault.

## Private Snapshot Panel

- Run the collector syntax check, loop run, and loop JSON status; retain real command output/evidence.
- Run `npx tsc --noEmit`, `npm run test`, `npm run check`, scoped `npx prettier --check` for changed files, `node scripts/check-public-boundary.mjs`, and `git diff --check`.
- Build public content with the private snapshot variable deliberately set; no snapshot panel, project rows, actions, or vault path may appear in public HTML/JSON/client JS.
- Build the intended private content with `FACTORY_BRAIN_PROJECT_SNAPSHOT` set to the actual collector artifact. Serve the isolated output on loopback as described in `RUNBOOK.md`.
- Run `scripts/verify-project-snapshot.mjs` against this preview. Compare every project status/category, action, warning group, collection timestamp, and all summary counts against the snapshot. Open a real INDEX, check backlinks, return through SPA navigation, and exercise Galaxy search/zoom/fit/drag/navigation/Escape, document graph, search, and dark mode.
- Verify a 375px viewport with project rows expanded and Galaxy open: no horizontal body overflow, fatal page/console errors, or escaping overlay.
- Build and browse separate valid-empty, missing-file, and invalid-data outputs. Missing/invalid states must not display made-up zero totals or rows; valid empty scans may show actual zeros.
- Preserve screenshots and machine-readable browser evidence only in ignored private/local paths; link the concise session log from the owning vault project INDEX.

An existing repository-wide formatting failure is a recorded baseline gap, not permission to rewrite unrelated files. Changed-source formatting, typecheck, tests, public/private builds, and browser evidence must still pass.
