# Card text the rules engine reads

The rules engine reads every Adventure Scuffle ability from the card itself: `Ability_AS` (the printed text) and `Type_AS` (how the card is used). There is no hidden effect field and no per-card code. If you write a new card with the phrases below, it plays by its text as soon as you export the pack.

A card with words the reader doesn't know still plays, **with its stats only**. The deck builder lists it under "missing or odd values", and the card zoom and preview show the words it couldn't read.

The code is `src/adventure/effects/reader.ts`. The phrases are its `PHRASES` list and the conditions are its `CONDITIONS` list.

## How a text is read

- **Clauses:** an ability is a series of clauses, each `[Conditions: ]Phrase.`. A phrase can be more than one sentence when it says so below (for example a swap and "The card placed on the field is Ready.").
- **Case and spacing don't matter.** Curly quotes are fine. The symbols `{fightingspirit_as}`, `{attack_as}` and `{defense_as}` are read as FS, Attack and Defense.
- **A leading label** such as "Flip Ability:" is skipped. The card's type says how the ability is used.
- **Several conditions** are separated by commas and must all hold: "Initiative, 3+ Rest Zone: +1 FS."
- **[W]** in a phrase is an archetype word, such as Grave, Ghoulish or Rianz. It is matched against `Archetype_AS`, or against the card's name when that field is empty.
- **[N]** is a whole number.

## The card type decides how an action is used

| Type_AS  | What its action does                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Field    | A Field Ability: used from a ready face-up card on the field, which then turns ability-active.           |
| Support  | A Support Ability: used from Support, then the card is rested (unless the text keeps it).                |
| Flip     | Triggers when the card is turned face up.                                                                |
| Battle   | Resolves right after the card is revealed as Fighting Spirit. Its "+N FS" clauses change its value then. |
| Inherent | No action: only lasting rules, such as stats and protections.                                            |
| Rest     | No action: Fighting Spirit from the rest zone.                                                           |

A card has at most one action. An action on an Inherent or Rest card isn't read.

## Conditions

Put these before a colon. They work with any phrase that takes conditions.

| Condition                                                          | Holds when…                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `Attacking Side` / `Defending Side`                                | you attack / defend in this Engagement                                       |
| `Initiative` / `No-Initiative`                                     | you have / don't have the initiative                                         |
| `N+ Rest Zone`, or `If you have N or more cards in your rest zone` | your rest zone holds at least N cards                                        |
| `If a [W] card is also on your field`                              | another face-up [W] card is on your field                                    |
| `If a [W] card is in your rest zone`                               | another [W] card is in your rest zone                                        |
| `If opponent has an Ace on their field`                            | the opponent has a face-up Ace on their field                                |
| `Center` / `Flank`                                                 | this card is in the middle column / a side column                            |
| `Second Engagement`                                                | this is the round's second Engagement                                        |
| `Won First Engagement`                                             | you scored the round's first Engagement                                      |
| `Lost Previous Engagement`                                         | your opponent scored the Engagement before this one                          |
| `If a [W] card was revealed as Fighting Spirit this Engagement`    | a [W] card is among your Fighting Spirit this Engagement (this one included) |

Two more go before a colon on Field and Support actions only:

- `Rest N`: a cost. You rest N other Support cards to use the ability.
- `Once per round`: the ability can be used once each round.

For example: "Once per round, Rest 1: Opponent rests a card from their Support."

## Phrases

### Stats and Fighting Spirit (any conditions)

| Phrase                                                                                                                                                                                         | Meaning                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `+N {attack_as}`, `+N {defense_as}`, or both joined by `and`                                                                                                                                   | while face up on your field                               |
| `This card's {attack_as} Value and {defense_as} Value are swapped.`                                                                                                                            | while face up on your field                               |
| `Defense Unbound`                                                                                                                                                                              | while face up on your field: non-adjacent defenders count |
| `+N {fightingspirit_as}`                                                                                                                                                                       | added to this card's Fighting Spirit when it is revealed  |
| `Flip a coin when revealed: Heads +N {fightingspirit_as}, Tails +N {fightingspirit_as} instead of printed value.`                                                                              | a coin sets its Fighting Spirit                           |
| `You may use this card for Fighting Spirit this Engagement. It gets +N {fightingspirit_as}.`                                                                                                   | Fighting Spirit from the rest zone, with the bonus        |
| `Flip a coin. Heads: you may use this card for Fighting Spirit this Engagement, and it gets +N {fightingspirit_as}. Tails: nothing happens, and you may still reveal Fighting Spirit or pass.` | the same, after a coin (once per Engagement)              |

