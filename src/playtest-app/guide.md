# How to play

Hearthside Table lays out a table for your game and lets you play it with the cards you made in Hearthside Cardworks, on any device. You move, flip and turn cards by hand and keep score. The app doesn't check the rules yet, so you play by your own.

## Getting your cards here

1. In Hearthside Cardworks, press **Playtest** in the left rail (or ☰ → **Playtest**).
2. Choose **Playtest now** to open the cards here straight away (Hearthside Cardworks in a browser), or **Save game pack** to get a `.cmpack` file.
3. Here, press **Import game pack** (or drop the file on the page) and press **Play**.

A game pack holds every card's picture, the values of its fields (such as `A_AS`, `D_AS` and `FS_AS`) and your decks. Send the file to a friend and they can play too. When you change cards, export the pack again: the new one replaces the old one here.

## Starting a game

1. Pick a **Game**. Two tables are built in:
   - **Adventure Scuffle! — Mutual Reveal**: for each player a 2 × 3 field (Front Line and Rear Guard), Support and a Rest zone; card states Ready, Attacking, Defending and Ability-active; a Main Attacker cube; points to 4. The two fields face each other, so a card's Mirrored Position is straight across.
   - **Simple board game**: a shared board, a hand and a deck for each player, pawns, markers and two dice.
2. Pick a **deck** for each player: one you built here (**Your decks**), or one from Hearthside Cardworks (**Decks in the pack**). **All cards** gives a player one of every card. A warning shows when a deck breaks a deck rule, or has a different number of cards than the game uses.
3. Press **Start**.

## Building decks

Press **Build decks…** on the New game screen. The pack's whole card pool is on the left (on a phone, the **Pool** tab); your deck is on the right (the **Deck** tab).

- **Tap a card** to add it to the deck, tap it again to take it out. A tick marks the cards in the deck.
- **Find cards** by name, code or ability text, filter by type or group, and sort by Fate Number, Attack, Defense or Fighting Spirit.
- **The rules** for Adventure Scuffle are checked as you go: a Free Company is exactly 12 different cards with at most one Ace. Aces are the cards with `{ace}` in their name (`Name_AS`). **Ready to play** shows when the deck is legal; otherwise the problems are listed.
- **Several decks:** **+** starts a new one, **Start from a pack deck…** copies a deck from Hearthside Cardworks to change, and the **Deck** list switches between them. Rename a deck in **Name**.
- **Export** saves the deck as a small `.asdeck.json` file, which **Import deck file** reads on another device or into another pack with the same card codes. **Copy list** copies the deck as text.

Decks are saved in this browser as you change them, one set per pack. Cards with missing or odd values (for example two cards with the same Fate Number) are listed above the pool so you can fix them in Hearthside Cardworks.

The game is saved in this browser as you play: come back later, or reload, and press **Continue**.

> **Tip:** **Random setup** (in the bar above the table) deals cards to the field for you. In Adventure Scuffle it puts 6 random Support cards face down on each field.

## The table

Each player's zones sit on their side of the table, in their colour. In a two-player game the top player sits across from you. The name of each zone is above it; **⋯** next to the name has **Show all cards**, **Shuffle** and **Pick a random card**.

- **Fields and boards** have slots. A slot holds one card.
- **Rows** (Support, a hand) show their cards side by side. They overlap when the row is full.
- **Piles** (the Rest zone, a deck) show the top card and how many there are. Tap a pile to see all of its cards.

Drag the empty table (or hold [[Space]]) to pan; pinch or use [[Ctrl]] + mouse wheel to zoom. [[Ctrl+0]] fits the table back on the screen.

![A game of Adventure Scuffle on the playtest table](playtest.webp)

## Moving cards

- **Drag** a card to another slot, row or pile. Dropping it on a card in a field **swaps** the two.
- Or **tap** a card to select it, press **Move…**, then tap where it goes. This is the easiest way on a phone.
- The bar at the bottom also has quick buttons such as **To Support** and **To Rest zone**.

A card that goes into a pile or a row is turned upright again and loses any token on it.

## Flipping and turning cards

Tap a card, then use the bar at the bottom:

- **Reveal** / **Turn face down** flips it. [[F]] does the same on a keyboard.
- The **card states** turn it. In Adventure Scuffle that is **Ready** (upright), **Attacking** (a quarter turn clockwise), **Defending** (a quarter turn the other way) and **Ability-active** (diagonal).
- **All Ready** at the top turns every card back to its first state, for the next round.
- The magnifier shows the card large enough to read.

[[Esc]] lets go of the selected card.

## Who sees what

Face-down cards show a crossed-out eye to the people who know them. The **view** menu at the top decides who you are:

- **Everyone sees all**: you play every player yourself. Face-down cards show dimmed, so you still know what they are.
- **Player 1's view**, **Player 2's view**: for passing one device between players. You see your own hidden cards, and only the backs of the other player's face-down cards and hand.

A pile such as a deck stays hidden from everyone until a card is turned up.

## Tokens, score and turns

The bar above the table has, for each player:

- the **initiative** flag: tap it to give initiative (or the first player) to that player.
- **counters** such as Points, with − and +. When a player reaches the winning number, a banner says who won. **Keep playing** hides it.
- the player's **tokens**, such as the Main Attacker cube. Tap a token, then tap a card or a slot to put it there. Drag it to move it, or select it and press **Back to tray**.

It also has **Round** and **phase** with arrows to step through the turn (Skirmish → Combat → Regroup), a **coin** and **dice**. The last result shows on the button.

## Undo and the game log

Everything on the table can be undone: [[Ctrl+Z]] and [[Ctrl+Y]], or the arrows at the top.

The **game log** lists everything that happened, such as "Spatial Witch: Attacking" or "Coin: Heads". Face-down cards stay anonymous in the log. Type a note at the bottom to add your own playtest notes, and press **Copy** to copy the whole log.

**New game** clears the table and goes back to the start.

## What's next

Rules, so that the table knows what's allowed and counts for you, and a computer opponent are planned for later versions.
