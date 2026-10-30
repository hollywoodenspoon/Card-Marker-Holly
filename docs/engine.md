# Hearthside Engine (working title)

A general game engine with Cardworks at its core, built into the Hearthside Cardworks
repo. Since phase 1 (v0.8.1-beta) it is the **Engine** workspace of the one app, beside
**Cards** (the card editor) and **Play** (Hearthside Table). The full plan is the
"Hearthside Engine: the plan" doc; this file describes the code. The owner designs the game
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
- **Look:** textured tile columns on a grid (FF Tactics / RPG Paper Maker), not true
  voxel. x runs east, z south, y up; one full step is one unit (see The map, below).
- **Own version:** `ENGINE_VERSION` in `src/app/appInfo.ts` (`0.4.0-alpha.1`), separate
  from the card app's `package.json` version.
- **Not in the Cozy Edition:** the Cozy build is the card editor only; the engine app is
  left out of its bundle (see `scripts/cozyStubs.ts`).

## Layout (`src/engine/`)

- `App.tsx`, `EngineShell.tsx`: the workspace's root and its shell. The top bar holds the File menu, undo/redo and the save badge. Below it are tools on the left, the mode bar over the viewports in the middle, and the selection's properties on the right.
- `model/`: pure data, no Three.js.
  - `map.ts` is the `MapDoc` v2 (see below).
  - `tileset.ts` holds tilesets and tile UVs.
  - `migrate.ts` upgrades v1 maps.
