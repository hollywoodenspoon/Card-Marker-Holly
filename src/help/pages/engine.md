# Making a game in the Engine

The Engine is where your cards become a game: places to visit, things to click, decks to play with, and card games to start. Open it with **Engine** in the switch at the left of the top bar.

## Games

Everything in the Engine belongs to a **game**. **File** has New game, Games… (open, rename, duplicate, delete), Duplicate this game, and Import / Export game file (`.hsgame`). The game saves by itself; the badge next to its name says _Saved_.

Maps you made before games existed are already in a game called "My game", each as a map scene.

## Card sources

In the **Game** panel, **Add card source** picks where the game's cards come from. Add as many as you like; together they are the game's cards:

- a **Cardworks project** (live): edits you make in Cards show up when you come back to the Engine;
- a **game pack** (`.cmpack`): a fixed copy, as Play uses.

The **Cards** panel lists every card by source.

## Decks

A deck is a list of cards with counts. It can be a deck for a card game, or any list your game needs, like a shop's stock.

- **From card sources**: the decks your projects and packs already have. **Copy to game deck** makes one you can change.
- **New deck**: then use **−** and **+** on each card.
- **Build deck**: pick **Suboptimal**, **Optimal** or **Very optimal** and the deck builder makes a deck from the cards. This needs a game module that knows the cards (Adventure Scuffle! has one).
- **Test draw**: pick a seed, **Shuffle**, then **Draw 1** or **Draw 5**. The same seed always draws the same cards.

The **Game** panel also has **Zones**: named piles such as Hand and Discard.

## Scenes

The **Scenes** panel lists the game's scenes. The flag marks where the game starts.

- **Picture scene**: a background picture with click areas and things placed on it.
- **Map scene**: a 3D map, built with the map tools (Terrain, Paint, Tile).

## Click areas

In a picture scene, the tools above the picture draw **click areas**: a rectangle (R), an ellipse (L) or a polygon (G, click each corner, then Enter). Players never see an area, only its glow.

For any other shape, select the area and press **Edit shape in Vector Maker…**. The pen, shapes and combine tools draw over the scene picture; **Done** brings the shape back.

**Glow** sets how an area lights up: its edges or the whole shape, when the pointer is over it, when it's pressed, or both, with a colour, strength and softness. On a touch screen it glows while pressed.

The other tools place a **character spot** (C), a **card** (K) or a **picture** (I). The properties panel picks its picture or card, and whether it's shown when the scene starts.

## Cause and Effect

Everything that happens in a game is Cause and Effect: a cause ("When the player clicks this") and the steps that follow. Select an area, a placed thing or the scene, then **Add cause and effect**, and **Do…** to add steps:

- **Effects**: go to a scene, set a flag, change a number, show or hide something, show a message, wait, run a recipe, build a deck, start a card game;
- **If / otherwise**: steps that run only when a condition holds (a flag is on, a number compares, a random chance);
- **A choice**: the player picks an option and its steps run;
- **Pick one at random**: one branch runs, by weight.

Branches hold more steps, as deep as you need. The ⋯ menu on a step list saves it as a **recipe** to reuse anywhere. Game-wide steps ("When the game starts") are in the right panel when no scene is open.

## Variables

The **Variables** panel holds named **flags** (on or off) and **numbers**, each with the value it starts at. Cause and Effect reads and changes them.

## Playing

**Play** in the top bar (or Space) plays the game from its start scene; **Play from this scene** starts where you are (without the "When the game starts" steps). Areas glow and clicks run their steps. **Back** returns to the previous scene and **Exit** (or Escape) returns to the editor. Variables start fresh each time.

**Start a card game** opens Play's table with the chosen decks. When you're done, **Back to** your game carries on from there, and the win can set a flag.

In Play, **Your games** opens a game's cards and decks on the table too, with replays, Rush, tournaments and the Balance lab.
