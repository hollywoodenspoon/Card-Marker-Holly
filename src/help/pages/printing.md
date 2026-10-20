# Printing on paper

Card Maker lays your cards out on paper sheets, ready to cut by hand, and saves them as a PDF at exact millimetre sizes. Everything on this page lives in the print view.

## Opening the print view

- **Desktop and tablet:** press **Print** in the top bar, or **Print** in the left rail. The settings sit on the left, the sheet preview in the middle.
- **Phone:** ☰ → **Print / export PDF**. Under the preview, tap **Cards to print** or **Print settings** to open them, then **Export PDF**.

The line under the title sums it up, for example "9 per sheet (portrait) · 18 cards · 2 sheets + backs". Use the arrows under the preview to step through the sheets. On a wide screen the fronts and the backs show side by side; on a phone a **Front** / **Back** switch picks one. Zoom the preview with the − % + buttons, [[Ctrl]] + mouse wheel (⌘ on Mac) or a pinch, and pan with [[Space]] + drag or two fingers. [[Esc]] or the back arrow returns to the editor.

![The print view with sheet settings and the preview](print.webp)

## What prints: the print list and decks

**Cards to print** lists every card. For each one:

- tick or untick it, or set the copies with − / + (0 to 99). Copies print next to each other.
- drag the handle on the left to change the print order. **Use Cards list order** puts it back.
- **All** sets every card to 1 copy, **None** to 0.

If your project has decks, a **Print** menu at the top picks **Cards to print (this list)** or one of your decks. A deck prints exactly its own counts; you change them in the [Decks](help:decks) panel. **Print deck** in the Decks panel opens this view with that deck already chosen.

## Paper, orientation and cards per sheet

- **Paper:** A4 (210 × 297 mm, the default), A3, A5, US Letter or US Legal.
- **Orientation:** **Best fit**, **Portrait** or **Landscape**. Each button shows how many cards fit that way, e.g. "Portrait · 9" and "Landscape · 8". Best fit picks whichever holds more (portrait on a tie). Pick the other one yourself if you prefer.
- **Printer margin** (default 5 mm): the edge your printer can't print on. It shows as a dashed line in the preview only.
- **Bleed**: the same bleed as in the editor. Changing it here changes it for the project.

### How the grid is worked out

Each card takes a cell of its size plus the bleed on every side. A 54 × 86 mm card with 3 mm bleed needs a 60 × 92 mm cell. The app keeps the printer margin and the room for cut marks free around the edge, fits as many whole cells across and down as it can, and centres the grid on the page. If not even one card fits, the preview says so.

## Gap between cards

**Gap between cards** is 0 by default: the cards touch, and neighbours share a cut line, so one cut separates two cards. With a gap, each card is cut on its own, and fewer cards may fit on a sheet.

## Bleed fill

When the bleed is above 0, **Bleed fill** sets what prints in it:

- **Mirror edges** (default): a reflection of each card's own edge, so a slightly off cut never shows white.
- **Stretch edges**: the outermost colours of the card, stretched out.
- **As designed**: only what you actually drew past the cut line.

## Cut marks and guide lines

**Cut marks** are short black lines in line with every cut, placed around the outside of the grid. They always sit outside the bleed, with a small **Gap from bleed** (default 2 mm), so they never print on a card.

- **Run marks to paper edge** (on by default) draws them all the way out; your printer simply leaves out the part in its margin. **Room for marks** is the space kept free around the cards for them. Turn it off to get short marks of a set **Mark length**.
- **Guide lines across the sheet** adds thin lines through every cut line, from margin to margin, crossing the cards. They are handy for a paper trimmer.

## Draft prints

**Draft (saves ink)** is for playtest copies:

- **Greyscale** prints everything in shades of grey.
- **Leave out art** skips pictures and art boxes. Frames, text and shapes still print.

## Exporting the PDF

Press **Export PDF**. The file holds fronts sheet 1, backs sheet 1, fronts sheet 2, and so on, so a double-sided print pairs up by itself. **Sheets** under **Backs** can switch to fronts only or backs only; see [Double-sided printing](help:double-sided).

The PDF is RGB, and every page is exactly the paper size in millimetres. Print it at 100% ([Checking the print](help:checking-print#print-at-100-percent)).

### Fonts and pictures in the PDF

Text is drawn as exact letter shapes from your uploaded fonts and the built-in ones, so the PDF looks the same as the preview on any computer. If a text uses a font the app has no file for, it prints as a sharp 600 dpi picture instead, and a message tells you which font to upload. PNG and JPG pictures go in at full resolution, and SVGs stay vector. After the export, a message also lists any picture that would print below about 300 DPI.

> **Tip:** Print a single sheet first and measure it before printing the whole deck.

## Corner cutter guide

If you round the corners with a corner cutter, turn on **Show rounded corners** in the right pane (nothing selected, **Corner cutter guide**) and set its **Corner radius**. The corners it will cut off are shaded in the editor and the print preview. The guide is never printed.

## See also

- [Double-sided printing](help:double-sided)
- [Checking the print](help:checking-print)
- [Card size, bleed and safe area](help:card-size)
- [Decks](help:decks)
