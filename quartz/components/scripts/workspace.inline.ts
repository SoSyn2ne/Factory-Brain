const mobileViewport = window.matchMedia("(max-width: 800px)")

let activeGraphDialog: HTMLElement | null = null
let lastGraphTrigger: HTMLElement | null = null
let lastAddProjectTrigger: HTMLElement | null = null
let observedRoot: HTMLElement | null = null
let refreshQueued = false

const workspaceObserver = new MutationObserver(() => queueWorkspaceRefresh())

function syncActiveNavigation() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(".explorer a")) {
    if (link.classList.contains("active")) {
      link.setAttribute("aria-current", "page")
    } else {
      link.removeAttribute("aria-current")
    }
  }
}

function syncExplorerState() {
  let mobileExplorerOpen = false

  for (const explorer of document.querySelectorAll<HTMLElement>(".explorer")) {
    const isOpen = !explorer.classList.contains("collapsed")
    const content = explorer.querySelector<HTMLElement>(".explorer-content")

    explorer.setAttribute("aria-expanded", String(isOpen))
    content?.setAttribute("aria-expanded", String(isOpen))
    for (const toggle of explorer.querySelectorAll<HTMLButtonElement>(".explorer-toggle")) {
      toggle.setAttribute("aria-expanded", String(isOpen))
    }

    if (mobileViewport.matches && isOpen) mobileExplorerOpen = true
  }

  document.documentElement.classList.toggle("mobile-no-scroll", mobileExplorerOpen)
}

function projectSlugFromName(name: string): string {
  return (
    name
      .normalize("NFKC")
      .trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}_-]+/gu, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "new-project"
  )
}

function yamlString(value: string): string {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, " ")}"`
}

function setupAddProjectDialog() {
  const dialog = document.querySelector<HTMLDialogElement>("[data-add-project-dialog]")
  const form = dialog?.querySelector<HTMLFormElement>("[data-add-project-form]")
  if (!dialog || !form || dialog.dataset.bound === "true") return

  dialog.dataset.bound = "true"
  const nameInput = form.elements.namedItem("project-name") as HTMLInputElement | null
  const slugInput = form.elements.namedItem("project-slug") as HTMLInputElement | null
  const statusInput = form.elements.namedItem("project-status") as HTMLSelectElement | null
  const categoryInput = form.elements.namedItem("project-category") as HTMLInputElement | null
  const status = form.querySelector<HTMLElement>("[data-add-project-status]")
  const fallback = form.querySelector<HTMLAnchorElement>("[data-add-project-fallback]")
  if (!nameInput || !slugInput || !statusInput || !categoryInput || !status || !fallback) return

  const open = () => {
    form.reset()
    delete slugInput.dataset.userEdited
    status.hidden = true
    fallback.hidden = true
    if (typeof dialog.showModal === "function") dialog.showModal()
    else dialog.setAttribute("open", "")
    nameInput.focus()
  }
  const close = () => {
    if (typeof dialog.close === "function") dialog.close()
    else dialog.removeAttribute("open")
    lastAddProjectTrigger?.focus()
  }

  for (const trigger of document.querySelectorAll<HTMLElement>("[data-open-add-project]")) {
    trigger.addEventListener("click", () => {
      lastAddProjectTrigger = trigger
      open()
    })
  }
  for (const trigger of form.querySelectorAll<HTMLElement>("[data-close-add-project]")) {
    trigger.addEventListener("click", close)
  }
  nameInput.addEventListener("input", () => {
    if (!slugInput.dataset.userEdited) slugInput.value = projectSlugFromName(nameInput.value)
  })
  slugInput.addEventListener("input", () => {
    slugInput.dataset.userEdited = "true"
  })
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close()
  })
  dialog.addEventListener("close", () => {
    const trigger = lastAddProjectTrigger
    lastAddProjectTrigger = null
    requestAnimationFrame(() => trigger?.focus())
  })
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    if (!form.reportValidity()) return

    const name = nameInput.value.trim().replace(/[\r\n]+/g, " ")
    const slug = slugInput.value.trim()
    const projectStatus = statusInput.value
    const category = categoryInput.value.trim().replace(/[\r\n]+/g, " ")
    const filePath = `10-projects/${slug}/index`
    const content = [
      "---",
      `title: ${yamlString(name)}`,
      `status: ${projectStatus}`,
      `category: ${yamlString(category || "project")}`,
      "tags:",
      "  - project",
      "---",
      "",
      `# ${name}`,
      "",
      "## Next action",
      "",
      "- ",
      "",
      "## Notes",
      "",
    ].join("\n")
    const uri =
      `obsidian://new?vault=${encodeURIComponent("Factory-Brain")}` +
      `&file=${encodeURIComponent(filePath)}&content=${encodeURIComponent(content)}`

    fallback.href = uri
    fallback.hidden = false
    status.textContent = `10-projects/${slug}/index 초안을 Obsidian에서 여는 중입니다. 저장하면 다음 빌드에 그래프가 반영됩니다.`
    status.hidden = false
    window.location.href = uri
  })
}

function makeGraphDialogHeader(overlay: HTMLElement, index: number) {
  const header = document.createElement("div")
  const title = document.createElement("strong")
  const hint = document.createElement("span")
  const close = document.createElement("button")

  header.className = "global-graph-dialog-header"
  title.id = `global-graph-title-${index}`
  const isProjectGalaxy = overlay.dataset.graphMode === "project-galaxy"
  title.textContent = isProjectGalaxy ? "Project Galaxy" : "Global Graph"
  hint.textContent = isProjectGalaxy
    ? "프로젝트를 눌러 작업방으로 이동 · Esc로 닫기"
    : "Drag to explore · Esc to close"
  close.className = "global-graph-close"
  close.type = "button"
  close.setAttribute("aria-label", "Close Global Graph")
  close.textContent = "×"

  header.append(title, hint, close)
  overlay.prepend(header)
  return { header, title, close }
}

