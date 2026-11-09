# Battle Journal: design outline

The big picture only. Numbers, names and details are still open and are marked "later".

## The game

- A physical co-op board game for 1 to 6 players.
- The players fight one boss per game.
- There are no fixed roles. Equipment decides what each player can do.
- It should feel like an RPG boss battle.

## The board: the boss book

- The board is a notebook. Each two-page spread is one boss.
- One page holds the boss's details:
  - its health bar,
  - how many cards it draws at the start,
  - the health thresholds where it draws more.
- The other page holds the boss's hex grid, with the boss artwork looming over or around it.
- Each boss has its own grid size and layout.
- How many bosses the book has: later.

## Zones

- Every map has the same three zones: **Frontline**, **Midline** and **Rearline**. Each hex belongs to one, shown by its coloured border.
- Because every map shares these zones, any boss card works on any map.
- Zones are also ability range: each ability says which zone(s) you can use it from.
- Hexes can carry symbols for precise boss mechanics, for example "stand on the Frontline star to soak damage for everyone". Which symbols to use: later.
- Some bosses also have a signature mechanic that only works on their own map. Not every boss has one.

## Round structure

1. All players act in one shared players' turn. No one goes first: they play at the same time and coordinate their actions.
2. The boss takes its turn.

## Player turns

- Each player has a fixed number of actions per turn, 2 for now.
- Actions include moving and using an ability. The rest of the list: later.

## Equipment

- Each player has 3 slots:
  - **Main hand:** a one-handed or two-handed weapon.
  - **Off hand:** can't be used with a two-handed main hand.
  - **Armour:** also sets the player's total health. It never deals damage; its abilities give buffs, movement or similar.
- Off hands can be a second source of damage or a utility.
- An equipment card shows the abilities you can use.
- After you use an ability, the card flips to its other face, which has a different set of abilities.
- Abilities per face:

  | Card | Abilities per face |
  | --- | --- |
  | One-handed main hand | 1 |
  | Two-handed main hand | 2 |
  | Off hand | 1 |
  | Armour | 1 |

  Either way you get 2 hand abilities per face. A two-hander keeps both on one card, which flips as a whole. A one-hander plus an off hand splits them over two cards that flip separately.

## Other player cards

- Besides equipment, players can have single-use items or spells. Unclaimed ones sit in a shared single-use pool, which the Dagger's Mug draws from. A used card goes back into the pool. Examples:
  - potions that restore health or give a buff,
  - magic scrolls that cast spells, such as one that flips your equipment card to the face you choose.

## Components and printing

- All cards are ID-card size (85.6 x 54 mm), because the owner's cutter is made for that size.
- An A4 sheet holds 9 cards (3 x 3).
- There is one copy of each player card:

  | Card | Count |
  | --- | --- |
  | One-handed main hand | 4 |
  | Two-handed main hand | 2 |
  | Off hand | 4 |
  | Armour | 6 |
  | Single-use item or spell | 6 |
  | **Total** | **22 (3 sheets, 5 spare slots)** |

- Armour is 3 types with 2 copies each (assumed from the 3 names below).

### The equipment

| Slot | Cards |
| --- | --- |
| One-handed main hand | Sword, Wand, Mace, Light Crossbow |
| Two-handed main hand | Longbow, Lance |
| Off hand | Shield, Book, Dagger, Torch |
| Armour | Plate Armour (heavy), Brigandine (medium), Linen Cuirass (light) |

### Armour abilities

Light descriptions, no numbers yet. Abilities cost action points (AP) out of the player's 2 per turn.

**Plate Armour (heavy)**
- Face 1, **Brace** (1 AP): gain a shield token. A player can spend any number of their shield tokens to reduce incoming damage.
- Face 2, **Bulwark** (2 AP): the player takes no damage and ignores forced movement from map effects until their next turn.

**Brigandine (medium)**
- Face 1, **Fighting Spirit** (1 AP): gain 1 power token. A player can spend any number of their power tokens on a damage-dealing attack, each adding +1 damage.
- Face 2, **Inspire** (1 AP): if you used a weapon action this turn, give an adjacent player 1 power token. If not, gain 1 shield token.

**Linen Cuirass (light)**
- Face 1, **Anticipation** (2 AP): until the start of your next turn, each time you are about to take damage during the boss turn, you may first move 1 hex.
- Face 2, **Lightweight** (1 AP): gain 1 speed token.

### Main-hand abilities

