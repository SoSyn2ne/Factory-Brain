# Project Galaxy Graph Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Keep the private Factory Brain runtime alive and add a project-level “Project Galaxy” view that shows every `10-projects/*` project and its real cross-project links at a glance, while preserving the existing document graph.

**Architecture:** Extend the shared Quartz graph model to support a private-full scope and a project-only projection derived from the private vault’s parsed files. Render an embedded model on the private home page, let the existing graph runtime consume it, and add a focused full-screen cinematic shell with real search/filter/fit/zoom/drag/node navigation. Keep the public build gated to `public-content` and never make private notes part of the public model.

**Tech Stack:** Quartz 5, TypeScript/Preact server components, dependency-free SVG/browser runtime, SCSS, Node test runner.

---

### Task 1: Add private-full model scope

**Files:**

- Modify: `quartz/util/factoryBrain.ts`
- Modify: private runtime `content/index.md` (scope marker only)
- Test: `quartz/util/factoryBrain.test.ts` or the closest existing model test file

Create a scope-aware model builder. Public mode keeps the current explicit `public-content` boundary. Private mode accepts source notes from the private vault, detects projects from `10-projects/<name>/index`, and derives cross-project edges from real parsed links. Preserve actual titles/status/tags and use `미지정` for missing metadata.

### Task 2: Render the Project Galaxy entrypoint

**Files:**

- Modify: `quartz/components/FactoryBrainDashboard.tsx`
- Modify: `quartz/components/frames/DefaultFrame.tsx`
- Modify: `quartz/components/scripts/workspace.inline.ts`

On the private home page, render a truthful `data-ui-pass="project-galaxy"` entrypoint with embedded JSON model, project count, last-build/source scope, and buttons to open the full-screen Project Galaxy or the real Obsidian-backed `추가하기` flow. Keep the existing public dashboard and its public graph behavior unchanged.

### Task 3: Make the global graph cinematic and project-first

**Files:**

- Modify: `plugins/graph/src/components/index.js`
- Modify: `plugins/graph/src/components/browser.js`
- Modify: `quartz/styles/custom.scss` or the graph CSS source
- Modify: `plugins/graph/src/components/graph-data.test.js` when helper behavior changes

Add a Project Galaxy mode that the existing runtime actually executes: project node shapes/colors, sparse label hierarchy, fit-to-view, search, project/status filters, hover neighbor emphasis, detail/tooltip data, keyboard and pointer controls, and click-through to the real project page. Use an SVG/CSS starfield or restrained motion only as presentation; keep reduced-motion support and avoid a generic SaaS chart.

### Task 4: Preserve continuous recording and runtime operation

**Files:**

- Modify: `README.md` or a focused runbook under `docs/`
- Modify: `/home/sy/Obsidian/Factory-Brain/30-runbooks/hermes-factory-brain-logging.md` only if the rule needs clarification
- Create: `/home/sy/Obsidian/Factory-Brain/40-session-logs/2026-09-28-factory-brain-project-galaxy.md`
- Modify: relevant project `INDEX.md` and the current daily diary with concise links

Document that project changes continue to be recorded in the vault and that the private viewer reads the vault source rather than a stale copied snapshot. The completed log records the Obsidian-backed `추가하기` flow and verification. Do not write secrets or full private note contents into the code repository.

### Task 5: Verify end to end

Run from `/home/sy/.openclaw/workspace/factory-brain-web`:

```bash
npx tsc --noEmit
npm run test
npx prettier --check <changed source/config files>
git diff --check
node /home/sy/.openclaw/factory-brain-private/quartz/bootstrap-cli.mjs build -d content --output /tmp/factory-brain-project-galaxy-build
```

Then verify the still-running private service at `https://sy-h310mhg.taild09079.ts.net/` and `/factory-brain/`: HTTP 200, `Project Galaxy` marker, all project nodes, search/filter, fit/reset, node click, Escape close, no console errors, no body scroll, and narrow viewport containment. Do not stop the existing service; restart only if required to load the rebuilt output, and leave the replacement serving on port 8090.

Commit only intended source/docs changes locally after verification. Do not push GitHub.