function syncGraphDialogs() {
  const overlays = [...document.querySelectorAll<HTMLElement>(".global-graph-outer")]
  let openDialog: HTMLElement | null = null

  overlays.forEach((overlay, index) => {
    const graph = overlay.closest<HTMLElement>(".graph")
    const trigger = graph?.querySelector<HTMLButtonElement>(".global-graph-icon")
    const dialogId = overlay.id || `global-graph-dialog-${index}`
    let header = overlay.querySelector<HTMLElement>(":scope > .global-graph-dialog-header")
    let title = header?.querySelector<HTMLElement>("strong")

    overlay.id = dialogId
    if (!header || !title) {
      const created = makeGraphDialogHeader(overlay, index)
      header = created.header
      title = created.title
    }

    const isOpen = overlay.classList.contains("active")
    overlay.setAttribute("role", "dialog")
    overlay.setAttribute("aria-modal", "true")
    overlay.setAttribute("aria-labelledby", title.id)
    overlay.setAttribute("aria-hidden", String(!isOpen))
    trigger?.setAttribute("aria-haspopup", "dialog")
    trigger?.setAttribute("aria-controls", dialogId)
    trigger?.setAttribute("aria-expanded", String(isOpen))

    const triggerSelector =
      overlay.dataset.graphMode === "project-galaxy"
        ? "[data-open-project-galaxy]"
        : "[data-open-global-graph]"
    for (const dashboardTrigger of document.querySelectorAll<HTMLButtonElement>(triggerSelector)) {
      dashboardTrigger.setAttribute("aria-haspopup", "dialog")
      dashboardTrigger.setAttribute("aria-controls", dialogId)
      dashboardTrigger.setAttribute("aria-expanded", String(isOpen))
    }

    if (isOpen) openDialog = overlay
  })

  if (openDialog && openDialog !== activeGraphDialog) {
    activeGraphDialog = openDialog
    requestAnimationFrame(() =>
      activeGraphDialog?.querySelector<HTMLButtonElement>(".global-graph-close")?.focus(),
    )
  } else if (!openDialog && activeGraphDialog) {
    activeGraphDialog = null
    const trigger = lastGraphTrigger
    lastGraphTrigger = null
    requestAnimationFrame(() => trigger?.focus())
  }
}

function observeWorkspaceRoot() {
  const root = document.getElementById("quartz-body")
  if (!root || root === observedRoot) return

  workspaceObserver.disconnect()
  observedRoot = root
  workspaceObserver.observe(root, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  })
}

function refreshWorkspaceUi() {
  refreshQueued = false
  observeWorkspaceRoot()
  syncActiveNavigation()
  syncExplorerState()
  setupAddProjectDialog()
  syncGraphDialogs()
}

function queueWorkspaceRefresh() {
  if (refreshQueued) return
  refreshQueued = true
  queueMicrotask(refreshWorkspaceUi)
}

function closeMobileExplorer() {
  const openExplorer = [...document.querySelectorAll<HTMLElement>(".explorer")].find(
    (explorer) => !explorer.classList.contains("collapsed"),
  )
  if (!openExplorer) return false

  openExplorer.classList.add("collapsed")
  syncExplorerState()
  openExplorer.querySelector<HTMLButtonElement>(".mobile-explorer")?.focus()
  return true
}

function keepFocusInGraph(event: KeyboardEvent) {
  if (event.key !== "Tab" || !activeGraphDialog) return

  const focusable = [
    ...activeGraphDialog.querySelectorAll<HTMLElement>(
      "button, input, select, textarea, [href], [tabindex]",
    ),
  ].filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.tabIndex >= 0 &&
      element.getClientRects().length > 0,
  )
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const current = document.activeElement
  if (event.shiftKey && (current === first || !activeGraphDialog.contains(current))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (current === last || !activeGraphDialog.contains(current))) {
    event.preventDefault()
    first.focus()
  }
}

document.addEventListener(
  "click",
  (event) => {
    const target = event.target instanceof Element ? event.target : null
    const dashboardTrigger = target?.closest<HTMLButtonElement>(
      "[data-open-global-graph], [data-open-project-galaxy]",
    )
    if (dashboardTrigger) {
      // Let the original click finish before opening: Quartz closes its graph
      // when that click bubbles outside the existing graph container.
      lastGraphTrigger = dashboardTrigger
      queueMicrotask(() => {
        const sourceSelector = dashboardTrigger.hasAttribute("data-open-project-galaxy")
          ? ".project-galaxy-source .global-graph-icon"
          : ".graph:not(.project-galaxy-source) .global-graph-icon"
        document.querySelector<HTMLButtonElement>(sourceSelector)?.click()
      })
    }
    const trigger = target?.closest<HTMLElement>(".global-graph-icon")
    if (trigger) lastGraphTrigger = trigger
    queueWorkspaceRefresh()
  },
  true,
)

document.addEventListener(
  "keydown",
  (event) => {
    keepFocusInGraph(event)

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
      lastGraphTrigger =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
    }

    if (event.key === "Escape" && !activeGraphDialog && mobileViewport.matches) {
      if (closeMobileExplorer()) event.preventDefault()
    }

    queueWorkspaceRefresh()
  },
  true,
)

document.addEventListener("nav", queueWorkspaceRefresh)
document.addEventListener("render", queueWorkspaceRefresh)
mobileViewport.addEventListener("change", queueWorkspaceRefresh)
queueWorkspaceRefresh()
