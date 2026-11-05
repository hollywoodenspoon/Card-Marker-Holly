# src/adventure/ map: Adventure Scuffle rules engine
Pure TypeScript, no React. Rules: `game/adventure-scuffle/rulebook.md`. Notes: `docs/adventure-rules-engine.md`.

- `state.ts` (game state types) · `engine.ts` (createGame, legalMoves, apply) · `stats.ts` (values, stacks)
- `check.ts` (rules checker) · `observe.ts` (hidden info) · `cards.ts`, `deck.ts` · `board.ts`, `table.ts` (to table pieces)
- `effects/`: card text → rules (own map)
- `bot/`: bots (own map)
- `lab/`: Balance lab and ladder (`run.ts`, `play.ts`, `analyze.ts`, `report.ts`, `ladder.ts`, workers)
- `deckgen/`: Auto Build (`values.ts` card values, `build.ts`, `climb.ts` Very optimal)
- `sim/`: Rush and `npm run as:sim` · `tournament/`: tournaments and series
- `fixtures/`: test cards (`allCards.ts` = every card from cards.csv), saved games in `games/`

Tests sit next to files. `allSets.test.ts` plays checked bot games with every card.
Traps:
- Old replays need their reveal rule (`savedGame()` in engine.ts).
- Card, balance or rule changes also go into `game/adventure-scuffle/`.
