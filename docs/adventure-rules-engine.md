# Adventure Scuffle rules engine

The Mutual Reveal rules as code, in `src/adventure/`. It is plain TypeScript with no React, DOM or storage, written as plain data and functions so it can be translated to GDScript for the Godot game.

## Files

| File         | What it holds                                                        |
| ------------ | -------------------------------------------------------------------- |
| `cards.ts`   | `AsCard`: a card's values read from the pack's `_AS` fields          |
| `deck.ts`    | Free Company check: 12 different cards, at most 1 Ace                |
| `board.ts`   | The 2 × 3 field: slot numbers, neighbours, mirrored positions, names |
| `state.ts`   | `AsState`, the whole game as plain data                              |
| `engine.ts`  | `createGame`, `legalMoves`, `apply`, `prompt`                        |
| `stats.ts`   | Card values and Engagement totals                                    |
| `observe.ts` | `observeAs`: the game as one player may know it                      |
| `table.ts`   | `toTable`: draws a game on the Hearthside Table setup                |
| `fixtures/`  | Test cards and saved scripted games (JSON)                           |

## The field

Slot = row × 3 + column. Row 0 is the Front Line and row 1 the Rear Guard. Column 1 is the Center; columns 0 and 2 are the Flanks.

```
0 1 2   Front Line
3 4 5   Rear Guard
```

Neighbours are orthogonal only. The mirrored position is the same row and the opposite column: `row * 3 + (2 - col)`.

## State

- `players[0|1]`: `field` (6 slots of `{card, faceUp, state}`), `support`, `rest`, `spent` (Fighting Spirit used this round), `points`, `mainAttacker` (a slot, or null).
- Card state: `ready`, `attacking`, `defending` or `ability`.
- `initiative`, `round`, and `phase` (`setup`, `skirmish`, `combat`, `regroup` or `over`).
- `step`: the decision waiting now, and who makes it.
- `skirmish`: the reveals made so far, and who made the last one.
- `queue`: the Engagements still to fight, by attacking seat. `engagement`: the current one, holding each side's Fighting Spirit cards and passes. `results`: this round's outcomes.
- `seed`: the random generator's state (mulberry32 in `src/playtest/rng.ts`).
- `log`: readable entries. `flag: true` marks a case the rules don't settle.

## Steps and moves

| Step                                                      | Who                                                                    | Moves                                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `place` (from `support` at setup, from `rest` at Regroup) | the initiative player, then the other                                  | `place {card, slot}`, `unplace {slot}`, `placeRandom`, then `done` once the field is full or the pool is empty          |
| `reveal` (count 2, then 1)                                | alternating, the initiative player first                               | `reveal {slots}`, on the opponent's face-down cards. A pair must be adjacent; a single must be next to a revealed card. |
| `respond`                                                 | the owner of the revealed cards; `final` goes to the initiative player | `pass`. Ability responses are added with the card effects. Skipped automatically when there is nothing but pass.        |
| `first`                                                   | the initiative player                                                  | `first {attacker}`                                                                                                      |
| `fs`                                                      | alternating, the initiative player first                               | `fs {card}` from Support, or `pass` (locks that player's total for this Engagement)                                     |
| `over`                                                    | nobody                                                                 | none                                                                                                                    |

`apply` checks the move against `legalMoves` and returns the same state when it is illegal. After a move it runs every step that needs no decision: skipped responses, an automatic pass for a player with an empty Support, and placement when there is nothing to place.

## Round flow

1. **Skirmish:** the initiative player reveals a pair, then the other player does. After that, single reveals alternate, and a player with nothing left to reveal is skipped. The initiative player gets a final response.
2. **Assignment:** on each field, cards in the `ability` state are set aside. Ready cards are sorted by Fate Number: the lower `floor(n / 2)` attack and the rest defend. The lowest attacker is the Main Attacker. With no attacker, that player's Engagement scores nothing and is flagged.
3. **Combat:** if both players have an attacker, the initiative player picks the first Engagement.
   - Attack is the Main Attacker plus the attacking cards next to it.
   - Defense is the defending cards on or next to the mirrored target.
   - With no defender there, the attacker scores at once.
   - Otherwise Fighting Spirit alternates until both players have passed. The higher total scores 1 point, and a tie scores nothing. Reaching 4 points wins at once.
4. **Regroup:**
   - Spent and unused Support cards go to the rest zone.
   - Active field cards go to Support. Ready cards stay.
   - Each player refills the empty positions from their rest zone, face down.
   - Initiative passes and the round number goes up.

## Hidden information

`observeAs(state, seat)` replaces the opponent's Support cards and face-down field cards with `"?"` and zeroes the seed. A bot is only given this view.

## Replaying games

`fixtures/games/*.json` holds `{format, cards, names, decks, seed, moves, expect: {winner, points, round, log}}`. The cards are `basicCards()` from `fixtures/basic.ts`: card `i` has Fate `100 + 20i`. A port should replay every fixture and match the log line for line. `AS_WRITE_FIXTURES=1 npx vitest run src/adventure` writes them again after a deliberate rules change.
