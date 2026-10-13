import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test, { describe } from "node:test"
import type { QuartzPluginData } from "../plugins/vfile"
import type { FilePath, FullSlug } from "./path"
import {
  decodeFactoryBrainSnapshot,
  loadPrivateProjectSnapshot,
  resolveSnapshotLink,
} from "./factoryBrainSnapshot"

function fixture() {
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-06T00:00:00.000Z",
    source: {
      vault: "/private/synthetic-vault",
      projectDirectory: "10-projects",
      mode: "read-only-index-scan",
    },
    summary: {
      projectCount: 2,
      statusCounts: { active: 1, 미지정: 1 },
      categoryCounts: { tools: 1, 미지정: 1 },
      projectsWithNextAction: 1,
      projectsWithRelatedLinks: 1,
      warningCount: 3,
    },
    projects: [
      {
        id: "sample-one",
        title: "Synthetic project",
        status: "active" as string | null,
        category: "tools" as string | null,
        workspaceProject: "/private/workspace",
        sourceRegistry: "/private/registry.json",
        path: "10-projects/sample-one/INDEX.md",
        lastDecision: "Keep the local snapshot as the source of truth" as string | null,
        runCommand: "npm run verify:project-snapshot" as string | null,
        unresolved: "Need a user-facing re-entry flow" as string | null,
        nextAction: "Verify the synthetic build" as string | null,
        relatedLinks: ["Synthetic reference"],
      },
      {
        id: "sample-two",
        title: "Synthetic missing metadata",
        status: "미지정" as string | null,
        category: "미지정" as string | null,
        workspaceProject: null,
        sourceRegistry: null,
        path: "10-projects/sample-two/index.md",
        nextAction: null as string | null,
        relatedLinks: [] as string[],
      },
    ],
    warnings: [
      { projectId: "sample-two", type: "missing-status", message: "status is 미지정" },
      { projectId: "sample-two", type: "missing-category", message: "category is 미지정" },
      { projectId: "sample-without-index", type: "missing-index", message: "Index is absent" },
    ],
  }
}

function source(relativePath: string, slug: string): QuartzPluginData {
  return {
    filePath: `/synthetic-vault/${relativePath}` as FilePath,
    relativePath: relativePath as FilePath,
    slug: slug as FullSlug,
  }
}

function scope(value: string): QuartzPluginData[] {
  return [
    {
      ...source("index.md", "index"),
      frontmatter: { title: "Synthetic root", factory_brain_scope: value },
    },
  ]
}

