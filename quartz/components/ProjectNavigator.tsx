import { FullSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { QuartzComponent, QuartzComponentProps } from "./types"

export interface ProjectNavigationEntry {
  name: string
  slug: FullSlug
}

export function formatProjectName(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

export function collectProjectNavigation(
  allFiles: Array<Pick<QuartzPluginData, "slug" | "frontmatter">>,
): ProjectNavigationEntry[] {
  const entries = new Map<string, ProjectNavigationEntry>()

  for (const file of allFiles) {
    const slug = file.slug
    if (!slug) continue

    const match = /^10-projects\/([^/]+)\/index$/i.exec(slug)
    if (!match) continue

    const segment = match[1]
    const title = file.frontmatter?.title
    const name =
      typeof title === "string" && !/^index$/i.test(title)
        ? formatProjectName(title)
        : formatProjectName(segment)

    entries.set(segment.toLowerCase(), { name, slug })
  }

  return [...entries.values()].sort((a, b) => {
    const aIsMain = a.slug === "10-projects/main/index"
    const bIsMain = b.slug === "10-projects/main/index"
    if (aIsMain !== bIsMain) return aIsMain ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  })
}

export const ProjectNavigator: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const slug = fileData.slug
  if (slug !== "index" && slug !== "00-index/project-portfolio") {
    return null
  }

  const projects = collectProjectNavigation(allFiles)
  if (projects.length === 0) return null

  const portfolioHref = resolveRelative(slug, "00-index/project-portfolio" as FullSlug)

  return (
    <nav class="project-navigator" aria-labelledby="project-navigator-title">
      <div class="project-navigator-header">
        <div>
          <p class="project-navigator-kicker">Workspace Map</p>
          <h2 id="project-navigator-title">Projects</h2>
        </div>
        <a class="project-portfolio-link internal-link" href={portfolioHref}>
          Project Portfolio <span aria-hidden="true">→</span>
        </a>
      </div>
      <ul class="project-navigator-list">
        {projects.map((project) => (
          <li>
            <a
              class="project-navigator-link internal-link"
              href={resolveRelative(slug, project.slug)}
            >
              <span class="project-navigator-dot" aria-hidden="true" />
              <span>{project.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
