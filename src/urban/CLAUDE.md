# src/urban/ map: Urban Warfare rules engine

Pure TypeScript, no React. Rules: `game/urban-warfare/rulebook.md` (keep them matching).

- `state.ts` (types; zones 0–8, center 4) · `engine.ts` (createGame, legalMoves, apply, push, wins)
- `cards.ts` (reads `Firepower_UW`, `Ability_UW`, `Name_UW`; deals hands) · `bot.ts` (Easy random, Normal search)
- `replay.ts` (a recorded match; rebuild its states) · `sim.ts` (bot vs bot games, seeded, tallies)
- `engine.test.ts`: rules, wins and bot games · `sim.test.ts`: sim and replay · `rulebook.test.ts`: `game/rulebook.md` holds both mode rulebooks
