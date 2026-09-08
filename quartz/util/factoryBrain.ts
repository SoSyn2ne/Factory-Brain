import type { Element, Root, RootContent } from "hast"
import type { QuartzPluginData } from "../plugins/vfile"
import { isFullSlug, simplifySlug, type FullSlug } from "./path"

export interface FactoryBrainNode {
  id: string
  slug: FullSlug
  title: string
  project: string | null
  category: string | null
  status: string
  tags: string[]
  kind: "project" | "reference" | "document"
  inbound: number
  outbound: number
  degree: number
}

export interface FactoryBrainLink {
  source: string
  target: string
}

interface DistributionRow {
  key: string
  label: string
  value: number
}

export interface FactoryBrainModel {
  metrics: {
    publicPages: number
    projects: number
    activeProjects: number
    experimentProjects: number
    referenceDocuments: number
    internalLinks: number
    connectedNodes: number
    isolatedDocuments: number
  }
  statusDistribution: DistributionRow[]
  categoryDistribution: DistributionRow[]
  topProjects: (FactoryBrainNode & { value: number })[]
  nodes: FactoryBrainNode[]
  links: FactoryBrainLink[]
  scope: "public-content"
  unresolvedPortfolioLinks: string[]
}

type PublicFile = QuartzPluginData & { slug: FullSlug }

function isTrue(value: unknown): boolean {
  return value === true || value === "true"
}

function isPublicContent(file: QuartzPluginData): file is PublicFile {
  const fm = file.frontmatter
  // Parsed source pages have filePath. Generated folder/tag/404 pages only have
  // relativePath, so they must never inflate the document or project counts.
  return (
    typeof file.filePath === "string" &&
    file.filePath.length > 0 &&
    typeof file.slug === "string" &&
    isFullSlug(file.slug) &&
    !isTrue(file.unlisted) &&
    !isTrue(file.encrypted) &&
    !isTrue(fm?.unlisted) &&
    !isTrue(fm?.draft) &&
    !isTrue(fm?.private) &&
    fm?.publish !== false &&
    fm?.publish !== "false"
  )
}

