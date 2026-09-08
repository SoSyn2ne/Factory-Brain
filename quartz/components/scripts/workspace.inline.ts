const mobileViewport = window.matchMedia("(max-width: 800px)")

let activeGraphDialog: HTMLElement | null = null
let lastGraphTrigger: HTMLElement | null = null
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

function makeGraphDialogHeader(overlay: HTMLElement, index: number) {
  const header = document.createElement("div")
  const title = document.createElement("strong")
  const hint = document.createElement("span")
  const close = document.createElement("button")

  header.className = "global-graph-dialog-header"
  title.id = `global-graph-title-${index}`
  title.textContent = "Global Graph"
  hint.textContent = "Drag to explore · Esc to close"
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

    for (const dashboardTrigger of document.querySelectorAll<HTMLButtonElement>(
      "[data-open-global-graph]",
    )) {
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
    const dashboardTrigger = target?.closest<HTMLButtonElement>("[data-open-global-graph]")
    if (dashboardTrigger) {
      // Let the original click finish before opening: Quartz closes its graph
      // when that click bubbles outside the existing graph container.
      queueMicrotask(() => {
        document.querySelector<HTMLButtonElement>(".graph .global-graph-icon")?.click()
        lastGraphTrigger = dashboardTrigger
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
