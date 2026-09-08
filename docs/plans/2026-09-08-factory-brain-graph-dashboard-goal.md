# Factory Brain 2차 업데이트 Goal

## User request

> 우리 옵시디언 페이지를 더 업데이트하고 싶다. 전체 그래프가 더 가독성 있으면 좋겠고, 그래프 같은 시각화도 있었으면 좋겠다. 통계표와 수치로 한눈에 보이게 해달라.

## Mission

Factory Brain을 단순한 Obsidian/Quartz 문서 목록이 아니라, 공개 가능한 프로젝트 지도와 운영 현황을 한눈에 파악하는 지식 워크스페이스로 개선한다.

이번 작업의 핵심은 다음 세 가지다.

1. Global Graph를 실제 프로젝트 관계를 이해할 수 있을 정도로 읽기 쉽게 개선한다.
2. 공개 content 데이터에서 계산한 KPI와 통계표를 추가한다.
3. 상태·카테고리·연결 관계를 실제 데이터 기반 차트로 보여준다.

계획만 쓰고 멈추지 말고 실제 구현, 테스트, 빌드, 브라우저 smoke까지 끝낸다.

## Canonical repository and runtime

- Source repository: `/home/sy/.openclaw/workspace/factory-brain-web`
- Private runtime: `/home/sy/.openclaw/factory-brain-private`
- Runtime local port: `8090`, Tailscale 뒤에서 제공됨
- Generated `public/`은 직접 수정하지 않는다.
- Private runtime 설정을 primary source로 수정하지 않는다.
- GitHub에는 push하지 않는다. 검증 완료 후 local commit만 허용한다.

## Existing worktree policy

시작 전에 `git status`와 `git diff`를 읽는다. 현재 worktree의 기존 변경사항은 의도된 이전 UI 작업이므로 reset, checkout, clean, stash, 삭제, 덮어쓰기를 하지 않는다.

특히 다음 기능을 보존한다.

- `quartz.config.yaml`의 local graph plugin 연결
- `plugins/graph/src/components/index.js`의 graph fork
- 프로젝트 index의 generic `INDEX` 대신 프로젝트명/폴더명을 보여주는 hover tooltip
- 실제 node hover, drag, zoom, local graph, global graph
- `quartz/components/ProjectNavigator.tsx`
- `quartz/styles/custom.scss`
- 기존 Quartz explorer, search, backlinks, dark mode, reader mode, 내부 링크

## Read first

- `README.md`
- `package.json`
- `quartz.config.yaml`
- `quartz/components/`, `quartz/styles/`
- `plugins/graph/`
- `content/index.md`
- `content/Project Portfolio.md`
- `content/Project Relationships.md`
- 기존 git status/diff

## Data and privacy rules

통계와 그래프는 실제 공개용 `content/`와 Quartz content/page index를 source of truth로 삼는다.

- 임의의 프로젝트 수, 상태 수, 링크 수를 하드코딩하지 않는다.
- private vault 전체 내용이나 private runtime 내부 정보를 공개 UI에 노출하지 않는다.
- 실제 metadata가 없는 값은 추측하지 말고 `미지정` 또는 `데이터 없음`으로 처리한다.
- `Project Portfolio.md`에 링크만 있고 실제 공개 페이지가 없는 항목을 실제 document node인 것처럼 잘못 세지 않는다.
- 차트, KPI, 통계표가 같은 단일 데이터 모델을 공유하게 한다.
- 통계 기준 범위를 UI에 표시한다. 예: `공개 content 기준`, `빌드 시점 기준`.

## Scope decision — do not ask for clarification

이번 작업은 저장소의 공개용 Factory Brain 화면을 기준으로 진행한다.

- KPI, 차트, 통계표는 이 저장소의 공개 `content/`만 집계한다.
- Tailscale private runtime의 기존 전체 vault graph와 private 문서 노출 범위는 변경하지 않는다.
- private graph가 이미 동작한다면 그대로 보존하고, 이번 변경으로 공개 통계와 충돌하지 않는지 regression만 확인한다.
- 두 Tailscale URL의 범위가 달라 보여도 이 결정을 사용자에게 다시 묻지 말고 구현을 계속한다.

