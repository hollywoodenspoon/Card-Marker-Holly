# Battleline: Mech Wars — Urban Warfare

The source of truth for Urban Warfare's rules. Git keeps the history, so there are no versioned copies.

| File             | What it is              |
| ---------------- | ----------------------- |
| `rulebook.md`    | The full rules.         |
| `how-to-play.md` | The short player sheet. |

## Card fields (for Hearthside Cardworks)

Put these fields on the cards (they can sit hidden behind the design). The Table reads them to play with the rules on.

| Field          | Values                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------- |
| `Firepower_UW` | 0–3                                                                                          |
| `Ability_UW`   | `flag` Battleline Mech, `bomb` Fighter-Bomber, `support` Logistics Mech, `nil` Advanced Mech |
| `Name_UW`      | Optional; the card's name is used when empty.                                                |

A pack whose cards have `Ability_UW` opens as Urban Warfare. Each player is dealt 3 `flag`, 2 `nil`, 2 `support` and 2 `bomb`; if the pack has fewer cards of a kind, copies of that card are used, so one card of each kind is enough.

## Changelog

- **2026-11-06, Rulebook v1.2:** Battleline wins at once on your own turn, and the Objective win needs the center held through 3 opponent turns (was 2). From the owner's simulation runs: first player wins went from 42% to 47%, with 1% draws.
- **2026-11-06, Rulebook v1.1:** the push chain follows firepower (each card pushes the next; enemy cards need equal or higher firepower). Fighter-Bomber becomes an action card from the hand that removes any enemy card, with an explosion on the table.
  Newest first. Every rule or card change gets a line here.

- **2026-11-06, Rulebook v1.0:** first version in the repo, with the owner's rulings: push strength is checked before the move; your own cards pushed off are gone; new Objective win (hold the center through the opponent's next 2 turns, win at the start of your turn); no pass on either first turn; a Fighter-Bomber bombs on a later turn; a buffed Fighter-Bomber pushes with 2; card counting allowed. Placed cards push with printed firepower (they enter from outside the field).
