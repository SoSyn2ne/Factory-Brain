#!/usr/bin/env node
// Run against a separately served private build. Evidence may contain private data:
// keep outputDir in an ignored private directory outside public outputs/content.
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { createRequire } from "node:module"

const [baseURL, snapshotPath, outputDir, mode = "ready"] = process.argv.slice(2)
if (!baseURL || !snapshotPath || !outputDir) {
  console.error(
    "Usage: node scripts/verify-project-snapshot.mjs <baseURL> <snapshotPath> <private-outputDir> [ready|empty|unavailable|invalid]",
  )
  process.exit(1)
}
assert.ok(["ready", "empty", "unavailable", "invalid"].includes(mode), "Supported state")
const require = createRequire(import.meta.url)
const puppeteer = require("puppeteer-core")
const executablePath =
  process.env.CHROMIUM_PATH ||
  ["/snap/bin/chromium", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(existsSync)
assert.ok(executablePath, "Set CHROMIUM_PATH to an installed Chromium executable")
await mkdir(outputDir, { recursive: true })
const evidence = {
  startedAt: new Date().toISOString(),
  baseURL,
  snapshotPath,
  mode,
  checks: [],
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  screenshots: [],
  status: "running",
}
let browser
let page
const passed = (name, details = {}) => {
  evidence.checks.push({ name, ...details })
  console.log(`PASS ${name}`)
}
const count = (selector) => page.$$eval(selector, (elements) => elements.length)
const text = (selector) => page.$eval(selector, (element) => element.textContent.trim())
const attribute = (selector, name) =>
  page.$eval(selector, (element, key) => element.getAttribute(key), name)
const selectorFor = (name, value) => `[${name}=${JSON.stringify(value)}]`
async function click(selector) {
  const element = await page.waitForSelector(selector, { visible: true })
  await element.scrollIntoView()
  await element.click()
}
async function fill(selector, value) {
  await click(selector)
  await page.keyboard.down("Control")
  await page.keyboard.press("a")
  await page.keyboard.up("Control")
  await page.keyboard.press("Backspace")
  if (value) await page.type(selector, value)
}
async function screenshot(name) {
  const target = path.join(outputDir, `${mode}-${name}.png`)
  await page.screenshot({ path: target, fullPage: true })
  evidence.screenshots.push(target)
}
async function home() {
  const response = await page.goto(baseURL, { waitUntil: "networkidle2" })
  assert.equal(response.status(), 200, "Private page HTTP status")
  await page.waitForSelector(`[data-project-snapshot][data-snapshot-state="${mode}"]`)
  assert.match(await page.title(), /Factory Brain/i, "Intended Factory Brain page")
}
async function openDetails(selector) {
  if (!(await page.$(selector))) return
  const open = await page.$eval(selector, (element) => element.open)
  if (!open) await click(`${selector} > summary`)
  assert.equal(await page.$eval(selector, (element) => element.open), true)
}
async function navigateLink(selector) {
  const href = await page.$eval(selector, (element) => element.href.baseVal || element.href)
  const target = new URL(href, page.url())
  assert.equal(target.origin, new URL(baseURL).origin, "Navigation stays in the preview")
  assert.equal(
    await page.evaluate(async (url) => (await fetch(url)).status, target.href),
    200,
    "Project target HTTP status",
  )
  await click(selector)
  await page.waitForFunction((url) => window.location.href === url, {}, target.href)
  await page.waitForSelector("article")
  return target.href
}
async function assertContained(label) {
  const size = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
  }))
  assert.ok(size.body <= size.viewport + 1, `${label}: no body horizontal overflow`)
  assert.ok(size.document <= size.viewport + 1, `${label}: no document horizontal overflow`)
  passed(label, size)
}

