# How to play

Hearthside Table lays out a table for your game and lets you play it with the cards you made in Hearthside Cardworks, on any device. You move, flip and turn cards by hand and keep score. For Adventure Scuffle, the app can also run the Mutual Reveal rules for you.

## Getting your cards here

1. In Hearthside Cardworks, press **Playtest** in the left rail (or ☰ → **Playtest**).
2. Choose **Playtest now** to open the cards here straight away (Hearthside Cardworks in a browser), or **Save game pack** to get a `.cmpack` file.
3. Here, press **Import game pack** (or drop the file on the page) and press **Play**.

A game pack holds every card's picture, the values of its fields (such as `A_AS`, `D_AS` and `FS_AS`) and your decks. Send the file to a friend and they can play too. When you change cards, export the pack again: the new one replaces the old one here.

**Archetypes** (such as Grave, Ghoulish or Rianz) come from a card's `Archetype_AS` field when it has one. You can list several, separated by commas, for example `Rianz, Hero`. A card with no `Archetype_AS` belongs to every archetype whose word is in its name. The deck builder's search finds cards by archetype too.

## Starting a game

1. Pick a **Game**. Two tables are built in:
   - **Adventure Scuffle! — Mutual Reveal**: for each player a 2 × 3 field (Front Line and Rear Guard), Support and a Rest zone; card states Ready, Attacking, Defending and Ability-active; a Main Attacker cube; points to 4. The two fields face each other, so a card's Mirrored Position is straight across.
   - **Simple board game**: a shared board, a hand and a deck for each player, pawns, markers and two dice.
2. For Adventure Scuffle, pick the **Rules**:
   - **Free table**: you move every card yourself and nothing is checked.
   - **Rules on: two players, one device**: the app runs the rules and hides each player's cards until the device is handed over.
   - **Rules on: see both sides**: the app runs the rules and you play both players, seeing everything. Good for playtesting alone.
   - **Rules on: you against the bot**: you play Player 1 and the bot plays Player 2. Pick its level: **Easy**, **Normal** or **Hard** (Hard thinks longer).
   - **Rules on: watch bot against bot**: two bots play each other while you watch.
   - **Rush: many bot games**: bots play a batch of games (you pick how many) as fast as the device allows, with nothing drawn. See Rush below.
   - **Initiative** (with the rules on): **Rock-paper-scissors**, as the rulebook recommends, or **Random**. With rock-paper-scissors each player picks Rock, Paper or Scissors in the bar (your throw stays hidden until both have thrown; a tie throws again), and the winner chooses **Take the initiative** or **Give it**. Bots always take it.
3. Pick a **deck** for each player: one you built here (**Your decks**), or one from Hearthside Cardworks (**Decks in the pack**). **All cards** gives a player one of every card. A warning shows when a deck breaks a deck rule, or has a different number of cards than the game uses. With the rules on, both decks must be legal Free Companies.
4. Press **Start**.

## Playing with the rules on

The bar at the bottom says whose turn it is and what to do. Cards you may use now glow green.

- **Setup and Regroup:** tap a card in your Support, then tap an empty position on your field, or drag it there. In Regroup, as at a real table, your Support is set aside and your rest zone is laid out in its place as your hand ("Rest zone: Regroup hand"), so you can read every card while you refill the field. Your Support comes back when the Skirmish starts. If your rest zone runs out before every position is filled, the rest come from your Support, and you choose which cards. **Fill randomly** fills the rest, and **Done** confirms. Until then you can move a card you just placed, or drag it back.
- **Skirmish:** tap 2 adjacent face-down cards on your opponent's field to reveal them (the first one you tap turns amber). After the opening pairs, you reveal 1 card at a time, next to one that is already revealed.
- **Attack and defense** are worked out by Fate Number when everything is revealed: the lower half attacks, the upper half defends, and the lowest attacker is the Main Attacker (the cube).
- **Combat:** the player with initiative picks which Engagement goes first. Then each player in turn reveals a Support card as Fighting Spirit, or passes. A pass locks your total for that Engagement. The bar shows the totals. If no defender is on or next to the attacked position, the attacker scores straight away.
- The first player to 4 points wins.

With **two players, one device**, a screen asks you to pass the device whenever the other player must act. Press the button only when the right player holds it. The view menu at the top can switch to **Everyone sees all** at any time.

**Card abilities** work as the cards say (the rules follow the v2 rulebook):