- `store/`:
  - `engineStore.ts`: the map, undo/redo (the shared `History`), and the mode and its options.
  - `viewStore.ts`: viewport preferences (layout, each pane's view, ortho and FOV) and the perf numbers.
- `tools/`:
  - `edit.ts`: pure edits (raise, lower, flatten, slope, kind, hole, overhangs, per-face paint, fill, replace everywhere).
  - `apply.ts`: turns a pick into an edit for the current mode. A drag is one undo step and touches each column once.
- `scene/`:
  - `chunkMesh.ts`: visible faces only, per 16×16 chunk, grouped by texture.
  - `mapScene.ts`: chunk meshes; rebuilds only dirty chunks; picks a face.
  - `textureStore.ts` and `tilesetImage.ts`: the built-in tiles, imported PNGs, and generated side tiles.
  - `viewport3d.ts`: one renderer, scissored panes, picking, highlights.
  - `paneCamera.ts`, `viewMath.ts`, `viewCube.ts`: cameras, views, FOV and the view cube.
  - `ViewportLayout.tsx`: single, quad and maximise, plus each pane's header.
  - `Map2DView.tsx`: the flat 2D view and fallback.
- `panels/`: `ModeBar`, `ToolPanel` (left), `PropertiesPanel` (right), `TilePicker`, `MapsDialog`.
- `storage/`: the engine's own IndexedDB (`maps`, `settings`, and since v2 `assets` for tileset images), plus autosave, map and tileset actions.
- `io/mapFile.ts`: `.hsmap` files. v2 embeds tileset images; v1 files still open.

## The map (v2)

- A grid of **tile columns**, as in FF Tactics. Each cell holds one tile:
  - a height in **half steps** (`h = 2` is one block);
  - an optional **slope** (rises toward N/E/S/W by half a step or a full step);
  - a **kind**: ground, water or blocked;
  - a **terrain type**.
- **Faces:**
  - Each type has default top / side (top band) / side (below) / bottom tiles, and sides are either drawn or **generated** from the top tile's edge as a draft.
  - Any single face can be **painted** over with any tile from any tileset.
- **Overhangs** are detached blocks (bridges, arches) above the grid. The rules ignore them for now.
- **Tilesets** are PNG grids of 16, 32 or 48 px tiles (e.g. Aseprite exports). A built-in 16 px starter set is drawn by code, so a new map needs no files.
- `camera` is the map's **Game camera**: its FOV, which of four diagonal views (turned in 90° steps), and its tilt. Test play and exported games will start from it.

## Viewports

- **Layout:** one Perspective pane by default. **Four views** splits into Top / Front / Right / Perspective. Double-click a pane header (or press its button) to maximise it.
- **Each pane:**
  - a view picker: Perspective, Game camera, Top, Front, Back, Left, Right, Bottom or 2D;
  - an **Ortho/Persp** toggle;
  - a **view cube**: click a face, edge or corner to look from there;
  - a **FOV** slider, number field and −/+ buttons, with `[` / `]` stepping 5°. The framing holds as the FOV changes, and each pane keeps its own FOV.
- **Game camera:** turns in 90° steps (buttons, or `,` / `.`; `E` belongs to Tile mode) and tilts between low and high. Its FOV, turn and tilt are saved in the map.
- **Drawing:** all 3D panes share one WebGL context and draw only when something changes.
- **2D:** the same map drawn flat on a 2D canvas. It edits with the same tools, and is the fallback when WebGL is missing.
- **Performance meter** (☰ or the gauge button): redraws per second, frame time, draw calls, faces, the last edit's rebuild time, and memory. A filled 64×64 map is 25 draw calls and about 12,500 faces, and a 5×5 raise rebuilds in about 22 ms.

## Modes (the mode bar)

- **Terrain (T):** raise, lower, flatten, slope, kind, hole, and bridge blocks. Brush 1, 3 or 5 tiles. Shift for a half step, Alt for the opposite.
- **Paint (P):**
  - tools: brush, fill or replace everywhere;
  - faces: tops, sides or both;
  - what: a tile, a terrain type, or clear.
  - Alt-click is the eyedropper.
  - The tile picker can import a tileset or change its tile size.
- **Tile (E):** inspect and change a tile's height, kind, walkable, slope, type and painted faces. Causes and effects come later.
- **Objects (O)** and **Play (Space)** show as coming soon.

## Reused from Cardworks (imported via `@/…`)

The component kit (`src/ui/components/ui/*`), theming (`src/ui/theme/*`, the `--canvas`
token as the viewport backdrop), the `History` class, and `useLayout`. The Konva card
renderer is **not** reused — it's replaced by `scene/`.

## Build wiring (one app)

- `src/app/workspace.ts`: the `useWorkspace` store and the hash routes (`#/cards`,
  `#/engine`, `#/play`, `#/play/pack=<id>`). `src/app/App.tsx` mounts each workspace on
  first use with `React.lazy` (so Three.js loads only for the Engine) and keeps it
  mounted, hidden, after that. Hidden workspaces ignore keys (`isActive()`).
- `src/ui/shell/WorkspaceSwitch.tsx`: Cards · Engine · Play at the start of every top bar.
- `engine/index.html` and `playtest/index.html` are redirects (`public/workspace-redirect.js`)
  to `#/engine` and `#/play`, keeping `#pack=`; their manifests stay for installed shortcuts.
  Cozy drops both, and the redirect script.
- Electron: one window; `routeOpen` returns `'self'` for the old pages, which load there.
- The Engine's **Cards:** menu (`panels/CardSourceMenu.tsx`) saves `MapDoc.cards`: the
  project open in Cards, or a `.cmpack` loaded into the Engine (shared with Play's packs).

## Roadmap

The current roadmap is the plan doc's build order: phase 1 (one app) is built; next is
phase 2 (the Cardworks core and scenes). The slice list below is the history so far.

1. **Scaffold + viewport** (done): the app renders a textured-block demo map with a
   working camera and picking, reusing the Cardworks chrome.
2. **Editing tools** (done): left-click acts, right-drag orbits; drag-strokes as single undo
   steps; undo/redo shortcuts; an "Open Hearthside Engine" launcher in the card app.
3. **Persistence** (done): maps save to the engine's own IndexedDB (`hearthside-engine`),
   autosave with a "Saved" indicator, a File menu + Maps dialog (new / open / rename /
   duplicate / delete), reopen the last map on launch, and `.hsmap` file import/export.
   (A desktop folder format alongside the DB comes with the Electron bridge work later.)
4. **Tile columns, tilesets, viewports** (done, owner feedback 2026-10-29): the v2 map, per-face
   tiles from 16/32/48 px tilesets, one-face hover, Terrain/Paint/Tile modes from the engine plan,
   a properties panel, the quad layout, view cube, ortho, FOV, Game camera, 2D view, perf meter.
5. **Separate 2D maps** (towns, side-view scenes) with their own tile layers.
6. **Objects mode** (sprites from Aseprite, doors, chests, spawn points), then **Cause and Effect**,
   **zones and the world view**, starters and graphics presets.
7. _(later)_ **Cardworks integration:** import a `.cmpack`, place card-backed entities
   (data + art); room kept for a card-battle module.
8. _(later)_ play mode, tile-anchored movement, RTwP/CRPG systems.

Phase 1 of the plan (v0.8.1-beta): one app with Cards, Engine and Play workspaces; one
UI across them; resizable side panels; UI size; Settings with fonts; view modes for cards
and assets; Gallery and Proofread shelved; the Engine's card source.

## Games, Play and scenes (PR 1 of 3, v0.8.2-beta)

Everything is now in a **game** (`model/game.ts`, `GameDoc`), stored in the Engine DB v3
`games` table. A game holds card sources, decks, zones, variables, scenes, game events
and recipes. Map scenes point at rows in `maps`, so the 3D editor and its autosave are
unchanged; picture scenes live inside the game.

- `storage/games.ts`, `storage/gameActions.ts`: the game store, first-run migration
  (older maps become map scenes in "My game"), File-menu actions, game autosave,
  `.hsgame` export/import (`io/gameFile.ts`).
- `store/gameStore.ts`: `useGame`, the open game with its own undo history, the rail
  panel, the centre view (a scene or a deck) and the selection.
- `cards/`: `gameCards.ts` loads and merges the sources into one `OpenPack` (the
  shape Play's table uses); live projects are exported with the card renderer and
  cached by a content fingerprint. `merge.ts` merges packs (pure, tested).
  `deckBridge.ts` routes Play's deck list to the game's decks. `draw.ts` holds the seeded
  test draws.
- `modules/`: the module registry. `adventureScuffle.ts` brings the deck builder
  (suboptimal, optimal, very optimal).
- `model/events.ts`, `events/`: Cause and Effect.
  - `pieces.ts` is the registry of causes, conditions and effects.
  - `run.ts` is the runner.
  - `EventsEditor.tsx` is the sentence editor.
- `scenes/`: `SceneView.tsx` draws the scene as SVG, with the glow filter.
  `PictureEditor.tsx` draws areas and places things. `SceneProps.tsx` holds the glow
  settings, the Vector Maker shape edit and the events. `ImagePicker.tsx` handles game
  images and card-project images.
- `runtime/`: `runtime.ts` is a game running (scenes, variables, messages, choices,
  Back, the services `deck.build` and `cards.play`). `GamePlayer.tsx` is the full-screen
  player.
- `panels/game/`: the rail panels (Game, Scenes, Decks, Cards, Images, Variables), the
  deck editor and the games dialog.
- Play opens a game at `#/play/game=<id>` (`play/openForPlay.ts`). Per-pack data is keyed
  by the game id, so replays, Rush, tournaments and the lab work on the game.
  `src/playtest/handoff.ts` carries "Start a card game" to the table and the result back.
- The Vector Maker has a shape mode (`src/vector/shapeRequest.ts`). It opens a drawing over
  a reference picture, and Done returns the drawing instead of saving an asset.
