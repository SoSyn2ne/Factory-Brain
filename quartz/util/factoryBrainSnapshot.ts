import fs from "node:fs"
import type { QuartzPluginData } from "../plugins/vfile"
import { hasPrivateFactoryBrainScope } from "./factoryBrain"
import { isFullSlug, resolveRelative, type FilePath, type FullSlug } from "./path"

export interface FactoryBrainSnapshotProject {
  id: string
  title: string
  status: string
  category: string
  path: string
  nextAction: string | null
  relatedLinks: string[]
}

export interface FactoryBrainSnapshotWarning {
  projectId: string
  type: "missing-index" | "missing-status" | "missing-category"
  message: string
}

/** Presentation projection of collector schema v1, without local machine paths. */
export interface FactoryBrainSnapshot {
  schemaVersion: 1
  generatedAt: string
  source: { projectDirectory: string; mode: "read-only-index-scan" }
  summary: {
    projectCount: number
    statusCounts: Record<string, number>
    categoryCounts: Record<string, number>
    projectsWithNextAction: number
    projectsWithRelatedLinks: number
    warningCount: number
  }
  projects: FactoryBrainSnapshotProject[]
  warnings: FactoryBrainSnapshotWarning[]
}

export type SnapshotLoadResult =
  | { state: "unavailable" }
  | { state: "invalid" }
  | { state: "ready"; snapshot: FactoryBrainSnapshot }

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

function safeRelativePath(value: unknown): value is string {
  return (
    nonempty(value) &&
    value === value.trim() &&
    !/[\\:%?#\u0000-\u001f\u007f]/.test(value) &&
    value.split("/").every((part) => part.trim() !== "" && part !== "." && part !== "..")
  )
}

function safeId(value: unknown): value is string {
  return safeRelativePath(value) && !value.includes("/")
}

function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  )
}

function distribution(projects: FactoryBrainSnapshotProject[], field: "status" | "category") {
  const counts = new Map<string, number>()
  for (const project of projects) counts.set(project[field], (counts.get(project[field]) ?? 0) + 1)
  return Object.fromEntries(counts)
}

function matchesCounts(value: unknown, expected: Record<string, number>): boolean {
  return (
    object(value) &&
    Object.keys(value).length === Object.keys(expected).length &&
    Object.entries(expected).every(
      ([key, count]) => Object.hasOwn(value, key) && value[key] === count,
    )
  )
}

/** Validate evidence rather than repairing inconsistent summaries or deriving metadata. */
export function decodeFactoryBrainSnapshot(value: unknown): FactoryBrainSnapshot | null {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !validDate(value.generatedAt) ||
    !object(value.source) ||
    value.source.projectDirectory !== "10-projects" ||
    value.source.mode !== "read-only-index-scan" ||
    !object(value.summary) ||
    !Array.isArray(value.projects) ||
    !Array.isArray(value.warnings)
  ) {
    return null
  }

  const projects: FactoryBrainSnapshotProject[] = []
  const projectIds = new Set<string>()
  for (const project of value.projects) {
    if (
      !object(project) ||
      !safeId(project.id) ||
      projectIds.has(project.id) ||
      !nonempty(project.title) ||
      !nullableText(project.status) ||
      !nullableText(project.category) ||
      !safeRelativePath(project.path) ||
      !nullableText(project.nextAction) ||
      !Array.isArray(project.relatedLinks) ||
      !project.relatedLinks.every(nonempty)
    ) {
      return null
    }

    const segments = project.path.split("/")
    if (
      segments.length !== 3 ||
      segments[0] !== value.source.projectDirectory ||
      segments[1] !== project.id ||
      !/^(INDEX\.md|index\.md|index)$/.test(segments[2])
    ) {
      return null
    }

    projectIds.add(project.id)
    projects.push({
      id: project.id,
      title: project.title.trim(),
      status: project.status?.trim() || "미지정",
      category: project.category?.trim() || "미지정",
      path: project.path,
      nextAction: project.nextAction?.trim() || null,
      relatedLinks: [...project.relatedLinks],
    })
  }

  const warnings: FactoryBrainSnapshotWarning[] = []
  const warningKeys = new Set<string>()
  for (const warning of value.warnings) {
    if (
      !object(warning) ||
      !safeId(warning.projectId) ||
      !nonempty(warning.message) ||
      (warning.type !== "missing-index" &&
        warning.type !== "missing-status" &&
        warning.type !== "missing-category")
    ) {
      return null
    }
    const project = projects.find((entry) => entry.id === warning.projectId)
    const key = `${warning.projectId}/${warning.type}`
    if (
      warningKeys.has(key) ||
      (warning.type === "missing-index" && project) ||
      (warning.type === "missing-status" && project?.status !== "미지정") ||
      (warning.type === "missing-category" && project?.category !== "미지정")
    ) {
      return null
    }
    warningKeys.add(key)
    warnings.push({ projectId: warning.projectId, type: warning.type, message: warning.message })
  }

  const summary: FactoryBrainSnapshot["summary"] = {
    projectCount: projects.length,
    statusCounts: distribution(projects, "status"),
    categoryCounts: distribution(projects, "category"),
    projectsWithNextAction: projects.filter((project) => project.nextAction !== null).length,
    projectsWithRelatedLinks: projects.filter((project) => project.relatedLinks.length > 0).length,
    warningCount: warnings.length,
  }
  for (const field of [
    "projectCount",
    "projectsWithNextAction",
    "projectsWithRelatedLinks",
    "warningCount",
  ] as const) {
    if (value.summary[field] !== summary[field]) return null
  }
  if (
    !matchesCounts(value.summary.statusCounts, summary.statusCounts) ||
    !matchesCounts(value.summary.categoryCounts, summary.categoryCounts)
  ) {
    return null
  }

  return {
    schemaVersion: 1,
    generatedAt: value.generatedAt,
    source: { projectDirectory: value.source.projectDirectory, mode: value.source.mode },
    summary,
    projects,
    warnings,
  }
}

