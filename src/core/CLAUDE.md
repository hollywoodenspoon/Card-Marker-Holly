# core/ map: Card Maker editor core
Must not import storage, print or ui. Geometry in mm (`.claude/rules/data-model.md`, `editor.md`).
- `model/`: document types (`types.ts`), factories, layering, tree
- `editor/`: `editorStore.ts` and commands (card, element, project) · `history/`: undo
- `render/`: Konva stage (`CardStage.tsx`, `StaticCard.tsx`, `nodes/`) · `text/`: rich text layout
- `units/`: mm/px conversion, size presets · `tools/`: align, snap
