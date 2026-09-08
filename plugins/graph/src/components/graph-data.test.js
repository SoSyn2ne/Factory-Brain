import { test } from "node:test"
import assert from "node:assert/strict"
import { graphDataHelpers } from "./graph-data.js"

const { title, href, radius, select } = graphDataHelpers()
const project = {
  id: "10-projects/emberpix/",
  slug: "10-projects/emberpix/index",
  title: "INDEX",
  project: "emberpix",
  status: "active",
  category: "Product",
  degree: 3,
  tags: [],
}
const document = { ...project, id: "Design", slug: "Design", title: "Design notes", degree: 1 }
const isolated = {
  ...project,
  id: "Research",
  slug: "Research",
  title: "Research",
  project: null,
  status: "미지정",
  category: "Research",
  degree: 0,
}
const model = {
  nodes: [project, document, isolated],
  links: [{ source: project.id, target: document.id }],
}

test("INDEX titles retain project and immediate folder fallbacks", () => {
  assert.equal(title(project), "emberpix")
  assert.equal(
    title({ ...project, project: null, slug: "10-projects/mom-voice/index" }),
    "mom-voice",
  )
  assert.equal(title(document), "Design notes")
})

test("node destinations preserve deployment prefixes and encode path segments", () => {
  assert.equal(href(project, "/factory-brain/"), "/factory-brain/10-projects/emberpix/")
  assert.equal(href({ id: "Project Portfolio" }), "/Project%20Portfolio")
  assert.equal(href({ id: "/" }, "/factory-brain"), "/factory-brain/")
})

test("local depth and combined graph filters only return induced, resolved links", () => {
  assert.deepEqual(select(model, project.id, 0).nodes, [project])
  assert.deepEqual(select(model, project.id, 1).nodes, [project, document])
  assert.equal(select(model, project.id, -1).nodes.length, 3)
  const result = select(model, project.id, -1, {
    search: "DESIGN",
    status: "active",
    category: "Product",
    project: "emberpix",
  })
  assert.deepEqual(result.nodes, [document])
  assert.deepEqual(result.links, [])
  assert.deepEqual(select(model, project.id, -1, { status: "paused" }).nodes, [])
})

test("degree-based node sizing remains bounded", () => {
  assert.equal(radius({ degree: -1 }), 6)
  assert.ok(radius(project) > radius(isolated))
  assert.equal(radius({ degree: 100000 }), 17)
})