- **Field and Support Abilities:** when it's your turn to respond, the bar lists the abilities you can use now. A Field Ability can be used by any of your face-up Ready cards, which then turns ability-active.
- **Flip Abilities** happen by themselves when the card is revealed.
- **Battle Abilities** happen when the card is revealed as Fighting Spirit. The Fighting Spirit buttons show what each card would add now. Rest-zone cards whose condition is met are listed too.
- **Choices**, such as a target or a card to rest, are asked in the bar. The cards you can pick glow, so you can tap one on the table instead. When there is only one possible choice, it is made for you.
- A field card whose Attack or Defense is changed by an ability shows its current values in a small badge.
- The card zoom shows the ability text. The rules engine reads each ability from that text. If it can't read part of it, the zoom quotes the words it couldn't read, and the card plays with its stats. `docs/card-text-phrases.md` lists the phrases it knows.

### Following the game

- **One action at a time:** after every move, the table shows what happened step by step. A box at the top names the action and shows the cards it is about. Cards light up for what just happened to them (revealed, used, attacking, defending, Fighting Spirit, moved). Cards that swap places get a double-headed arrow, and a card that moves gets a one-way arrow. Choices wait until the step-by-step view is over.
- **Action speed** (in the bar) sets how long each action stays on screen: Slow, Normal or Fast. **Rush** plays without pauses. **Skip** jumps to the end of the move. On a phone, tap the action box to open the whole log.
- **Card preview:** tap any card you can see to read it in a small window, with its current A, D and FS and its ability. The tap still does what it would (a reveal, for example). The window's arrows enlarge the card; × closes it.
- **The combat stage:** during an Engagement, its cards gather in the middle of the table. As on the table, Active cards lie sideways: the attackers that count are turned with their swords showing, the Main Attacker in front (with its cube) and the others behind it. The defenders that count are turned the other way, shields showing. Fighting Spirit cards stand upright in front of their side's stack, each with the value it added. The totals sit between the stacks. **Hide stage** shows the field underneath.

Undo works move by move, and the game log names every card that is revealed. A ⚑ in the log marks something the rules don't settle yet, such as a player left with no attacking card.

## Playing against the bot

The bot only knows what a player at the table would: your Support and face-down cards stay hidden from it. It does know which cards are in your Free Company (as if decklists were shown before the game), not where they are.

- **Easy** plays any legal move.
- **Normal** places and reveals by rules of thumb, and plays **Skirmish Tricks** and **Combat Tricks**:
  - It times swaps, Maneuvers and locks for the coming combat. It works out from the Fate Numbers who will attack whom, tries each option against guesses of your hidden cards, and keeps an ability for later unless using it now clearly pays.
  - In Combat, it uses rest-zone Fighting Spirit cards, weighs switching attackers and defenders, and spends Support freely in the round's last Engagement, since unused Support is rested anyway.
- **Hard** plays the same Tricks. For Fighting Spirit and the First Engagement, it also plays the round out many times against guesses of your hidden cards and keeps the choice that goes best.

While the bot is thinking, the bar says so. Its moves are shown action by action like yours, at the Action speed. **Pause** stops it, and **Next move** then plays one move at a time. **Undo** against the bot goes back to your own last decision.

## Rush

Pick **Rush: many bot games** as the Rules, a deck and a bot level for each side, and the number of games, then press **Start Rush**. The decks swap seats every other game, and each keeps its bot level.

The Rush screen counts as the games finish: each deck's win rate and wins as first player, the average number of rounds, and the cards each deck used most for Fighting Spirit and abilities. **Stop** ends the batch early. **Copy report** copies it all as text. Every match is listed: **Watch** replays it, and the pin keeps it with your replays. The last 5 batches stay under **Replays**.

## Tournaments

Press **Tournaments…** on the start screen (or the trophy at the top of the table), then **New tournament**.

- **Format:** the official ladder from the game plan, or **Custom…** (round robin, Swiss with a top cut, groups then a knockout, or single elimination, at any size):

  | Format             | Players | How it runs                                             | Match length               |
  | ------------------ | ------- | ------------------------------------------------------- | -------------------------- |
  | Locals             | 8       | Round robin                                             | Best of 1                  |
  | Regionals          | 16      | 3 rounds of Swiss, then a top 4 knockout                | Best of 1                  |
  | Nationals          | 32      | 5 rounds of Swiss, then a top 8 knockout                | Best of 1                  |
  | Pro Tour           | 16      | 4 groups of 4, round robin; group winners to a knockout | Best of 3, final best of 5 |
  | World Championship | 16      | 2 groups of 8, round robin; top 4 of each to a knockout | Best of 3, final best of 5 |

