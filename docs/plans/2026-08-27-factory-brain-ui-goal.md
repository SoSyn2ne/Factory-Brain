# Factory Brain UI/UX Goal — Codex gpt-5.6-sol ultra

## User request

> 아으 좀 더 내가 보기 쉽게 ui/ux 수정좀해줘 전체적으로 codex에 goal모드로 진행해줘 sol 울트라로

## Product target

Make the private Factory Brain read as a calm, project-oriented knowledge workspace / operating console rather than a default Quartz documentation page. The first three seconds should make it obvious where the user is, what projects exist, and how to navigate the vault. Keep the information-dense knowledge-work character: do not turn it into a marketing landing page or a generic SaaS dashboard.

## Canonical repository and runtime

- Source repository: `/home/sy/.openclaw/workspace/factory-brain-web`
- Live private runtime: `/home/sy/.openclaw/factory-brain-private`
- The private runtime symlinks its `quartz/` tree to this repository and serves on local port `8090` behind Tailscale.
- Do not edit generated `public/` output or private runtime config as the primary source of truth.
- Do not push to GitHub. Local commits are allowed only after independent verification.

## Existing dirty work — preserve it

Before changing anything, inspect the worktree. These existing changes are intentional from the previous user request and must not be reset, stashed away, or deleted:

- `quartz.config.yaml`: graph plugin now points at the local fork.
- `plugins/graph/**`: local Graph component fork adds hover tooltips and derives project-folder names when an index page has the generic `INDEX` title.

Keep the graph hover behavior working. If you touch graph code, preserve the actual node hover tooltip and verify that project nodes such as `emberpix` and `mom-voice` are shown instead of bare `INDEX`.

## Read first

- `README.md`, `package.json`, `quartz.config.yaml`
- `quartz/styles/`, `quartz/components/`, and the existing graph fork under `plugins/graph/`
- Representative private content only for understanding the information architecture: `content/index.md`, `content/00-index/Project Portfolio.md`, and project index notes under `content/10-projects/`
- Existing git diff/status before editing

## Design standard

Use StyleSeed as the design judgment layer. Read `https://styleseed-demo.vercel.app/llms.txt` if network access is available. Adapt it to this real knowledge-work product, not a library demo.

Direction: Linear / Notion-inspired private knowledge workspace with an editorial documentation core. Use one restrained accent system, semantic tokens, consistent radius/spacing/shadows, strong typography hierarchy, readable Korean text, and meaningful surfaces. Avoid random gradients, excessive glassmorphism, noisy glow, pure-black blocks, arbitrary hardcoded colors, and decorative controls that do not work.

## UI/UX objectives

Choose the highest-impact cohesive slices based on the current screenshot and source, but cover the whole shell rather than polishing only one button:

1. **Information hierarchy and orientation**
   - Make the current page identity, section context, and primary reading path obvious.
   - Improve the left explorer so folders/projects scan quickly and active/current context is clear without fake tabs.
   - Give project-related content a stronger visual grouping where the existing data supports it.

2. **Reading surface and layout rhythm**
   - Improve typography, line length, spacing, headings, links, metadata/properties, and code/table readability.
   - Use surfaces/dividers intentionally so the center content feels like a workspace, not an unstyled document dump.
   - Preserve internal links, backlinks, search, dark mode, reader mode, and Quartz navigation behavior.

3. **Graph as a useful project map**
   - Keep the existing local/global graph, project-name hover tooltip, and Global Graph action.
   - Make the graph panel easier to discover and understand visually without hiding the reading surface.
   - Ensure the tooltip has sufficient contrast, sensible placement, and does not block pointer interaction.

4. **Responsive and accessibility quality**
   - Check a wide desktop and a narrow desktop/tablet/mobile-sized viewport.
   - Avoid horizontal/page overflow and clipped content; give only intended panes internal scrolling.
   - Preserve keyboard-visible focus, readable contrast, semantic buttons/links, and touch-sized controls.

## Non-negotiable regressions

- No broken Tailscale paths or changes to the service/port setup.
- No removal of private content, internal links, graph functionality, search, dark mode, reader mode, explorer, or existing plugin behavior.
- No fake interactive controls, fake ARIA tabs, or static status counters presented as live data.
- No unrelated content rewrites, dependency churn, or generated-output edits.
- No new secrets or external provider keys.
- Do not reformat unrelated existing content files merely to make the full-repo formatter green.

## Implementation guidance

- Prefer focused source changes in `quartz/styles/`, existing Quartz components, and the graph fork only when needed.
- Reuse the existing Quartz component/layout system and semantic CSS variables; do not replace Quartz with a separate framework.
- Keep UI copy concise and product-specific. Korean labels are welcome where they improve scanning, but do not change document content just for decoration.
- If adding a small marker for QA, use a truthful marker such as `data-ui-pass="factory-brain-workspace"`; do not add markers without the underlying behavior.
- If the current CSS architecture makes a full pass unsafe, implement the highest-impact coherent shell/readability pass and leave the rest documented rather than inventing a parallel UI system.

## Verification gates

Run the relevant gates before each local commit and report exact results:

- `npx tsc --noEmit`
- `npm run test`
- `npx prettier --check` on changed source/config files only
- `git diff --check`
- Build with the private runtime configuration when feasible:
  `node /home/sy/.openclaw/factory-brain-private/quartz/bootstrap-cli.mjs build -d content --output /tmp/factory-brain-codex-build`
- Do not treat the known full `npm run check` formatter warnings in untouched content files as a reason to reformat those files.

After the build, browser-smoke the actual Tailscale page:

- `https://sy-h310mhg.taild09079.ts.net/` and `/factory-brain/` return HTTP 200 and show `Factory Brain — Private Home`.
- The page has the explorer, article/reading surface, Graph View, and Global Graph action.
- Open Global Graph and exercise a real node hover; the tooltip contains a real document/project name, with project index nodes showing a folder name rather than bare `INDEX`.
- Check browser console for errors and inspect screenshots at desktop and narrow widths.
- Check body/page scroll containment and ensure no important rail/content is clipped.

## Commit policy

Do not push. Once the implementation and independent verification are complete, commit only intended source/config/docs changes. Do not stage `.hermes/`, logs, `public/`, `node_modules/`, or unrelated files. The final response must be either:

- `DONE`: summarize actual files, behavior, tests/build/browser evidence, and local commit hash; or
- `BLOCKED`: state the exact blocker, commands/output, preserved worktree state, and the safest next action.

Continue through the next highest-impact cohesive UI slice if the first pass exposes an obvious nearby issue, but stop when the stated acceptance criteria are met rather than endlessly redesigning the product.
