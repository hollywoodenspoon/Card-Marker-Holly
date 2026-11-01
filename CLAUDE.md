# Card Maker

Browser card editor (PC and phone) for the owner's original 1v1 card game: local storage of cards, images and fonts, reusable templates with fields, print-ready A4 sheets with bleed and cut guides as RGB or CMYK PDF.
The owner cuts printed sheets by hand. Optimize for: fast design workflow, reusable layouts, accurate print output.

## Hard constraints

- Web app first. No backend, no accounts. Everything runs and is stored in the browser.
- All geometry stored in **millimetres**; convert to pixels only at render time.
- RGB or CMYK PDF export only; export module separate from the editor core.
- A4 only for printing (210 x 297 mm), paper size kept as a setting in code.
- Responsive from day one: desktop, tablet, phone. Do not leave mobile for the end.
- Dark, light and system themes from day one.
- Prefer well-maintained libraries; keep the bundle reasonable.

## Stack

- React + TypeScript (strict) + Vite
- Tailwind CSS + shadcn/ui (Radix)
- Canvas: Konva (react-konva)
- Storage: IndexedDB through Dexie; autosave with a visible "saved" indicator
- PDF: jsPDF + svg2pdf.js (SVG stays vector)
- PWA: installable, works offline
- Tests: Vitest for pure logic (print layout math, template resolution, unit conversion)

## Commands

- `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm test`

## Architecture principles

- Editor core (document model, tools, rendering) must not depend on storage, PDF export or the responsive shell; each is a replaceable module.
- Layout (templates) is separate from content (card values).
- Pointer events everywhere (mouse, pen, touch), never mouse-only events.
- No hover-only interactions.
- Small, well-named modules that can be understood and edited independently.

## Working rules

- Start in plan mode. Present the plan (stack choices, folder layout, data schema) before writing code, and wait for approval.
- Every PR bumps the `package.json` version and starts its title with it; follow the ship-pr skill.
- Keep `README.md` short: how to install, run, and build.
- Do not add features outside the spec (this file plus `.claude/rules/`) without asking.
- If a requirement is ambiguous, pick the simplest option that matches the spec and note the assumption in `DECISIONS.md`.
- Fix type errors and lint warnings as you go. Do not leave failing tests.

## Where things live

- Spec by area (load when touching those paths): `.claude/rules/data-model.md` (card sizes, data model), `templates.md`, `editor.md`, `print.md`, `ui.md`
- PR procedure: `.claude/skills/ship-pr/SKILL.md`
- Original folder layout: `docs/architecture.md`
- Original build order and v1 definition of done: `docs/spec-history.md`
- Decisions and assumptions: `DECISIONS.md` · Engine: `docs/engine.md` · Versions: `docs/version-history.md` · Owner's design docs: `docs/design/`