### Lasting rules (no conditions)

| Phrase                                                                 | Meaning                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `May not be the target of an opponent's Field Ability.`                | opponents' Field Abilities can't choose it                      |
| `This card cannot be repositioned by an opponent's ability.`           | opponents' abilities can't move or swap it, on or off the field |
| `Whenever this card would be rested, it goes to your Support instead.` | it never rests                                                  |
| `This card cannot be rested to pay a cost.`                            | it can't pay a Rest cost                                        |

### Actions

| Phrase                                                                                                                                                                 | Meaning                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Opponent rests a card from their Support[, if able].`                                                                                                                 | the opponent chooses the card                                                                                |
| `Swap target opponent's card's position with another card on their field.`                                                                                             | you choose both                                                                                              |
| `Swap target opponent's ready card on the field with a random card from their Support. The card that enters the field inherits the state of the card it swapped with.` | add `The card it swapped with is rested.` to rest the card swapped out                                       |
| `Swap a card on your field with a card from your Support. The card placed on the field is Ready.`                                                                      |                                                                                                              |
| `Swap a ready card's position with another ready card on your field.`                                                                                                  |                                                                                                              |
| `Swap the position of a [W] card on your field [(this card included)] with another card on your field.`                                                                | add `To choose a face-down [W] card, show it to your opponent; it stays face down.` to allow face-down cards |
| `[You may] swap this card's position with a [ready] card on your field.`                                                                                               | see "Swaps from off the field" below                                                                         |
| `[You may] swap one of your attackers to one of your defenders.`                                                                                                       | Battle only: the two change roles. The combat rules then decide the new Main Attacker and the totals         |
| `Target opponent's card on the field is turned to the ability-active position without resolving its ability.`                                                          |                                                                                                              |
| `Target a ready card on the opponent's field. It is turned to the ability-active position without resolving its ability.`                                              | only a ready card                                                                                            |
| `Attack Unbound: Non-adjacent cards are counted for attack.`                                                                                                           | for this round                                                                                               |
| `Your opponent reveals a random card from their Support to you.`                                                                                                       |                                                                                                              |
| `This card is included in your attacking group this round, regardless of its Fate Number rank.`                                                                        |                                                                                                              |
| `Return a [W] card from your rest zone to your Support.`                                                                                                               |                                                                                                              |
| `Copy and use the Field Ability of a card on the opponent's field (excluding abilities that themselves copy another ability).`                                         | uses the copied ability as your own, with its own costs and choices                                          |

`You may` makes an action optional: the player is asked first.

### Keeping a Support card in Support

| Phrase                                                                                | Meaning                                          |
| ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `Reveal this card.`                                                                   | you show it, and it stays in Support             |
| `This card is not rested after use.`                                                  | it stays in Support                              |
| `If a [W] card is in your rest zone, this card does not need to be rested after use.` | it stays if the condition holds after the action |

## Swaps from off the field

"Swap this card's position with a card on your field" reads by where the card is:

- **From Support:** each card goes where the other was. This card goes on the field and the field card goes to Support. Add `This card inherits the state of the card it swapped with.` to keep that card's state; otherwise it arrives Ready.
- **As Fighting Spirit (Battle):** this card takes the field card's place, and the field card takes its place as the Fighting Spirit, at its printed value.

A card swapped off the field counts as repositioned, so a card that "cannot be repositioned by an opponent's ability" can't be swapped out by an opponent.

## Writing new cards

- Start from a phrase above and change only the parts in brackets: the archetype word, the numbers, the conditions.
- Keep one action per card. Lasting rules and stat clauses can be added freely.
- Write each clause as its own sentence, ending with a full stop.
- Open the pack in Hearthside Table. If the deck builder shows "can't read …" for the card, the quoted words are the part to rephrase.
- If no phrase fits a new idea, the reader needs a new phrase. That's a small change in `reader.ts`, plus a line in this list.
