import type { QuartzPluginData } from "../plugins/vfile"
import type { FullSlug } from "../util/path"
import { loadPrivateProjectSnapshot, resolveSnapshotLink } from "../util/factoryBrainSnapshot"

const count = (value: number) => value.toLocaleString("ko-KR")
const warningLabels: Record<string, string> = {
  "missing-status": "상태 미지정",
  "missing-category": "카테고리 미지정",
  "missing-index": "INDEX 없음",
}

export function FactoryBrainSnapshotPanel({
  allFiles,
  currentSlug,
}: {
  allFiles: readonly QuartzPluginData[]
  currentSlug: FullSlug
}) {
  const result = loadPrivateProjectSnapshot(allFiles)
  if (!result) return null
  const snapshot = result.state === "ready" ? result.snapshot : null
  const state = snapshot?.projects.length === 0 ? "empty" : result.state
  const link = (target: string, label: string, sourcePath?: string) => {
    const href = resolveSnapshotLink(target, allFiles, currentSlug, sourcePath)
    return href ? (
      <a class="internal" href={href}>
        {label}
      </a>
    ) : (
      <span>{label} · 웹 문서 없음</span>
    )
  }

  return (
    <section
      class="fb-snapshot"
      data-project-snapshot
      data-snapshot-state={state}
      aria-labelledby="fb-snapshot-title"
    >
      <header>
        <p class="fb-eyebrow">PROJECT LEDGER</p>
        <h3 id="fb-snapshot-title">프로젝트 원장</h3>
        <p class="fb-scope">Vault의 INDEX 기록을 한곳에 모았습니다. 빌드할 때 갱신됩니다.</p>
      </header>
      {!snapshot ? (
        <p class="fb-empty" role="status">
          데이터 없음 ·{" "}
          {result.state === "invalid"
            ? "스냅샷 형식 또는 집계가 맞지 않습니다. 수집 결과를 확인해 주세요."
            : "스냅샷이 연결되지 않았거나 읽을 수 없습니다."}
        </p>
      ) : (
        <>
          <p class="fb-scope">
            수집 시각{" "}
            <time dateTime={snapshot.generatedAt}>
              {new Date(snapshot.generatedAt).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                hour12: false,
              })}{" "}
              KST
            </time>{" "}
            · {snapshot.source.projectDirectory}/*/INDEX · 빌드 시점 기준
          </p>
          <dl class="fb-snapshot-counts">
            {[
              ["projects", "프로젝트", snapshot.summary.projectCount],
              ["next-actions", "다음 행동 있음", snapshot.summary.projectsWithNextAction],
              [
                "cleanup",
                "정리 필요 프로젝트",
                new Set(snapshot.warnings.map((w) => w.projectId)).size,
              ],
              ["warnings", "메타데이터 경고", snapshot.summary.warningCount],
            ].map(([key, label, value]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd data-snapshot-count={key}>{count(Number(value))}</dd>
              </div>
            ))}
          </dl>
          {snapshot.projects.length === 0 && (
            <p class="fb-empty" role="status">
              데이터 없음 · 수집된 프로젝트 INDEX가 없습니다.
            </p>
          )}
          <ul class="fb-snapshot-statuses" aria-label="INDEX에 명시된 프로젝트 상태">
            {Object.entries(snapshot.summary.statusCounts).map(([status, value]) => (
              <li key={status} data-snapshot-status={status} data-count={value}>
                <span>{status}</span> <strong>{count(value)}</strong>
              </li>
            ))}
          </ul>
          <details data-snapshot-actions open>
            <summary>
              다음 행동 · {count(snapshot.summary.projectsWithNextAction)}개 프로젝트
            </summary>
            {snapshot.summary.projectsWithNextAction === 0 ? (
              <p class="fb-empty">데이터 없음 · 기록된 다음 행동이 없습니다.</p>
            ) : (
              <ul class="fb-snapshot-actions">
                {snapshot.projects
                  .filter((project) => project.nextAction)
                  .map((project) => (
                    <li key={project.id}>
                      <strong>{link(project.path, project.title)}</strong>
                      <p data-snapshot-next-action={project.id}>{project.nextAction}</p>
                    </li>
                  ))}
              </ul>
            )}
          </details>
          <details data-snapshot-warnings>
            <summary>메타데이터 정리 · 경고 {count(snapshot.summary.warningCount)}건</summary>
            {snapshot.warnings.length === 0 ? (
              <p class="fb-empty">메타데이터 경고 없음</p>
            ) : (
              <ul class="fb-snapshot-warnings">
                {[...new Set(snapshot.warnings.map((warning) => warning.projectId))].map((id) => {
                  const project = snapshot.projects.find((item) => item.id === id)
                  return (
                    <li key={id} data-snapshot-warning-project={id}>
                      <strong>{project ? link(project.path, project.title) : id}</strong>
                      <span>
                        {snapshot.warnings
                          .filter((warning) => warning.projectId === id)
                          .map((warning) => warningLabels[warning.type] ?? warning.message)
                          .join(" · ")}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </details>
          <details data-snapshot-records>
            <summary>전체 프로젝트 · 상태 / 카테고리 / 관련 문서</summary>
            <p class="fb-scope">
              INDEX에 없는 메타데이터는 미지정입니다. 웹에 포함된 문서만 링크합니다.
            </p>
            <div
              class="fb-table-scroll"
              role="region"
              aria-label="수집된 프로젝트 목록"
              tabIndex={0}
            >
              <table>
                <caption>수집된 프로젝트 INDEX · {count(snapshot.summary.projectCount)}개</caption>
                <thead>
                  <tr>
                    <th scope="col">프로젝트 / INDEX</th>
                    <th scope="col">상태 / 카테고리</th>
                    <th scope="col">다음 행동 / 관련 문서</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.projects.map((project) => {
                    const href = resolveSnapshotLink(project.path, allFiles, currentSlug)
                    return (
                      <tr
                        key={project.id}
                        data-snapshot-project={project.id}
                        data-status={project.status}
                        data-category={project.category}
                      >
                        <th scope="row">
                          {href ? (
                            <a class="internal" data-snapshot-index href={href}>
                              {project.title}
                            </a>
                          ) : (
                            <span>{project.title} · 웹 문서 없음</span>
                          )}
                          <small>{project.path}</small>
                        </th>
                        <td>
                          <span>{project.status}</span>
                          <small>{project.category}</small>
                        </td>
                        <td>
                          <span>{project.nextAction ? "다음 행동 있음" : "데이터 없음"}</span>
                          <details>
                            <summary>관련 문서 {count(project.relatedLinks.length)}개</summary>
                            {project.relatedLinks.length === 0 ? (
                              <p class="fb-empty">데이터 없음</p>
                            ) : (
                              <ul>
                                {project.relatedLinks.map((target) => (
                                  <li key={target}>{link(target, target, project.path)}</li>
                                ))}
                              </ul>
                            )}
                          </details>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p class="fb-scope">
              카테고리:{" "}
              {Object.entries(snapshot.summary.categoryCounts)
                .map(([category, value]) => `${category} ${count(value)}`)
                .join(" · ") || "데이터 없음"}
            </p>
          </details>
        </>
      )}
    </section>
  )
}
