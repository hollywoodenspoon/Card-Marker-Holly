# Card Maker

Browser-based card editor (React + TypeScript + Vite, Konva canvas). Everything is stored locally in IndexedDB; there is no backend.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check and build to dist/
npm test         # run unit tests (Vitest)
npm run lint     # ESLint
npm run preview  # serve the production build (installable, works offline)
```

Live version: https://hollywoodenspoon.github.io/Card-Marker-Holly/ — every push to `main` rebuilds it (`.github/workflows/pages.yml`). One-time setup: repo Settings → Pages → Source: **GitHub Actions**.

Assumptions and design choices are listed in [DECISIONS.md](DECISIONS.md).

## Features and how to use them

### Your first card in a minute
1. Open the app and press **Start a new project**. Pick a card size (the ID card, 54 × 86 mm, is the default), portrait or landscape, your units and the bleed, then **Create**. You get a ready-made front and back.
2. Click **Card name** on the card and type. Double-click the grey art box to pick a picture.
3. Press **Print** (top bar) → **Export PDF**. Everything saves by itself ("Saved" in the top bar).

### Projects and backups
- **Home screen** (☰ → All projects): open, rename, delete projects; **Import** a backup.
- **Backup file**: ☰ → *Export backup file* saves the whole project (cards, templates, images, fonts) as one `.cardproject.json`. Import always creates a new project, so nothing is overwritten.
- Projects live in the browser you made them in. To move work between computers, export a backup and import it on the other one.

### Left pane
- The rail on the left (desktop, and the tablet's left drawer) has the panels **Templates, Cards, Decks, Fonts**, then quick buttons: **Print**, **Gallery** (gallery and proofreading), **Images** (export card images), **Keywords** and **Data** (card data table, CSV export and mail merge). These are also in the ☰ menu.
- **Assets** sit at the bottom of the left pane. Click the header to fold them away or open them again (remembered on this device). Click an image to put it on the card, or into the selected art box. The header buttons make a folder or upload images. On a phone, Assets is in the bottom bar.

### Asset folders
- **New folder** (folder button in the Assets header) → type a name. Folders open and close with a click on their name.
- Put images in a folder: drag an image onto the folder's name (mouse or pen), or image ⋯ → **Move to folder…** (pick a folder, *No folder*, or make a new one).
- Folder ⋯: **Upload here**, **Rename**, **Delete folder** (the images stay, they just leave the folder).

### Card size, bleed and safe area
- Right pane → **Card** (nothing selected): pick a preset or type a size; the two buttons switch portrait / landscape. Presets:
  - **Card games:** ID card 54 × 86 mm, Poker 63.5 × 88.9, Trading card 63 × 88, **Japanese TCG** 59 × 86 (Yu-Gi-Oh!, Cardfight!! Vanguard), Bridge 57 × 89
  - **Board games:** Mini American 41 × 63, Mini Euro 44 × 68, American 56 × 87, Euro 59 × 92, Tarot 70 × 120, Square 70 × 70 and 80 × 80, Dixit 80 × 120
  - **Other:** business cards (EU 85 × 55, US 3.5 × 2 in)
- **Units**: right pane → **Card** → *Units*, or ☰ → *Units…*: millimetres, centimetres, inches or pixels. Every size and position box, the size list and the rulers switch. Pixels are counted at a print resolution you set (default 300 pixels per inch), so 59 mm shows as 697 px. New projects start with the units you used last.
- **Bleed** (default 3 mm) is extra art past the cut line (red). Keep text inside the **safe area** (green). The eye button at the bottom of the canvas shows or hides these lines.
- **Corner cutter guide**: right pane (nothing selected) → *Show rounded corners* and set the radius of your corner cutter. The corners it will cut off are shaded orange in the editor and print preview; it is never printed.

### Canvas basics
- **Zoom**: buttons bottom-right, Ctrl/⌘ + mouse wheel, or pinch on touch. **Pan**: space + drag, middle mouse, or two fingers.
- **Snapping** to card edges, guides and other parts (magnet button). Drag from a ruler to make a **guide**; drag it back to remove it.
- **Layers** (right pane, or the Layers tab on phone): drag to reorder, eye to show/hide, lock, double-click to rename.
- **Shortcuts**: Ctrl/⌘ Z undo, Ctrl/⌘ Shift Z or Y redo, Ctrl/⌘ D duplicate, Delete, arrows nudge (Shift = 5 mm), Ctrl/⌘ G group, Ctrl/⌘ Shift G ungroup, Ctrl/⌘ 0 fit, Ctrl/⌘ H find and replace.

### Adding things
**Add** (top bar, or the phone's bottom bar): Text, Image, Image field (art box), Icon row (stat), Card number, Rectangle, Ellipse, Line. In template mode things go on the template; in card mode they belong to that card only.

### Text
- Double-click text to edit. Select words to change font, size, colour, bold, italic, underline; the toolbar also sets alignment, line height and letter spacing.
- **Auto-shrink**: long text shrinks to fit its box, down to a minimum size (Text properties).
- **Fonts**: bundled Inter, Alegreya and Alegreya SC; upload your own TTF/OTF in the **Fonts** tab.
- **Inline symbols**: in **Assets**, give an image a symbol name (⋯ → *Symbol name…*, e.g. `fire`). Typing `{fire}` in any text draws it inline.
- **Shared styles**: Text properties → *New style from this text*. Every text linked to a style updates when you change it.
- **Outline and shadow**: Text properties → *Effects*: outline colour and width, shadow colour, X/Y offset and opacity (sizes are % of the font size). Shapes have a *Shadow* row too. Shadows are sharp (no blur) so they print exactly as shown.
- **Keywords**: ☰ → *Keywords…* (or Text properties → *Edit keywords…*). Add words or phrases like “Flying” with bold / italic / underline / colour / font; they're styled automatically in every card's text (whole words, any capitals). Turn *Style keywords in this text* off for parts like titles.
- **Card numbers**: Add → *Card number* puts `{#}/{total}` on the template (e.g. “3/60”). You can type the tokens in any text: `{#}` is the card's place in the Cards list, `{#:3}` pads it (003), `{total}` is the number of cards. Change the first number under *Card numbers* (right pane, nothing selected).

### Images and art boxes
- Upload by dragging files in, the Assets section (bottom of the left pane), or pasting.
- Drag corners to resize (aspect locked; hold Shift for free resize), use the round handle to rotate or type an angle. Flip, opacity, crop and *Replace image* are in Image properties.
- **Art box** (image field): each card fills it with its own picture — double-click it, or use the floating bar (*Choose/Replace image*, *Reposition*, *Default*). Fill or fit the frame; drag and zoom inside it.
- A warning shows when a picture would print below about 300 DPI. SVGs stay sharp (vector) in the PDF.

### Icon rows (stats)
Add → *Icon row*: the same icon repeated N times, centred in its box (horizontal or vertical). The template sets the icon; each card sets the count.

- **Grey icons**: each card sets its own number of greyscale icons next to its normal count — in the floating bar under a selected icon row (− **Grey** +) or in Icon row properties (*Grey icons on this card*). E.g. 3 coloured + 2 grey for a 3-of-5 stat. In the template, set the *Default grey icons* and where they go: on the left or right (row), or at the top or bottom (column).

### Templates
- **Template / Card** switch (top bar). In **Template** mode you edit the layout every card using it shares; changes show on all those cards straight away.
- **Templates** tab: new, rename, duplicate, delete, *Save card as template*, **Export file / Import** (carries its images, fonts and styles).
- Every text, art box and icon row is a **field**: cards keep their own value under the field name, so switching template keeps matching values.
- **Per card**: the eye in Layers hides a template part on that card only; other parts stay where they are.
- **Show only when…**: in template mode, select a part → Template part → *Show only when…* and pick a field, a condition (is, is not, contains, is filled in, is empty) and a value — e.g. show the gold gem only when Rarity is Rare. Parts with a rule have an “if” badge in Layers; the eye on one card still overrides it. Works well with mail merge.
- **Card-only layers**: in Card mode, added things belong to that card and can be dragged between template layers.

### Fronts and backs
The **Front / Back** switch above the canvas. Each card picks a front template and a back template: in the **Templates** tab, click a template (or ⋯ → *Use for this card*); a tick marks the ones in use. One back can be shared by the whole deck.

### Cards list
**Cards** tab: *+ Card* (copies the previous card's layout), search, drag to reorder, ⋯ for rename / duplicate / export image / delete.
- **Change many cards at once**: press **Select**, tick cards (or *All*), then use the bar at the bottom: change the front or back template, show/hide a template part (eye buttons), set print copies, duplicate or delete. Each change is one undo step. Press **Done** to leave select mode.

### Decks
**Decks** tab (on phone: ☰ → *Decks*): *New deck*, then − / + per card for how many of each it holds (e.g. two starter decks). ⋯ renames, duplicates or deletes a deck. **Print deck** prints exactly those counts (Print view → *Print* picks the print list or a deck).

### Gallery and proofreading
☰ → *Gallery and proofreading*: every card in a big grid (fronts, backs or both, with a size slider, search and a deck filter); click a card to open it. The **Proofread** tab lists each card's text with the browser's spell check; plain text can be fixed right there (formatted text is edited on the card).

### Tabletop Simulator
☰ → *Export for Tabletop Simulator…*: pick a deck (or the print list) and download a zip of deck sheets (10 × 7, up to 69 cards each, max 4096 px) plus the back image — or matching back sheets when backs differ — and step-by-step import instructions.

### Find and replace
☰ → *Find and replace…* (Ctrl/⌘ H): searches every card's text (and, with *Also template text*, the templates' default text). Options for matching capitals and whole words. Untick places you want to keep, click a place to open that card, then **Replace all** — one undo puts everything back.

### Card data (table and CSV export)
Rail → **Data** (or ☰ → *Card data*) shows every card as a spreadsheet-style table: name, front and back template, print copies, then every field. Search and filter by deck at the top.
- **Edit right in the table**: changes go straight onto the cards (undo works). Text cells take plain text; text with its own formatting is greyed (italic) and edited on the card. Art cells pick one of your uploaded images, icon-row cells take a number, ✕ clears a card's own value so the template default shows (greyed placeholder). A — means that card's template doesn't have the field. Click a thumbnail to open the card.
- **Export CSV** saves the shown rows as `<project> cards.csv` (opens in Excel, Google Sheets, Numbers). Art is written as image file names and icon rows as numbers, the same as mail merge reads, and each field sits in its spreadsheet column letter (shown in the table header). Empty cells mean "template default".
- To bring an edited CSV back: **Import** tab → choose the file, first row `2`, name column `A` (and copies / template columns from the header letters), then **Add as new**. "Update existing" matches cards by their original spreadsheet row, so it's meant for re-running the same sheet you first merged from.

### Mail merge (cards from a spreadsheet)
1. In template mode, select each field and set **Spreadsheet column** (e.g. Title = `B`, Art = `D`). Upload art images first; the art column holds file names like `dragon.png`. Icon-row columns hold numbers.
2. Cards → *+ Card* ▾ → **Mail merge from spreadsheet…** (or rail → **Data** → **Import**) → choose an `.xlsx` / `.csv` file or paste cells.
3. Set the **first row** (row 1 is often headers), optional **only rows** / **skip rows** (e.g. `2-20, 25`), templates, and optional name / copies / template columns. *Use header names* fills letters from matching headers.
4. Choose **Update existing** (cards made earlier from the same row are updated) or **Add as new**, check the issues list, then **Run merge**. One undo removes the whole merge.

### Printing (PDF)
**Print** (top bar; on phone ☰ → *Print / export PDF*) shows each sheet's fronts and mirrored backs.
- **Cards to print**: tick boxes, copies (− / +), drag to set the print order; *All* / *None*.
- **Sheet**: paper (A4, A3, A5, US Letter, US Legal), orientation (Best fit picks the most cards per sheet), printer margin, bleed, and **gap between cards** (0 = cards touch and share cut lines; a gap lets you cut each card on its own).
- **Bleed fill**: *Mirror edges* (default) fills the bleed from each card's own edge, so a slightly off cut never shows white; *Stretch edges*; or *As designed*.
- **Cutting**: cut marks sit outside the bleed and run to the paper edge (switch off for short marks); optional guide lines across the sheet.
- **Backs**: *Sheets* = fronts + backs, fronts only, or backs only. Match the long/short-edge flip to your printer, print the **Alignment test** once, and enter any offset as Back offset X/Y.
- **Draft (saves ink)**: *Greyscale* and/or *Leave out art* for playtest copies.
- **Export PDF**: exact mm sizes — print at 100% / "actual size".

### Card images
☰ → *Export card images…* (or a card's ⋯ → *Export as image…*): this card or all cards, front/back, with/without bleed, PNG / JPG / WebP, 150–600 dpi. Several files download as one zip.

### Phone, tablet and offline
- Works on phones and tablets: panels become drawers and bottom sheets; pinch to zoom, two fingers to pan. On phone, Templates, Decks and Fonts are in the ☰ menu.
- **Install**: ☰ → *Install app* (when the browser offers it). After the first visit it works fully offline, including PDF export.
- Themes: ☰ → Light, Dark or Follow system, or a colour theme: Bubblegum pop, Midnight arcade (dark), Forest or Sunset. The canvas around the card stays neutral grey in every theme so card colours look true.
