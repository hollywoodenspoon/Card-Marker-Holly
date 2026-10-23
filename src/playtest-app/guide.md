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
   - **Rules on: you against the bot**: you play Player 1 and the bot plays Player 2. Pick its level: **Easy**, **Normal** or **Hard**. With a Hard bot, **Hard thinks** sets how long it may think per move (0.5, 1, 2 or 4 seconds; 1 by default, remembered).
   - **Rules on: watch bot against bot**: two bots play each other while you watch.
   - **Rush: many bot games**: bots play a batch of games (you pick how many) as fast as the device allows, with nothing drawn. See Rush below.
   - **Reveal size** (with the rules on): **Classic** (a pair each, then one card at a time), **Pairs throughout**, or **Triples** (each field is revealed as a connected group of 3, then the 3 cards left). Pairs and triples are test rules. Only the opening group must touch; after that, each card you reveal must be next to one already revealed. Replays keep the rule they were played with.
   - **Initiative** (with the rules on): **Rock-paper-scissors**, as the rulebook recommends, or **Random**. With rock-paper-scissors each player picks Rock, Paper or Scissors in the bar (your throw stays hidden until both have thrown; a tie throws again), and the winner chooses **Take the initiative** or **Give it**. Bots always take it.
3. Pick a **deck** for each player: one you built here (**Your decks**), or one from Hearthside Cardworks (**Decks in the pack**). **All cards** gives a player one of every card. A warning shows when a deck breaks a deck rule, or has a different number of cards than the game uses. With the rules on, both decks must be legal Free Companies.
4. Press **Start**.

## Playing with the rules on

The bar at the bottom says whose turn it is and what to do. Cards you may use now glow green.

- **Setup and Regroup:** tap a card in your Support, then tap an empty position on your field, or drag it there. In Regroup, as at a real table, your Support is set aside and your rest zone is laid out in its place as your hand ("Rest zone: Regroup hand"), so you can read every card while you refill the field. Your Support comes back when the Skirmish starts. If your rest zone runs out before every position is filled, the rest come from your Support, and you choose which cards. **Fill randomly** fills the rest, and **Done** confirms. Until then you can move a card you just placed, or drag it back.
- **Skirmish:** tap 2 adjacent face-down cards on your opponent's field to reveal them (the first one you tap turns amber). After the opening pairs, you reveal 1 card at a time (2 under pairs, 3 under triples), each next to one that is already revealed.
- **Attack and defense** are worked out by Fate Number when everything is revealed: the lower half attacks, the upper half defends, and the lowest attacker is the Main Attacker (the cube).
- **Combat:** when combat starts, each attack's cards gather on the field as stacks: the attackers with the Main Attacker, the defenders on the attacked position. Attackers glow red and defenders green until Regroup, and every card's values are locked for the round. A swap such as Strategic Vanguard's moves a card between the stacks, wherever it sits, and its glow changes with it. The player with initiative picks which Engagement goes first. Then each player in turn reveals a Support card as Fighting Spirit, or passes. A pass locks your total for that Engagement. The bar shows the totals. If no defender is on or next to the attacked position, the attacker scores straight away.
- The first player to 4 points wins.

With **two players, one device**, a screen asks you to pass the device whenever the other player must act. Press the button only when the right player holds it. The view menu at the top can switch to **Everyone sees all** at any time.

**Card abilities** work as the cards say (the rules follow the v2 rulebook):

- **Field and Support Abilities:** when it's your turn to respond, the bar lists the abilities you can use now. A Field Ability can be used by any of your face-up Ready cards, which then turns ability-active.
- **Flip Abilities** happen by themselves when the card is revealed. A face-down card that Grave Keeper or Hunter Dragoon already turned ability-active doesn't trigger its Flip Ability.
- **Battle Abilities** happen when the card is revealed as Fighting Spirit. The Fighting Spirit buttons show what each card would add now. Rest-zone cards whose condition is met are listed too.
- **Choices**, such as a target or a card to rest, are asked in the bar. The cards you can pick glow, so you can tap one on the table instead: the tap marks it (amber) and opens its preview, and **Choose …** in the bar confirms it, so checking a card never picks it by accident. **Cancel** unmarks it. When there is only one possible choice, it is made for you.
- A field card whose Attack or Defense is changed by an ability shows its current values in a small badge.
- The card zoom shows the ability text. The rules engine reads each ability from that text. If it can't read part of it, the zoom quotes the words it couldn't read, and the card plays with its stats. `docs/card-text-phrases.md` lists the phrases it knows.

### Following the game

