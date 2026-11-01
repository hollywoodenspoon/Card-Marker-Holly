# ADVENTURE SCUFFLE!
### Rulebook — Mutual Reveal Mode (v2.6)

v2.6 makes **pairs** the Skirmish rule: after the opening pairs, cards are revealed two at a time. "Changes since v2.5" at the end lists the changes.

---

## Overview

Two players each bring a Free Company of 12 cards. The game is played in rounds; each round has two Engagements, each worth 1 point. The first player to **4 points** wins at once.

**Components:** each player's 12 cards, a coin (for coin-flip cards), 2 cubes to mark each player's Main Attacker, and debuff tokens (only for Free Companies that place them, such as Fear Descends).

---

## Building a Free Company

- **Exactly 12 cards, one copy of each.**
- **At most one Ace.** Aces are cards marked as Ace, usually with stronger stats or abilities. A Free Company may have zero or one Ace. **Exception:** Guardian of Creation may be added as a second Ace.
- **Bonus cards** are released outside the premade Free Companies. They follow the same rules; a bonus Ace counts toward the Ace limit.

New players can pick a premade Free Company instead of building one.

---

## Start of the Game

1. Decide the initiative: rock-paper-scissors (the winner takes or gives the initiative). Hearthside Table can also decide it at random.
2. Each player places 6 of their 12 cards face down on their field; the initiative player places first. The other 6 cards are their **Support**.

**The field** is 6 positions in 2 rows and 3 columns. The top row is the **Front Line**, the bottom row the **Rear Guard**; the middle column is the **Center**, the two side columns the **Flank**. Every position is one row and one column at once (top-left is Front Line and Flank).

---

## Round Structure

Each round is a **Skirmish Phase**, a **Combat Phase** and a **Regroup Phase**.

### Skirmish Phase: Mutual Reveal

Both fields start face down. Players reveal each other's cards, and each reveal is answered by a response.

1. The initiative player reveals **2 adjacent face-down cards** on the opponent's field.
2. The opponent gets a **response** (see below).
3. The opponent reveals **2 adjacent face-down cards** on the initiative player's field.
4. The initiative player gets a response.
5. From then on, players alternate revealing **2 cards at a time** on the other player's field, starting with the initiative player. Each card revealed must be **next to an already-revealed card** on that field (the two cards needn't touch each other). Each reveal is followed by a response from the player whose cards were revealed.
   - If only one face-down card is left on that field, reveal it alone.
   - If no face-down card next to a revealed card is left, any face-down card may be revealed.
   - A player with no face-down card left to reveal is skipped; the other keeps revealing.
   - If no adjacent face-down pair is left for an opening reveal, reveal one card instead.
6. When all 12 field cards are face up, the **initiative player** gets one final response.

**A response** is one of:
- **Use a Field Ability** of any face-up Ready card on your own field that hasn't used it yet (not only a card just revealed). The card becomes ability-active.
- **Use a Support Ability** from your Support.
- **Pass.**

