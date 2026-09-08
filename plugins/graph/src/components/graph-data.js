/** Shared, browser-safe graph rules. Only resolved public model nodes enter the graph. */
export function graphDataHelpers() {
  function title(node) {
    if (node.title && !/^index$/i.test(node.title)) return node.title
    const segments = node.slug
      .replace(/\/index$/i, "")
      .split("/")
      .filter(Boolean)
    return node.project || segments.at(-1) || "Factory Brain"
  }

  function href(node, basePath = "") {
    const base = basePath.replace(/^\/+|\/+$/g, "")
    const path = node.id === "/" ? "" : node.id.replace(/^\/+/, "")
    return `/${base ? `${base}/` : ""}${path.split("/").map(encodeURIComponent).join("/")}`
  }

  function radius(node) {
    return Math.min(17, Math.max(6, 5 + Math.sqrt(Math.max(0, node.degree)) * 2.3))
  }

  function select(model, currentId, depth, filters = {}) {
    const allowed = new Set()
    if (depth >= 0) {
      allowed.add(currentId)
      let frontier = [currentId]
      for (let level = 0; level < depth; level++) {
        const next = new Set()
        for (const link of model.links) {
          if (frontier.includes(link.source) && !allowed.has(link.target)) next.add(link.target)
          if (frontier.includes(link.target) && !allowed.has(link.source)) next.add(link.source)
        }
        for (const id of next) allowed.add(id)
        frontier = [...next]
      }
    } else {
      for (const node of model.nodes) allowed.add(node.id)
    }
    const query = (filters.search || "").trim().toLocaleLowerCase()
    const nodes = model.nodes.filter((node) => {
      if (!allowed.has(node.id)) return false
      if (filters.project && node.project !== filters.project) return false
      if (filters.category && node.category !== filters.category) return false
      if (filters.status && node.status !== filters.status) return false
      return (
        !query ||
        [title(node), node.project, node.category, node.status, ...(node.tags || [])]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)
      )
    })
    const ids = new Set(nodes.map((node) => node.id))
    return {
      nodes,
      links: model.links.filter((link) => ids.has(link.source) && ids.has(link.target)),
    }
  }

  return { title, href, radius, select }
}
