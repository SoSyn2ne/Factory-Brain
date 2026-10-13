# Factory Brain Design System

Factory Brain is a private project notebook, not an AI control-room mockup. The interface should feel edited, lived-in, and useful before it feels impressive.

## Product hierarchy

Factory Brain is a project workbench around a knowledge base. The first screen should support re-entry, not just display totals:

- **Restart Desk:** “어디서 다시 시작하지?” — the four records needed to resume a project.
- **Portfolio View:** “무엇을 볼까?” — choose and compare projects.
- **Project Galaxy:** “무엇과 연결돼 있지?” — explore relationships.
- **Project Ledger:** “원본에 무엇이 기록돼 있지?” — inspect the Vault snapshot.

The Restart Desk may show missing records honestly. A missing field is an invitation to update the INDEX in Obsidian, never a cue to invent a summary.

## Direction

- **Editorial workbench:** warm paper surfaces, ink text, thin rules, compact metadata, and deliberate whitespace.
- **One accent:** use the semantic `--fb-accent` token (rust/orange in light mode, softened terracotta in dark mode). Use semantic exceptions only for warnings or destructive actions.
- **Flat structure:** prefer borders, dividers, and rhythm over floating cards, gradients, glass, glow, or stacked shadows.
- **Human hierarchy:** use serif display headings with restrained monospace labels for metadata. Korean body copy stays readable and generous.
- **Evidence first:** counts, status, links, and timestamps must be sourced from the Vault/model. Never add decorative metrics that look like evidence.

## Tokens

The source of truth is `quartz/styles/custom.scss`:

- `--fb-canvas`: page background
- `--fb-sidebar`: navigation surface
- `--fb-surface` / `--fb-surface-raised`: reading surfaces
- `--fb-border` / `--fb-border-strong`: rules and boundaries
- `--fb-text-muted`: supporting copy
- `--fb-accent` / `--fb-accent-soft`: the only general-purpose accent
- `--fb-radius-xs` / `--fb-radius-sm` / `--fb-radius-md`: shared corner scale
- `--fb-shadow-sm` / `--fb-shadow-md`: restrained elevation only where a layer must float

Do not introduce one-off hex values in components or new visual surfaces. Use the tokens or add a semantic token once at the root.

## Component rules

- Use one consistent button treatment: compact, rectangular, semantic accent for the primary action, transparent/outlined for secondary actions.
- Use rules and whitespace for grouping before adding a card.
- Keep KPI groups flat and comparable; use tabular numbers and clear units.
- Keep graph nodes legible with solid fills and no glow/filter effects. Project nodes use the accent; document nodes stay neutral.
- Dialogs and overlays must be opaque enough to read, with no blur dependency.
- Keep touch targets at least 44px and preserve keyboard focus rings.
- Prefer one meaningful transition over repeated reveal animations.
- Give each visualization one question. Use Project Galaxy for relationship discovery; use Portfolio View for choosing what to inspect next.
- Prefer spotlight, filtering, and drill-down over plotting every measure at once. A chart must make a decision easier, not decorate the page.
- Keep comparative rows sorted by a truthful measure such as connections, status, or category. Never invent activity scores or trend lines when the Vault has no source field.

## Forbidden defaults

- No purple/blue AI gradients.
- No star fields, neon glows, glassmorphism, or decorative radial gradients.
- No random rounded cards for every section.
- No uppercase jargon in place of useful Korean labels.
- No hardcoded counts, invented state, or “AI-generated” filler copy.

## Verification

For a visual change, run typecheck/tests and a scoped Prettier check, then verify the live private page at desktop and narrow widths. Exercise Project Galaxy, search, Escape close, dark mode, and the add-project dialog when those surfaces are touched.
