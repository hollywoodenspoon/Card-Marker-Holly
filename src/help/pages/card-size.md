# Card size, bleed and safe area

You choose a card size when you create the project and can change it at any time. A project can also mix sizes, for example poker-size creatures and small square tokens.

## Choose a size

1. Click an empty spot around the card so nothing is selected.
2. In the right pane, under **Card**, open **Card size** and pick a preset, or choose **Custom** and type a **Width** and **Height** (10 to 300 mm).
3. Use the **Portrait** and **Landscape** buttons next to the list to turn the card.

![Card size settings in the right pane](card-size.webp)

## Sizes belong to a front and its back

Every front template is paired with a back template, so the two always line up when you print double-sided. One back can serve several fronts. A back and all the fronts paired with it share one size; the right pane shows which templates that is, for example _Size of Creature front + Spell front + Basic back (3 templates)_.

The size you change is the size of the template you're on (in Card mode, the current card's templates) and of its pair. Other pairs keep their sizes. To give some cards another size, make a new back, set its size, and pair new fronts with it (see [Fronts and backs](help:fronts-backs#pairing-a-front-with-a-back)).

When you change a size, parts keep their positions and sizes in mm, so after a big change you may want to move a few things in Template mode. Backgrounds that cover the whole card (or the card and its bleed) stretch to the new size. If a template in the pair was already designed, or cards using it have their own layers, the app asks before it changes anything. Undo puts the old size back.

## Presets

**Card games**

- ID card: 54 × 86 mm (the default)
- Poker: 63.5 × 88.9 mm (2.5 × 3.5 in)
- Trading card: 63 × 88 mm
- Japanese TCG: 59 × 86 mm (Yu-Gi-Oh!, Cardfight!! Vanguard)
- Bridge: 57 × 89 mm (2.25 × 3.5 in)

**Board games**

- Mini American: 41 × 63 mm
- Mini Euro: 44 × 68 mm
- American: 56 × 87 mm
- Euro: 59 × 92 mm
- Tarot: 70 × 120 mm
- Square small: 70 × 70 mm
- Square large: 80 × 80 mm
- Dixit: 80 × 120 mm

**Other**

- Business card (EU): 55 × 85 mm
- Business card (US): 50.8 × 88.9 mm (2 × 3.5 in)

## Units

Hearthside Cardworks always measures in mm behind the scenes, but you can see and type sizes in the unit you like: **Millimetres**, **Centimetres**, **Inches** or **Pixels**.

Change it in the right pane under **Card** → **Units** (nothing selected), or with ☰ → **Settings** → **Units…**. Every size and position box, the size list and the rulers switch over.

Pixels only make sense at a print resolution, so choosing **Pixels** shows a **Pixels per inch** box (300 by default). At 300 pixels per inch, 59 mm shows as 697 px.

The unit belongs to the project. New projects start with the unit you used last.

## Bleed

Bleed is extra artwork past the cut line. When you cut by hand you'll never cut exactly on the line; with bleed, a slightly-off cut still shows your art instead of a white edge.

Set it under **Print area** → **Bleed** in the right pane (0 to 10 mm, 3 mm by default). The same setting is in the print settings.

On the canvas:

- The **shaded band** around the card is the bleed. Its outer **red line** is how far background art should reach.
- The **thin dark line** is the cut line: the edge of the finished card.

Let backgrounds and full-art pictures run all the way to the red line.

> **Tip:** If you make the bleed bigger later, stretch your backgrounds to the new red line. Or let the print settings' **Bleed fill** fill the extra edge for you.

## Safe area

The **green line** inside the card is the safe area. Keep names, rules text and important symbols inside it, so a slightly-off cut never trims them. Set its distance from the cut line with **Safe margin** (0 to 20 mm, 3 mm by default).

The button at the bottom right of the canvas (next to the magnet) shows or hides the bleed and safe-area lines. They are never printed.

## Rounded corners

If you round your corners with a corner cutter, turn on **Show rounded corners** under **Corner cutter guide** and set the **Corner radius** to match your cutter (0.5 to 15 mm). The corners it will cut off are shaded orange in the editor and the print preview, so you can keep art and text clear of them. The shading is never printed.

## See also

- [Canvas: zoom, pan, snapping and undo](help:canvas)
- [Printing on paper](help:printing)
- [Settings](help:settings)
