import test, { describe } from "node:test"
import assert from "node:assert"
import { collectComponents, normalizeGenericIndexTitles, resolveLayout } from "./dispatcher"
import { QuartzPageTypePluginInstance } from "../types"
import { QuartzComponent } from "../../components/types"
import { defaultProcessedContent } from "../vfile"
import { isFullSlug } from "../../util/path"

function fullSlug(value: string) {
  assert.ok(isFullSlug(value))
  return value
}

const StubA: QuartzComponent = (() => null) as unknown as QuartzComponent
const StubB: QuartzComponent = (() => null) as unknown as QuartzComponent
const StubHead: QuartzComponent = (() => null) as unknown as QuartzComponent

function makePageType(
  overrides: Partial<QuartzPageTypePluginInstance> = {},
): QuartzPageTypePluginInstance {
  return {
    name: "test-page-type",
    layout: "content",
    match: () => true,
    body: () => (() => null) as unknown as QuartzComponent,
    ...overrides,
  } as QuartzPageTypePluginInstance
}

describe("resolveLayout", () => {
  test("footer defaults to [] when sharedDefaults omits footer", () => {
    const result = resolveLayout(makePageType(), { head: StubHead }, {})
    assert.deepStrictEqual(result.footer, [])
  })

  test("header defaults to [] when sharedDefaults omits header", () => {
    const result = resolveLayout(makePageType(), { head: StubHead }, {})
    assert.deepStrictEqual(result.header, [])
  })

  test("footer from sharedDefaults is used when no override", () => {
    const result = resolveLayout(makePageType(), { head: StubHead, footer: [StubA] }, {})
    assert.deepStrictEqual(result.footer, [StubA])
  })

  test("byPageType override replaces footer", () => {
    const result = resolveLayout(
      makePageType(),
      { head: StubHead, footer: [StubA] },
      { content: { footer: [StubB] } },
    )
    assert.deepStrictEqual(result.footer, [StubB])
  })

  test("byPageType override clears footer with []", () => {
    const result = resolveLayout(
      makePageType(),
      { head: StubHead, footer: [StubA] },
      { content: { footer: [] } },
    )
    assert.deepStrictEqual(result.footer, [])
  })

  test("byPageType override clears header with []", () => {
    const result = resolveLayout(
      makePageType(),
      { head: StubHead, header: [StubA] },
      { content: { header: [] } },
    )
    assert.deepStrictEqual(result.header, [])
  })

  test("all array slots default to [] when sharedDefaults only has head", () => {
    const result = resolveLayout(makePageType(), { head: StubHead }, {})
    assert.deepStrictEqual(result.header, [])
    assert.deepStrictEqual(result.left, [])
    assert.deepStrictEqual(result.right, [])
    assert.deepStrictEqual(result.beforeBody, [])
    assert.deepStrictEqual(result.afterBody, [])
    assert.deepStrictEqual(result.footer, [])
  })

  test("preserves component references through override", () => {
    const result = resolveLayout(makePageType(), { head: StubHead, footer: [StubA, StubB] }, {})
    assert.strictEqual(result.footer[0], StubA)
    assert.strictEqual(result.footer[1], StubB)
  })
})

describe("resolveLayout frame resolution", () => {
  test("config override frame wins over page type frame", () => {
    const result = resolveLayout(
      makePageType({ frame: "minimal" }),
      { head: StubHead },
      { content: { frame: "full-width" } },
    )
    assert.strictEqual(result.frame, "full-width")
  })

  test("page type frame wins when no config override", () => {
    const result = resolveLayout(makePageType({ frame: "minimal" }), { head: StubHead }, {})
    assert.strictEqual(result.frame, "minimal")
  })

  test("defaults to 'default' when no frame specified", () => {
    const result = resolveLayout(makePageType(), { head: StubHead }, {})
    assert.strictEqual(result.frame, "default")
  })

  test("defaults to 'default' when byPageType entry exists but has no frame", () => {
    const result = resolveLayout(makePageType(), { head: StubHead }, { content: { left: [StubA] } })
    assert.strictEqual(result.frame, "default")
  })
})

describe("collectComponents", () => {
  test("collects all unique components across page types", () => {
    const pageTypes = [makePageType(), makePageType({ layout: "landing" })]
    const sharedDefaults = { head: StubHead }
    const byPageType = {
      content: { footer: [StubA] },
      landing: { footer: [StubB] },
    }

    const result = collectComponents(pageTypes, sharedDefaults, byPageType)
    assert.ok(result.includes(StubA))
    assert.ok(result.includes(StubB))
  })

  test("deduplicates shared components", () => {
    const pageTypes = [makePageType(), makePageType({ layout: "landing" })]
    const sharedDefaults = { head: StubHead }
    const byPageType = {
      content: { left: [StubA] },
      landing: { left: [StubA] },
    }

    const result = collectComponents(pageTypes, sharedDefaults, byPageType)
    const matches = result.filter((component) => component === StubA)
    assert.strictEqual(matches.length, 1)
  })

  test("handles empty footer and header arrays", () => {
    const pageTypes = [makePageType({ layout: "empty" })]
    const sharedDefaults = { head: StubHead }
    const byPageType = { empty: { footer: [], header: [] } }

    const result = collectComponents(pageTypes, sharedDefaults, byPageType)
    assert.ok(result.every((component) => component))
  })
})

describe("normalizeGenericIndexTitles", () => {
  test("normalizes case-insensitive folder index titles only", () => {
    const uppercase = defaultProcessedContent({
      slug: fullSlug("10-projects/emberpix/index"),
      frontmatter: { title: "INDEX", tags: [] },
    })
    const mixedCase = defaultProcessedContent({
      slug: fullSlug("10-projects/mom-voice/index"),
      frontmatter: { title: "Index", tags: [] },
    })
    const meaningful = defaultProcessedContent({
      slug: fullSlug("10-projects/ops/index"),
      frontmatter: { title: "Operations", tags: [] },
    })
    const rootIndex = defaultProcessedContent({
      slug: fullSlug("index"),
      frontmatter: { title: "INDEX", tags: [] },
    })
    const content = [uppercase, mixedCase, meaningful, rootIndex]

    normalizeGenericIndexTitles(content)

    assert.strictEqual(uppercase[1].data.frontmatter?.title, "index")
    assert.strictEqual(mixedCase[1].data.frontmatter?.title, "index")
    assert.strictEqual(meaningful[1].data.frontmatter?.title, "Operations")
    assert.strictEqual(rootIndex[1].data.frontmatter?.title, "INDEX")
  })

  test("leaves missing frontmatter and missing slugs untouched", () => {
    const noFrontmatter = defaultProcessedContent({ slug: fullSlug("10-projects/ops/index") })
    const noSlug = defaultProcessedContent({ frontmatter: { title: "INDEX" } })

    normalizeGenericIndexTitles([noFrontmatter, noSlug])

    assert.strictEqual(noFrontmatter[1].data.frontmatter, undefined)
    assert.strictEqual(noSlug[1].data.frontmatter?.title, "INDEX")
  })
})
