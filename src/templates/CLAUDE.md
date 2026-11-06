# templates/ map
Spec: `.claude/rules/templates.md`. Layout (templates) stays separate from content (card values).
- `resolve.ts`: template + card → what to draw · `fields.ts`, `rules.ts` (showIf), `overrides.ts`
- Commands: `commands.ts`, `fieldCommands`, `bulkCommands`, `deckCommands`, `sizeCommands`, `mergeCommands`, `keywordCommands`
- Data: `cardTable.ts` (CSV), `mailMerge.ts`, `findReplace.ts`, `proofread.ts`, `sizeGroups.ts`
- `templateFile.ts` (import/export), `switchTemplate.ts`, `saveCardAsTemplate.ts`, `stylePresets.ts`, `textDecor.ts`
