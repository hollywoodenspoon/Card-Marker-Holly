# Handoff: PR 2 of 3 for the Engine (v0.8.3-beta)

Start a fresh session with: **"Read docs/handoff-pr2.md and start PR 2."**

## Where things stand

- **PR 1** (#62, v0.8.2-beta) is merged:
  - games and card sources;
  - Decks with deck building;
  - picture scenes with click areas and glow;
  - Cause and Effect;
  - variables;
  - the runtime;
  - Play opening Engine games.

  Code is in `src/engine/`; see `docs/engine.md`.
- **The branch** `claude/clever-bohr-eqto0k` restarts from `main`. It carries the sprite work done after PR 1, which goes into PR 2:
  - the PixelLab **mannequin base** (`art/sprites/base-mannequin.*`, 8 directions, 96 × 96 frames): stand, walk, ready, slash, kneel, knocked out (face up and face down), and four starting poses;
  - the scripts `scripts/sprites/import_pixellab.py` and `build.py`;
  - prompt lists in `docs/sprites/`;
  - see `art/sprites/README.md`.

  Action animations reuse north-east for north (the owner's call).

## PR 2 outline (agreed with the owner)

These are general engine tools; Adventure Scuffle! only fills them with data.

1. **Characters with layered portraits.**
   - Portrait templates: the owner defines the layers (skin, eyes, mouth, hair, clothes, accessory…), and each layer has options.
   - Layers can be **recoloured in the Engine:** a grey-to-colour ramp keeps the shading, with a hue shift as fallback.
   - Characters: a name, a name colour, an option per layer, and a colour per layer.
   - Expressions swap some layers (eyes and mouth).
   - This is the base for PR 3's character maker.
2. **Dialogue:** a Say effect (character, expression, text), a VN dialogue box with typing text, a log, and variables in text. The existing choices show in the same box.
3. **Money, items, collection.**
   - One money currency, which is a chosen number variable.
   - Items with a picture and a price, kept as counts in the inventory.
   - A card collection that counts **normal and foil copies apart**.
   - Effects and conditions to give, take and check.
4. **Shops:** general shops with items, single cards and boosters, buy and sell.
5. **Boosters: 3 cards per pack,** each card rolling its own rarity (editable per booster):

   | Rarity | Cards | Chance |
   | --- | --- | --- |
   | Common | non-Ace | 70% |
   | Uncommon | Ace | 22% |
   | Rare | foil non-Ace | 6% |
   | Diamond rare | foil Ace | 2% |

   - Common vs uncommon comes from a card field picked in the Game settings (Ace).
   - The engine draws a moving foil shine.
   - The cards reveal one by one.
   - The player builds a deck from owned cards with an "Edit my deck" effect.
6. **Weeks, not days. There's no day/night cycle.**
   - Time moves one week at a time; week, month, season and year sizes are set per game.
   - **Activities:** the player picks one per week, which runs its Cause and Effect. An activity can be locked by a condition (grounded) or forced (exam week).
   - **A weekly tick**, e.g. the allowance from Parents' approval.
   - **Calendar events:** repeating (every week, the first week of a month, the 3rd week of a season), one-off, random-on-an-important-event, and **announced only N weeks ahead**.
   - **A calendar screen** shows the upcoming events the player knows about.
   - **End conditions** are calendar events.
7. **Saves:** 3 slots plus an autosave on every scene change, and a Save / Load menu in the player.

**PR 3:**
- tournaments (brackets, invites, points, prizes);
- releases and bans, and seasons' card releases;
- the character maker and generated characters;
- tutorial hints;
- the season simulator;
- 2D tile maps.

## The card game's design (from the owner)

- Seasons are 3 months, 4 seasons a year. The game ends at 7 years without a Worlds win; winning Worlds is the ending.
- **Locals** are weekly (like FNM).
- **Regionals** are in the first week of a month.
- **Nationals** are in the 3rd week of a season, twice a year, and are a big deal. Season 4 Nationals is the last chance to qualify, with a tougher field.
- **Pro Tour** is by invite (points from Regionals and Nationals). **Worlds** players come from the Pro Tour.
- **Cash prizes** at Nationals, Pro Tour and Worlds.
- **Exams:** one exam week per season, random but always on an important tournament, and one is always on season 4 Nationals.
- **Stats:**
  - **Parents' approval** sets the allowance, the main income. It's raised by school performance and family time.
  - **School performance:** if it's low, approval drops, and you can be grounded from tournaments.
  - **Money** pays for entry fees, packs, singles and items (study aids, approval boosters).
- The player picks **one activity a week**. The calendar shows upcoming events, and some prize tournaments appear only a week or a month ahead.
- The starting card pool is 60 cards, with more released each season.

## Owner's artifacts (on claude.ai, not in the repo; open by link)

- [Hearthside Engine: the plan](https://claude.ai/artifact/XWXm8CSvwHBDNRcoMuWd4i)
- [Game editor: feature set](https://claude.ai/artifact/CgpeWAVsQQHaCL6DyNgw2c)
- [Adventure Scuffle: game roadmap](https://claude.ai/artifact/JK9phT49rY1d2oK4riPSDp)
- [Adventure Scuffle: 216-card design](https://claude.ai/artifact/5RABFS9wYg643nJhekYD62)

## Working with the owner

- **Discuss before planning.** Don't make plans unless asked.
- **No option-picker question dialogs:** outline the idea in plain text and let the owner reply.
- **Keep answers short and simple.**
- **Every PR bumps the last version number** (keep the beta label), and the PR title starts with it. This one is **v0.8.3-beta**.
- **Cozy builds only when the owner asks.**