describe("decodeFactoryBrainSnapshot", () => {
  test("keeps canonical records and totals while dropping absolute source details", () => {
    const input = fixture()
    const result = decodeFactoryBrainSnapshot(input)
    assert.ok(result)
    assert.deepEqual(result.summary, input.summary)
    assert.deepEqual(result.source, {
      projectDirectory: "10-projects",
      mode: "read-only-index-scan",
    })
    assert.equal(result.projects[0].lastDecision, "Keep the local snapshot as the source of truth")
    assert.equal(result.projects[0].runCommand, "npm run verify:project-snapshot")
    assert.equal(result.projects[0].unresolved, "Need a user-facing re-entry flow")
    assert.equal(result.projects[0].nextAction, "Verify the synthetic build")
    assert.equal(result.warnings[2].projectId, "sample-without-index")
    assert.equal(JSON.stringify(result).includes("/private/"), false)
  })

  test("normalizes empty metadata only when declared totals agree and invents no actions", () => {
    const input = fixture()
    input.projects[1].status = null
    input.projects[1].category = "  "
    input.projects[1].nextAction = "  "
    Object.assign(input.projects[1], { tags: ["active", "next-action"] })
    const result = decodeFactoryBrainSnapshot(input)
    assert.ok(result)
    assert.equal(result.projects[1].status, "미지정")
    assert.equal(result.projects[1].category, "미지정")
    assert.equal(result.projects[1].nextAction, null)
    input.summary.statusCounts = { active: 2, 미지정: 0 }
    assert.equal(decodeFactoryBrainSnapshot(input), null)
  })

  test("accepts a truthful empty scan without synthetic projects or warnings", () => {
    const input = fixture()
    input.projects = []
    input.warnings = []
    Object.assign(input.summary, {
      projectCount: 0,
      statusCounts: {},
      categoryCounts: {},
      projectsWithNextAction: 0,
      projectsWithRelatedLinks: 0,
      warningCount: 0,
    })
    const result = decodeFactoryBrainSnapshot(input)
    assert.ok(result)
    assert.deepEqual(result.projects, [])
    assert.deepEqual(result.warnings, [])
  })

  test("rejects malformed schema, dates, fields, warnings, and duplicate ids", () => {
    const invalid: unknown[] = [null, [], {}, { ...fixture(), schemaVersion: 2 }]
    for (const generatedAt of ["yesterday", "2026-02-30T00:00:00.000Z", "", 123]) {
      invalid.push({ ...fixture(), generatedAt })
    }
    for (const field of [
      "id",
      "title",
      "path",
      "relatedLinks",
      "status",
      "category",
      "nextAction",
    ]) {
      const input = fixture()
      Object.assign(input.projects[0], { [field]: 123 })
      invalid.push(input)
    }
    const duplicate = fixture()
    duplicate.projects[1].id = duplicate.projects[0].id
    invalid.push(duplicate)
    const badWarning = fixture()
    badWarning.warnings[0].projectId = "not-a-record"
    invalid.push(badWarning)
    const contradictoryWarning = fixture()
    contradictoryWarning.warnings[0].projectId = "sample-one"
    invalid.push(contradictoryWarning)
    for (const input of invalid) assert.equal(decodeFactoryBrainSnapshot(input), null)
  })

  test("rejects unsafe and mismatched project paths", () => {
    for (const unsafe of [
      "/private/INDEX.md",
      "../sample-one/INDEX.md",
      "10-projects/sample-one/../../INDEX.md",
      "10-projects/sample-one/%2e%2e/INDEX.md",
      "10-projects\\sample-one\\INDEX.md",
      "10-projects/other-project/INDEX.md",
      "10-projects/sample-one/notes.md",
      "https://example.com/INDEX.md",
    ]) {
      const input = fixture()
      input.projects[0].path = unsafe
      assert.equal(decodeFactoryBrainSnapshot(input), null, unsafe)
    }
  })

  test("validates every summary count against records and warnings", () => {
    for (const field of [
      "projectCount",
      "projectsWithNextAction",
      "projectsWithRelatedLinks",
      "warningCount",
    ]) {
      const input = fixture()
      Object.assign(input.summary, { [field]: 99 })
      assert.equal(decodeFactoryBrainSnapshot(input), null, field)
    }
    for (const field of ["statusCounts", "categoryCounts"]) {
      const input = fixture()
      Object.assign(input.summary, { [field]: { invented: 2 } })
      assert.equal(decodeFactoryBrainSnapshot(input), null, field)
    }
  })
})

describe("loadPrivateProjectSnapshot", () => {
  test("does not read a snapshot unless the parsed root explicitly declares private scope", (t) => {
    const read = t.mock.method(fs, "readFileSync", () => {
      throw new Error("Public scope must never read the snapshot")
    })
    assert.equal(loadPrivateProjectSnapshot(scope("public-content"), "/unused"), null)
    assert.equal(loadPrivateProjectSnapshot(scope("unknown"), "/unused"), null)
    assert.equal(loadPrivateProjectSnapshot([], "/unused"), null)
    assert.equal(read.mock.callCount(), 0)
  })

  test("distinguishes unavailable, malformed, and ready private snapshots", (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "factory-snapshot-test-"))
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
    const filename = path.join(directory, "synthetic.json")
    const files = scope("private-full")
    assert.deepEqual(loadPrivateProjectSnapshot(files, ""), { state: "unavailable" })
    assert.deepEqual(loadPrivateProjectSnapshot(files, filename), { state: "unavailable" })
    fs.writeFileSync(filename, "not json")
    assert.deepEqual(loadPrivateProjectSnapshot(files, filename), { state: "invalid" })
    fs.writeFileSync(filename, JSON.stringify({ ...fixture(), schemaVersion: 4 }))
    assert.deepEqual(loadPrivateProjectSnapshot(files, filename), { state: "invalid" })
    fs.writeFileSync(filename, JSON.stringify(fixture()))
    const result = loadPrivateProjectSnapshot(files, filename)
    assert.equal(result?.state, "ready")
    if (result?.state === "ready") assert.equal(result.snapshot.projects.length, 2)
  })
})

