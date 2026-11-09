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

1. All players take their turns.
2. The boss takes its turn.

## Player turns

- Each player has a fixed number of actions per turn, 2 for now.
- Actions include moving and using an ability. The rest of the list: later.

## Equipment

- Each player has 3 slots: main hand, off hand and armour.
- A two-handed weapon takes both hand slots, so you get no off hand.
- An equipment card shows the abilities you can use.
- After you use an ability, the card flips to its other face, which has a different set of abilities.

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

- A player who falls stays down unless a teammate uses a revive ability.

## Winning and losing

- The players win when the boss's health reaches 0.
- They lose if every player is dead.
- A boss may have a hard or soft enrage. This is set per boss: later.
