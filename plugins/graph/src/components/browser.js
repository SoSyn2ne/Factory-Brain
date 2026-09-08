/** Browser graph runtime. Serialized by the Quartz component; no CDN or runtime dependencies. */
export function graphBrowser(createHelpers) {
  const helpers = createHelpers()
  const NS = "http://www.w3.org/2000/svg"
  let disposePage = () => {}

  const element = (name, attributes = {}, text = "") => {
    const node = document.createElement(name)
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value)
    if (text) node.textContent = text
    return node
  }
  const svgElement = (name, attributes = {}) => {
    const node = document.createElementNS(NS, name)
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value)
    return node
  }
  const simplify = (slug) => slug.replace(/(^|\/)index$/i, "$1") || "/"

  async function readModel() {
    const embedded = document.querySelector("script[data-factory-brain-model]")
    if (embedded) return JSON.parse(embedded.textContent)
    // Legacy/private views retain their own page index; this never feeds public statistics.
    const index = await fetchData
    const byId = new Map()
    for (const [slug, page] of Object.entries(index)) {
      const id = simplify(slug)
      const folder = slug
        .replace(/\/index$/i, "")
        .split("/")
        .slice(0, -1)
        .join("/")
      const match = /^10-projects\/([^/]+)(?:\/|$)/i.exec(slug)
      const tags = page.tags || []
      const knownStatus = tags.find((tag) => /^(active|experiment|reference|paused)$/.test(tag))
      const project = match?.[1] || folder || null
      byId.set(id, {
        id,
        slug,
        title: page.title || slug,
        project,
        category: null,
        status: knownStatus || "미지정",
        tags,
        kind:
          /\/index$/i.test(slug) && match
            ? "project"
            : tags.some((tag) => /^(reference|research)$/.test(tag))
              ? "reference"
              : "document",
        inbound: 0,
        outbound: 0,
        degree: 0,
      })
    }
    const links = []
    const seen = new Set()
    const neighbors = new Map([...byId.keys()].map((id) => [id, new Set()]))
    for (const [slug, page] of Object.entries(index)) {
      const source = simplify(slug)
      for (const targetSlug of page.links || []) {
        const target = simplify(targetSlug)
        const key = JSON.stringify([source, target])
        if (source === target || !byId.has(target) || seen.has(key)) continue
        seen.add(key)
        links.push({ source, target })
        byId.get(source).outbound++
        byId.get(target).inbound++
        neighbors.get(source).add(target)
        neighbors.get(target).add(source)
      }
    }
    for (const node of byId.values()) node.degree = neighbors.get(node.id).size
    return { scope: "content-index", nodes: [...byId.values()], links }
  }

  function renderGraph(container, model, currentId, options, isGlobal) {
    const cleanups = []
    const listen = (target, event, fn, opts) => {
      target.addEventListener(event, fn, opts)
      cleanups.push(() => target.removeEventListener(event, fn, opts))
    }
    container.replaceChildren()
    container.dataset.uiPass = "factory-brain-graph-dashboard"
    const filters = { search: "", project: "", category: "", status: "" }
    const controls = element("div", { class: "graph-controls" })
    const actions = element("div", { class: "graph-actions" })
    const stage = element("div", { class: "graph-stage" })
    const svg = svgElement("svg", {
      class: "factory-graph-svg",
      role: "group",
      tabindex: "0",
      "aria-label": isGlobal
        ? "프로젝트 관계 지도. 방향키로 이동, +와 -로 확대·축소, 0으로 맞춤."
        : "현재 문서의 연결 지도",
    })
    const world = svgElement("g", { class: "graph-world" })
    svg.append(world)
    stage.append(svg)
    const empty = element(
      "p",
      { class: "graph-empty", role: "status" },
      "조건에 맞는 문서가 없습니다.",
    )
    empty.hidden = true
    stage.append(empty)
    const footer = element("div", { class: "graph-footer" })
    const count = element("span", { class: "graph-result-count", "aria-live": "polite" })
    const scope = element(
      "span",
      { class: "graph-scope" },
      model.scope === "public-content" ? "공개 content · 빌드 시점 기준" : "현재 문서 색인 기준",
    )
    footer.append(count, scope)
    const tooltip = element("div", { class: "graph-node-tooltip", role: "tooltip" })
    tooltip.hidden = true
    document.body.append(tooltip)
    cleanups.push(() => tooltip.remove())
    let width = 600
    let height = 400
    let view = { x: 0, y: 0, k: 1 }
    let nodes = []
    let links = []
    let hovered = null
    let dragging = null
    let moved = false
    let lastFit = true
    const pointers = new Map()
    const controlsByKey = new Map()
    const formatter = new Intl.NumberFormat("ko-KR")
    const basePath = document.body.dataset.basepath || ""
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const graphDepth = isGlobal ? -1 : (options.depth ?? 1)

    const button = (label, title, action) => {
      const result = element("button", { type: "button", title, "aria-label": title }, label)
      listen(result, "click", action)
      actions.append(result)
      return result
    }
    if (isGlobal) {
      const searchLabel = element("label", { class: "graph-search" })
      searchLabel.append(element("span", {}, "문서 검색"))
      const search = element("input", {
        type: "search",
        placeholder: "문서·프로젝트 검색",
        "aria-label": "그래프 문서 검색",
      })
      listen(search, "input", () => {
        filters.search = search.value
        draw()
      })
      controlsByKey.set("search", search)
      searchLabel.append(search)
      controls.append(searchLabel)
      for (const [key, label] of [
        ["project", "프로젝트"],
        ["category", "카테고리"],
        ["status", "상태"],
      ]) {
        const values = [...new Set(model.nodes.map((node) => node[key]).filter(Boolean))].sort(
          (a, b) => a.localeCompare(b, "ko"),
        )
        if (!values.length) continue
        const field = element("label")
        field.append(element("span", {}, label))
        const select = element("select", { "aria-label": `그래프 ${label} 필터` })
        select.append(element("option", { value: "" }, `모든 ${label}`))
        for (const value of values) select.append(element("option", { value }, value))
        listen(select, "change", () => {
          filters[key] = select.value
          draw()
        })
        controlsByKey.set(key, select)
        field.append(select)
        controls.append(field)
      }
      container.append(controls)
    }
    if (isGlobal) {
      button("−", "그래프 축소", () => zoom(1 / 1.25))
      button("+", "그래프 확대", () => zoom(1.25))
      button("맞춤", "모든 노드가 보이도록 맞춤", fit)
      button("초기화", "필터와 그래프 위치 초기화", () => {
        for (const key of Object.keys(filters)) {
          filters[key] = ""
          const control = controlsByKey.get(key)
          if (control) control.value = ""
        }
        draw()
      })
      const legend = element("div", { class: "graph-legend", "aria-label": "노드 범례" })
      for (const [kind, name] of [
        ["project", "프로젝트"],
        ["document", "문서"],
        ["reference", "참고자료"],
      ]) {
        const item = element("span")
        item.append(
          element("i", { "data-kind": kind, "aria-hidden": "true" }),
          document.createTextNode(name),
        )
        legend.append(item)
      }
      const bar = element("div", { class: "graph-toolbar" })
      bar.append(legend, actions)
      container.append(bar)
    }
    container.append(stage)
    if (isGlobal) container.append(footer)

    function setTooltip(node, event) {
      tooltip.replaceChildren(element("strong", {}, helpers.title(node)))
      if (node.project) tooltip.append(element("span", {}, `프로젝트 / 폴더 · ${node.project}`))
      if (node.status && node.status !== "미지정")
        tooltip.append(element("span", {}, `상태 · ${node.status}`))
      tooltip.append(
        element(
          "span",
          {},
          `연결 문서 ${formatter.format(node.degree)} · 들어옴 ${formatter.format(node.inbound)} · 나감 ${formatter.format(node.outbound)}`,
        ),
      )
      tooltip.hidden = false
      const rect = node.el.getBoundingClientRect()
      const x = event?.clientX ?? rect.x + rect.width / 2
      const y = event?.clientY ?? rect.y + rect.height
      tooltip.style.left = `${Math.max(8, Math.min(x + 14, window.innerWidth - tooltip.offsetWidth - 8))}px`
      tooltip.style.top = `${Math.max(8, Math.min(y + 14, window.innerHeight - tooltip.offsetHeight - 8))}px`
    }
    function highlight(node, event) {
      hovered = node?.id || null
      const neighbors = new Set([hovered])
      for (const link of links) {
        if (link.source.id === hovered) neighbors.add(link.target.id)
        if (link.target.id === hovered) neighbors.add(link.source.id)
      }
      for (const item of nodes)
        item.el.dataset.dimmed = String(!!hovered && !neighbors.has(item.id))
      for (const link of links) {
        link.el.dataset.dimmed = String(
          !!hovered && link.source.id !== hovered && link.target.id !== hovered,
        )
        link.el.dataset.highlighted = String(
          !!hovered && (link.source.id === hovered || link.target.id === hovered),
        )
      }
      if (node) setTooltip(node, event)
      else tooltip.hidden = true
      showLabels()
    }
    function showLabels() {
      const occupied = []
      const ranking = [...nodes].sort(
        (a, b) =>
          Number(b.id === hovered) - Number(a.id === hovered) ||
          Number(b.id === currentId) - Number(a.id === currentId) ||
          b.degree - a.degree,
      )
      const limit = isGlobal ? (view.k > 2.4 ? nodes.length : view.k > 1.4 ? 18 : 9) : 4
      let shown = 0
      for (const node of ranking) {
        const selected = node.id === hovered
        const x = node.x * view.k + view.x
        const y = node.y * view.k + view.y + (node.radius + 7) * view.k
        const textWidth = Math.min(260, helpers.title(node).length * 7.8)
        const box = { x: x - textWidth / 2, y, width: textWidth, height: 20 }
        const overlap = occupied.some(
          (other) =>
            box.x < other.x + other.width + 12 &&
            box.x + box.width + 12 > other.x &&
            box.y < other.y + other.height + 8 &&
            box.y + box.height + 8 > other.y,
        )
        const visible =
          selected ||
          (shown < limit && !overlap && x > -50 && x < width + 50 && y > 0 && y < height)
        node.label.style.display = visible ? "" : "none"
        node.label.setAttribute("font-size", String((selected ? 13 : 12) / view.k))
        node.label.setAttribute("y", String(node.radius + 8 + 10 / view.k))
        if (visible) {
          occupied.push(box)
          shown++
        }
      }
    }
    function update() {
      world.setAttribute("transform", `translate(${view.x},${view.y}) scale(${view.k})`)
      svg.dataset.scale = view.k.toFixed(3)
      for (const node of nodes) {
        node.el.setAttribute("transform", `translate(${node.x},${node.y})`)
        node.el.dataset.x = node.x.toFixed(2)
        node.el.dataset.y = node.y.toFixed(2)
      }
      for (const link of links) {
        link.el.setAttribute("x1", String(link.source.x))
        link.el.setAttribute("y1", String(link.source.y))
        link.el.setAttribute("x2", String(link.target.x))
        link.el.setAttribute("y2", String(link.target.y))
      }
      showLabels()
    }
    function fit() {
      if (!nodes.length) return
      const xs = nodes.map((node) => node.x)
      const ys = nodes.map((node) => node.y)
      const minX = Math.min(...xs) - 70,
        maxX = Math.max(...xs) + 70
      const minY = Math.min(...ys) - 45,
        maxY = Math.max(...ys) + 60
      const k = Math.min(width / (maxX - minX), height / (maxY - minY), isGlobal ? 1.6 : 1.3)
      view = { x: width / 2 - ((minX + maxX) / 2) * k, y: height / 2 - ((minY + maxY) / 2) * k, k }
      lastFit = true
      update()
    }
    function zoom(factor, x = width / 2, y = height / 2) {
      if (options.zoom === false) return
      const next = Math.max(0.15, Math.min(6, view.k * factor))
      const ratio = next / view.k
      view = { x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio, k: next }
      lastFit = false
      tooltip.hidden = true
      update()
    }
    function layout() {
      // Deterministic force relaxation keeps a reopened graph stable and works offline.
      const span = Math.max(140, Math.sqrt(nodes.length) * 62)
      nodes.forEach((node, index) => {
        const angle = index * 2.399963229728653
        const radius = Math.sqrt((index + 1) / Math.max(1, nodes.length)) * span
        node.x = Math.cos(angle) * radius
        node.y = Math.sin(angle) * radius
      })
      const iterations = reducedMotion ? 65 : 90
      for (let tick = 0; tick < iterations; tick++) {
        const cooling = 1 - tick / iterations
        const forces = nodes.map((node) => ({ x: -node.x * 0.005, y: -node.y * 0.005 }))
        // Limit sampled repulsion for very large legacy indexes to avoid blocking input.
        const step = Math.max(1, Math.ceil(nodes.length / 240))
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j += step) {
            const dx = nodes[i].x - nodes[j].x,
              dy = nodes[i].y - nodes[j].y
            const distance = Math.max(10, Math.hypot(dx, dy))
            const force = Math.min(12, 1500 / (distance * distance))
            forces[i].x += (dx / distance) * force
            forces[i].y += (dy / distance) * force
            forces[j].x -= (dx / distance) * force
            forces[j].y -= (dy / distance) * force
          }
        }
        for (const link of links) {
          const dx = link.target.x - link.source.x,
            dy = link.target.y - link.source.y
          const distance = Math.max(1, Math.hypot(dx, dy))
          const force = (distance - (isGlobal ? 115 : 90)) * 0.026
          const source = forces[link.source.index],
            target = forces[link.target.index]
          source.x += (dx / distance) * force
          source.y += (dy / distance) * force
          target.x -= (dx / distance) * force
          target.y -= (dy / distance) * force
        }
        nodes.forEach((node, index) => {
          node.x += Math.max(-15, Math.min(15, forces[index].x)) * cooling
          node.y += Math.max(-15, Math.min(15, forces[index].y)) * cooling
        })
      }
    }
    function draw() {
      highlight(null)
      world.replaceChildren()
      const selected = helpers.select(model, currentId, graphDepth, filters)
      nodes = selected.nodes.map((node, index) => ({
        ...node,
        index,
        radius: helpers.radius(node),
      }))
      const byId = new Map(nodes.map((node) => [node.id, node]))
      links = selected.links.map((link) => ({
        source: byId.get(link.source),
        target: byId.get(link.target),
      }))
      const edges = svgElement("g", { class: "graph-edges", "aria-hidden": "true" })
      const vertices = svgElement("g", { class: "graph-nodes" })
      world.append(edges, vertices)
      for (const link of links) {
        link.el = svgElement("line", { class: "graph-edge", "vector-effect": "non-scaling-stroke" })
        edges.append(link.el)
      }
      for (const node of nodes) {
        const link = svgElement("a", {
          href: helpers.href(node, basePath),
          class: "graph-node",
          "data-node-id": node.id,
          "data-kind": node.kind,
          "data-current": String(node.id === currentId),
          "aria-label": `${helpers.title(node)} · 연결 문서 ${node.degree}`,
          tabindex: "0",
        })
        const target = svgElement("circle", {
          r: String(Math.max(node.radius, 15)),
          class: "graph-hit-target",
        })
        const shape =
          node.kind === "document"
            ? svgElement("circle", { r: String(node.radius), class: "graph-node-shape" })
            : svgElement("rect", {
                x: String(-node.radius),
                y: String(-node.radius),
                width: String(node.radius * 2),
                height: String(node.radius * 2),
                rx: node.kind === "project" ? "4" : "1",
                transform: node.kind === "reference" ? "rotate(45) scale(.8)" : "",
                class: "graph-node-shape",
              })
        const label = svgElement("text", {
          "text-anchor": "middle",
          class: "graph-node-label",
          "aria-hidden": "true",
        })
        label.textContent = helpers.title(node)
        link.append(target, shape, label)
        node.el = link
        node.label = label
        link.addEventListener("pointerenter", (event) => {
          if (!dragging) highlight(node, event)
        })
        link.addEventListener("pointermove", (event) => {
          if (hovered === node.id && !dragging) setTooltip(node, event)
        })
        link.addEventListener("pointerleave", () => {
          if (!dragging) highlight(null)
        })
        link.addEventListener("focus", () => highlight(node))
        link.addEventListener("blur", () => highlight(null))
        link.addEventListener("click", (event) => {
          if (moved) {
            event.preventDefault()
            return
          }
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          container
            .closest(".graph")
            ?.dispatchEvent(new CustomEvent("graph:navigate", { bubbles: true }))
          const url = new URL(helpers.href(node, basePath), window.location.href)
          if (typeof window.spaNavigate === "function") window.spaNavigate(url)
          else window.location.assign(url)
        })
        vertices.append(link)
      }
      count.textContent = `${formatter.format(nodes.length)} 문서 · ${formatter.format(links.length)} 내부 링크`
      empty.hidden = nodes.length !== 0
      svg.dataset.nodeCount = String(nodes.length)
      svg.dataset.linkCount = String(links.length)
      layout()
      fit()
    }

    const resize = new ResizeObserver(() => {
      const rect = stage.getBoundingClientRect()
      const oldWidth = width,
        oldHeight = height
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`)
      if (lastFit) fit()
      else {
        view.x += (width - oldWidth) / 2
        view.y += (height - oldHeight) / 2
        update()
      }
    })
    resize.observe(stage)
    cleanups.push(() => resize.disconnect())
    listen(
      svg,
      "wheel",
      (event) => {
        if (options.zoom === false) return
        event.preventDefault()
        const rect = svg.getBoundingClientRect()
        zoom(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top)
      },
      { passive: false },
    )
    listen(svg, "pointerdown", (event) => {
      if (event.button !== 0) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      moved = false
      const target = event.target.closest(".graph-node")
      dragging = {
        node:
          options.drag === false ? null : nodes.find((node) => node.id === target?.dataset.nodeId),
        x: event.clientX,
        y: event.clientY,
      }
      // Leave a stationary node click targeted at its anchor; capture only once dragging starts.
      if (!target) svg.setPointerCapture(event.pointerId)
      tooltip.hidden = true
    })
    listen(svg, "pointermove", (event) => {
      if (!dragging || !pointers.has(event.pointerId)) return
      const before = [...pointers.values()]
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size === 2) {
        const after = [...pointers.values()]
        const oldDistance = Math.hypot(before[0].x - before[1].x, before[0].y - before[1].y)
        const newDistance = Math.hypot(after[0].x - after[1].x, after[0].y - after[1].y)
        if (oldDistance > 0) zoom(newDistance / oldDistance)
        moved = true
        return
      }
      const dx = event.clientX - dragging.x,
        dy = event.clientY - dragging.y
      if (!moved && Math.hypot(dx, dy) < 4) return
      moved = true
      svg.setPointerCapture(event.pointerId)
      lastFit = false
      if (dragging.node) {
        dragging.node.x += dx / view.k
        dragging.node.y += dy / view.k
      } else {
        view.x += dx
        view.y += dy
      }
      dragging.x = event.clientX
      dragging.y = event.clientY
      update()
    })
    const release = (event) => {
      pointers.delete(event.pointerId)
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId)
      if (!pointers.size) {
        dragging = null
        highlight(null)
        // The browser dispatches click after pointerup. Keep drag suppression through it.
        setTimeout(() => {
          moved = false
        }, 0)
      }
    }
    listen(window, "pointerup", release)
    listen(window, "pointercancel", release)
    listen(svg, "keydown", (event) => {
      if (event.target !== svg) return
      const offsets = {
        ArrowLeft: [40, 0],
        ArrowRight: [-40, 0],
        ArrowUp: [0, 40],
        ArrowDown: [0, -40],
      }
      if (offsets[event.key]) {
        event.preventDefault()
        view.x += offsets[event.key][0]
        view.y += offsets[event.key][1]
        lastFit = false
        update()
      } else if (["+", "=", "-", "0"].includes(event.key)) {
        event.preventDefault()
        if (event.key === "0") fit()
        else zoom(event.key === "-" ? 0.8 : 1.25)
      }
    })
    draw()
    return () => {
      for (const cleanup of cleanups) cleanup()
      container.replaceChildren()
    }
  }

  async function setup() {
    disposePage()
    let cancelled = false
    const cleanups = []
    disposePage = () => {
      cancelled = true
      cleanups.splice(0).forEach((cleanup) => cleanup())
    }
    let model
    try {
      model = await readModel()
    } catch (error) {
      if (cancelled) return
      for (const node of document.querySelectorAll(".graph-container"))
        node.textContent = "그래프 데이터를 불러오지 못했습니다."
      console.error("[Factory Brain Graph]", error)
      return
    }
    if (cancelled) return
    const currentId = simplify(document.body.dataset.slug || "index")
    for (const graph of document.querySelectorAll(".graph")) {
      const local = graph.querySelector(".graph-container")
      const overlay = graph.querySelector(".global-graph-outer")
      const global = graph.querySelector(".global-graph-container")
      const trigger = graph.querySelector(".global-graph-icon")
      if (!local || !overlay || !global || !trigger) continue
      cleanups.push(
        renderGraph(local, model, currentId, JSON.parse(local.dataset.cfg || "{}"), false),
      )
      let disposeGlobal = null
      let previousOverflow = ""
      const close = () => {
        if (!overlay.classList.contains("active")) return
        overlay.classList.remove("active")
        overlay.setAttribute("aria-hidden", "true")
        trigger.setAttribute("aria-expanded", "false")
        document.body.style.overflow = previousOverflow
        disposeGlobal?.()
        disposeGlobal = null
        trigger.focus()
      }
      const open = () => {
        if (overlay.classList.contains("active")) return
        previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        overlay.classList.add("active")
        overlay.setAttribute("aria-hidden", "false")
        trigger.setAttribute("aria-expanded", "true")
        disposeGlobal = renderGraph(
          global,
          model,
          currentId,
          JSON.parse(global.dataset.cfg || "{}"),
          true,
        )
        overlay.querySelector(".global-graph-close")?.focus()
      }
      const click = (event) => {
        if (event.target === overlay || event.target.closest(".global-graph-close")) close()
      }
      const keydown = (event) => {
        if (event.key === "Escape") close()
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
          event.preventDefault()
          if (overlay.classList.contains("active")) close()
          else open()
        }
      }
      trigger.addEventListener("click", open)
      overlay.addEventListener("click", click)
      graph.addEventListener("graph:navigate", close)
      document.addEventListener("keydown", keydown)
      cleanups.push(() => {
        close()
        trigger.removeEventListener("click", open)
        overlay.removeEventListener("click", click)
        graph.removeEventListener("graph:navigate", close)
        document.removeEventListener("keydown", keydown)
      })
    }
  }
  document.addEventListener("nav", setup)
  document.addEventListener("render", setup)
  setup()
}
