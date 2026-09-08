import test, { describe } from "node:test"
import assert from "node:assert"
import { collectProjectNavigation, formatProjectName } from "./ProjectNavigator"
import { isFullSlug } from "../util/path"

function fullSlug(value: string) {
  assert.ok(isFullSlug(value))
  return value
}

describe("formatProjectName", () => {
  test("turns folder slugs into readable project names", () => {
    assert.strictEqual(formatProjectName("prototype-factory"), "Prototype Factory")
    assert.strictEqual(formatProjectName("mom-voice"), "Mom Voice")
  })
})

describe("collectProjectNavigation", () => {
  test("collects and deduplicates real project index pages", () => {
    const projects = collectProjectNavigation([
      { slug: fullSlug("10-projects/emberpix/index"), frontmatter: { title: "INDEX", tags: [] } },
      { slug: fullSlug("10-projects/emberpix/INDEX"), frontmatter: { title: "index", tags: [] } },
      { slug: fullSlug("10-projects/main/index"), frontmatter: { title: "main", tags: [] } },
      { slug: fullSlug("notes/index"), frontmatter: { title: "Notes", tags: [] } },
    ])

    assert.deepStrictEqual(
      projects.map((project) => [project.name, project.slug]),
      [
        ["Main", "10-projects/main/index"],
        ["Emberpix", "10-projects/emberpix/INDEX"],
      ],
    )
  })

  test("handles absent frontmatter and ignores pages without a project index slug", () => {
    const projects = collectProjectNavigation([
      {},
      { slug: fullSlug("10-projects/prototype-factory/index") },
      { slug: fullSlug("10-projects/prototype-factory/notes") },
    ])

    assert.deepStrictEqual(projects, [
      { name: "Prototype Factory", slug: "10-projects/prototype-factory/index" },
    ])
  })
})