function canonicalId(slug: string): string | undefined {
  const path = slug.split(/[?#]/, 1)[0].replace(/(^|\/)index$/i, "$1index")
  const full = path === "/" ? "index" : path.endsWith("/") ? `${path}index` : path
  return full && isFullSlug(full) ? simplifySlug(full) : undefined
}

/** Only an explicitly opted-in public build gets the dashboard and its styles. */
export function hasPublicFactoryBrainScope(allFiles: readonly QuartzPluginData[]): boolean {
  return allFiles.some(
    (file) =>
      isPublicContent(file) &&
      canonicalId(file.slug) === "/" &&
      file.frontmatter?.factory_brain_scope === "public-content",
  )
}

function documentTitle(file: PublicFile): string {
  const title = file.frontmatter?.title?.trim()
  if (title && !/^index$/i.test(title)) return title
  const segments = file.slug.split("/")
  if (/^index$/i.test(segments.at(-1) ?? "")) segments.pop()
  return (segments.at(-1) ?? file.slug).replace(/-/g, " ")
}

function textContent(node: Root | RootContent): string {
  if (node.type === "text") return node.value
  return "children" in node ? node.children.map(textContent).join("") : ""
}

interface PortfolioLink {
  id: string
  category: string
}

function portfolioLinks(file: PublicFile): PortfolioLink[] {
  const links: PortfolioLink[] = []
  let category = "미지정"

  function collect(node: RootContent, inList: boolean): void {
    if (node.type !== "element") return
    if (node.tagName === "li") inList = true
    if (inList && node.tagName === "a") {
      // CrawlLinks has already applied Quartz's alias/path resolution. Using
      // that target avoids interpreting code samples or guessing note names.
      const target = node.properties["data-slug"] ?? node.properties.dataSlug
      const id = typeof target === "string" ? canonicalId(target) : undefined
      if (id) links.push({ id, category })
    }
    node.children.forEach((child) => collect(child, inList))
  }

  for (const node of file.htmlAst?.children ?? []) {
    if (node.type === "element" && /^h[12]$/.test(node.tagName)) {
      category = node.tagName === "h2" ? headingText(node) : "미지정"
    } else {
      collect(node, false)
    }
  }
  return links
}

function headingText(node: Element): string {
  // Heading permalink icons are UI, not part of the Portfolio category name.
  return (
    node.children
      .filter(
        (child) =>
          child.type !== "element" ||
          !String(child.properties.className ?? "").includes("icon-header"),
      )
      .map(textContent)
      .join("")
      .trim() || "미지정"
  )
}

function metadataTags(file: PublicFile): string[] {
  return (file.frontmatter?.tags ?? []).map((tag) => tag.toLowerCase().trim())
}

const knownStatuses = ["active", "experiment", "reference", "research", "paused"]

function projectStatus(file: PublicFile): string {
  const status = file.frontmatter?.status
  if (typeof status === "string" && status.trim()) return status.trim().toLowerCase()
  const tags = metadataTags(file)
  return knownStatuses.find((candidate) => tags.includes(candidate)) ?? "미지정"
}

function distribution(counts: Map<string, number>): DistributionRow[] {
  return [...counts].map(([label, value]) => ({ key: label, label, value }))
}

/**
 * Consume the already filtered allFiles from Quartz's page dispatcher. No
 * filesystem access, private vault imports, or invented Portfolio nodes.
 */
export function getPublicFactoryBrainModel(
  allFiles: readonly QuartzPluginData[],
): FactoryBrainModel | null {
  if (!hasPublicFactoryBrainScope(allFiles)) return null

  const files = new Map<string, PublicFile>()
  for (const file of allFiles) {
    if (!isPublicContent(file)) continue
    const id = canonicalId(file.slug)
    if (id && !files.has(id)) files.set(id, file)
  }

  const nodes = [...files].map(([id, file]) => ({
    id,
    slug: file.slug,
    title: documentTitle(file),
  }))
  const neighbors = new Map(nodes.map((node) => [node.id, new Set<string>()]))
  const inbound = new Map(nodes.map((node) => [node.id, 0]))
  const outbound = new Map(nodes.map((node) => [node.id, 0]))
  const links: FactoryBrainLink[] = []
  let internalLinks = 0
  for (const [source, file] of files) {
    const targets = new Set((file.links ?? []).map(canonicalId))
    for (const target of targets) {
      if (!target || target === source || !files.has(target)) continue
      internalLinks++
      links.push({ source, target })
      outbound.set(source, (outbound.get(source) ?? 0) + 1)
      inbound.set(target, (inbound.get(target) ?? 0) + 1)
      neighbors.get(source)?.add(target)
      neighbors.get(target)?.add(source)
    }
  }

  const portfolio = [...files.values()].find((file) => /(^|\/)project-portfolio$/i.test(file.slug))
  const projects = new Set<string>()
  const categories = new Map<string, Set<string>>()
  const categoryById = new Map<string, string>()
  const unresolved = new Set<string>()
  const referenceProjects = new Set<string>()
  for (const link of portfolio ? portfolioLinks(portfolio) : []) {
    if (!files.has(link.id)) {
      unresolved.add(link.id)
      continue
    }
    if (link.id === canonicalId(portfolio!.slug) || link.id === "/") continue
    projects.add(link.id)
    categoryById.set(link.id, link.category)
    const members = categories.get(link.category) ?? new Set<string>()
    members.add(link.id)
    categories.set(link.category, members)
    if (/\bresearch\b|\breference\b|참고|연구/i.test(link.category)) referenceProjects.add(link.id)
  }

  const statuses = new Map<string, number>()
  for (const id of projects) {
    const status = projectStatus(files.get(id)!)
    statuses.set(status, (statuses.get(status) ?? 0) + 1)
  }
  const referenceNodeIds = new Set(
    [...files]
      .filter(([id, file]) => {
        const metadata = [projectStatus(file), ...metadataTags(file)]
        return (
          referenceProjects.has(id) ||
          metadata.some((value) => /^(reference|research)$/.test(value))
        )
      })
      .map(([id]) => id),
  )
  const referenceDocuments = referenceNodeIds.size
  const graphNodes: FactoryBrainNode[] = nodes.map((node) => {
    const file = files.get(node.id)!
    const tags = metadataTags(file)
    const degree = neighbors.get(node.id)?.size ?? 0
    return {
      ...node,
      project: projects.has(node.id) ? node.title : null,
      category: categoryById.get(node.id) ?? (referenceNodeIds.has(node.id) ? "참고·연구" : null),
      status: projectStatus(file),
      tags,
      kind: projects.has(node.id)
        ? "project"
        : referenceNodeIds.has(node.id)
          ? "reference"
          : "document",
      inbound: inbound.get(node.id) ?? 0,
      outbound: outbound.get(node.id) ?? 0,
      degree,
    }
  })

  const connectedNodes = [...neighbors.values()].filter((nodeLinks) => nodeLinks.size > 0).length

  return {
    metrics: {
      publicPages: graphNodes.length,
      projects: projects.size,
      activeProjects: statuses.get("active") ?? 0,
      experimentProjects: statuses.get("experiment") ?? 0,
      referenceDocuments,
      internalLinks,
      connectedNodes,
      isolatedDocuments: graphNodes.length - connectedNodes,
    },
    statusDistribution: distribution(statuses),
    categoryDistribution: distribution(
      new Map([...categories].map(([category, members]) => [category, members.size])),
    ),
    topProjects: graphNodes
      .filter((node) => projects.has(node.id))
      .map((node) => ({ ...node, value: node.degree }))
      .sort((a, b) => b.value - a.value || a.title.localeCompare(b.title))
      .slice(0, 5),
    nodes: graphNodes,
    links,
    scope: "public-content",
    unresolvedPortfolioLinks: [...unresolved],
  }
}