## Feature A: Global Graph readability

현재 Global Graph modal을 프로젝트 관계 지도처럼 개선한다.

- desktop에서 충분히 큰 graph surface를 사용하고 mobile/좁은 화면에서는 clipping과 horizontal overflow를 막는다.
- modal 내부에서만 필요한 scroll이 발생하게 하고 body scroll은 유발하지 않는다.
- close button과 Escape 닫기를 제공한다.
- fit/reset, zoom, drag를 유지하고 실제 node click은 해당 문서로 이동하게 한다.
- degree가 높은 node는 적당히 크게 표시하되 크기를 clamp한다.
- 프로젝트·문서·참고자료를 구분할 수 있는 일관된 색상/형태와 범례를 제공한다.
- 모든 label을 무조건 표시해서 서로 겹치게 만들지 않는다. 중요한 label 중심으로 표시하고 zoom/hover 시 추가 label을 보여준다.
- hover 시 해당 node와 연결된 이웃을 강조하고 나머지는 dim 처리한다.
- generic `INDEX`는 기존 fallback 로직을 통해 프로젝트명 또는 폴더명으로 보여준다.
- tooltip에는 실제 데이터가 있을 때 문서명, 프로젝트명/폴더명, status tag, 연결 문서 수, inbound/outbound link 수를 보여준다.
- tooltip이 viewport 밖으로 잘리지 않고 graph pointer 조작을 막지 않게 한다.
- 가능하면 실제로 동작하는 project/category/status filter와 graph search를 추가한다. 동작하지 않는 fake control은 추가하지 않는다.
- 현재 프로젝트명 예시인 `emberpix`, `mom-voice`가 hover에서 bare `INDEX`가 아닌 이름으로 보이는지 확인한다.

## Feature B: KPI summary

홈 또는 가장 적절한 project overview 위치에 실제 데이터 기반 요약을 추가한다.

가능한 경우 다음 수치를 보여준다.

- 전체 공개 문서 수
- 프로젝트 수
- active 프로젝트 수
- experiment 프로젝트 수
- reference/research 문서 수
- 전체 내부 링크 수
- 연결된 graph node 수
- 고립 문서 수

계산할 수 없는 항목은 숨기거나 `미지정`으로 처리한다. 숫자는 실제 계산값이어야 하며 천 단위 구분, `tabular-nums`, 숫자와 단위의 명확한 hierarchy를 사용한다. 좁은 화면에서도 깨지지 않아야 한다.

## Feature C: Charts

실제 데이터에 기반한 차트를 최소 2개 추가한다. 가능하면 무거운 새 dependency보다 CSS/SVG/semantic HTML과 기존 Quartz 구조를 재사용한다.

1. Status distribution: active, experiment, reference, paused, 미지정.
2. Project category distribution: `Project Portfolio.md`의 실제 섹션/링크 구조 기준.

추가로 데이터가 충분하면 다음 중 하나를 구현한다.

- 연결 수가 많은 프로젝트 Top 5 horizontal bar chart
- document type distribution
- 실제 날짜가 있을 때만 recent update timeline

차트는 장식이 아니며 정확한 수치를 알 수 있는 표/텍스트 fallback을 함께 제공한다. 차트와 통계표가 서로 다른 값을 보여주면 안 된다.

## Feature D: Statistics table

Project Portfolio 또는 전용 overview 위치에 상세 통계표를 추가한다.

표에는 최소한 `구분 | 수치 | 기준/설명` 열이 있어야 한다. 숫자 열은 오른쪽 정렬하고 tabular numerals를 사용한다. 모바일에서는 표가 화면을 깨뜨리지 않도록 responsive 처리한다.

예시 행은 실제 데이터가 있을 때만 만든다.

