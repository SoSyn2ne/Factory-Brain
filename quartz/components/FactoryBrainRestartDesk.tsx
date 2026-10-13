import type { FullSlug } from "../util/path"
import { resolveSnapshotLink, loadPrivateProjectSnapshot } from "../util/factoryBrainSnapshot"
import type { FactoryBrainModel } from "../util/factoryBrain"
import type { QuartzPluginData } from "../plugins/vfile"

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

function displayTitle(title: string): string {
  return title.replace(/\s+index$/i, "").trim() || title
}

function obsidianHref(path: string): string {
  const projectFile = path.replace(/\/(?:INDEX\.md|index\.md|index)$/i, "")
  return `obsidian://open?vault=${encodeURIComponent("Factory-Brain")}&file=${encodeURIComponent(projectFile)}`
}

function projectNode(model: FactoryBrainModel, projectId: string) {
  return model.projectGalaxy.nodes.find((node) =>
    node.slug.toLowerCase().includes(`/10-projects/${projectId.toLowerCase()}/index`),
  )
}

export function FactoryBrainRestartDesk({
  allFiles,
  currentSlug,
  model,
}: {
  allFiles: readonly QuartzPluginData[]
  currentSlug: FullSlug
  model: FactoryBrainModel
}) {
  const result = loadPrivateProjectSnapshot(allFiles)
  if (!result || result.state !== "ready") return null

  const snapshot = result.snapshot
  const projects = [...snapshot.projects].sort((left, right) => {
    const leftStatus = statusOrder.indexOf(left.status)
    const rightStatus = statusOrder.indexOf(right.status)
    return (
      Number(Boolean(right.nextAction)) - Number(Boolean(left.nextAction)) ||
      (leftStatus < 0 ? statusOrder.length : leftStatus) -
        (rightStatus < 0 ? statusOrder.length : rightStatus) ||
      left.title.localeCompare(right.title)
    )
  })
  const fields = (project: (typeof projects)[number]) => [
    project.lastDecision,
    project.runCommand,
    project.unresolved,
    project.nextAction,
  ]
  const readyProjects = projects.filter((project) => project.nextAction)
  const documentedProjects = projects.filter(
    (project) => fields(project).filter(Boolean).length >= 3,
  )
  const spotlight = readyProjects[0] ?? projects[0]

  const renderField = (label: string, value: string | null, code = false) => (
    <div class={value ? "is-filled" : "is-empty"}>
      <dt>{label}</dt>
      <dd>{value ? code ? <code>{value}</code> : value : "아직 기록 없음"}</dd>
    </div>
  )

  return (
    <section class="fb-restart-desk" data-restart-desk data-visible-count={projects.length}>
      <header class="fb-restart-heading">
        <div>
          <p class="fb-eyebrow">RESTART DESK</p>
          <h3>다시 시작할 곳</h3>
          <p class="fb-restart-lede">
            한 달 뒤 다시 열어도 바로 움직일 수 있게, 프로젝트마다 결정·실행·미해결·다음 행동을 한
            장에 모읍니다.
          </p>
        </div>
        <span class="fb-restart-count" data-restart-count>
          {number(readyProjects.length)}개 다음 행동 기록
        </span>
      </header>

      <div class="fb-restart-summary" aria-label="재시작 기록 상태">
        <div>
          <span>다시 움직일 수 있음</span>
          <strong data-restart-summary="ready">{number(readyProjects.length)}</strong>
        </div>
        <div>
          <span>관리 블록 3칸 이상</span>
          <strong data-restart-summary="documented">{number(documentedProjects.length)}</strong>
        </div>
        <div>
          <span>전체 원장</span>
          <strong data-restart-summary="total">{number(projects.length)}</strong>
        </div>
      </div>

      {spotlight && (
        <article class="fb-restart-spotlight" data-restart-spotlight data-project-id={spotlight.id}>
          <div class="fb-restart-spotlight-head">
            <div>
              <p class="fb-eyebrow">FIRST RE-ENTRY</p>
              <h4>{displayTitle(spotlight.title)}</h4>
              <p>
                {statusLabel(spotlight.status)} · {spotlight.category} · 연결 문서{" "}
                {number(projectNode(model, spotlight.id)?.degree ?? spotlight.relatedLinks.length)}
                개
              </p>
            </div>
            <div class="fb-restart-actions">
              {resolveSnapshotLink(spotlight.path, allFiles, currentSlug) && (
                <a
                  class="fb-primary-button"
                  href={resolveSnapshotLink(spotlight.path, allFiles, currentSlug)!}
                >
                  기록 열기 <span aria-hidden="true">↗</span>
                </a>
              )}
              <a class="fb-secondary-button" href={obsidianHref(spotlight.path)}>
                Obsidian에서 관리
              </a>
            </div>
          </div>
          <dl class="fb-restart-guide">
            {renderField("마지막 결정", spotlight.lastDecision)}
            {renderField("실행 방법", spotlight.runCommand, true)}
            {renderField("미해결", spotlight.unresolved)}
            {renderField("다음 행동", spotlight.nextAction)}
          </dl>
        </article>
      )}

      <div class="fb-restart-toolbar">
        <div class="fb-restart-filters" role="tablist" aria-label="재시작 기록 필터">
          <button type="button" role="tab" aria-selected="false" data-restart-filter="all">
            전체 <span>{number(projects.length)}</span>
          </button>
          <button type="button" role="tab" aria-selected="true" data-restart-filter="ready">
            다음 행동 있음 <span>{number(readyProjects.length)}</span>
          </button>
          <button type="button" role="tab" aria-selected="false" data-restart-filter="missing">
            기록 보강 필요 <span>{number(projects.length - documentedProjects.length)}</span>
          </button>
        </div>
        <label class="fb-restart-search">
          <span>프로젝트 찾기</span>
          <input type="search" placeholder="이름·상태·카테고리" data-restart-search />
        </label>
      </div>

      <div class="fb-restart-list" role="tabpanel" data-restart-list>
        {projects.map((project) => {
          const href = resolveSnapshotLink(project.path, allFiles, currentSlug)
          const node = projectNode(model, project.id)
          const filled = fields(project).filter(Boolean).length
          const searchable =
            `${project.title} ${project.status} ${project.category}`.toLocaleLowerCase()
          return (
            <article
              class="fb-restart-row"
              data-restart-row
              data-restart-status={project.status}
              data-restart-ready={String(Boolean(project.nextAction))}
              data-restart-complete={String(filled >= 3)}
              data-restart-search-value={searchable}
              key={project.id}
            >
              <div class="fb-restart-row-main">
                <div>
                  <p class="fb-restart-meta">
                    <span data-status-dot={project.status} />
                    {statusLabel(project.status)} · {project.category}
                  </p>
                  <h4>
                    {href ? (
                      <a class="internal" href={href}>
                        {displayTitle(project.title)}
                      </a>
                    ) : (
                      displayTitle(project.title)
                    )}
                  </h4>
                  <p class="fb-restart-next">
                    <span>다음 행동</span>
                    {project.nextAction ?? "다음 행동을 기록하세요"}
                  </p>
                </div>
                <div class="fb-restart-row-stats">
                  <strong>{number(filled)}/4</strong>
                  <span>재시작 기록</span>
                  <small>연결 {number(node?.degree ?? project.relatedLinks.length)}개</small>
                </div>
              </div>
              <div class="fb-restart-row-actions">
                {href && (
                  <a class="fb-text-link" href={href}>
                    프로젝트 열기 ↗
                  </a>
                )}
                <a class="fb-text-link" href={obsidianHref(project.path)}>
                  Obsidian 편집
                </a>
              </div>
            </article>
          )
        })}
        <p class="fb-restart-empty" data-restart-empty hidden>
          지금 조건에 맞는 프로젝트가 없습니다.
        </p>
      </div>

      <p class="fb-restart-contract">
        운영 규칙: 프로젝트 INDEX의 <strong>마지막 결정 · 실행 방법 · 미해결 · 다음 행동</strong> 네
        칸만 갱신하면 이 화면이 다음 빌드에 다시 시작 설명서가 됩니다.
      </p>
    </section>
  )
}
