# print/ map: export

Spec: `.claude/rules/print.md`. Must not depend on the editor UI.

- `paper.ts` (sizes), `layout.ts` (sheet math), `bleedBand.ts`, `settings.ts`, `job.ts`, `printList.ts`, `draft.ts`, `alignmentTest.ts`
- `pdf/`: `exportPdf.ts` and draw targets (jsPDF, CMYK, grey, canvas) · `color/`: CMYK engine and ICC profiles
- `image/`: PNG export · `pack/`: game pack export · `tts/`: Tabletop Simulator export
