# Hearthside Engine (working title)

A game-maker for tile-and-block RPGs, built into the Hearthside Cardworks repo as a
third app alongside the card editor and Hearthside Table. The owner designs the game
in a Canva-style editor; cards made in Cardworks can later become game data (and,
eventually, in-game cards). See `docs/cozy-edition.md` for the sibling Windows build and
the plan this follows.

## Why it lives here

Real integration with Cardworks is the point: the engine reuses Cardworks' UI shell,
component kit, 37-theme system, undo/redo and (later) storage, and consumes card data
through the existing `.cmpack` game pack. One repo means the two never drift.

## Shape

- **Foundation:** React + TypeScript + **Three.js**, shipped in the browser and as an
  Electron window. Linux first, then Windows; tuned for low-end hardware.
- **Look:** textured blocks on an integer cell grid (FF Tactics / RPG Paper Maker), not
  true voxel. A block at cell `(x, y, z)` fills the unit cube to `(x+1, y+1, z+1)`, y up.
- **Own version:** `ENGINE_VERSION` in `src/app/appInfo.ts` (`0.1.0-alpha.1`), separate
  from the card app's `package.json` version.
- **Not in the Cozy Edition:** the Cozy build is the card editor only; the engine app is
  left out of its bundle (see `scripts/cozyStubs.ts`).

## Layout (`src/engine/`)

- `main.tsx`, `App.tsx`, `EngineShell.tsx` — entry and the top-bar-over-viewport shell.
- `model/map.ts` — the pure `MapDoc` (blocks keyed by cell, a block-type palette, and a
  reserved `entities[]` for card-backed objects later). No Three.js, so it serialises and
  snapshots cheaply.
- `store/engineStore.ts` — the editor store: `commit(recipe)` + undo/redo on the shared
  `History` class, same immer-snapshot pattern as the card editor.
- `scene/` — Three.js: `Viewport.tsx` (renderer, orbit/pan/zoom camera, on-demand
  rendering, hover picking), `blocks.ts` (one `InstancedMesh` per block type → flat draw
  calls), `textures.ts` (procedural tile textures, nearest-filtered), `highlight.ts`.

## Reused from Cardworks (imported via `@/…`)

The component kit (`src/ui/components/ui/*`), theming (`src/ui/theme/*`, the `--canvas`
token as the viewport backdrop), the `History` class, and `useLayout`. The Konva card
renderer is **not** reused — it's replaced by `scene/`.

## Build wiring

- `engine/index.html` → `/src/engine/main.tsx`; assets in `public/engine/`.
- `vite.config.ts`: `engine` rollup input (omitted in Cozy), own PWA manifest, and
  `/engine/` in the service-worker navigate denylist.
- Electron: `routeOpen` returns `'engine'` for `/engine/` pages; `openEngine()` in
  `electron/main.ts` gives it its own window.

## Roadmap

1. **Scaffold + viewport** (done): the app renders a textured-block demo map with a
   working camera and picking, reusing the Cardworks chrome.
2. **Editing tools** (done): Select / Terrain / Paint / Tile modes (left-click acts, right-drag
   orbits), a block palette, a selection inspector, drag-strokes as single undo steps, keyboard
   shortcuts (1–4, Ctrl+Z/Y, Delete), and an "Open Hearthside Engine" launcher in the card app.
3. **Persistence:** `MapDoc` save/load (own Dexie DB `hearthside-engine` + a folder
   format), autosave, map file import/export.
4. _(later)_ **Cardworks integration:** import a `.cmpack`, place card-backed entities
   (data + art); room kept for a card-battle module.
5. _(later)_ play mode, tile-anchored movement, RTwP/CRPG systems, the Cause-and-Effect
   logic layer.
