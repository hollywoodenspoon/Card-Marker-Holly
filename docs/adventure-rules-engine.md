# Adventure Scuffle rules engine

The Mutual Reveal rules as code, in `src/adventure/`. It is plain TypeScript with no React, DOM or storage, written as plain data and functions so it can be translated to GDScript for the Godot game.

## Files

| File         | What it holds                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `cards.ts`   | `AsCard`: a card's values read from the pack's `_AS` fields, with `archetypes` from `Archetype_AS` |
| `deck.ts`    | Free Company check: 12 different cards, at most 1 Ace                                              |
| `board.ts`   | The 2 × 3 field: slot numbers, neighbours, mirrored positions, names                               |
| `state.ts`   | `AsState`, the whole game as plain data                                                            |
| `engine.ts`  | `createGame`, `legalMoves`, `apply`, `prompt`                                                      |
| `stats.ts`   | Card values and Engagement totals                                                                  |
| `observe.ts` | `observeAs`: the game as one player may know it                                                    |
| `table.ts`   | `toTable`: draws a game on the Hearthside Table setup                                              |
| `effects/`   | Card abilities: `reader.ts` (reads the text), `blocks.ts`, `helpers.ts` (keywords), `registry.ts`  |
| `fixtures/`  | Test cards (basic and The First Quest), random games, saved scripted games (JSON)                  |

## The field

Slot = row × 3 + column. Row 0 is the Front Line and row 1 the Rear Guard. Column 1 is the Center; columns 0 and 2 are the Flanks.

```
0 1 2   Front Line
3 4 5   Rear Guard
```

Neighbours are orthogonal only. The mirrored position is the same row and the opposite column: `row * 3 + (2 - col)`.

## State

- `players[0|1]`: `field` (6 slots of `{card, faceUp, state}`), `support`, `rest`, `spent` (Fighting Spirit used this round), `points`, `mainAttacker` (a slot, or null), and `round` flags set by abilities: `attackUnbound`, `used` (once-per-round abilities), `extra` (extra attackers).
- Card state: `ready`, `attacking`, `defending` or `ability`.
- `initiative`, `round`, and `phase` (`setup`, `skirmish`, `combat`, `regroup` or `over`).
- `step`: the decision waiting now, and who makes it.
- `skirmish`: the reveals made so far, and who made the last one.
- `queue`: the Engagements still to fight, by attacking seat. `engagement`: the current one, holding each side's Fighting Spirit (`{card, value, from}`, the value fixed at reveal), the passes, and the coin cards tried. `results`: this round's outcomes.
- `pending`: the ability being resolved (its context, the answers so far, and where the game goes on afterwards). `flips`: Flip Abilities still to trigger from the last reveal.
- `seed`: the random generator's state (mulberry32 in `src/playtest/rng.ts`).
- `log`: readable entries. `flag: true` marks a case the rules don't settle.

## Steps and moves

