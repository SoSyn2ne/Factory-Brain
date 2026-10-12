import type { FullSlug } from "../util/path"
import { resolveRelative } from "../util/path"
import type { FactoryBrainModel, FactoryBrainNode } from "../util/factoryBrain"

const statusLabels: Record<string, string> = {
  active: "진행 중",
  experiment: "실험",
  reference: "기반",
  research: "연구",
  paused: "대기",
  미지정: "미지정",
}

const statusOrder = ["active", "experiment", "reference", "research", "paused", "미지정"]

const number = (value: number) => value.toLocaleString("ko-KR")

function statusLabel(status: string): string {
  return statusLabels[status] ?? status
}

function projectSort(a: FactoryBrainNode, b: FactoryBrainNode): number {
  const statusDifference =
    statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) ||
    a.status.localeCompare(b.status)
  return (
    statusDifference ||
    b.inbound + b.outbound - (a.inbound + a.outbound) ||
    a.title.localeCompare(b.title)
  )
}

function projectRows(model: FactoryBrainModel, currentSlug: FullSlug) {
  const projects = [...model.projectGalaxy.nodes].sort(projectSort)
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const neighbors = new Map<string, Set<string>>(
    projects.map((project) => [project.id, new Set<string>()]),
  )
  for (const link of model.projectGalaxy.links) {
    neighbors.get(link.source)?.add(link.target)
    neighbors.get(link.target)?.add(link.source)
  }
  const maxConnections = Math.max(
    1,
    ...projects.map((project) => project.inbound + project.outbound),
  )
  return projects.map((project) => {
    const connections = project.inbound + project.outbound
    return {
      ...project,
      connections,
      connectionWidth: `${Math.max(6, (connections / maxConnections) * 100)}%`,
      href: resolveRelative(currentSlug, project.slug),
      search: `${project.title} ${project.category ?? ""} ${project.status}`.toLocaleLowerCase(),
      neighbors: [...(neighbors.get(project.id) ?? [])]
        .map((id) => projectById.get(id))
        .filter((neighbor): neighbor is FactoryBrainNode => Boolean(neighbor))
        .sort(projectSort)
        .map((neighbor) => ({
          id: neighbor.id,
          title: neighbor.title,
          href: resolveRelative(currentSlug, neighbor.slug),
        })),
    }
  })
}

