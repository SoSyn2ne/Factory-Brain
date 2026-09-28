import { QuartzComponent, QuartzComponentProps } from "./types"
import { getFactoryBrainModel, FactoryBrainModel } from "../util/factoryBrain"
import { resolveRelative } from "../util/path"

const number = (value: number) => value.toLocaleString("ko-KR")

export function factoryBrainStatistics(model: FactoryBrainModel, isPrivate = false) {
  const m = model.metrics
  return [
    {
      key: "public-pages",
      label: isPrivate ? "Vault 문서" : "공개 문서",
      value: m.publicPages,
      unit: "개",
      description: isPrivate
        ? "private-full 원본의 실제 Markdown 문서. 자동 생성 목록 제외"
        : "공개 content의 실제 문서. 자동 생성 목록 제외",
    },
    {
      key: "projects",
      label: "프로젝트",
      value: m.projects,
      unit: "개",
      description: isPrivate
        ? "10-projects/*/index에서 파싱한 실제 프로젝트"
        : "Portfolio에서 연결한 실제 공개 프로젝트 페이지",
    },
    {
      key: "active-projects",
      label: "Active 프로젝트",
      value: m.activeProjects,
      unit: "개",
      description: "명시된 status 또는 태그가 active인 프로젝트",
    },
    {
      key: "experiment-projects",
      label: "Experiment 프로젝트",
      value: m.experimentProjects,
      unit: "개",
      description: "명시된 status 또는 태그가 experiment인 프로젝트",
    },
    {
      key: "reference-documents",
      label: "참고·연구 문서",
      value: m.referenceDocuments,
      unit: "개",
      description: "reference·research 메타데이터 또는 참고자료 카테고리",
    },
    {
      key: "internal-links",
      label: "내부 링크",
      value: m.internalLinks,
      unit: "개",
      description: "실제 문서 사이의 방향별 연결. 반복·자기 링크 제외",
    },
    {
      key: "connected-nodes",
      label: "연결된 문서",
      value: m.connectedNodes,
      unit: "개",
      description: "하나 이상의 다른 공개 문서와 연결된 그래프 노드",
    },
    {
      key: "isolated-documents",
      label: "고립 문서",
      value: m.isolatedDocuments,
      unit: "개",
      description: "다른 공개 문서와 들어오거나 나가는 연결이 없는 문서",
    },
  ]
}

type ChartRow = { key: string; label: string; value: number; href?: string }

