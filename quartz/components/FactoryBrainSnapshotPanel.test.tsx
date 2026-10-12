import assert from "node:assert/strict"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { renderToString } from "preact-render-to-string"
import type { QuartzPluginData } from "../plugins/vfile"
import type { FullSlug, FilePath } from "../util/path"
import { FactoryBrainSnapshotPanel } from "./FactoryBrainSnapshotPanel"

function renderSnapshot(snapshot: unknown, scope = "private-full") {
  const directory = mkdtempSync(join(tmpdir(), "snapshot-panel-test-"))
  const original = process.env.FACTORY_BRAIN_PROJECT_SNAPSHOT
  try {
    const snapshotPath = join(directory, "snapshot.json")
    if (snapshot !== undefined) writeFileSync(snapshotPath, JSON.stringify(snapshot))
    process.env.FACTORY_BRAIN_PROJECT_SNAPSHOT = snapshotPath
    const allFiles: QuartzPluginData[] = [
      {
        filePath: "content/index.md" as FilePath,
        slug: "index" as FullSlug,
        frontmatter: { title: "Home", factory_brain_scope: scope },
      },
    ]
    return renderToString(
      <FactoryBrainSnapshotPanel allFiles={allFiles} currentSlug={"index" as FullSlug} />,
    )
  } finally {
    if (original === undefined) delete process.env.FACTORY_BRAIN_PROJECT_SNAPSHOT
    else process.env.FACTORY_BRAIN_PROJECT_SNAPSHOT = original
    rmSync(directory, { recursive: true, force: true })
  }
}

const emptySnapshot = {
  schemaVersion: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  source: {
    vault: "/private/synthetic-vault",
    projectDirectory: "10-projects",
    mode: "read-only-index-scan",
  },
  summary: {
    projectCount: 0,
    statusCounts: {},
    categoryCounts: {},
    projectsWithNextAction: 0,
    projectsWithRelatedLinks: 0,
    warningCount: 0,
  },
  projects: [],
  warnings: [],
}

test("public and undeclared scopes do not render a private snapshot panel", () => {
  assert.equal(renderSnapshot(emptySnapshot, "public-content"), "")
  assert.equal(renderSnapshot(emptySnapshot, "unknown"), "")
})

test("missing and invalid snapshots show no invented zero counts or project rows", () => {
  for (const [snapshot, state] of [
    [undefined, "unavailable"],
    [{ schemaVersion: 99 }, "invalid"],
  ] as const) {
    const html = renderSnapshot(snapshot)
    assert.ok(html.includes(`data-snapshot-state="${state}"`))
    assert.ok(html.includes("데이터 없음"))
    assert.ok(!html.includes("data-snapshot-count"))
    assert.ok(!html.includes("data-snapshot-project="))
  }
})

test("a valid empty snapshot displays actual zero counts and its collection time", () => {
  const html = renderSnapshot(emptySnapshot)
  assert.ok(html.includes('data-snapshot-state="empty"'))
  assert.ok(html.includes('data-snapshot-count="projects">0</dd>'))
  assert.ok(html.includes('datetime="2026-01-01T00:00:00.000Z"'))
  assert.ok(!html.includes("/private/synthetic-vault"))
  assert.ok(!html.includes("data-snapshot-project="))
})

test("snapshot text is escaped and unresolved notes do not become invented URLs", () => {
  const project = {
    id: "sample",
    title: "<script>synthetic</script>",
    path: "10-projects/sample/INDEX.md",
    status: "active",
    category: "experiment",
    nextAction: "<img src=x onerror=alert(1)>",
    relatedLinks: ["missing-note"],
  }
  const html = renderSnapshot({
    ...emptySnapshot,
    projects: [project],
    summary: {
      ...emptySnapshot.summary,
      projectCount: 1,
      statusCounts: { active: 1 },
      categoryCounts: { experiment: 1 },
      projectsWithNextAction: 1,
      projectsWithRelatedLinks: 1,
    },
  })
  assert.ok(html.includes('data-snapshot-state="ready"'))
  assert.match(html, /&lt;script(?:>|&gt;)synthetic&lt;\/script(?:>|&gt;)/)
  assert.ok(!html.includes("<img src=x"))
  assert.ok(html.includes("missing-note · 웹 문서 없음"))
  assert.ok(!html.includes("href="))
})
