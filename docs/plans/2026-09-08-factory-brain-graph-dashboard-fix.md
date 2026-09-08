# Factory Brain graph dashboard — Codex completion fix

Work in `/home/sy/.openclaw/workspace/factory-brain-web` and continue from the current dirty worktree. Do not reset, checkout, stash, clean, delete, or redesign the existing work. Do not ask questions.

The previous Codex pass created part of the requested Factory Brain graph/statistics dashboard but stopped while repeating a patch. Act as a focused completion/fix pass now.

Observed exact failures from independent verification:

- `quartz/components/FactoryBrainDashboard.tsx` imports `../util/factoryBrain`, but `quartz/util/factoryBrain.ts` does not exist on disk.
- `npx tsc --noEmit` currently fails in the new dashboard because of the missing module and implicit-any callbacks, and also reports the existing FullSlug/frontmatter typing errors in the current dirty work.
- `npm run test` currently reports 138 passing and 3 failing tests.

## Required work

1. Read the current diff and the actual Quartz types before editing.
2. Complete the dashboard data model in `quartz/util/factoryBrain.ts` (or, if the existing architecture proves a safer location, an equivalent source file) using real `allFiles`/public content data. It must provide the model expected by `FactoryBrainDashboard`: metrics, statusDistribution, categoryDistribution, topProjects, nodes, and unresolvedPortfolioLinks.
3. Keep the public-content boundary. Count only real public content pages and real resolved Portfolio links. Do not hardcode project/stat numbers and do not expose private vault data.
4. Fix all TypeScript errors introduced by this dashboard and the current dirty UI changes, including correct `FullSlug` handling and optional frontmatter handling. Do not silence errors with broad `any` casts unless a narrow Quartz boundary cast is genuinely required.
5. Fix the 3 failing tests or update/add focused tests for the pure data/statistics behavior. Preserve the earlier graph hover/index-name behavior and existing tests.
6. Ensure the dashboard button really opens the existing Global Graph, and ensure any `data-content-scope`/scroll CSS marker used by the new styles is actually emitted by the DOM. Remove dead selectors if the marker cannot be truthful.
7. Keep the new charts and table readable in dark mode and narrow viewports. Do not add fake controls or fake values.

## Verification required before commit

Run and record exact results for:

```bash
npx tsc --noEmit
npm run test
npx prettier --check <all changed source/config/test files only>
git diff --check
node /home/sy/.openclaw/factory-brain-private/quartz/bootstrap-cli.mjs build -d content --output /tmp/factory-brain-codex-build
```

Then run a real browser smoke against a fresh local build or the existing private runtime as appropriate. Verify the page loads, the dashboard marker exists, the KPI/stat table and charts contain actual values, Global Graph opens, hover still shows a real project/document name, and there are no console errors. Check desktop and narrow viewport overflow.

Do not modify generated `public/`, `node_modules/`, `.hermes/`, logs, or private runtime source. Do not push to GitHub.

After all gates pass, inspect `git diff --stat` and `git status`, stage only intended source/config/test/docs files, and make one local commit. Final response must start with `DONE` or `BLOCKED` and include actual command results, browser evidence, and the local commit hash if committed.
