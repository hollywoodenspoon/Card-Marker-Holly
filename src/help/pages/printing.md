# Printing on paper

Hearthside Cardworks lays your cards out on paper sheets, ready to cut by hand, and saves them as a PDF at exact millimetre sizes. Everything on this page lives in the print view.

## Opening the print view

- **Desktop and tablet:** press **Print** in the top bar. The settings sit on the left, the sheet preview in the middle.
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

### Cards of different sizes

When the cards you print come in more than one size, each size gets its own sheets with its own grid, cut marks and mirrored backs. The PDF has the sheets of the first size, then the next size, and so on, in the order they first appear in the print list. The summary line says, for example, "2 card sizes · 24 cards · 4 sheets + backs", the caption under each preview names the size, and **Orientation** shows the count for each size, like "Portrait · 9 / 4".

## Gap between cards

**Gap between cards** is 0 by default: the cards touch, and neighbours share a cut line, so one cut separates two cards. With a gap, each card is cut on its own, and fewer cards may fit on a sheet.

## Bleed fill

When the bleed is above 0, **Bleed fill** sets what prints in it:

- **Mirror edges** (default): a reflection of each card's own edge, so a slightly off cut never shows white.
- **Stretch edges**: the outermost colours of the card, stretched out.
- **As designed**: only what you actually drew past the cut line.

## Cut marks and guide lines

**Cut marks at the card edge** are short solid lines in line with every cut, placed around the outside of the grid. They always sit outside the bleed, with a small **Gap from bleed** (default 2 mm), so they never print on a card.

**Bleed marks (dotted)** add a second set of marks, made of short dots, in line with the edge of each card's bleed. Use them to trim the sheet down to the bleed first, or to check how much bleed is left after cutting. Solid always means the card edge and dotted always means the bleed edge, so the two can't be mixed up. You can turn on either set or both. With no bleed the two edges are the same, so only the solid marks print.

- **Run marks to paper edge** (on by default) draws them all the way out; your printer simply leaves out the part in its margin. **Room for marks** is the space kept free around the cards for them. Turn it off to get short marks of a set **Mark length**.
- **Guide lines across the sheet** adds thin lines through every cut line, from margin to margin, crossing the cards. With bleed marks on, dotted guide lines run along every bleed edge too. They are handy for a paper trimmer.

## Colour: RGB or CMYK

**Colour** chooses how the PDF describes colours:

- **RGB · home printer** (the default). Home and office printers expect RGB and convert it themselves.
- **CMYK · print shop**, for a print shop that asks for CMYK. Every colour, picture and SVG is converted to the four printing inks (cyan, magenta, yellow and black) with a **printer profile**, and the profile goes into the PDF so the shop knows what the numbers mean.

**Printer profile:** the built-in one is **FOGRA39 (ISO Coated v2, ECI)**, the standard for coated paper that most print shops outside the US accept. If the shop sends you its own profile (an .icc file), press **Load ICC profile…** and choose it. It stays on this device; on another device the PDF falls back to FOGRA39 until you load it there too.

**The preview shows how the colours will print.** Screens can show brighter colours than ink on paper, so very bright blues, greens, purples and oranges come out duller. When a sheet has such colours, the bar above it says so; **Show where** paints them magenta in the preview. Change those colours if the difference matters, or accept it: it is how the cards will look.

**Black:** large black areas (both sides at least 10 mm) print as rich black, 60/40/40/100, which looks deeper. Black text, thin lines and the cut marks print in black ink only (0/0/0/100), so they stay sharp even if the inks shift slightly.

**Exact CMYK colours:** for a brand colour or one the shop matched for you, pick the colour, press **Add** and type its inks in percent, for example 0/40/100/0 (cyan/magenta/yellow/black). Wherever that colour appears, it prints with exactly those inks. Values over the profile's ink limit are reduced, and a message says so.

Pictures are converted pixel by pixel. SVGs stay vector, except SVGs with gradients, embedded photos, masks or filters, which print as sharp 600 DPI CMYK images (a message says so). Very large photos are scaled down to 600 DPI at their printed size, which keeps the file small without any visible difference. The [alignment test](help:double-sided) page stays RGB: it is for your own printer.

## Draft prints

**Draft (saves ink)** is for playtest copies:

- **Greyscale** prints everything in shades of grey.
- **Leave out art** skips pictures and art boxes. Frames, text and shapes still print.

## Exporting the PDF

Press **Export PDF**. The file holds fronts sheet 1, backs sheet 1, fronts sheet 2, and so on, so a double-sided print pairs up by itself. **Sheets** under **Backs** can switch to fronts only or backs only; see [Double-sided printing](help:double-sided).

The PDF is RGB or CMYK ([Colour](help:printing#colour-rgb-or-cmyk)), and every page is exactly the paper size in millimetres. Print it at 100% ([Checking the print](help:checking-print#print-at-100-percent)).

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