export function FactoryBrainPortfolio({
  model,
  currentSlug,
}: {
  model: FactoryBrainModel
  currentSlug: FullSlug
}) {
  const rows = projectRows(model, currentSlug)
  const statusCounts = new Map<string, number>()
  for (const row of rows) statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1)
  const mostConnected = rows[0]
  const unconnected = rows.filter((row) => row.connections === 0).length

  return (
    <section class="fb-portfolio-focus" data-portfolio-focus data-visible-count={rows.length}>
      <header class="fb-portfolio-heading">
        <div>
          <p class="fb-eyebrow">PORTFOLIO VIEW</p>
          <h3>어디부터 볼까</h3>
          <p class="fb-portfolio-lede">
            Galaxy는 관계를 찾고, 이 화면은 지금 살펴볼 프로젝트를 고르는 데 집중합니다.
          </p>
        </div>
        <p class="fb-portfolio-count" data-portfolio-count>
          {number(rows.length)}개 원장
        </p>
      </header>

      <div class="fb-portfolio-signals" aria-label="프로젝트 신호">
        <div>
          <span>진행 중</span>
          <strong>{number(statusCounts.get("active") ?? 0)}</strong>
        </div>
        <div>
          <span>가장 많이 연결됨</span>
          <strong>{mostConnected ? mostConnected.title : "없음"}</strong>
        </div>
        <div>
          <span>아직 연결 없음</span>
          <strong>{number(unconnected)}</strong>
        </div>
      </div>

      {mostConnected && (
        <section
          class="fb-portfolio-detail"
          data-portfolio-detail
          data-default-project={mostConnected.id}
          aria-labelledby="fb-portfolio-detail-title"
        >
          <div class="fb-portfolio-detail-heading">
            <div>
              <p class="fb-eyebrow">DECOMPOSED VIEW</p>
              <h4 id="fb-portfolio-detail-title" data-portfolio-detail-title>
                {mostConnected.title}
              </h4>
            </div>
            <span data-portfolio-detail-path>
              전체 / {statusLabel(mostConnected.status)} / {mostConnected.category ?? "미지정"}
            </span>
          </div>
          <div class="fb-portfolio-detail-grid">
            <div>
              <span>상태</span>
              <strong data-portfolio-detail-status>{statusLabel(mostConnected.status)}</strong>
            </div>
            <div>
              <span>연결</span>
              <strong data-portfolio-detail-connections>
                {number(mostConnected.connections)}개
              </strong>
            </div>
            <div>
              <span>프로젝트 관계</span>
              <strong data-portfolio-detail-degree>{number(mostConnected.degree)}개</strong>
            </div>
          </div>
          <div class="fb-portfolio-related">
            <span>연결된 프로젝트</span>
            <div data-portfolio-detail-related>
              {mostConnected.neighbors.length === 0 ? (
                <em>직접 연결된 프로젝트 없음</em>
              ) : (
                mostConnected.neighbors.map((neighbor) => (
                  <a class="internal" href={neighbor.href} key={neighbor.id}>
                    {neighbor.title}
                  </a>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <div class="fb-portfolio-toolbar">
        <div class="fb-portfolio-filters" role="tablist" aria-label="프로젝트 상태 필터">
          <button type="button" role="tab" aria-selected="true" data-portfolio-filter="all">
            전체 <span>{number(rows.length)}</span>
          </button>
          {statusOrder
            .filter((status) => statusCounts.has(status))
            .map((status) => (
              <button
                type="button"
                role="tab"
                aria-selected="false"
                data-portfolio-filter={status}
                key={status}
              >
                {statusLabel(status)} <span>{number(statusCounts.get(status) ?? 0)}</span>
              </button>
            ))}
        </div>
        <label class="fb-portfolio-search">
          <span>프로젝트 찾기</span>
          <input type="search" placeholder="이름·분류·상태" data-portfolio-search />
        </label>
      </div>

      <div class="fb-portfolio-list" role="tabpanel" data-portfolio-list>
        {rows.map((project) => (
          <article
            class="fb-portfolio-row"
            data-portfolio-row
            data-project-id={project.id}
            data-status={project.status}
            data-search={project.search}
            data-title={project.title}
            data-category={project.category ?? "미지정"}
            data-connections={project.connections}
            data-degree={project.degree}
            data-neighbors={JSON.stringify(project.neighbors)}
            key={project.id}
          >
            <div class="fb-portfolio-row-main">
              <div>
                <p class="fb-portfolio-status">
                  <span data-status-dot={project.status} />
                  {statusLabel(project.status)} · {project.category ?? "미지정"}
                </p>
                <h4>
                  <a class="internal" href={project.href}>
                    {project.title}
                  </a>
                </h4>
              </div>
              <p class="fb-portfolio-links">
                <strong>{number(project.connections)}</strong> 연결
                <small>프로젝트 관계 {number(project.degree)}개</small>
              </p>
            </div>
            <div class="fb-portfolio-row-actions">
              <button
                type="button"
                class="fb-portfolio-select"
                data-portfolio-select
                data-project-id={project.id}
                aria-pressed={project.id === mostConnected?.id}
              >
                분해해서 보기
              </button>
            </div>
            <div class="fb-portfolio-inline-detail" data-portfolio-inline-detail hidden>
              <p class="fb-eyebrow">SELECTED PROJECT</p>
              <strong data-portfolio-inline-title>{project.title}</strong>
              <span data-portfolio-inline-meta>
                {statusLabel(project.status)} · {project.category ?? "미지정"} ·{" "}
                {number(project.connections)}개 연결
              </span>
              <div data-portfolio-inline-related>
                {project.neighbors.length === 0 ? (
                  <em>직접 연결된 프로젝트 없음</em>
                ) : (
                  project.neighbors.map((neighbor) => (
                    <a class="internal" href={neighbor.href} key={neighbor.id}>
                      {neighbor.title}
                    </a>
                  ))
                )}
              </div>
            </div>
            <div class="fb-portfolio-bar" aria-hidden="true">
              <span style={{ width: project.connectionWidth }} />
            </div>
          </article>
        ))}
        <p class="fb-portfolio-empty" data-portfolio-empty hidden>
          지금 조건에 맞는 프로젝트가 없습니다.
        </p>
      </div>
    </section>
  )
}