function Distribution({
  id,
  title,
  description,
  rows,
  unit,
}: {
  id: string
  title: string
  description: string
  rows: ChartRow[]
  unit: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  return (
    <figure class="fb-chart" aria-labelledby={`${id}-title`} data-chart={id}>
      <figcaption>
        <h3 id={`${id}-title`}>{title}</h3>
        <p>{description}</p>
      </figcaption>
      {rows.length === 0 ? (
        <p class="fb-empty">데이터 없음</p>
      ) : (
        <ul class="fb-chart-rows">
          {rows.map((row) => (
            <li key={row.key} data-chart-key={row.key} data-value={row.value}>
              <div class="fb-chart-label">
                {row.href ? (
                  <a class="internal" href={row.href}>
                    {row.label}
                  </a>
                ) : (
                  <span>{row.label}</span>
                )}
                <strong>
                  {number(row.value)}
                  <small>{unit}</small>
                </strong>
              </div>
              <div class="fb-bar-track" aria-hidden="true">
                <span style={{ width: `${(row.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

function AddProjectDialog() {
  return (
    <dialog
      class="fb-add-project-dialog"
      data-add-project-dialog
      aria-labelledby="fb-add-project-title"
    >
      <form class="fb-add-project-form" data-add-project-form>
        <div class="fb-add-project-heading">
          <div>
            <p class="fb-eyebrow">CONTINUE RECORDING</p>
            <h3 id="fb-add-project-title">새 프로젝트 추가</h3>
          </div>
          <button
            type="button"
            class="fb-dialog-close"
            data-close-add-project
            aria-label="프로젝트 추가 닫기"
          >
            ×
          </button>
        </div>
        <p class="fb-add-project-copy">
          Obsidian Vault에 프로젝트 index 초안을 만들면, 다음 빌드에서 Project Galaxy가 자동으로
          다시 계산합니다.
        </p>
        <label class="fb-form-field">
          <span>프로젝트 이름</span>
          <input
            name="project-name"
            type="text"
            placeholder="예: 가족 보이스"
            autocomplete="off"
            required
          />
        </label>
        <div class="fb-form-grid">
          <label class="fb-form-field">
            <span>폴더 ID</span>
            <input
              name="project-slug"
              type="text"
              placeholder="family-voice"
              pattern="[A-Za-z0-9가-힣][A-Za-z0-9가-힣_-]*"
              autocomplete="off"
              required
            />
          </label>
          <label class="fb-form-field">
            <span>상태</span>
            <select name="project-status">
              <option value="active">active</option>
              <option value="experiment">experiment</option>
              <option value="paused">paused</option>
              <option value="reference">reference</option>
            </select>
          </label>
        </div>
        <label class="fb-form-field">
          <span>
            카테고리 <small>(선택)</small>
          </span>
          <input
            name="project-category"
            type="text"
            placeholder="예: product, game, research"
            autocomplete="off"
          />
        </label>
        <p class="fb-add-project-status" data-add-project-status role="status" hidden />
        <div class="fb-add-project-actions">
          <button type="button" class="fb-secondary-button" data-close-add-project>
            취소
          </button>
          <button type="submit" class="fb-primary-button">
            Obsidian에서 만들기 <span aria-hidden="true">↗</span>
          </button>
        </div>
        <a
          class="fb-add-project-fallback"
          data-add-project-fallback
          target="_blank"
          rel="noreferrer"
          hidden
        >
          Obsidian 링크 다시 열기
        </a>
      </form>
    </dialog>
  )
}

export const FactoryBrainDashboard: QuartzComponent = ({
  allFiles,
  fileData,
}: QuartzComponentProps) => {
  const currentSlug = fileData.slug
  if (
    !currentSlug ||
    (currentSlug !== "index" && currentSlug.toLowerCase() !== "project-portfolio")
  )
    return null
  const model = getFactoryBrainModel(allFiles)
  if (!model) return null
  const isPrivate = model.scope === "private-full"
  const modelScript = JSON.stringify(model).replace(/</g, "\\u003c")
  const statistics = factoryBrainStatistics(model, isPrivate)
  const topProjects = model.topProjects.map((row) => ({
    key: row.id,
    label: row.title,
    value: row.value,
    href: resolveRelative(currentSlug, row.slug),
  }))
  const scopeLabel = isPrivate ? "실제 Vault 프로젝트" : "실제 공개 프로젝트"
  const chartStatistics = [
    ...model.statusDistribution.map((row) => ({
      ...row,
      key: `status-${row.key}`,
      label: `상태 · ${row.label}`,
      description: `${scopeLabel} 기준. 상태 없는 프로젝트는 미지정`,
    })),
    ...model.categoryDistribution.map((row) => ({
      ...row,
      key: `category-${row.key}`,
      label: `카테고리 · ${row.label}`,
      description: isPrivate
        ? "10-projects/*/index의 실제 category 또는 미지정"
        : "Project Portfolio의 실제 섹션 기준. 공개 페이지가 없는 항목 제외",
    })),
    ...topProjects.map((row) => ({
      ...row,
      key: `connections-${row.key}`,
      description: isPrivate
        ? "해당 프로젝트와 연결된 서로 다른 Vault 문서 수"
        : "해당 프로젝트와 연결된 서로 다른 공개 문서 수",
    })),
  ]

  return (
    <section
      class="factory-brain-dashboard"
      aria-labelledby="fb-dashboard-title"
      data-ui-pass={isPrivate ? "project-galaxy" : "factory-brain-graph-dashboard"}
      data-factory-brain-source-scope={model.scope}
      data-project-count={model.projectGalaxy.nodes.length}
    >
      <script
        type="application/json"
        data-factory-brain-model
        dangerouslySetInnerHTML={{ __html: modelScript }}
      />
      <div class="fb-dashboard-heading">
        <div>
          <p class="fb-eyebrow">{isPrivate ? "PROJECT GALAXY" : "PROJECT INTELLIGENCE"}</p>
          <h2 id="fb-dashboard-title">{isPrivate ? "Project Galaxy" : "공개 프로젝트 현황"}</h2>
          <p class="fb-scope" data-factory-brain-build-scope>
            {isPrivate
              ? "private-full · Vault 원본 기준 · 빌드 시점 기준"
              : "공개 content 기준 · 빌드 시점 기준"}
          </p>
        </div>
        <div class="fb-dashboard-actions">
          {isPrivate && (
            <button type="button" class="fb-add-button" data-open-add-project>
              <span aria-hidden="true">＋</span> 추가하기
            </button>
          )}
          <button
            type="button"
            class="fb-map-button"
            {...(isPrivate
              ? { "data-open-project-galaxy": "true" }
              : { "data-open-global-graph": "true" })}
          >
            {isPrivate ? "Project Galaxy 열기" : "관계 지도 열기"} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
      {isPrivate && <AddProjectDialog />}
      {isPrivate && (
        <div
          class="graph project-galaxy-source"
          data-graph-mode="project-galaxy"
          data-project-galaxy-source
          aria-hidden="true"
        >
          <div class="graph-outer">
            <div class="graph-container" data-cfg='{"depth":0}' />
            <button type="button" class="global-graph-icon" aria-label="Open Project Galaxy">
              Project Galaxy
            </button>
          </div>
          <div
            class="global-graph-outer project-galaxy-outer"
            data-graph-mode="project-galaxy"
            data-project-galaxy-outer
            aria-hidden="true"
          >
            <div class="global-graph-container" data-cfg="{}" />
          </div>
        </div>
      )}
      <dl class="fb-kpi-grid">
        {statistics.map((stat) => (
          <div class="fb-kpi" key={stat.key}>
            <dt>{stat.label}</dt>
            <dd>
              <strong data-stat-key={stat.key}>{number(stat.value)}</strong>
              <span>{stat.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div class="fb-chart-grid">
        <Distribution
          id="project-status"
          title="프로젝트 상태"
          description={
            isPrivate
              ? "실제 Vault 프로젝트 · 명시된 상태와 태그 기준"
              : "실제 공개 프로젝트 · 명시된 상태와 태그 기준"
          }
          rows={model.statusDistribution}
          unit="개"
        />
        <Distribution
          id="project-category"
          title="프로젝트 카테고리"
          description={
            isPrivate
              ? "10-projects/*/index의 실제 category 기준"
              : "Project Portfolio 섹션 · 공개 페이지가 있는 항목"
          }
          rows={model.categoryDistribution}
          unit="개"
        />
      </div>
      <Distribution
        id="project-connections"
        title="연결이 많은 프로젝트"
        description={
          isPrivate
            ? "연결된 서로 다른 Vault 문서 수 · 상위 최대 5개"
            : "연결된 서로 다른 공개 문서 수 · 상위 최대 5개"
        }
        rows={topProjects}
        unit="문서"
      />
      {model.unresolvedPortfolioLinks.length > 0 && (
        <p class="fb-data-note">
          Portfolio에 공개 페이지가 없는 항목이{" "}
          <strong data-stat-key="unresolved-portfolio">
            {number(model.unresolvedPortfolioLinks.length)}개
          </strong>{" "}
          있습니다. 프로젝트 수와 그래프에서 제외했습니다.
        </p>
      )}
      <details class="fb-statistics">
        <summary>상세 통계와 집계 기준</summary>
        <div
          class="fb-table-scroll"
          role="region"
          aria-label={isPrivate ? "Vault 프로젝트 상세 통계" : "공개 프로젝트 상세 통계"}
          tabIndex={0}
        >
          <table>
            <caption>
              {isPrivate
                ? "Factory Brain Vault · 빌드 시점의 동일 데이터로 계산한 수치"
                : "공개 content · 빌드 시점의 동일 데이터로 계산한 수치"}
            </caption>
            <thead>
              <tr>
                <th scope="col">구분</th>
                <th scope="col" class="fb-numeric">
                  수치
                </th>
                <th scope="col">기준 / 설명</th>
              </tr>
            </thead>
            <tbody>
              {[...statistics, ...chartStatistics].map((stat) => (
                <tr key={stat.key} data-stat-row={stat.key}>
                  <th scope="row">{stat.label}</th>
                  <td class="fb-numeric" data-value={stat.value}>
                    {number(stat.value)}
                  </td>
                  <td>{stat.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