**Sword**
- Face 1, **Swift Stab** (1 AP, Frontline only): deal 2 damage.
- Face 2, **Disengaging Strike** (1 AP, from a Frontline hex next to a Midline hex): deal 3 damage, then move to an adjacent Midline hex.

**Wand**
- Face 1, **Time Blast** (2 AP, Rearline only): deal 3 damage. Then look at the top 2 + X cards of the boss deck, where X is the number of other players. You may reorder them, then put them back on top.
- Face 2, **Arcane Bolt** (1 AP, Midline only): deal 1 damage, then choose a player. They gain 1 token of their choice.

**Lance** (two-handed)
- Face 1:
  - **Ready Lance** (1 AP, Midline only): gain 2 power tokens.
  - **Lance Stab** (1 AP, Frontline only): deal 2 damage.
- Face 2:
  - **Lance Charge** (1 AP, from a Midline hex next to a Frontline hex): deal 3 damage. You may spend exactly 2 power tokens to deal 7 damage instead (no more than 2). Then move to an adjacent Frontline hex.
  - **Lance Jump** (2 AP, any zone): spend any number (X) of your tokens, of any type, to deal X damage to a target. Then move to any Frontline hex.

### Off-hand abilities

**Shield**
- Face 1, **Shield Stance** (2 AP): gain 1 shield token. Then, until the start of your next turn, you may spend any number of your shield tokens to reduce damage taken by an adjacent player during the boss turn.
- Face 2, **Shield Bash** (1 AP, Frontline or Midline only): gain 1 shield token, then spend any number of shield tokens to deal that much damage to a target. Power tokens can add to it, but only if you spend at least 1 shield token. You may spend none: you deal 0 damage and can't add power tokens, but you still gain the shield token and the card still flips.

**Book**
- Face 1, **Revival** (2 AP): target a player (you can target yourself). Spend any mix of your power, shield and speed tokens to restore that much health to them. If they are incapacitated, this also revives them, but only if you spend at least 1 token.
- Face 2, **Raise Spirit** (2 AP): you and every adjacent player each gain 1 power, shield or speed token of their choice.

**Dagger**
- Face 1, **Exposing Strike** (1 AP, Frontline only): deal 1 damage. Your next damage this turn is doubled, before token buffs are added.
- Face 2, **Mug** (1 AP, Frontline only): deal 1 damage and take a random card from the single-use pool.

**Torch**
- Face 1, **Light of Hope** (1 AP, Midline only): must be your first action. You and every adjacent player each gain 1 power, shield or speed token of their choice. You can't use an armour action after this, this turn.
- Face 2, **Flame of Courage** (2 AP, Frontline only): target a player other than yourself. They get a 3rd action this turn.

### Tokens

Players keep tokens until they spend them. Any number can be spent at once.

| Token | Spend it to |
| --- | --- |
| Shield | Reduce incoming damage by 1 each. |
| Power | Add +1 damage each to a damage-dealing attack. |
| Speed | Add +1 movement each to a move action. |

What the other main hands do: later.

- The single-use pool may get duplicates of the 6 cards or more designs, so it holds more than one card per player.
- Equipment has two faces, so those sheets are printed double-sided.
- Boss cards are not counted here yet.

## The boss deck

- The boss runs itself from a deck of cards. There is no game master.
- Each card has a cost.
- On its turn the boss draws a number of cards and reveals them one at a time:
  - If the boss's ink is at least the card's cost, the card is played. The ink is checked, not spent.
  - Otherwise the card goes face down into the boss's ink pool.
- The ink pool never shrinks and has no cap, so the boss grows stronger over the fight.
- When the deck runs out, it is reshuffled.
- At set health thresholds the boss draws more cards each turn.
- How many cards the boss draws, and how this scales with player count: later.

## Boss card types

The boss has three card types for now:

- **Map attacks:** revealed on one boss turn, they go off on the next boss turn. Players have one round to respond, for example by dodging out of an area attack or stacking together.
- **Direct effects:** happen right away on the boss's turn, for example dealing damage to all players or flipping players' equipment cards.
- **Summon effects:** put something on the map, such as enemy adds or obstacles.
  - Adds cannot act on the boss turn they arrive, like summoning sickness. From the next boss turn on, they attack a player every boss turn.

## Boss move sets

- Each boss comes with its own designed deck.
- Players can mix cards from different decks into a custom move set and pair it with any boss.

## Death and revive

- A player at 0 health is incapacitated and stays down unless a teammate uses a revive ability, such as the Book's Revival.

## Winning and losing

- The players win when the boss's health reaches 0.
- They lose if every player is dead.
- A boss may have a hard or soft enrage. This is set per boss: later.
