# playtest-app/ map: Hearthside Table UI
- `App.tsx` (routes) · `Library.tsx` (packs) · `HowToPlay.tsx` · `guide.md` (in-app guide; update with rule changes)
- `table/`: the game screen (own map) · `urban/`: Urban Warfare screen (own map)
- `decks/`: DeckBuilder, AutoBuild, `autoBuildDeck.ts` (shared with StartPanel), `deckStore.ts`
- `lab/`: BalanceLab and Ladder screens, `labClient.ts` (talks to workers)
- `tournament/`: tournament screens
- `workerPool.ts`, `useGameAutosave.ts`
Rules logic lives in `src/adventure/` and `src/urban/`, not here.
