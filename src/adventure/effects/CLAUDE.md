# effects/ map: card text → rules
- `reader.ts`: parses ability text into rules; phrase order matters (more specific phrases first)
- `types.ts`: rule and mode types · `registry.ts`: card id → rules
- `blocks.ts`: rule building blocks · `helpers.ts`: keyword helpers · `mechanics.ts`: tokens, Interpose, Endure, weapons, Hire
- Tests: `reader.test.ts`, `cards.test.ts`, `allCards.test.ts` (every card must read), `mechanics.test.ts`
- Phrase list for card writers: `docs/card-text-phrases.md`