- **One action at a time:** after every move, the table shows what happened step by step. A box at the top names the action and shows the cards it is about. Cards light up for what just happened to them (revealed, used, attacking, defending, Fighting Spirit, moved). Cards that swap places get a double-headed arrow, and a card that moves gets a one-way arrow. Choices wait until the step-by-step view is over.
- **Action speed** (in the bar) sets how long each action stays on screen: Slow, Normal or Fast. **Rush** plays without pauses. **Skip** jumps to the end of the move. On a phone, tap the action box to open the whole log.
- **Card values:** every card you can see shows its Attack (A, red, left edge), Defense (D, green, right edge) and Fighting Spirit (FS, amber, top edge), where the card prints them. On the field these are the values as they count now; a value raised by an ability has a white outline. On a computer, rest the mouse on any card to see it large beside the pointer.
- **Card preview:** tap any card you can see to read it in a small window, with its current A, D and FS and its ability. The tap still does what it would (a reveal, for example). The window's arrows enlarge the card; × closes it.
- **The combat stage:** during an Engagement, its cards gather in the middle of the table. As on the table, Active cards lie sideways: the attackers that count are turned with their swords showing, the Main Attacker in front (with its cube) and the others behind it. The defenders that count are turned the other way, shields showing. Fighting Spirit cards stand upright in front of their side's stack, each with the value it added. The totals sit between the stacks, and a change pops up as +N beside them. Your Support stays in reach along the bottom of the stage (tap a card to read it). **Hide stage** shows the field underneath.
- **Who is doing what:** the player to act has a lit chip in the top bar, with what they are doing ("Revealing 2 cards", "Fighting Spirit", "· thinking…" for a bot), and their half of the table glows in their colour. Each chip shows the player's **Hand** size and last action, and **Passed** once they pass in an Engagement. A column per player on the table's left lists their recent actions.
- **Before someone else's move:** the cards they pick lift and glow gold, with a pointer and what they are doing ("Player 2 selects 2 cards to reveal"). A card being placed shows its target position outlined; in combat, the hand card picked for Fighting Spirit lifts into view on the stage (face down if you may not see it), then flies onto the stage. Against a bot, a **Your turn** banner shows when the turn comes back to you.
- **On the stage:** each side shows its hand size, **Passed**, an arrow for whose Fighting Spirit turn it is, and an amber **Rest zone ready** strip with the rest-zone cards that player can still use for Fighting Spirit this Engagement (with their value). A Fighting Spirit card used from the rest zone is tagged "from rest zone": it stays there, so it can be used again in the next Engagement if its condition holds.
- **Support rows** lay their cards side by side, in two lines when full, so no card hides another.
- **Card game moments:** while actions play, a banner announces each phase and Engagement, the card of an ability zooms up with its text as it activates, a dashed line runs from an ability's card to the card it picks (also while you pick one), and cards flip over as they are revealed. None of this plays in Rush, or when your system asks for reduced motion.

Undo works move by move, and the game log names every card that is revealed. A ⚑ in the log marks something the rules don't settle yet, such as a player left with no attacking card.

## Playing against the bot

The bot only knows what a player at the table would: your Support and face-down cards stay hidden from it. It does know which cards are in your Free Company (as if decklists were shown before the game), not where they are.

- **Easy** places and reveals by rules of thumb, and plays **Skirmish Tricks** and **Combat Tricks**:
  - It times swaps, Maneuvers and locks for the coming combat. It works out from the Fate Numbers who will attack whom, tries each option against guesses of your hidden cards, and keeps an ability for later unless using it now clearly pays.
  - In Combat, it uses rest-zone Fighting Spirit cards, weighs switching attackers and defenders, and spends Support freely in the round's last Engagement, since unused Support is rested anyway.
- **Normal** plays the same Tricks. For Fighting Spirit and the First Engagement, it also plays the round out many times against guesses of your hidden cards and keeps the choice that goes best.
- **Hard** searches every decision (placing, revealing, abilities, choices, Fighting Spirit) with Monte Carlo tree search: it plays many short practice games from the current position against guesses of your hidden cards, for both sides, and picks the move that works out best most often. It thinks for the time set in **Hard thinks**.

