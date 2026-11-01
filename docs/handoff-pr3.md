# Handoff: PR 3 of 3 for the Engine (v0.8.4-beta)

Start a fresh session with: **"Read docs/handoff-pr3.md and start PR 3."**

## Where things stand

- **PR 1** (#62, v0.8.2-beta) is merged: games and card sources, Decks, picture scenes with click areas and glow, Cause and Effect, variables, the runtime, Play opening Engine games.
- **PR 2** (#63, v0.8.3-beta) is merged:
  - characters with layered portraits;
  - dialogue;
  - money, items and the collection;
  - shops and boosters;
  - weeks, activities and the calendar;
  - saves.
- Since then, `main` has the owner's design docs in `docs/design/` (#64) and a slimmer `CLAUDE.md` with path rules and a ship-pr skill in `.claude/` (#65).
- The code is in `src/engine/`; `docs/engine.md` describes it, and its last section lists PR 2's files. The assumptions are in `DECISIONS.md`.

## What PR 2 built that PR 3 builds on

- **Portraits** (`model/characters.ts`, `portraits/`): templates with layers, options and expressions. Layers use the ramp, hue or as-drawn recolouring. This is the base for the character maker.
- **Calendar** (`model/calendar.ts`):
  - weeks, months, seasons and years, with sizes set per game;
  - activities with lock and force conditions;
  - events on rules (weekly, Nth week of a month or season, once, random on an important event), with season and year limits;
  - announce-ahead, and modes auto / activity / forced.

  Random picks are seeded per playthrough (`calSeed`). Tournaments and releases will hang off this.

- **Economy** (`model/economy.ts`, `economy/`):
  - money is one number variable;
  - items;
  - a collection with normal and foil copies;
  - the Ace field (`aceField` and `aceText`);
  - boosters with rarities, and shops with buy-back per rarity.
- **Runtime** (`runtime/`):
  - `state.ts` holds the store and the screens the steps wait for (`showScreen` / `closeScreen`);
  - `world.ts` holds the player's world (`RunContext.world`);
  - `snapshot.ts` and `storage/saves.ts` handle saves.

  Anything new that a save must keep goes into `Snapshot`.

- **Pieces:** new causes, conditions and effects go in a registry file like `events/worldPieces.ts`. That file is imported for its side effect by `events/run.ts` and `EventsEditor.tsx`.
- **Editor panels:** `panels/world/` holds the rail panels and centre views, and `worldViews.ts` lists the centre view kinds. New views follow the same pattern: add a `GameView` kind in `store/gameStore.ts` and a rail entry in `EngineShell.tsx`.

## PR 3: the agreed list (details not yet agreed)

From the PR 2 handoff. **Discuss each with the owner before planning**; only the list itself is agreed.

1. **Tournaments:** brackets, invites, points, prizes.
2. **Releases and bans:** each season's card releases, and the ban list.
3. **The character maker** and generated characters.
4. **Tutorial hints.**
5. **The season simulator.**
6. **2D tile maps.**

The owner's design for each is in `docs/design/` (read these, not the claude.ai links):

- `adventure-scuffle-roadmap.md`, under What the game needs:
  - Tournaments, Ban list, The official calendar, Official tournament formats;
  - Opponents, Cards and collection;
  - also the sections NPC duelists: decks and careers, Characters: paper dolls, and Card pool size and releases.
- `engine-plan.md`: the duelists-as-cards table (character maker, tutorial hints, season simulator rows) and the 2D tile map scene kind.
- `game-editor-features.md`: Character maker, Tutorial, Season simulator, the money balance chart, and the tile map notes.

Some useful facts:

- Prize pools split 50 / 30 / 20.
- Bans are at most 2 cards per update, announced 4 weeks ahead.
- The pool is about 120 NPC duelists.
- The game starts with 60 cards, and 6 new cards come out each season from season 3 of year 1.
- The game ends at 7 years.

Check these against the docs before relying on them.

## The card game's design (from the owner, carried over)

- Seasons are 3 months, 4 seasons a year. The game ends at 7 years without a Worlds win; winning Worlds is the ending.
- **Locals** are weekly. **Regionals** are in the first week of a month. **Nationals** are in the 3rd week of a season, twice a year; Season 4 Nationals is the last chance to qualify, with a tougher field.
- **Pro Tour** is by invite (points from Regionals and Nationals). **Worlds** players come from the Pro Tour.
- **Cash prizes** at Nationals, Pro Tour and Worlds.
- **Exams:** one a season, random on an important tournament, always on season 4 Nationals. PR 2's calendar already does this, with two random events.

## Working with the owner

- **Discuss before planning.** Don't make plans unless asked.
- **No option-picker question dialogs:** outline the idea in plain text and let the owner reply.
- **Keep answers short and simple.**
- **Every PR bumps the last version number** (keep the beta label), and the PR title starts with it. This one is **v0.8.4-beta**. Follow `.claude/skills/ship-pr/SKILL.md`.
- **Test in the browser yourself.** In the dev server, `page.evaluate(() => import('/src/engine/...'))` can build a game and start the runtime directly. That's how PR 2's play-through was done.
- **Cozy builds only when the owner asks.**
