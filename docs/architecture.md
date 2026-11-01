# Architecture

The original suggested folder layout from the first plan. It is out of date: `src/` now also has `engine/`, `playtest/`, `playtest-app/`, `adventure/`, `cozy/`, `help/`, `platform/`, `vector/`, `app/`, `lib/` and `types/`. See also `docs/engine.md`.

Suggested layout:

```
src/
  core/        document model, units, canvas tools, render
  templates/   template resolution, fields, overrides
  storage/     Dexie schema, autosave, import/export
  print/       sheet layout math, cut marks, PDF export
  ui/          shells (desktop, tablet, phone), panels, theme
  assets/      image and font handling
```