Until version 0.2.0, Easy played random moves, and today's Easy and Normal were called Normal and Hard. Saved games and replays keep their stored level, so an old "Normal" game now shows as Easy.

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
- **Entrants:** with **You and bots**, fill in your name and deck and press **Fill with bots**: it enters you first, then fills the other seats with bots. Pick the bots' level, and their decks: the pack's and your saved decks, auto-built Suboptimal or Optimal decks, or a mix. **Add a person** enters more people (for hot-seat games). **Bots only** leaves people out entirely, so the tournament can play itself; starting a You and bots tournament with no person asks first.
- **Playing:**
  - Each round lists its matches. **Play** starts your next game on the table: against a bot, or against another person on the same device with the hand-over screen.
  - When the game ends, **Back to the tournament** records it.
  - **Settle bot matches** plays every bot-against-bot match of the round in the background, which takes seconds.
  - **Play to the end** (bots-only tournaments) plays every round in turn until there's a winner. **Stop after this round** pauses it, and every game can be watched afterwards.
  - The next round is paired once every match is done.
- **Watching:** the eye (or **G1**, **G2**… in a longer match) replays any game that was played, with the step-by-step view and the combat stage.
- **Standings** sort by points (3 for a match win), then opponents' match-win %, game-win % and opponents' game-win %. Groups have a table each, and the knockout shows its bracket.
- **The end:** the placings and **Copy report**. Tournaments are saved as they go, so **Continue** picks one up after a reload.

## Balance lab

Press **Balance lab…** on the start screen (or the flask at the top of the table). There are no decks to pick: the lab builds its own and tests every card in the pack.

- **Settings:**
  - **Games:** Quick check (2,000), Standard (10,000), Overnight (100,000), or any number.
  - **Bots:** Quick for big runs, or Tricks (the table's Easy; about ten times slower, plays better).
  - **Reveal size:** classic, pairs throughout or triples, as on the table.
  - **Seed:** the same seed and settings give the same run.
  - **Threads:** how many of the computer's threads to use (all but one by default).
  - **Core set:** the code prefixes on the cards (TFQ, PU, CH…), remembered per pack. The core set is tested on its own, then used as the baseline for every other card. The First Quest is ticked by default.
- **One run, three stages:**
  1. **Every card tested:** random decks that hold every card about equally often play a league. Each card gets a value (how much it adds to a deck's chance to win; 0 is average) and a tier from S to D.
  2. **Constructed check:** Optimal decks auto-built from those values, from many random parts of the pool, plus Suboptimal ones and the premades, play each other. How often a card makes the Optimal deck when it could is its **Picked** rate.
  3. **Premade matrix:** the pack's own decks against each other, on both seats.
- **Results:** ranked suggestions (core set first, then cards that break the game once the new sets arrive, then the rest), each with stat and text options; a card table per view; pairs of cards that win far more together than apart; how the auto-built decks did; the premade matrix; and anything the rules checker found in a sample of the games.
  - **Power creep:** a new card above the core set's range, and clearly above the core card it's closest to.
  - A small run gives rough values. Use Standard or Overnight before changing cards.
- **Stop** ends the run early and reports on what was played. The last 10 runs stay in the lab. **Save results** writes a `.hssim.json` file (send it over for a closer look), and **Copy report** copies the report as text.
- **Bot ladder:** the switch at the top of the lab changes from **Card balance** to **Bot ladder**. Pick the bots (Quick, Easy, Normal, and Hard with 100, 400 or 1,600 practice games a move), the games per pairing (20, 100 or 400) and the reveal size, then press **Start the ladder**. Every bot plays every other on the pack's decks plus random legal ones, swapping seats. The results show a rating for each bot (Easy at 1000; 100 points is about a 64% win rate), every pairing's win rate, and how long each bot thinks per move. Stop, Save results and Copy report work as for a balance run.
- In the desktop app, the computer stays awake while a run goes, and the table keeps full speed behind other windows.

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

## In the desktop app

Hearthside Cardworks for Windows and Linux has Hearthside Table built in: ☰ → **Open Hearthside Table**, or **Playtest now** when exporting a game pack. It opens in its own window and updates with the app. Packs, decks, games and replays kept in a browser stay in that browser: bring packs over with **Playtest now** or **Import game pack**, and replays and decks as files.

## Getting the latest version

The app works offline, so it keeps a copy on your device. When a newer version is out, a message says **A new version is available.** Press **Update** to switch: a game in progress is saved and carries on. The version and build are shown at the bottom of the packs screen, next to **Check for updates**, which looks for a new version right away.

If a phone keeps showing an old version, open `chrome://serviceworker-internals` in Chrome, press **Unregister** under this site's entry, then open the app again. Your packs, decks, games and replays stay. Don't use "Clear site data": it deletes them.

## What's next

For whole-pack balance testing, use the **Balance lab**. `npm run as:sim` (in the project folder) still plays bot games between given decks without a screen and writes a report of win rates per deck and per card.
