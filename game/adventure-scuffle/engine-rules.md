# Adventure Scuffle! — engine rules

The exact rules the engine (`src/adventure/`) implements for The First Quest. Players use `rulebook.md`; this file holds every detail and ruling the code needs. Card text overrides these rules.

## 1. State

- **Zones per player:** field (6 positions), Support (hidden hand), rest zone (face-up ordered pile, newest on top).
- **Field position:** row `front | rear`, column `left | center | right`. `center` is Center; `left`/`right` are Flank. Adjacent = orthogonal neighbour on the same field. Mirrored position = same row, opposite column (center mirrors center).
- **Field card:** `faceUp: boolean`, `state: ready | attacking | defending | used`, `attachedWeapon?`.
- **Game:** score per player, initiative player, round number. Win at 4 points, checked after every point.

## 2. Setup

1. Initiative: random (or chosen).
2. Each player places 6 cards face down, initiative player first; 6 go to Support.
3. Deck legal: 12 distinct cards, at most 1 Ace.

## 3. Skirmish

### 3.1 Reveal
1. Every face-down field card turns face up at once. Cards turned face down by an effect last round were refilled away at Regroup, so none stay down.
2. Initiative player chooses one face-up Flip card on their field and resolves it; then the other player does the same. A player with no Flip card skips.
3. Flip abilities are mandatory. Targets are chosen by the card's owner. No legal target: nothing happens, the Flip is still the player's one Flip.
4. A card flipped face up later in the round triggers its Flip ability when flipped (no TFQ card does this). A card entering the field by a swap or a replacement is not flipped and does not trigger.

### 3.2 Actions
Players alternate one action each, initiative player first, until both have passed. A passed player takes no more actions.

- **Attack:** a face-up Ready card becomes `attacking`. Max 3 per player per round. It becomes the Main Attacker. From the second attacker on, it must be adjacent to the previous Main Attacker.
- **Defend:** a face-up Ready card becomes `defending`. Max 3 per player per round.
- **Field ability:** a face-up Ready Field card. Requires: Rest N cost payable **and** at least 1 card left in Support after paying. Order: pay Rest N → resolve effect → move the card to the rest zone → owner chooses a Support card to take its position, face up, Ready. (Unassuming Mage: goes to Support instead of the rest zone, after the replacement.)
- **Support ability:** reveal a Support card, pay its cost, resolve, rest it (Mission Handler included).
- **Rest ability:** a Rest card in your rest zone whose text is an action (Ghoulish Disruptor, Ghoulish Flanker, Cackling Demon, Living Weapon Dusk). Ghoulish Disruptor/Flanker are turned face down in the rest zone after use and can't be used again until Regroup.
- **Pass.**

### 3.3 Face down
A field card turned face down: can't attack, defend, use abilities or be counted by "on your field" checks; keeps its position; can't be turned face up again this round unless an effect does so. If it was attacking or defending, it no longer counts in the attack or defense; in combat its stats are removed from the total.

## 4. Combat

### 4.1 Stacks
- Attack stack = every card the player declared as attacker this round (still face up and on the field).
- Target = mirrored position of the Main Attacker.
- Defense stack = opponent's defending cards on or adjacent to the target.
- No attackers: no Engagement for that player.

### 4.2 Engagements
1. Initiative player picks which Engagement is First.
2. Empty defense stack: attacker scores, no Fighting Spirit.
3. Totals: attack = Σ Attack (+ attached weapon Attack); defense = Σ Defense (+ weapon Defense). Stats never change during the round.
4. **Fighting Spirit turns:** initiative player first in every Engagement. On a turn: reveal one Support card (add its FS, resolve its Battle ability), or, if a card allows it, use a rest-zone card (Ghoulish Brute/Stalker, any card under Grave Mistress); both count as a reveal, and the used card's Battle ability resolves. Or pass. Passing is final for that Engagement. The Engagement ends when both have passed.
5. A rest-zone card used for FS leaves the rest zone into the Engagement and is rested again at Regroup.
6. Higher total scores 1; tie scores nothing.
7. Support cards not used carry to the Second Engagement.

### 4.3 Battle-ability rulings
- **Swap an attacker with a defender** (Monk, Vanguard, Coin-Toss): the two cards change stacks; totals update; the target doesn't change. Coin-Toss Tails: the opponent chooses which of their cards swap.
- **Force Pass** (Ghoulish Brute): the opponent makes one more reveal (a rest-zone FS use counts), then is passed.
- **Archmage:** the opponent can't pass before their next reveal; that reveal is 2 Support cards at once, both add FS and both Battle abilities resolve. 1 card in Support: they reveal it. 0 cards: nothing happens.
- **Opponent rests a card from their Support:** opponent chooses. **Random:** uniform random card. Empty Support: nothing.
- **Coin flip:** 50/50.

## 5. Regroup
1. Rest: cards used for FS, all Support cards, attached weapons.
2. All field cards go to Support.
3. Refill 6 positions face down from the rest zone (owner chooses which card goes where), initiative player first; rest zone empty → from Support.
4. Initiative passes.

## 6. Effect rulings
- **Archetype:** name contains the quoted word; "also on your field" excludes the card itself and counts face-up cards only.
- **Targeting:** "target" picks a card on the named field; face-down cards can be targeted unless the text says "Ready" (Ready includes face down). The Kingdom's Hero can't be targeted by the opponent's effects.
- **Reposition:** any effect that moves a card to another field position or swaps it off the field. Weapon Master and Tower Guardian block the opponent's repositioning.
- **Replacement** (Crimson Duelist, Witch, Assassin, Quartermaster, Wanderer): the new card takes the position and the state of the card it replaces, face up, unless the text says Ready.
- **Living Weapon:** attaches to a Ready card as an action; adds its Attack and Defense; one per card; rested when its host leaves the field.
- **Emissary:** the opponent's Support is visible to the player (bots: perfect information on that Support) for the round.
- **Grave Guardian:** while it is in the current Engagement's attack or defense stack, its owner ignores "rests a card from their Support" effects.

- **Lucky Charm Bearer:** "top card" = the most recently rested card. It can be revealed later in the same Engagement.
- **Grave Mistress:** the 3+ check is made once, when Combat starts; if met, the effect lasts both Engagements whatever the count does later.
- **Unassuming Mage:** can't be used unless an opposing Ace is face up on the field.