- **Match length** can be changed for any tournament. In a match of more than one game, rock-paper-scissors (or a coin, if you pick that) decides only game 1. In every later game, the player who went second in the game before starts with the initiative.
- **Entrants:** add people (a name and a deck) and **Fill with bots**: pick their level, and their decks: the pack's and your saved decks, auto-built Suboptimal or Optimal decks, or a mix. **Bots only** leaves people out entirely, so the tournament can play itself.
- **Playing:**
  - Each round lists its matches. **Play** starts your next game on the table: against a bot, or against another person on the same device with the hand-over screen.
  - When the game ends, **Back to the tournament** records it.
  - **Settle bot matches** plays every bot-against-bot match of the round in the background, which takes seconds.
  - **Play to the end** (bots-only tournaments) plays every round in turn until there's a winner. **Stop after this round** pauses it, and every game can be watched afterwards.
  - The next round is paired once every match is done.
- **Watching:** the eye (or **G1**, **G2**… in a longer match) replays any game that was played, with the step-by-step view and the combat stage.
- **Standings** sort by points (3 for a match win), then opponents' match-win %, game-win % and opponents' game-win %. Groups have a table each, and the knockout shows its bracket.
- **The end:** the placings and **Copy report**. Tournaments are saved as they go, so **Continue** picks one up after a reload.

## Replays

Every rules game is kept as a replay when it ends, or when you start a new game after its first round. **Watch replay** on the winner's banner opens it straight away, and the **Replays** button (at the top of the table, or on the start screen) lists them all.

A replay plays like the game did, action by action, with the combat stage and card preview. Its bar has play and pause, one action back or forward, the previous or next round, a slider to jump anywhere, and the speed. The view menu at the top shows everything or one player's view. **Leave** goes back, and the game you had open is still there.

The newest 100 replays of a pack are kept. Pin one to keep it for good.

**Replay files:** the download button saves a game as a `.hsreplay.json` file. It's on each replay in the list, in the replay bar, and at the top of the table for the game you're playing, finished or not. **Import replay** in the list opens a file again. A file holds every card's values and every move, so if a game ever looks wrong, send its file in: it can be replayed and checked move by move.

## Building decks

Press **Build decks…** on the New game screen. The pack's whole card pool is on the left (on a phone, the **Pool** tab); your deck is on the right (the **Deck** tab).

- **Tap a card** to add it to the deck, tap it again to take it out. A tick marks the cards in the deck.
- **Find cards** by name, code or ability text, filter by type or group, and sort by Fate Number, Attack, Defense or Fighting Spirit.
- **The rules** for Adventure Scuffle are checked as you go: a Free Company is exactly 12 different cards with at most one Ace. Aces are the cards with `{ace}` in their name (`Name_AS`). **Ready to play** shows when the deck is legal; otherwise the problems are listed.
- **Several decks:** **+** starts a new one, **Start from a pack deck…** copies a deck from Hearthside Cardworks to change, and the **Deck** list switches between them. Rename a deck in **Name**.
- **Auto-build** makes a new deck from any cards in the pack, at one of three levels:
  - **Suboptimal:** playable but weak, from the less valued cards.
  - **Optimal:** the strongest cards, plus archetype synergy (cards that ask for, say, a Grave card count more when the deck has Grave cards).
  - **Very optimal:** starts from Optimal, then tries card swaps and keeps a swap only if the deck wins more bot games against the pack's decks. This takes a minute or two, and **Stop** keeps the best deck found so far.

  The first time, and after the cards change, the app works out how strong each card is from quick bot games, which takes a few seconds and is then remembered. A short note tells you the deck's strongest cards and any archetype it builds around. In testing on The First Quest, Suboptimal decks won about 35% against the three premade decks, the premades about 50%, and Optimal decks about 70%.

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

## Getting the latest version

The app works offline, so it keeps a copy on your device. When a newer version is out, a message says **A new version is available.** Press **Update** to switch: a game in progress is saved and carries on. The version and build are shown at the bottom of the packs screen, next to **Check for updates**, which looks for a new version right away.

If a phone keeps showing an old version, open `chrome://serviceworker-internals` in Chrome, press **Unregister** under this site's entry, then open the app again. Your packs, decks, games and replays stay. Don't use "Clear site data": it deletes them.

## What's next

For balance testing, `npm run as:sim` (in the project folder) plays many bot games without a screen and writes a report of win rates per deck and per card.
