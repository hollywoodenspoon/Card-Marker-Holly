# Playtesting your game

**Play** (Hearthside Table) is the workspace for playing your game with your cards on a virtual table before you print anything. Switch to it with **Play** at the left of the top bar. It works on a computer, tablet or phone. Cards reach it as a **game pack**.

## Exporting a game pack

1. Open **Export ▾** in the top bar → **Game pack for Hearthside Table…** (on a phone, ☰ → the same item).
2. The dialog shows what goes into the pack: **every card** in the project (also cards that are in no deck), your **decks**, and the **fields** it found.
3. Choose:
   - **Playtest now**: switches to **Play** with the pack ready to play. **Cards** at the left of the top bar brings you back.
   - **Save game pack**: saves a `.cmpack` file. Open it in Play on any device, or send it to a friend.

![The game pack dialog](game-pack.webp)

Each card's picture is drawn exactly as it prints. When you change cards, export again: the new pack replaces the old one in Play, and a game in progress keeps going.

## Fields the Playtest app can read

The pack also holds each card's **field values** by field name: text fields as plain text, icon rows as numbers. Fields on hidden layers are included too, so a card can carry data that is never printed. Picture fields are left out.

A field's layer name and field name are always the same, so the names you see in the Layers panel are the names the Playtest app gets. Short, unique names work well, for example `A_AS` (Attack), `D_AS` (Defense), `FS_AS` (Fighting Spirit) and `Fate_AS` (Fate Number). Future versions of the Playtest app will read these to count for you. See [Templates and fields](help:templates).

## Playing

Open [Play](playtest/), import the pack (or use **Playtest now**) and press **Play**. Pick a game table and a deck for each player, then move, flip and turn cards, place tokens and keep score. Its own **How to play** guide ( **?** in Play) explains the table.

![A game of Adventure Scuffle in the Playtest app](playtest.webp)