- 전체 공개 문서
- 프로젝트
- active 프로젝트
- experiment 프로젝트
- 내부 링크
- 연결된 node
- 고립 문서

## Design direction

StyleSeed를 디자인 판단 기준으로 사용한다. 네트워크가 가능하면 `https://styleseed-demo.vercel.app/llms.txt`를 먼저 읽는다.

방향은 Linear + Notion inspired private knowledge workspace와 editorial documentation이다.

- 한 가지 restrained accent system
- semantic CSS variables
- 일관된 spacing, radius, shadow
- 읽기 쉬운 한국어 typography
- 카드/표/그래프 안의 명확한 여백
- dark mode에서도 충분한 대비
- 숫자는 크게, 단위와 설명은 알맞게 작게

과도한 gradient, rainbow graph, pure black block, noisy glow, excessive glassmorphism, 장식용 버튼, fake percentage, fake status, fake ARIA tabs를 사용하지 않는다.

## Implementation scope

우선 다음 영역을 중심으로 필요한 최소 변경을 한다.

- `plugins/graph/src/components/index.js`
- `plugins/graph/src/index.js`
- `quartz/components/`
- `quartz/styles/`
- `quartz.config.yaml`은 필요한 경우에만
- 필요한 테스트 파일
- 필요한 경우 `content/index.md` 또는 `content/Project Portfolio.md`

Quartz/Preact 구조를 유지하고 별도 frontend framework로 교체하지 않는다. dependency 추가는 꼭 필요하고 이유가 명확할 때만 한다.

가능하면 truthful QA marker를 추가한다. 예: `data-ui-pass="factory-brain-graph-dashboard"`, `data-stat-key="public-pages"`. marker만 넣고 실제 동작을 생략하지 않는다.

## Verification gates

구현 후 아래를 실제 실행한다.

```bash
npx tsc --noEmit
npm run test
npx prettier --check <changed source/config files only>
git diff --check
node /home/sy/.openclaw/factory-brain-private/quartz/bootstrap-cli.mjs build -d content --output /tmp/factory-brain-codex-build
```

브라우저에서 실제 페이지를 확인한다.

- `https://sy-h310mhg.taild09079.ts.net/`
- `https://sy-h310mhg.taild09079.ts.net/factory-brain/`

확인 항목:

1. HTTP 200과 `Factory Brain — Private Home` 확인
2. KPI 숫자가 실제 content 기준으로 표시됨
3. 차트와 통계표 수치가 일치함
4. Global Graph를 열고 닫을 수 있음
5. graph drag, zoom, fit/reset, node click이 동작함
6. 실제 node hover tooltip에 프로젝트명/문서명이 표시됨
7. `INDEX`가 프로젝트명 대신 남아 있지 않음
8. console JavaScript error 없음
9. desktop과 narrow viewport에서 clipping/overflow 없음
10. dark mode에서도 그래프·표·tooltip이 읽힘
11. body 전체 scroll 없이 의도된 pane만 스크롤됨
12. 키보드 focus와 touch target이 사용 가능함

정적 marker 존재만으로 완료 처리하지 말고, 실제 DOM 값과 실제 interaction을 확인한다. UI 변경은 screenshot 또는 browser visual inspection으로도 확인한다.

## Commit policy

- GitHub push 금지
- 기존 변경사항 유지
- `public/`, `node_modules/`, `.hermes/`, 로그, generated output stage 금지
- 의도한 source/config/test/docs만 commit
- 검증 전 commit 금지
- commit 전 `git status --short --branch`, `git diff --stat`, `git diff --check` 재확인

최종 응답은 `DONE` 또는 `BLOCKED`로 시작한다.

`DONE`에는 실제 변경 파일, 실제 구현 기능, 실행한 명령과 결과, browser evidence, local commit hash를 적는다.

`BLOCKED`에는 정확한 blocker, 실제 명령/output, 보존된 worktree 상태, 이미 완료된 부분, 안전한 다음 조치를 적는다.
