# Agent OS–Factory Brain Loop Prompt

Copy this prompt into the loop-mode coding agent for the next slice.

````text
You are the implementation agent for Agent OS / Factory Brain.

Operate in continuous loop mode. Do not stop after writing a plan or after one worker reports success. Continue until the current slice is implemented, independently verified, recorded in Factory Brain, and there is a real stop condition.

## Product

Factory Brain is the source of truth: a local Obsidian vault containing project records, decisions, knowledge, and work logs.
Factory Loop Engine is the execution/evidence layer.
Factory Brain Web is the visual layer.
Do not create a new repository or a second database.

## Current state

The first vertical slice already exists and is verified:

- Collector: `/home/sy/.openclaw/workspace/scripts/factory-brain-project-snapshot.mjs`
- Loop registry: `/home/sy/.openclaw/workspace/state/factory-loop-engine/loops.json`
- Latest snapshot: `/home/sy/.openclaw/workspace/state/factory-loop-engine/snapshots/latest.json`
- Vault source: `/home/sy/Obsidian/Factory-Brain/10-projects/*/INDEX.md`
- Web repository: `/home/sy/.openclaw/workspace/factory-brain-web`
- Contract files in the web repository: `AGENT.md`, `LOOP.md`, `VERIFY.md`, `RUNBOOK.md`
- Existing private Project Galaxy and graph work must remain intact.

The collector currently produces real data from 29 project indexes, including status/category counts, related links, next actions, and metadata warnings. It is read-only against the vault.

## Mission for this run

Implement the next vertical slice: a read-only Factory Brain Web panel that displays the live project snapshot without hard-coded project data.

The panel must answer at a glance:

1. Which projects are active, experimental, paused, or missing metadata?
2. Which projects have a real next action?
3. Which project records need metadata cleanup?
4. Where can the operator open the related project/index?

## Required workflow

1. Inspect the existing web repository, current git status, `AGENT.md`, `LOOP.md`, `VERIFY.md`, `RUNBOOK.md`, and the existing Project Galaxy implementation before editing.
2. Inspect how the private runtime/build currently receives Factory Brain data. Do not make browser code read an absolute local filesystem path.
3. Decide the smallest truthful data path from the existing snapshot/vault model into the private web build. Reuse the existing Factory Brain/Quartz model when possible.
4. Write or update a focused implementation plan before broad edits.
5. Implement one cohesive slice only. Preserve public/private boundaries, existing graph behavior, search, backlinks, dark mode, and Project Galaxy.
6. Add tests for parsing/model behavior before relying on visual output.
7. Run the relevant build, typecheck, test, and formatting gates.
8. Run the private runtime or local preview and perform browser smoke verification. Confirm the panel shows real values and not placeholders.
9. Verify a narrow viewport and a missing/empty-data state.
10. Write a concise Factory Brain session log with purpose, changed files, decisions, verification evidence, blocker, and next action. Link it from the relevant project INDEX.
11. Update the runbook or verification contract if this run exposes a repeatable pitfall.
12. Continue to the next obvious small slice only if it is safe, scoped, and implied by this mission. Otherwise stop with a verified report.

## Non-negotiables

- Do not reset, clean, stash, or overwrite unrelated worktree changes.
- Do not delete the existing Project Galaxy implementation.
- Do not hard-code project counts, status counts, graph edges, or fake percentages.
- Do not expose private vault contents in the public `content/` tree.
- Do not infer missing status/category/next-action values; show `미지정` or `데이터 없음`.
- Do not add email, calendar, multi-user, vector DB, or external integrations in this slice.
- Do not create a new repo or duplicate the Factory Brain data model.
- Do not claim completion from a build alone; interactive UI needs browser evidence.
- Do not push or publish. Leave commit/push for an explicit user instruction.

## Verification gates

At minimum, run and record the real output of:

```bash
cd /home/sy/.openclaw/workspace
node --check scripts/factory-brain-project-snapshot.mjs
node scripts/factory-loop-engine.mjs run factory-brain-project-snapshot
node scripts/factory-loop-engine.mjs status --json

cd /home/sy/.openclaw/workspace/factory-brain-web
npx tsc --noEmit
npm run test
npx prettier --check <changed source/config/docs files>
git diff --check
````

Then run the intended private/local web runtime and verify:

- HTTP 200 and the intended Factory Brain page
- real project count/status/warning values
- real next-action rows
- no fake data when the snapshot is empty or unavailable
- Project Galaxy still opens, searches, zooms, drags, and navigates
- no fatal console errors
- no unintended body overflow on narrow viewport

## Reporting format

Finish with:

Status: Built / Verified / Blocked
Path: exact repository and artifact paths
Changed: concise file list
Verified: exact commands and browser interactions that passed
Data: real counts/source scope, with caveats
Known limitations: only actual remaining gaps
Next action: one concrete next slice

Never report a future action as completed.

```

```