Some cards let you do something in a response window *in addition to* your response (for example, attaching a Living Weapon from the rest zone, or Unassuming Mage's swap). Their text says so.

**Flip Abilities** trigger the moment their card is revealed, before the response. They are mandatory; the card's owner picks any targets. If there is no legal target, nothing happens. A Flip Ability doesn't make its card ability-active: it stays Ready and still attacks or defends. A face-down card that an ability turned ability-active "without resolving its ability" doesn't trigger its Flip Ability when revealed.

**No card turns a field card face down during the Skirmish.**

### Attack/Defense Assignment

When the Skirmish ends, each player assigns their own field:

1. Cards that are already ability-active stay ability-active. They don't attack or defend this round.
2. Rank the remaining Ready cards by Fate Number, lowest first.
3. The **lower half attacks**, the **upper half defends**. With an odd number of cards, the extra card defends.
   - A card "included in your attacking group regardless of its Fate Number rank" is left out of the split and added to the attackers as an extra attacker.
4. Your attacker with the lowest Fate Number is your **Main Attacker**. Mark it with a cube.
5. **The stacks form.** Your attack stack is your Main Attacker plus your attackers adjacent to it. It attacks the **Mirrored Position** of your Main Attacker on the opponent's field (same row, opposite column). The opponent's defense stack is their defenders on or adjacent to that position. Interpose cards and Unbound cards may join stacks from anywhere.
6. **Values lock.** Every card's Attack and Defense, with position bonuses and other Inherent changes, stays as it is now for the rest of the round, even if the card moves or a condition stops being met. Only modifiers applied during combat (such as debuff tokens) still change them.

**The Main Attacker** only decides where the attack comes from and what it targets. Once combat has started it is an attacker like any other, and no ability checks which card is the Main Attacker. Abilities may still decide, before the stacks form, which card *can* become Main Attacker.

### Combat Phase

1. Each player's attack makes one Engagement. The initiative player chooses which one resolves first: the **First Engagement**; the other is the **Second Engagement**.
   - A player with no attacker plays no Engagement this round.
   - If an attack has no defender on or adjacent to its target, the attacker scores the point at once and no Fighting Spirit is revealed.
2. **Starting totals:** Attack is the attack stack's total Attack; Defense is the defense stack's total Defense.
3. **Fighting Spirit:** players alternate revealing one card at a time, starting with the initiative player in every Engagement, whichever side they are on.
   - Reveal a card from your Support and add its Fighting Spirit to your side, or use a rest-zone card whose Rest Ability lets you use it for Fighting Spirit (it stays in the rest zone and can be used once per Engagement).
   - Resolve its Battle Ability before the next reveal.
   - **Or pass.** Passing locks your total for this Engagement only; the other player may keep revealing until they pass too.
   - If an ability moves a card between your attack stack and your defense stack, totals update at once. Such abilities ignore Fate Numbers. A swap trades the two cards' places in the stacks, wherever they sit, each keeping its locked values; the attack still comes from the same position and targets the same position.
   - A condition that turns on during combat (an Unbound, an Interpose) adds its cards to the stack at once, at their locked values.
4. **Scoring:** the higher total scores 1 point, attacker or defender. A tie scores nothing. Reaching 4 points wins at once.
5. **Between Engagements,** players may use any Rest Ability whose condition is met.
6. Resolve the Second Engagement the same way. Support cards you didn't use carry over to it.

### Regroup Phase

1. Remove all debuff tokens.
2. Rest every card used for Fighting Spirit, every unused Support card, and every attached Living Weapon.
3. Cards with **Endure** may stay on the field (see Endure). Every other active field card goes to your Support. Ready cards stay where they are.
4. **Refill** every empty field position face down from your rest zone, choosing which card goes where; the initiative player refills first. If your rest zone runs out, fill the rest from your Support. Every round starts with 6 cards on each field.
5. Pass the initiative. The next round's Skirmish reveals the refilled cards.

---

## Terminology

**Free Company** - a player's 12-card deck.

**Ace** - a card marked as Ace (see Building a Free Company).

**Support** - the cards in a player's hand. Used for Fighting Spirit in combat, or for Support Abilities in the Skirmish.

**Field** - a player's 6 positions (see Start of the Game).

**Rest / Rest Zone** - to rest a card is to put it in your rest zone, a face-up pile. Rest-zone cards refill the field at Regroup and can use Rest Abilities.

**Ready** - a card that hasn't attacked, defended or used an ability this round.

**Active** - a card that is attacking (turned clockwise), defending (turned counter-clockwise) or ability-active (turned diagonally). Attacking and defending are assigned after the Skirmish; ability-active comes from using an ability.

**Adjacent / next to** - directly above, below, left or right on the same field. Diagonals don't count.

**Mirrored Position** - the same row, opposite column, on the opponent's field.

**Engagement** - one attack against one defense in the Combat Phase. A round has at most two.

**Won / Lost an Engagement** - you scored its point / the other player did. A tie is neither. Only the current round counts, so "Lost Previous Engagement" can only be met in the Second Engagement.

**Attack, Defense and Fighting Spirit Values** - printed on the card's left edge, right edge and top edge. A greyed-out icon shows the most the stat can reach through the card's own ability. **No card's Fighting Spirit can be above 3,** after every bonus. **Exception:** Guardian of Creation is printed with 4.

**Fate Number** - a unique number from 100 to 666 on every card. It only decides the Attack/Defense Assignment.

**Swapped-in card** - a card an ability puts on the field in place of another. It takes the replaced card's face (up or down) and its state, unless the ability says otherwise ("is Ready"). Its Flip Ability triggers only when it is later revealed.

---

## Ability Types

**Field Ability** - used from the field, as a response in the Skirmish, by a face-up Ready card. Using it makes the card ability-active, so it doesn't attack or defend this round.

**Support Ability** - used from your Support, as a response in the Skirmish. Show the card, resolve it, then rest it, unless the text says otherwise.

**Rest Ability** - used from the rest zone when its condition is met. "You may use this card for Fighting Spirit this Engagement" is used on your Fighting Spirit turn instead of revealing a Support card; the card stays in the rest zone. Living Weapons that are Rest cards attach from the rest zone in the Skirmish.

**Battle Ability** - resolves when its card is revealed as Fighting Spirit. Its condition is checked once, at reveal.

**Inherent Ability** - always on, wherever the card is; its own text sets its limits (a positional bonus only works on the field). Checks that look at the field only count face-up cards.

**Flip Ability** - triggers when its card is revealed in the Skirmish (see the Skirmish Phase).

---

## Keywords and Wording

Ability text is `[Condition or Cost]: [Effect]`. "+1  A", "+1  D" and "+1  FS" are printed with a double space for the icons.

### Conditions

- **Position:** `Center:` / `Flank:` — only while the card is in that zone.
- **Initiative / No-Initiative** — whether you have the initiative this round.
- **Attacking Side / Defending Side** — which side of the current Engagement you are on.
- **First / Second Engagement**, **Won First Engagement**, **Lost Previous Engagement.**
- **N+ Rest Zone** — your rest zone holds N or more cards.
- **"If you have N or fewer cards in Support"**, **"If opponent has N+ cards in their rest zone"**, **"If opponent has an Ace on their field"** (a face-up Ace).
- **Board state:** `If [condition]: [effect]`, checked continuously; on the field, until values lock.
- **Terror N+** — the opponent's field holds N or more debuff tokens.

### Reveal-order keywords (Battle Abilities)

- **First Blood** — no card has been revealed as Fighting Spirit yet this Engagement.
- **Riposte** — the card revealed just before this one this Engagement was a Battle card revealed by your opponent.
- **Ambush** — your opponent has already passed this Engagement.
- **Final Blow** — the bonus waits until both players have passed, and counts only if this card is still the last card revealed.
- **Echo Bond** — another card of the named archetype was already revealed this Engagement.

### Costs

Any ability, Inherent included, may start with **Rest N**: rest N cards of your choice from your Support, not counting the ability's own card. Pay in full or you can't use it. An Inherent cost is paid when its effect applies (for example, "Rest 1: Interpose." is paid when the stacks form).

### Targeting

- "Opponent" always means the opponent. "Target player" is either player, the user's choice.
- "Opponent rests a card from their Support": the opponent chooses which card.
- "Your opponent reveals a random card from their Support to you": it is shown to both players, then goes back to their Support.
- A "ready card" target can be face up or face down.
- A protected card can't be chosen by the ability it is protected from.
- **"Cannot be repositioned"** protects against every swap by an opponent's ability, including being swapped out of the field.

### Archetypes (families)

- A card belongs to an archetype if its name contains the archetype word (Hero of Rianz is a Rianz card), or if it **prints** an archetype (every card of The United Horde prints Horde).
- An archetype check never counts the card itself: "If a Rianz card is also on your field" needs **another** face-up Rianz card.
- **At most 6 cards** share an archetype. Exceptions: Fear 7, Horde 12, Living Weapon no cap.
- Archetype effects are written in plain text. Common forms:
  - `If a [A] card is also on your field: …` and `If a [A] card is in your rest zone: …`
  - `If a [A] card was revealed as Fighting Spirit this Engagement: …`
  - `If a [A] card is in your rest zone, this card does not need to be rested after use.`
  - `Swap the position of a [A] card on your field (this card included) with another card on your field.` A face-down [A] card can be chosen by showing it to the opponent; it stays face down.

### Unbound

**Attack Unbound:** all your attackers count for your Attack. **Defense Unbound:** all your defenders count for your Defense. An Unbound on a Field Ability makes its card ability-active and lasts for the round.

### Debuff Tokens

A token lowers a field card's Attack or Defense by 1 (the ability names the stat, or the placing player chooses).
- Tokens stack; a stat can't go below 0; they never change Fighting Spirit.
- A token can go on a face-up or face-down field card, moves with it, and is removed if the card leaves the field.
- Placed during combat, a token lowers the card's locked value at once.
- All tokens are removed at the start of Regroup.

### Endure

`Endure.` or `[Condition]: Endure.` At Regroup you may keep this card on the field instead of moving it to Support. It stays in place, turns face down and becomes Ready; it is revealed again in the next Skirmish. The refill then needs one card fewer, so one card of your choice stays in your rest zone, and your next Support is one card smaller. A card whose text starts with Endure has no other ability.

### Hire

`Hire: Swap a card in your Support with a card in your rest zone.` You need a card in each place. Hiring a card out of your Support counts as resting it (Runaway Familiar can't be hired out). A face-down rest-zone card can't be hired back.

### Interpose

`Interpose.`, `[Condition]: Interpose.` or `Rest N: Interpose.` If this card is defending, it joins your defense stack wherever it is on your field. Only defending cards Interpose.

### Living Weapon

An archetype of Rest and Support cards named "Living Weapon [Name]".
- "Attach this card to a ready card on your field": the weapon goes under its host and adds its Attack and Defense to it.
- Weapons attach **only during the Skirmish**: Support weapons as a Support Ability, Rest weapons from the rest zone in a response window.
- **One weapon per card.** If the host leaves the field, the weapon goes to the rest zone. A weapon on a locked or ability-active host does nothing.
- An attached weapon isn't a field card: it doesn't count for "on your field" checks and can't be targeted on its own.
- You may arm your own face-down card; on the opponent's side, only face-up cards. A weapon on an opponent's card only restricts it, never lowers its stats.
- **Only Living Weapons add stats to another card.**

---

## Card Rulings

- **Unassuming Mage:** while the opponent has a Fear card on their field and the Mage is face up, in each of your response windows you may first swap the Mage with any card on your field (once per window). It doesn't use up your response.
- **Unmade Wretch:** "Rest 1, if an Unmade card is also on your field: Target opponent's card. It is turned to the ability-active position without resolving its ability."
- **Doppelganger Thief:** pays Rest 2 plus the copied ability's own cost.
- **Strategic Vanguard:** see the swap rule in Combat step 3.
- **A lone Engagement** (only one player attacks) counts as the First Engagement.
- Retired keyword names: Kindred (Strike, Return, Maneuver, Discount) and Onslaught. Cards still printed with them are read by their plain-text effect.

---

## Changes since v2.5

1. **Pairs is the Skirmish rule.** After the opening pairs, players reveal 2 cards at a time instead of 1 (Skirmish step 5). The one-card-at-a-time rule ("Classic") and the test rule "Triples" are retired.
2. Step 5 now says what happens when one card, or no card next to a revealed one, is left.

## Changes since v2.4

1. **Version markers removed;** the change logs of v2 to v2.4 are folded into the text.
2. **Field Ability (terminology)** said it is used "as a response to your own card being revealed"; it now matches the Skirmish rule (any later response, by a face-up Ready card).
3. **Flip Ability (terminology)** said it triggers at setup or at refill, and only changes Attack or Defense; it now triggers when revealed in the Skirmish and can do anything its text says (many Flip cards rest Support cards or swap positions).
4. **Ace (terminology)** said "never more than one"; it now includes the Guardian of Creation exception.
5. **Archetype keywords** listed the retired Kindred names (Strike, Return, Maneuver, Discount) as keywords; they are now plain-text forms.
6. **Endure** is now part of Regroup step 3 instead of only its own section.
7. **Responses** now mention abilities usable in a response window in addition to the response (Living Weapons, Unassuming Mage).
8. **Stacks:** Interpose and Unbound are named in the Assignment step that forms them.
9. **Initiative:** Hearthside Table can use rock-paper-scissors or a random draw.
10. **Card rulings** collected in one section.
