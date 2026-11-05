# bot/ map
- `index.ts`: bot levels and pickMove (entry point) · `mcts.ts`: search (supports `thinkMs` cap)
- `determinize.ts`: guesses hidden cards · `evaluate.ts`: position score · `policies.ts`: playout moves · `tricks.ts`: hand-written plays
- `bot.worker.ts`: runs in a Web Worker
- Tests: `bot.test.ts`, `search.test.ts`, `tricks.test.ts`
