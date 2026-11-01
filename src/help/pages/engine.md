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

- **Effects**: go to a scene, set a flag, change a number, show or hide something, show a message, a character says something, wait, run a recipe, build a deck, start a card game, give or take money, items or cards, open a shop, open a booster, edit my deck, pick this week's activity, start the next week, show the calendar, end the game;
- **If / otherwise**: steps that run only when a condition holds (a flag is on, a number compares, a random chance, the player has money, an item or a card, a calendar event is this week, the date);
- **A choice**: the player picks an option and its steps run;
- **Pick one at random**: one branch runs, by weight.

Branches hold more steps, as deep as you need. The ⋯ menu on a step list saves it as a **recipe** to reuse anywhere. Game-wide steps ("When the game starts") are in the right panel when no scene is open.

## Variables

The **Variables** panel holds named **flags** (on or off) and **numbers**, each with the value it starts at. Cause and Effect reads and changes them.

Any text the player reads can show a variable: write its name in braces, like `You have {Gold} coins`. `{date}`, `{week}`, `{season}` and `{year}` show the date.

## Characters

The **Characters** panel has **portrait templates** and **characters**.

A portrait template lists the **layers** of a portrait (skin, eyes, mouth, hair, clothes, accessory…), bottom to top, and each layer's **options** (pictures). Draw every layer on the same canvas size. Each layer takes its colour one of three ways:

- **Grey-to-colour ramp**: draw it in greys. Mid grey becomes the chosen colour, darker greys its shadows and lighter greys its highlights, so the shading stays.
- **Hue shift**: draw it in colour; it turns to the chosen colour's hue.
- **As drawn**: no colour change (eyes, outlines).

**Expressions** (Happy, Sad…) swap some layers: under an option, **Pictures for expressions** holds that option's picture for each expression. The first expression is the neutral face.

A **character** has a name, a name colour, a portrait template, and an option and a colour per layer.

## Dialogue

**A character says something** shows the character in the dialogue box at the bottom: their portrait with the chosen expression, their name in its colour, and the words typing out. A click, Enter or Space shows the rest at once, then continues. Choices show in the same box. **Log** in the player's top bar lists everything said.

## Money, items and cards

The **Items** panel sets:

- **Money**: one number variable is the money (**Make one** adds it), with a unit such as "coins";
- **Card collection**: the **Ace field** (a card field, and the text in it that makes a card an Ace, like `{ace}`) and the deck the player starts with;
- **Items**: things the player buys and keeps, with a picture and a price.

The player's collection counts **normal and foil** copies apart. **Bag** in the player's top bar shows the money, items and cards.

## Shops and boosters

The **Shops** panel has shops and boosters.

- A **shop** sells items, boosters and single cards (normal or foil), each at its own price or a price set here. It buys back items (at a % of their price) and cards (a price per rarity). Copies in the player's own deck are never sold. **Open a shop** shows it.
- A **booster** is a pack: **3 cards** by default, from all the game's cards or a deck's. Each card rolls its own rarity: Common (non-Ace) 70%, Uncommon (Ace) 22%, Rare (foil non-Ace) 6%, Diamond rare (foil Ace) 2%. Change them per booster. **Open a test pack** tries it out.

A booster bought in a shop opens at once; **Open a booster** gives one for free. The cards turn over one by one, and foils shine.

**Edit my deck** lets the player build a deck from the cards they own.

## Weeks and the calendar

Time moves **a week at a time**. The **Calendar** panel sets how many weeks make a month, months a season and seasons a year, and lists activities and calendar events. **Preview the calendar** shows a year.

- **Activities**: the player picks one a week. An activity can be **locked** while a condition holds (grounded) or be **the only choice** while one holds.
- **Calendar events** happen on weeks by a rule: every week, the Nth week of every month or season, once, or **at random on another event** (an exam on an important tournament). An event can be limited to some seasons or years, is **announced** a set number of weeks ahead, and on its week is one of the activities, the only activity, or runs by itself as the week starts.
- **Pick this week's activity** shows the week's choices, runs the picked one, then starts the next week. **A new week starts** (in the game's own Cause and Effect) is the weekly tick, such as an allowance.
- An ending is a calendar event whose steps **End the game**.

The player's **Calendar** shows the date and the events they know are coming.

## Saves

**Save and load** in the player's top bar has three slots and an **Autosave**, made on every scene change. A saved game starts again at the start of its scene.

## Playing

**Play** in the top bar (or Space) plays the game from its start scene; **Play from this scene** starts where you are (without the "When the game starts" steps). Areas glow and clicks run their steps. **Back** returns to the previous scene and **Exit** (or Escape) returns to the editor. Each play starts fresh; load a save to carry on.

**Start a card game** opens Play's table with the chosen decks. When you're done, **Back to** your game carries on from there, and the win can set a flag.

In Play, **Your games** opens a game's cards and decks on the table too, with replays, Rush, tournaments and the Balance lab.
