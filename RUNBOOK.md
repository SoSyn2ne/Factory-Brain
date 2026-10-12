# RUNBOOK.md

## Important Paths

- Web source: `/home/sy/.openclaw/workspace/factory-brain-web`
- Private vault: `/home/sy/Obsidian/Factory-Brain`
- Loop registry: `/home/sy/.openclaw/workspace/state/factory-loop-engine/loops.json`
- Loop evidence: `/home/sy/.openclaw/workspace/state/factory-loop-engine/runs/`
- Latest project snapshot: `/home/sy/.openclaw/workspace/state/factory-loop-engine/snapshots/latest.json`

## Project Snapshot

From the workspace root:

```bash
node scripts/factory-brain-project-snapshot.mjs
node scripts/factory-loop-engine.mjs run factory-brain-project-snapshot
node scripts/factory-loop-engine.mjs status --json
```

Optional overrides:

```bash
FACTORY_BRAIN_VAULT=/path/to/vault node scripts/factory-brain-project-snapshot.mjs --json
node scripts/factory-brain-project-snapshot.mjs --vault /path/to/vault --output /path/to/snapshot.json
```

## Web Checks

From this repository:

```bash
npm run check
npm run test
npx quartz build
```

## Safety

- The collector is read-only against the Obsidian vault.
- Do not run `git clean`, reset, or broad stash operations; preserve unrelated workspace changes.
- Do not publish private vault data.
- Push only when the user explicitly requests it and the intended repository/branch is verified.

## Private Project Snapshot Panel

The panel reads collector schema v1 through `FACTORY_BRAIN_PROJECT_SNAPSHOT` on the build server. The root note must explicitly declare `factory_brain_scope: private-full`; public builds ignore the snapshot even when the environment variable is set. Keep this variable out of public build configuration. The private runtime already links the vault subtrees and shares this repository's Quartz sources.

This is a collection/build-time view, not a polling service. Refresh the collector through the loop engine, then rebuild the private preview. Updating `latest.json` alone does not refresh rendered HTML. Missing/unreadable snapshots show `데이터 없음`; malformed or inconsistent snapshots show an invalid-data message. A valid empty scan shows zero projects. No graph or placeholder data fills these states.

From the workspace root, first run the Project Snapshot commands above. Then build into a local ignored directory, leaving the existing service and its output alone:

```bash
cd /home/sy/.openclaw/workspace/factory-brain-web
mkdir -p private/snapshot-panel-verification
cd /home/sy/.openclaw/factory-brain-private
FACTORY_BRAIN_PROJECT_SNAPSHOT=/home/sy/.openclaw/workspace/state/factory-loop-engine/snapshots/latest.json \
  node quartz/bootstrap-cli.mjs build -d content \
  --output /home/sy/.openclaw/workspace/factory-brain-web/private/snapshot-panel-verification/ready-build
```

Serve with an explicit loopback binding from the web repository (use a separate terminal):

```bash
node --input-type=module -e 'import http from "node:http"; import handler from "serve-handler"; http.createServer((req, res) => handler(req, res, {public: process.argv[1], cleanUrls: true, directoryListing: false})).listen(8096, "127.0.0.1")' \
  private/snapshot-panel-verification/ready-build
```

Quartz `--serve` binds all interfaces and defaults to websocket port 3001. A separate loopback static preview avoids exposing private verification output or colliding with the service configured on 8090. Do not restart or change the service to run these checks. If running, its source watcher may notice edits to shared Quartz files. During this run, `systemctl --user show factory-brain-private.service` confirmed the service had been inactive since 2026-09-28 16:10:21 KST; verification used the isolated preview.

Run browser verification from the web repository:

```bash
node scripts/verify-project-snapshot.mjs \
  http://127.0.0.1:8096 \
  /home/sy/.openclaw/workspace/state/factory-loop-engine/snapshots/latest.json \
  private/snapshot-panel-verification/browser-ready ready
```

The smoke script uses the workspace's existing `puppeteer-core` and `/snap/bin/chromium`. Set `CHROMIUM_PATH` for another installed browser. Screenshots and JSON evidence contain private project data: keep the output in ignored `private/` or another local directory, never `content/` or published output.

Quartz project INDEX routes are folder pages whose existing configuration omits the right sidebar. Verify backlinks and the document graph on a real linked content note such as `START-HERE`. For narrow checks, load the page at the narrow viewport and close any open mobile explorer with its toggle before interacting with the panel; an overlay can intercept clicks after a desktop resize.

For missing/empty/invalid-state verification, build separate outputs using a nonexistent path, a schema-v1 empty snapshot with zero summaries, or invalid JSON. Never replace the canonical `latest.json` to simulate an error. Pass `unavailable`, `empty`, or `invalid` as the smoke script's final argument. The script checks empty/error states at desktop and narrow widths without accepting invented rows or counts.

Repository-wide `npm run check` also formats pre-existing public Markdown and scripts. If unrelated files already fail Prettier, record those filenames and run a scoped Prettier check on all files changed by this slice; do not reformat private/public content just to hide a baseline failure.