try {
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  page = await browser.newPage()
  page.setDefaultTimeout(15000)
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
  page.on("pageerror", (error) => evidence.pageErrors.push(String(error)))
  page.on("console", (message) => {
    if (message.type() === "error") evidence.consoleErrors.push(message.text())
  })
  page.on("requestfailed", (request) => {
    evidence.requestFailures.push({ url: request.url(), error: request.failure()?.errorText })
  })
  await home()
  passed("HTTP 200, Factory Brain page, expected snapshot state", { state: mode })

  if (mode === "ready") {
    const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"))
    assert.equal(snapshot.schemaVersion, 1)
    assert.equal(snapshot.projects.length, snapshot.summary.projectCount)
    const counts = {
      projects: snapshot.projects.length,
      "next-actions": snapshot.projects.filter((project) => project.nextAction).length,
      warnings: snapshot.warnings.length,
      cleanup: new Set(snapshot.warnings.map((warning) => warning.projectId)).size,
    }
    for (const [key, expected] of Object.entries(counts)) {
      const value = await text(selectorFor("data-snapshot-count", key))
      assert.equal(Number(value.replace(/[^\d]/g, "")), expected, `${key} count`)
    }
    for (const [status, expected] of Object.entries(snapshot.summary.statusCounts)) {
      assert.equal(
        Number(await attribute(selectorFor("data-snapshot-status", status), "data-count")),
        expected,
        `${status} status count`,
      )
    }
    assert.equal(await count("[data-snapshot-project]"), snapshot.projects.length)
    assert.equal(await count("[data-snapshot-next-action]"), counts["next-actions"])
    for (const project of snapshot.projects) {
      const row = selectorFor("data-snapshot-project", project.id)
      assert.equal(await attribute(row, "data-status"), project.status, `${project.id}: status`)
      assert.equal(
        await attribute(row, "data-category"),
        project.category,
        `${project.id}: category`,
      )
      assert.ok((await text(row)).includes(project.title), `${project.id}: real project title`)
      if (project.nextAction) {
        assert.equal(
          await text(selectorFor("data-snapshot-next-action", project.id)),
          project.nextAction,
          `${project.id}: real next action`,
        )
      }
    }
    const warningProjects = [...new Set(snapshot.warnings.map((warning) => warning.projectId))]
    assert.equal(
      await count("[data-snapshot-warning-project]"),
      warningProjects.length,
      "Every project needing metadata cleanup is rendered",
    )
    for (const projectId of warningProjects) {
      assert.equal(
        await count(selectorFor("data-snapshot-warning-project", projectId)),
        1,
        `${projectId}: metadata cleanup warning`,
      )
    }
    passed(
      "Snapshot counts, every project/status/category/action, and metadata warnings match JSON",
      {
        counts,
        statuses: snapshot.summary.statusCounts,
        generatedAt: snapshot.generatedAt,
      },
    )
    await openDetails("[data-snapshot-records]")
    await openDetails("[data-snapshot-actions]")
    await openDetails("[data-snapshot-warnings]")
    await screenshot("desktop")
    const linkedProject =
      snapshot.projects.find((project) => project.id === "main") || snapshot.projects[0]
    const projectURL = await navigateLink(
      `${selectorFor("data-snapshot-project", linkedProject.id)} [data-snapshot-index]`,
    )
    passed("Project INDEX link navigates to HTTP 200", { projectURL })
    await page.goBack({ waitUntil: "networkidle2" })
    await page.waitForSelector("[data-project-snapshot]")
    passed("Browser back restores snapshot home")
    await openDetails("[data-snapshot-records]")
    const projectRow = selectorFor("data-snapshot-project", linkedProject.id)
    await openDetails(`${projectRow} details`)
    const relatedLinks = await page.$$eval(`${projectRow} details a`, (anchors) =>
      anchors.map((anchor) => ({ text: anchor.textContent.trim(), href: anchor.href })),
    )
    assert.ok(relatedLinks.length, "Real related project links are resolved")
    assert.ok(linkedProject.relatedLinks.includes(relatedLinks[0].text))
    const contentNote = relatedLinks.find(
      (link) => !new URL(link.href).pathname.includes("/10-projects/"),
    )
    assert.ok(contentNote, "A real related content note is available for graph/backlink regression")
    const relatedURL = await navigateLink(`${projectRow} details a`)
    passed("Contextual related link from project table navigates to HTTP 200", {
      source: relatedLinks[0].text,
      relatedURL,
    })
    await home()

    const galaxy = ".project-galaxy-outer.active"
    await click("[data-open-project-galaxy]")
    await page.waitForSelector(`${galaxy} .graph-node`)
    const galaxyNodes = await count(`${galaxy} .graph-node`)
    assert.equal(galaxyNodes, snapshot.projects.length, "Galaxy preserves every real project")
    const search = `${galaxy} input[aria-label="그래프 문서 검색"]`
    await fill(search, snapshot.projects[0].title)
    await page.waitForFunction(
      (selector, total) => {
        const nodes = document.querySelectorAll(selector)
        return nodes.length > 0 && nodes.length < total
      },
      {},
      `${galaxy} .graph-node`,
      galaxyNodes,
    )
    const filteredNodes = await count(`${galaxy} .graph-node`)
    await click(`${galaxy} [aria-label="필터와 그래프 위치 초기화"]`)
    assert.equal(await count(`${galaxy} .graph-node`), galaxyNodes)
    const world = `${galaxy} .graph-world`
    const beforeZoom = await attribute(world, "transform")
    await click(`${galaxy} [aria-label="그래프 확대"]`)
    assert.notEqual(
      await attribute(world, "transform"),
      beforeZoom,
      "Galaxy zoom changes transform",
    )
    await click(`${galaxy} [aria-label="모든 노드가 보이도록 맞춤"]`)
    const firstNode = `${galaxy} .graph-node`
    const nodeBefore = await attribute(firstNode, "transform")
    const shape = await page.$(`${firstNode} .graph-node-shape`)
    const box = await shape.boundingBox()
    assert.ok(box, "Galaxy node is visible")
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 45, y + 30, { steps: 10 })
    await page.mouse.up()
    assert.notEqual(
      await attribute(firstNode, "transform"),
      nodeBefore,
      "Galaxy node drag moves node",
    )
    await screenshot("galaxy")
    await page.keyboard.press("Escape")
    await page.waitForSelector(galaxy, { hidden: true })
    passed("Galaxy open, search, reset, zoom, fit, node drag and Escape", {
      nodes: galaxyNodes,
      filteredNodes,
    })
    await click("[data-open-project-galaxy]")
    await page.waitForSelector(`${galaxy} .graph-node`)
    const galaxyURL = await navigateLink(`${galaxy} .graph-node`)
    passed("Galaxy node navigates to real project", { galaxyURL })
    // Project INDEX routes are Quartz folder pages: their configured right
    // sidebar is empty. Check document graph/backlinks on an actual note.
    const contentResponse = await page.goto(contentNote.href, { waitUntil: "networkidle2" })
    assert.equal(contentResponse.status(), 200)
    await page.waitForSelector(".backlinks")
    assert.ok(await count(".backlinks a"), "Content note retains real backlinks")
    passed("Existing document backlinks remain linked", { noteURL: contentNote.href })
    await click('.graph:not(.project-galaxy-source) .global-graph-icon[aria-label="Global Graph"]')
    await page.waitForSelector(".global-graph-outer.active .graph-node")
    await page.keyboard.press("Escape")
    await page.waitForSelector(".global-graph-outer.active", { hidden: true })
    passed("Existing global graph opens and closes")

    const themeBefore = await attribute("html", "saved-theme")
    await click("button.darkmode")
    assert.notEqual(await attribute("html", "saved-theme"), themeBefore)
    await screenshot("theme-toggle")
    await click("button.darkmode")
    assert.equal(await attribute("html", "saved-theme"), themeBefore)
    passed("Dark mode toggles and restores")
    await click(".search-button")
    await page.waitForSelector(".search-container.active")
    await fill(".search-container.active input.search-bar", snapshot.projects[0].title)
    await page.waitForSelector(".search-container.active .result-card:not(.no-match)")
    await page.keyboard.press("Escape")
    await page.waitForSelector(".search-container.active", { hidden: true })
    passed("Existing document search returns real project results")
    await home()
  } else {
    assert.equal(await count("[data-snapshot-project]"), 0)
    assert.equal(await count("[data-snapshot-next-action]"), 0)
    assert.equal(await count("[data-snapshot-warning-project]"), 0)
    assert.match(await text("[data-project-snapshot]"), /데이터 없음/)
    const counts = await page.$$eval("[data-snapshot-count]", (elements) =>
      elements.map((element) => element.textContent.trim()),
    )
    assert.ok(
      counts.every((value) => !/[1-9]/.test(value)),
      "No fabricated positive counts",
    )
    passed("Missing/empty/invalid state contains no fabricated project rows, actions, or counts")
    await screenshot("desktop")
  }

  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 })
  await home()
  if (await count(".explorer:not(.collapsed)")) {
    await click(".explorer:not(.collapsed) button.mobile-explorer")
    await page.waitForFunction(() => !document.querySelector(".explorer:not(.collapsed)"))
    passed("Closed existing mobile navigation using its toggle")
  }
  await openDetails("[data-snapshot-records]")
  await openDetails("[data-snapshot-actions]")
  await openDetails("[data-snapshot-warnings]")
  await assertContained("375px viewport contains expanded panel")
  await screenshot("narrow")
  if (mode === "ready") {
    await click("[data-open-project-galaxy]")
    await page.waitForSelector(".project-galaxy-outer.active .graph-node")
    await assertContained("375px viewport contains open Galaxy")
    await screenshot("narrow-galaxy")
    await page.keyboard.press("Escape")
    await page.waitForSelector(".project-galaxy-outer.active", { hidden: true })
  }
  assert.deepEqual(evidence.pageErrors, [], "No uncaught browser page errors")
  const fatalConsoleErrors = evidence.consoleErrors.filter((message) =>
    /uncaught|typeerror|referenceerror|syntaxerror|rangeerror/i.test(message),
  )
  assert.deepEqual(fatalConsoleErrors, [], "No fatal console errors")
  passed("No fatal console or page errors", {
    nonfatalConsoleErrors: evidence.consoleErrors.length,
  })
  evidence.status = "pass"
} catch (error) {
  evidence.status = "fail"
  evidence.error = error.stack || String(error)
  console.error(evidence.error)
  if (page) await screenshot("failure").catch(() => {})
  process.exitCode = 1
} finally {
  evidence.finishedAt = new Date().toISOString()
  await writeFile(
    path.join(outputDir, `${mode}-evidence.json`),
    JSON.stringify(evidence, null, 2) + "\n",
  )
  await browser?.close()
}