| Step                                                      | Who                                                                    | Moves                                                                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `rps` (only with `opening: 'rps'`)                        | Player 1, then Player 2                                                | `throw {hand}` (rock, paper or scissors). A tie throws again; the other throw is hidden from each player until both have thrown.     |
| `initiative`                                              | the rock-paper-scissors winner                                         | `initiative {take}`: take the initiative, or give it                                                                                 |
| `place` (from `support` at setup, from `rest` at Regroup) | the initiative player, then the other                                  | `place {card, slot}`, `unplace {slot}`, `placeRandom`, then `done` once the field is full or the pool is empty                       |
| `reveal` (count 2, then 1)                                | alternating, the initiative player first                               | `reveal {slots}`, on the opponent's face-down cards. A pair must be adjacent; a single must be next to a revealed card.              |
| `respond`                                                 | the owner of the revealed cards; `final` goes to the initiative player | `ability {card}` (a Field Ability of a face-up Ready card, or a Support Ability), or `pass`. Skipped when there is nothing but pass. |
| `choose`                                                  | whoever the ability asks                                               | `choose {id}`, one of the step's options                                                                                             |
| `first`                                                   | the initiative player                                                  | `first {attacker}`                                                                                                                   |
| `fs`                                                      | alternating, the initiative player first                               | `fs {card}` from Support, `fs {card, from: 'rest'}` (a Rest Ability), or `pass` (locks that player's total for this Engagement)      |
| `over`                                                    | nobody                                                                 | none                                                                                                                                 |

`apply` checks the move against `legalMoves` and returns the same state when it is illegal. After a move it runs every step that needs no decision: skipped responses, an automatic pass for a player with an empty Support, and placement when there is nothing to place.

## Round flow

1. **Skirmish:** the initiative player reveals a pair, then the other player does. After that, single reveals alternate, and a player with nothing left to reveal is skipped. The Flip Abilities of revealed cards trigger before each response. The initiative player gets a final response.
2. **Assignment:** on each field, cards in the `ability` state are set aside. Extra attackers (`round.extra`) are left out of the split. The other Ready cards are sorted by Fate Number: the lower `floor(n / 2)` attack and the rest defend. The extra attackers then join the attackers, and the lowest-Fate attacker is the Main Attacker. With no attacker, that player's Engagement scores nothing and is flagged.
3. **Combat:** if both players have an attacker, the initiative player picks the first Engagement.
   - Attack is the Main Attacker plus the attacking cards next to it (every attacker with Attack Unbound).
   - Defense is the defending cards on or next to the mirrored target (every defender with Defense Unbound).
   - Card values come from `statsAt`: the printed values, changed by the card's Inherent `stat` while it is face up.
   - A Battle Ability resolves right after its card is revealed as Fighting Spirit.
   - With no defender there, the attacker scores at once.
   - Otherwise Fighting Spirit alternates until both players have passed. The higher total scores 1 point, and a tie scores nothing. Reaching 4 points wins at once.
4. **Regroup:**
   - Spent and unused Support cards go to the rest zone.
   - Active field cards go to Support. Ready cards stay.
   - Each player refills the empty positions from their rest zone, face down.
   - Initiative passes and the round number goes up.

## Card abilities

Each card's rules are read from its printed ability (`Ability_AS`) and its type (`Type_AS`) by `effects/reader.ts`. There is no per-card code. The reader matches the text clause by clause against a list of phrases and conditions (`docs/card-text-phrases.md`), and builds the rules from the abilities in `effects/blocks.ts`. A card with any clause it can't read plays with its printed stats, and `unreadParts(card)` in `registry.ts` gives the words. A port should carry the phrase list over, not the cards. The rules may have:

- `stat(s, seat, slot, {a, d})`: Inherent A/D changes while face up on the field.
- `fs(s, seat, engagement, printed, card)`: the Fighting Spirit value at reveal. `fsCoin` sets it by a coin instead.
- `field`, `support`, `flip` and `battle`: abilities (below). `restFs`: Fighting Spirit from the rest zone, with a condition, a bonus and an optional coin.
- Flags:
  - `fieldProof`: not a target of opponent Field Abilities.
  - `fixed`: not moved by opponent abilities.
  - `defenseUnbound(s, seat)`
  - `runaway`: goes to Support instead of resting.
  - `unpayable`: can't pay a Rest cost.
  - `copies`: can't be copied.

An ability is `{name, optional?, can?, plan, apply, keep?}`.

- `plan(io)` only reads the state. It asks its choices with `io.pick(seat, prompt, options)`, which returns the answer.
- The engine runs `plan` again after every answer, replaying the answers given so far.
  - When an answer is missing, it stops on a `choose` step.
  - A choice with one option is answered without asking, and isn't stored.
  - A choice with no options means the ability can't go on: nothing happens.
- Once `plan` finishes, `apply(d, ctx, plan)` changes the state once. Randomness (coins, random cards) happens only in `apply`.
- Then the Field Ability's card turns ability-active, or the Support card rests unless `keep` says otherwise, and the game goes on (`pending.after`).
- An ability is offered only if `can` holds and a trial `plan`, taking the first option of every choice, completes.

Rest costs (`restCost`) pick Support cards one at a time. Cards already promised to a cost in the same plan (`io.reserved`) are excluded, so a copied ability that has its own cost can't pay twice with one card. Resting always goes through `rest()`, which sends a Runaway Familiar to Support instead.

The reader wraps actions for their conditions: `withCost` ("Rest N:"), `oncePerRound` and `when` (conditions such as "Defending Side:").

## Hidden information

`observeAs(state, seat)` replaces the opponent's Support cards and face-down field cards with `"?"` and zeroes the seed. A bot is only given this view.

## Replaying games

`fixtures/games/*.json` holds `{format, cards, names, decks, seed, moves, expect: {winner, points, round, log}}`. The cards are `basicCards()` from `fixtures/basic.ts` (no abilities): card `i` has Fate `100 + 20i`. A port should replay every fixture and match the log line for line. `AS_WRITE_FIXTURES=1 npx vitest run src/adventure` writes them again after a deliberate rules change.

The card ability tests (`effects/cards.test.ts`) build small boards from `fixtures/firstQuest.ts`, the 45 cards with ids `tfq01` to `tfq45`. `fixtures/randomGame.ts` plays random legal moves from a seed. A port can use it the same way, to check that games always end and no card is lost.

## Tournaments

`tournament/tournament.ts` holds tournaments as plain data:

- **Starting:** `createTournament(spec, entrants, seed)` sets one up. `PRESETS` holds the official formats.
- **Playing:** `currentMatches(t)` lists the round's matches. `nextGameStart(t, match)` says how a match's next game starts: the opening in game 1, then `initiative` for the player who went second the game before. `recordGame(t, matchId, game)` adds a result and pairs the next round once a round is complete.
- **Results:** `standings(t, stage, ids)` and `placings(t)` give the tables and the final order.

`tournament/series.ts` plays a whole bot-against-bot match for the worker.

## Step by step

`applyFrames(state, move)` returns the states a move passes through, one per log line it adds, each taken just before the next line is logged (or at the end). The last one is `apply(state, move)`. It works through an optional recorder in `log()`, which `apply` never sets. The Playtest app uses it to show moves action by action, and to rebuild a replay from its start and moves.

## Bots and balance runs

`bot/index.ts`: `botMove(state, level, seed, {playouts})` returns a move for the player to act, given as `'easy'`, `'normal'` or `'hard'`.

- Easy and Normal (`bot/policies.ts`) are rules of thumb.
- Hard is determinized Monte Carlo:
  - `bot/determinize.ts` shuffles the opponent's hidden cards and reseeds coins.
  - Each candidate is played to the end of the round with Normal on both sides.
  - The candidate with the best average score wins.
- A port only needs `legalMoves`, `apply` and the seeded RNG to reproduce them.

`sim/sim.ts`: `simulate({cards, decks, games, levels, seed})` plays bot games and counts:

- results per deck, per pairing, per level and per card
- any game that refused a bot's move or lost a card

`playMatch(game, levels, playouts)` plays one game with a bot on each seat and returns its moves (and who made each). `simulate` uses it, and its `onMatch` callback passes each finished game. `sim/rush.ts` plays one deck against another for the app's Rush mode, in `sim/rush.worker.ts`.

`report(result)` turns them into Markdown. `npm run as:sim -- --games 500 --levels normal,hard --pack my.cmpack --out report.md` runs it from the command line.

Archetype checks go through `inArchetype(s, card, word)` (`effects/helpers.ts`). A card's `archetypes` list decides when it isn't empty. Otherwise the word must appear in the card's name.
