# table/ map: the game screen
- `GameView.tsx`: screen root · `StartPanel.tsx`: new-game setup (decks, bots, Auto Build)
- `TableCanvas.tsx`, `Piece.tsx`, `CombatStage.tsx`, `Flights.tsx`, `Spotlight.tsx`: drawing and animation
- `ActionBar`, `RulesBar`, `Tracker`, `LogPanel`, `ActionFeed`, `ZoneSheet`, `CardZoom`/`HoverZoom`/`CardPreview`: panels
- State: `usePlaytest.ts` (main hook), `rulesPlay.ts` (rules games), `useStage.ts`/`stage.ts`, `cues.ts`, `activity.ts`, `intent.ts`
- Bots: `useBotDriver.ts`, `botClient.ts` · Rush: `RushView.tsx`, `rushClient.ts`, `rushTally.ts`
- Replays: `replays.ts`, `replayFile.ts`, `ReplayBar.tsx`, `ReplaysView.tsx`
- Engine matches: `useHandoffStart.ts` (with `src/playtest/handoff.ts`)