/** Build-server only. Public builds never open the configured snapshot file. */
export function loadPrivateProjectSnapshot(
  allFiles: readonly QuartzPluginData[],
  snapshotPath = process.env.FACTORY_BRAIN_PROJECT_SNAPSHOT,
): SnapshotLoadResult | null {
  if (!hasPrivateFactoryBrainScope(allFiles)) return null
  if (!snapshotPath?.trim()) return { state: "unavailable" }

  let input: string
  try {
    input = fs.readFileSync(snapshotPath, "utf8")
  } catch {
    return { state: "unavailable" }
  }
  try {
    const snapshot = decodeFactoryBrainSnapshot(JSON.parse(input))
    return snapshot ? { state: "ready", snapshot } : { state: "invalid" }
  } catch {
    return { state: "invalid" }
  }
}

function linkKey(value: string): string {
  return value.normalize("NFC").toLowerCase().replace(/\.md$/, "")
}

function relativeTarget(target: string, sourcePath: string | undefined): string | null {
  if (!safeRelativePath(sourcePath)) return null
  const segments = sourcePath.split("/").slice(0, -1)
  for (const part of target.split("/")) {
    if (part === ".") continue
    if (part === "..") {
      if (segments.length === 0) return null
      segments.pop()
    } else {
      if (!safeId(part)) return null
      segments.push(part)
    }
  }
  return segments.join("/")
}

/** Resolve only actual parsed notes; never guess a URL for an absent or ambiguous note. */
export function resolveSnapshotLink(
  target: string,
  allFiles: readonly QuartzPluginData[],
  currentSlug: FullSlug,
  sourcePath?: string,
): string | null {
  const isRelative = /^\.\.?\//.test(target)
  const resolvedTarget = isRelative ? relativeTarget(target, sourcePath) : target
  if (!safeRelativePath(resolvedTarget) || !isFullSlug(currentSlug)) return null
  const key = linkKey(resolvedTarget)
  const exact = isRelative || resolvedTarget.includes("/")
  const sources = allFiles.filter(
    (file): file is QuartzPluginData & { relativePath: FilePath; slug: FullSlug } =>
      nonempty(file.filePath) &&
      safeRelativePath(file.relativePath) &&
      typeof file.slug === "string" &&
      safeRelativePath(file.slug) &&
      isFullSlug(file.slug),
  )
  const matches = sources.filter((file) =>
    [linkKey(file.relativePath), linkKey(file.slug)].some(
      (candidate) => candidate === key || (!exact && candidate.endsWith(`/${key}`)),
    ),
  )
  if (matches.length !== 1) return null
  const match = matches[0]
  if (sources.filter((file) => linkKey(file.slug) === linkKey(match.slug)).length !== 1) return null
  return resolveRelative(currentSlug, match.slug)
}
