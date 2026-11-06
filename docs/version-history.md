# Version history

The version rule changed on 2026-10-29: only a major update bumps the middle
number; fixes, updates to features already built, and features still under
construction bump the last one (see `CLAUDE.md` and `DECISIONS.md`).

Earlier PRs were numbered under the old reading. Their real version numbers,
tags and releases stay as they were, so nothing breaks (pacman, the update
notice and old links all keep working). This table shows what each would have
been under the current rule. Versions keep counting up from the repo's current
one: #61 was **0.8.1-beta**, then the Engine's three PRs took **0.8.2-beta**, **0.8.3-beta** and **0.8.4-beta**, and the pairs rule with every card in the engine took **0.8.5-beta**.

| PR  | Title                                                                                                                                                                                                    | Shipped as    | Under the current rule | Released |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------- | -------- |
| #49 | Show the version with the app's name                                                                                                                                                                     | 0.1.1-alpha.1 | 0.1.1-alpha.1          | no       |
| #50 | Bot ladder and MCTS (the new Hard)                                                                                                                                                                       | 0.2.0-alpha.1 | 0.1.2-alpha.1          | no       |
| #51 | Table overlays stay under the lab and other views                                                                                                                                                        | 0.2.1-alpha.1 | 0.1.3-alpha.1          | no       |
| #52 | CMYK PDF export                                                                                                                                                                                          | 0.3.0-beta    | 0.3.0-beta (major)     | no       |
| #53 | Later reveals touch revealed cards                                                                                                                                                                       | 0.3.1-beta    | 0.3.1-beta             | no       |
| #54 | Releases are the Arch package; Windows waits for Cozy                                                                                                                                                    | 0.3.2-beta    | 0.3.2-beta             | yes      |
| #55 | Fix the black screen after rock-paper-scissors                                                                                                                                                           | 0.3.3-beta    | 0.3.3-beta             | yes      |
| #56 | Combat stacks, rules fixes, Master Duel-style readability                                                                                                                                                | 0.4.0-beta    | 0.3.4-beta             | yes      |
| #57 | See every action in Hearthside Table                                                                                                                                                                     | 0.5.0-beta    | 0.3.5-beta             | yes      |
| #58 | Cozy Edition build                                                                                                                                                                                       | 0.6.0-beta    | 0.3.6-beta             | yes      |
| #59 | Hearthside Engine: block map editor                                                                                                                                                                      | 0.7.0-beta    | 0.3.7-beta             | no       |
| #60 | Hearthside Engine: tile columns, tilesets, viewports                                                                                                                                                     | 0.8.0-beta    | 0.3.8-beta             | no       |
| #61 | One app: Cards, Engine and Play                                                                                                                                                                          | 0.8.1-beta    | 0.8.1-beta             | no       |
| #62 | Engine 1 of 3: games, Play and scenes                                                                                                                                                                    | 0.8.2-beta    | 0.8.2-beta             | no       |
| —   | Engine 2 of 3: characters, money, shops, weeks, saves                                                                                                                                                    | 0.8.3-beta    | 0.8.3-beta             | no       |
| #67 | Engine 3 of 3: league, tournaments, simulator, template                                                                                                                                                  | 0.8.4-beta    | 0.8.4-beta             | no       |
| #68 | Template Aces; calendar; give-cards effects; own deck                                                                                                                                                    | 0.8.6-beta    | 0.8.6-beta             | no       |
| #70 | Card game step: own deck, league opponent, optional flag                                                                                                                                                 | 0.8.7-beta    | 0.8.7-beta             | no       |
| —   | Folder maps: a short CLAUDE.md in each main folder                                                                                                                                                       | 0.8.8-beta    | 0.8.8-beta             | no       |
| —   | Urban Warfare: move and push arrows on the cards, Buffed marks                                                                                                                                           | 0.8.10-beta   | 0.8.10-beta            | no       |
| —   | Urban Warfare fixes: site build error, arrows no longer cover nearby zones, taps need press and release on the same spot, last move marked                                                               | 0.8.11-beta   | 0.8.11-beta            | no       |
| —   | Every move shown clearly: Urban Warfare plays each move step by step (callout, sliding cards, cards flying off, turn banner, bot waits); Adventure Scuffle actions stay up longer and have a Next button | 0.8.12-beta   | 0.8.12-beta            | no       |
| —   | Urban Warfare rulebook v1.1: push chain follows firepower; Fighter-Bomber is an action card from the hand with an explosion effect                                                                       | 0.8.13-beta   | 0.8.13-beta            | no       |
| —   | Urban Warfare: bot against bot, replays (match recorder) and simulation                                                                                                                                  | 0.8.14-beta   | 0.8.14-beta            | no       |
| —   | Urban Warfare: rules in `game/urban-warfare/`, engine `src/urban/`, playable at the Table                                                                                                                | 0.8.9-beta    | 0.8.9-beta             | no       |

Earlier PRs (#1–#48) used the 0.1.0 alpha line and are unchanged.
| — | Pairs rule, all 188 cards in the engine, Auto Build | 0.8.5-beta | 0.8.5-beta | no |
| #77 | Urban Warfare trial rule switches and smarter bots | 0.8.15-beta | 0.8.15-beta | no |
| #78 | Urban Warfare rulebook v1.2: instant Battleline, hold 3 | 0.8.16-beta | 0.8.16-beta | no |
| #79 | Card images rounded corners; print corner guides, bleed fix, rename and tab fixes | 0.8.17-beta | 0.8.17-beta | no |
| — | Urban Warfare rulebook v1.3 (passing no longer ends the game), Battlelines and combined rulebooks | 0.8.18-beta | 0.8.18-beta | no |
