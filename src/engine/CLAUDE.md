# engine/ map: the game editor (Engine workspace)
Plan: `docs/design/engine-plan.md`. Notes: `docs/engine.md`.
- `App.tsx`, `EngineShell.tsx`, `useEngineShortcuts.ts`
- `model/`: game data types (game, map, characters, calendar, league, migrate)
- `store/`: zustand stores · `storage/`: Dexie saves, autosave, assets
- `scene/`: 3D/2D map view (Three.js) · `scenes/`: picture scenes editor · `tools/`: map edit tools
- `panels/`: side panels (`game/`, `world/`, `rules/`)
- `events/`: Cause and Effect pieces and runner · `runtime/`: playing a game (`GamePlayer.tsx`, `cardGame.ts`)
- `league/`, `economy/`: league sim, market, boosters · `cards/`: deck bridge to the rules engine
- `modules/`: game modules (`adventureScuffle.ts`) · `io/`: .hsgame and map files · `portraits/`