describe("resolveSnapshotLink", () => {
  const files = [
    source("10-projects/Synthetic Project/INDEX.md", "10-projects/synthetic-project/index"),
    source("30-knowledge/한글 메모.md", "30-knowledge/한글-메모"),
    source("notes/Synthetic reference.md", "notes/synthetic-reference"),
    source("first/Collision.md", "first/collision"),
    source("second/Collision.md", "second/collision"),
    source("START-HERE.md", "start-here"),
  ]

  test("uses the parsed source slug for mixed-case INDEX and Unicode note paths", () => {
    assert.equal(
      resolveSnapshotLink("10-projects/SYNTHETIC PROJECT/index.md", files, "index" as FullSlug),
      "./10-projects/synthetic-project/",
    )
    assert.equal(
      resolveSnapshotLink("30-knowledge/한글 메모", files, "nested/dashboard" as FullSlug),
      "../30-knowledge/한글-메모",
    )
    assert.equal(
      resolveSnapshotLink("한글 메모".normalize("NFD"), files, "index" as FullSlug),
      "./30-knowledge/한글-메모",
    )
  })

  test("resolves unique short wiki targets and refuses absent or ambiguous ones", () => {
    assert.equal(
      resolveSnapshotLink("Synthetic reference", files, "index" as FullSlug),
      "./notes/synthetic-reference",
    )
    assert.equal(resolveSnapshotLink("Collision", files, "index" as FullSlug), null)
    assert.equal(resolveSnapshotLink("absent", files, "index" as FullSlug), null)
    assert.equal(
      resolveSnapshotLink("first/Collision", files, "index" as FullSlug),
      "./first/collision",
    )
  })

  test("resolves explicit relative links from the source index without escaping the vault", () => {
    const relativeFiles = [
      ...files,
      source("10-projects/neighbor/INDEX.md", "10-projects/neighbor/index"),
    ]
    const index = "10-projects/sample-one/INDEX.md"
    assert.equal(
      resolveSnapshotLink("../neighbor/INDEX", relativeFiles, "index" as FullSlug, index),
      "./10-projects/neighbor/",
    )
    assert.equal(
      resolveSnapshotLink("../../START-HERE", relativeFiles, "index" as FullSlug, index),
      "./start-here",
    )
    assert.equal(
      resolveSnapshotLink("../../../START-HERE", relativeFiles, "index" as FullSlug, index),
      null,
    )
    assert.equal(resolveSnapshotLink("../neighbor/INDEX", relativeFiles, "index" as FullSlug), null)
    assert.equal(
      resolveSnapshotLink(
        "../../START-HERE",
        relativeFiles,
        "index" as FullSlug,
        "../outside/INDEX.md",
      ),
      null,
    )
  })

  test("does not suffix-match qualified or resolved paths when the target is absent", () => {
    const nested = [
      source("archive/10-projects/absent/INDEX.md", "archive/10-projects/absent/index"),
      source("nested/ROOT.md", "nested/root"),
    ]
    assert.equal(resolveSnapshotLink("10-projects/absent/INDEX", nested, "index" as FullSlug), null)
    assert.equal(
      resolveSnapshotLink(
        "../../ROOT",
        nested,
        "index" as FullSlug,
        "10-projects/sample-one/INDEX.md",
      ),
      null,
    )
  })

  test("ignores generated pages and refuses source/slug collisions and unsafe targets", () => {
    assert.equal(
      resolveSnapshotLink("generated", [{ slug: "generated" as FullSlug }], "index" as FullSlug),
      null,
    )
    const collisions = [...files, source("alias.md", "notes/synthetic-reference")]
    assert.equal(resolveSnapshotLink("Synthetic reference", collisions, "index" as FullSlug), null)
    for (const target of [
      "",
      "/private/path",
      "../notes/Synthetic reference",
      "https://example.com",
      "javascript:alert(1)",
      "notes\\Synthetic reference",
      "notes/%2e%2e/private",
      "notes/Synthetic reference?token=secret",
      "notes/Synthetic reference\u0000",
    ]) {
      assert.equal(resolveSnapshotLink(target, files, "index" as FullSlug), null, target)
    }
  })
})
