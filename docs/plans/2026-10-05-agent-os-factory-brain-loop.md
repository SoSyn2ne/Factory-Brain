# Agent OS–Factory Brain Loop Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Connect the existing Factory Brain Obsidian vault to the local Factory Loop Engine with a truthful, repeatable project-state snapshot loop.

**Architecture:** Factory Brain remains the source of truth for project metadata. The Factory Loop Engine runs a safe local collector that reads only `10-projects/*/INDEX.md`, normalizes frontmatter and links, writes a machine-readable snapshot, and records execution evidence. Factory Brain Web will consume this snapshot in a later UI slice; this first slice does not invent a second database or mutate the vault.

**Tech Stack:** Node.js ESM, Markdown frontmatter, JSON snapshot, existing `factory-loop-engine.mjs` runner.

---

### Task 1: Define the Agent OS–Factory Brain contract

**Objective:** Document the first vertical slice and its non-negotiable verification rules.

**Files:**

- Create: `docs/plans/2026-10-05-agent-os-factory-brain-loop.md`
- Modify: `/home/sy/.openclaw/workspace/docs/FACTORY_LOOP_ENGINE.md`

**Acceptance:** Factory Brain is read-only input; missing metadata is reported as `미지정`; no private note body is copied into the snapshot; every run leaves JSON evidence.

### Task 2: Collect project records from the Obsidian vault

**Objective:** Create a deterministic local collector for `10-projects/*/INDEX.md`.

**Files:**

- Create: `/home/sy/.openclaw/workspace/scripts/factory-brain-project-snapshot.mjs`

**Acceptance:** The collector emits schema version, source path, generation time, project records, status/category counts, related wikilinks, and missing-metadata warnings. It exits non-zero when the vault or project directory is unavailable.

### Task 3: Register the repeatable loop

**Objective:** Make the collector executable through the existing Factory Loop Engine.

**Files:**

- Modify: `/home/sy/.openclaw/workspace/state/factory-loop-engine/loops.json`

**Acceptance:** `factory-brain-project-snapshot` appears in `list/status`, is safe to run locally, writes `state/factory-loop-engine/snapshots/latest.json`, and records evidence in the normal JSONL run log.

### Task 4: Verify the vertical slice

**Objective:** Run the collector directly and through the loop runner, then validate the resulting JSON and existing loop behavior.

**Commands:**

- `node scripts/factory-brain-project-snapshot.mjs --json`
- `node scripts/factory-loop-engine.mjs run factory-brain-project-snapshot --json`
- `node scripts/factory-loop-engine.mjs status --json`
- JSON parse and invariant checks for project count, records, and summary counts

**Stop condition:** The snapshot is generated from the live vault, the loop returns `pass`, and no existing loop definition is removed or rewritten.

### Task 5: Next slice (not included here)

Add a Factory Brain Web read-only panel that consumes the snapshot and shows project status, missing metadata, and next actions. Do not start this until the collector contract and evidence format are stable.
