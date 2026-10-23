# Hearthside Cardworks

Version **0.5.0-beta** (beta). Formerly _Card Maker_; its playtest app is **Hearthside Table**.

A card editor built with React, TypeScript, Vite and a Konva canvas. It runs as a website (projects stored in the browser), or as a desktop app for Arch Linux and CachyOS (projects stored as folders of ordinary files). There is no backend, and it works offline.

```bash
npm install            # install dependencies
npm run dev            # website dev server at http://localhost:5173 (Playtest app: /playtest/)
npm run as:sim         # Adventure Scuffle balance run: bot games and a Markdown report (options are listed at the top of scripts/as-sim.mjs)
npm run build          # type-check and build the website to dist/
npm test               # unit tests (Vitest)
npm run lint           # ESLint
npm run preview        # serve the website build (installable, works offline)

npm run desktop:dev    # desktop app with live reload
npm run desktop:dist   # desktop packages for this OS in release/ (add e.g. -- --linux pacman)
npm run android:sync   # build the web app into the Android project (paused; android/, open it in Android Studio)
npm run android:apk    # build release/Hearthside-Cardworks-<version>.apk (needs the Android SDK and JDK 21)
```

**Website:** https://hollywoodenspoon.github.io/Card-Marker-Holly/. Every push to `main` rebuilds it (`.github/workflows/pages.yml`). One-time setup: repo Settings → Pages → Source: **GitHub Actions**.

**Releases:** set the version in `package.json` on `main`, then on GitHub open **Actions → Release → Run workflow**. The tag `v<version>` is created for you. Pushing a matching tag works too. `.github/workflows/release.yml` builds the Arch package, attaches it to a GitHub Release and updates the pacman repository. Alpha and beta versions are published as pre-releases. Windows and AppImage builds have stopped; the Cozy Edition (`docs/cozy-edition.md`) will replace the Windows download.

**Versioning:** alpha versions (`0.1.0-alpha.1` to `0.3.0-alpha.1`), beta from `0.3.0-beta` (fixes `0.3.1-beta`, features `0.4.0-beta`), then `1.0.0` when v1 is done.

**Help:** the full user guide is inside the app: ☰ → **Settings** → **Help**, the **Help** button on the left rail, or **F1**. Its pages are Markdown files in `src/help/pages/` (one per topic in `src/help/topics.ts`); `npm run help:shots` retakes the screenshots in `public/help/` from a demo project.

Assumptions and design choices are listed in [DECISIONS.md](DECISIONS.md).

## Features and how to use them

### Your first card in a minute

1. Open the app and press **Start a new project**. Pick a card size (the ID card, 54 × 86 mm, is the default), portrait or landscape, your units and the bleed, then **Create**. You get a ready-made front and back.
2. Click **Card name** on the card and type. Double-click the grey art box to pick a picture.
3. Press **Print** (top bar) → **Export PDF**. Everything saves by itself ("Saved" in the top bar).

A small _Make your first card_ checklist on the canvas ticks these steps off as you go (close it with ✕).

### Projects and backups

- **Home screen** (☰ → All projects): open, rename, delete projects; **Import** a backup.
- **Backup file**: **Export ▾** → _Project backup file_ saves the whole project (cards, templates, images, fonts) as one `.cardproject.json`. Import always creates a new project, so nothing is overwritten.
- On the **website**, projects live in the browser you made them in. To move work between computers, or into the desktop app, export a backup and import it on the other side.

### Desktop app (Arch Linux and CachyOS)

- **Install** it from the app's pacman repository, so your normal `sudo pacman -Syu` updates it. Add this to the end of `/etc/pacman.conf` once:

  ```
  [cardworks]
  SigLevel = Optional TrustAll
  Server = https://github.com/hollywoodenspoon/Card-Marker-Holly/releases/download/pacman-repo
  ```

  then run `sudo pacman -Syu hearthside-cardworks` (it replaces an older `card-maker` package). The packages aren't signed yet, hence `SigLevel = Optional TrustAll` for this repository only. The `.pkg.tar.xz` on each release still works with `sudo pacman -U`.

- **Windows and AppImage** downloads have stopped. The Cozy Edition will replace the Windows app.
- **Each project is a folder** of ordinary files, by default in `Documents/Hearthside Cardworks/<project name>/`:
  ```
  project.json      cards, templates, styles, and which pictures and fonts are used
  project.json.bak  the version before the last save
  images/           your uploaded pictures, unchanged (PNG, JPG, WebP, SVG)
  fonts/            your uploaded fonts
  ```
  Saving is automatic. It writes to a temporary file first and then swaps it in, so a crash or power cut never leaves a half-written project. Copy the folder to back it up, or to move it to another computer or a USB stick.
- **Home screen extras:**
  - **Open folder** adds a project folder from anywhere.
  - Each project shows where it lives. ⋯ → **Show in folder** opens it in your file manager.
  - **Remove…** takes a project off the list. Tick the box to also move its folder to the Trash.
  - A project whose folder was moved shows _Folder not found_: click it and point to the new place.
- **New project** shows where its folder will go. **Change…** picks another place for new projects.
- **Exports** (PDF, images, Tabletop Simulator, CSV, vectors) open a normal **Save as** dialog; the message afterwards has **Show in folder**.
- **Settings and the Recent list** are kept in `~/.config/card-maker`.
- **Hearthside Table is built in:** ☰ → **Open Hearthside Table**, or **Playtest now** in the game pack export, opens it in its own window. Long bot runs (Rush, tournaments, the Balance lab) keep the computer awake and run at full speed behind other windows.
- **Updates:** at first start the app asks whether to check for updates. With checks on, it asks GitHub once per start and nothing else, and says when a new version is out; `sudo pacman -Syu` installs it. With checks off it never goes online. ☰ has **Check for updates** and **Automatic update checks**, and shows the version.

### Android app (paused)

Android releases are paused: the Release workflow builds no APK. The Android project (`android/`, Capacitor, the native folder plugin) stays in the repo, and `npm run android:apk` still builds one locally. See DECISIONS for what's needed to ship it again.

### Left pane

- The rail on the left (desktop, and the tablet's left drawer) has the places: **Cards, Templates, Decks, Fonts, Keywords** (opening one never changes what you're editing). Below them come the views **Gallery** (gallery and proofreading), **Data** (card data table, CSV export and mail merge) and **Vector**, with **Help** at the bottom. Outputs are in the top bar: **Print**, and **Export ▾** (card images, Tabletop Simulator, game pack, project backup). On a phone all of these are in ☰.
- **Assets** sit at the bottom of the left pane. Click the header to fold them away or open them again (remembered on this device). Click an image to put it on the card, or into the selected art box. The header buttons make a folder or upload images. On a phone, Assets is in the bottom bar.

### Asset folders

- **New folder** (folder button in the Assets header) → type a name. Folders open and close with a click on their name.
- Put images in a folder: drag an image onto the folder's name (mouse or pen), or image ⋯ → **Move to folder…** (pick a folder, _No folder_, or make a new one).
- Folder ⋯: **Upload here**, **Rename**, **Delete folder** (the images stay, they just leave the folder).

### Vector Maker (draw your own shapes and icons)

Rail → **Vector**, ☰ → _Vector Maker_, or the pen button in the Assets header. It opens a separate drawing board (artboard in pixels, default 512 × 512) that saves into your assets.

- **Tools** (left; bottom bar on phone), with the same keys as Illustrator:
  - **V Selection**: click or drag a box to select, drag to move, handles to resize (Shift keeps proportions) and rotate.
  - **A Direct selection**: drag single points and their handles; drag a box to pick points. A smooth point keeps its handles in line (hold Alt to break them).
  - **P Pen**, like Illustrator's. The pen cursor shows what a click will do:
    - empty space: click for a corner point, click and drag for a curve. Alt-drag breaks the handle; Shift snaps to 45°.
    - ○ over the first point closes the path (drag to shape the closing curve).
    - ^ over the point you just placed: click so the next segment starts as a corner, or drag out a new handle on its own.
    - over another open path's end: joins the two into one path. / over an open end: carries on drawing it.
    - - / − over a selected path's outline or point: adds or deletes a point.
    - Hold **Space** while dragging to move the point you're placing. Hold **Ctrl/⌘** to adjust points and handles (Direct Selection) without leaving the pen; Ctrl/⌘-click on empty space ends the path. **Backspace** takes back the last point. **Enter** / **Esc** finish.
    - On touch, tick _Break handles_ in the right pane instead of holding Alt. The hint at the top of the right pane says what a tap will do.
  - **+ / −** add or delete points; **Shift C** turns a point smooth ↔ corner (drag to pull new handles).
  - **U Shapes**: pick one of 30 presets (rectangles, polygon, star, gear, badge, heart, shield, gem, flame, sword, crown, arrows, speech bubble, frames…) and drag it out (Shift = equal sides, Alt = from the centre), or click for a 100 px one. Shapes with settings (points, sides, teeth, corner radius…) keep them in the right pane until you edit their points.
  - **H Hand** (or hold Space) pans; Ctrl/⌘ + wheel or pinch zooms.
- **Combine shapes** (select two or more): _Unite_, _Minus front_ (the top shapes cut the bottom one), _Intersect_, _Exclude_, _Divide_. Also _Compound path_ (holes where shapes overlap), _Release_, _Reverse direction_.
- **Right pane**: fill and stroke colour (or none), stroke width, corners and line ends, opacity, exact X / Y / W / H, arrange (front / back), align (to each other, or one object to the artboard), move to layer. With nothing selected: artboard size, _Fit to artwork_, snapping (artboard, points, whole pixels).
- **Layers**: add, rename (double-click), drag to reorder, hide, lock, opacity; each layer lists its objects (click to select, hide, lock).
- **Save** → _Save to assets_ as **SVG** (stays sharp and vector in the PDF), **PNG** (transparent, 1×/2×/4×) or **JPEG** (with a background colour), into the folder you pick. The layers are kept with the asset: Assets → ⋯ → **Edit in Vector Maker** reopens it, and saving with _Replace_ updates every card using it. Uploaded SVGs can be opened the same way.
- **Download**: SVG, PDF (vector), PNG or JPEG, for use in other programs. The folder button in the top bar opens an SVG file to edit.
- **Trace image** (top bar; on phone in Properties): turns a picture (an uploaded image or a file) into editable shapes, one per colour, on a new layer. Set the number of colours, detail, smoothing and speck removal, and whether to drop the background; the preview updates as you go. Best for logos, icons, line art and flat art; photos become many small shapes (fewer colours and more smoothing help).
- Shortcuts: Ctrl/⌘ Z / Shift Z undo and redo, Ctrl/⌘ D duplicate, Delete, arrows nudge (Shift = 10 px), Ctrl/⌘ A select all, Ctrl/⌘ S save, Ctrl/⌘ 0 fit.
- **Drafts**: the drawing you're working on is kept in this browser until you save it to assets. Close the Vector Maker any time; next time it offers to _Carry on with it_.
- Layers and objects: click a name again to rename it (also on touch). On a phone, ⋯ in the top bar has _Open SVG file_, _Trace image_ and _Fit artboard_.

### Card size, bleed and safe area

- Right pane → **Card** (nothing selected): pick a preset or type a size; the two buttons switch portrait / landscape. Presets:
  - **Card games:** ID card 54 × 86 mm, Poker 63.5 × 88.9, Trading card 63 × 88, **Japanese TCG** 59 × 86 (Yu-Gi-Oh!, Cardfight!! Vanguard), Bridge 57 × 89
  - **Board games:** Mini American 41 × 63, Mini Euro 44 × 68, American 56 × 87, Euro 59 × 92, Tarot 70 × 120, Square 70 × 70 and 80 × 80, Dixit 80 × 120
  - **Other:** business cards (EU 85 × 55, US 3.5 × 2 in)
- **Units**: right pane → **Card** → _Units_, or ☰ → _Settings_ → _Units…_: millimetres, centimetres, inches or pixels. Every size and position box, the size list and the rulers switch. Pixels are counted at a print resolution you set (default 300 pixels per inch), so 59 mm shows as 697 px. New projects start with the units you used last.
- **Sizes per front/back pair**: every front is paired with a back (right pane → _Back for this front_), and the pair shares one size, so a project can mix sizes. Changing the size changes only that pair, asks first when a template was designed or cards have their own layers, and stretches full-card backgrounds.
- **Bleed** (default 3 mm) is extra art past the cut line (red). Keep text inside the **safe area** (green). The eye button at the bottom of the canvas shows or hides these lines.
- **Corner cutter guide**: right pane (nothing selected) → _Show rounded corners_ and set the radius of your corner cutter. The corners it will cut off are shaded orange in the editor and print preview; it is never printed.

### Canvas basics

- **Zoom**: buttons bottom-right, Ctrl/⌘ + mouse wheel, or pinch on touch. **Pan**: space + drag, middle mouse, or two fingers.
- **Snapping** to card edges, guides and other parts (magnet button). Drag from a ruler to make a **guide**; drag it back to remove it.
- **Layers** (right pane, or the Layers tab on phone): drag to reorder, eye to show/hide, lock, double-click to rename (or edit the name at the top of the right pane, which also works on touch).
- **Deleting** acts straight away and shows a message with **Undo** (cards, decks, layers). Fonts ask first, as they can't be undone.
- **Esc** closes Print, Gallery and Card data. The card editor's keys (Delete, arrows…) only act on the card when no other view or dialog is open.
- **Shortcuts**: Ctrl/⌘ Z undo, Ctrl/⌘ Shift Z or Y redo, Ctrl/⌘ D duplicate, Delete, arrows nudge (Shift = 5 mm), Ctrl/⌘ G group, Ctrl/⌘ Shift G ungroup, Ctrl/⌘ 0 fit, Ctrl/⌘ H find and replace.

### Adding things

**Add** (top bar, or the phone's bottom bar): Text, Image, Image field (art box), Icon row (stat), Card number, Rectangle, Ellipse, Line. In template mode things go on the template; in card mode they belong to that card only.

### Text

- Double-click text to edit. Select words to change font, size, colour, bold, italic, underline; the toolbar also sets alignment, line height and letter spacing.
- **Auto-shrink**: long text shrinks to fit its box, down to a minimum size (Text properties).
- **Fonts**: bundled Inter, Alegreya and Alegreya SC; upload your own TTF/OTF in the **Fonts** tab.
- **Inline symbols**: in **Assets**, give an image a symbol name (⋯ → _Symbol name…_, e.g. `fire`). Typing `{fire}` in any text draws it inline.
- **Shared styles**: Text properties → _New style from this text_. Every text linked to a style updates when you change it.
- **Outline and shadow**: Text properties → _Effects_: outline colour and width, shadow colour, X/Y offset and opacity (sizes are % of the font size). Shapes have a _Shadow_ row too. Shadows are sharp (no blur) so they print exactly as shown.
- **Keywords**: ☰ → _Keywords…_ (or Text properties → _Edit keywords…_). Add words or phrases like “Flying” with bold / italic / underline / colour / font; they're styled automatically in every card's text (whole words, any capitals). Turn _Style keywords in this text_ off for parts like titles.
- **Card numbers**: Add → _Card number_ puts `{#}/{total}` on the template (e.g. “3/60”). You can type the tokens in any text: `{#}` is the card's place in the Cards list, `{#:3}` pads it (003), `{total}` is the number of cards. Change the first number under _Card numbers_ (right pane, nothing selected).

### Images and art boxes

- Upload by dragging files in, the Assets section (bottom of the left pane), or pasting.
- Drag corners to resize (aspect locked; hold Shift for free resize), use the round handle to rotate or type an angle. Flip, opacity, crop and _Replace image_ are in Image properties.
- **Art box** (image field): each card fills it with its own picture — double-click it, or use the floating bar (_Choose/Replace image_, _Reposition_, _Default_). Fill or fit the frame; drag and zoom inside it.
- A warning shows when a picture would print below about 300 DPI. SVGs stay sharp (vector) in the PDF.

### Icon rows (stats)

Add → _Icon row_: the same icon repeated N times, centred in its box (horizontal or vertical). The template sets the icon; each card sets the count.

- **Grey icons**: each card sets its own number of greyscale icons next to its normal count — in the floating bar under a selected icon row (− **Grey** +) or in Icon row properties (_Grey icons on this card_). E.g. 3 coloured + 2 grey for a 3-of-5 stat. In the template, set the _Default grey icons_ and where they go: on the left or right (row), or at the top or bottom (column).

### Templates

- **Template / Card** switch (top bar). In **Template** mode you edit the layout every card using it shares; changes show on all those cards straight away.
- **Templates** tab: new, rename, duplicate, delete, **Export file / Import** (carries its images, fonts and styles). A card's ⋯ menu has _Save front (or back) as template…_ and _Change template_.
- Every text, art box and icon row is a **field**: cards keep their own value under the field name, so switching template keeps matching values.
- **Per card**: the eye in Layers hides a template part on that card only; other parts stay where they are.
- **Show only when…**: in template mode, select a part → Template part → _Show only when…_ and pick a field, a condition (is, is not, contains, is filled in, is empty) and a value — e.g. show the gold gem only when Rarity is Rare. Parts with a rule have an “if” badge in Layers; the eye on one card still overrides it. Works well with mail merge.
- **Card-only layers**: in Card mode, added things belong to that card and can be dragged between template layers.

### Fronts and backs

The **Front / Back** switch above the canvas. Each card picks a front template and a back template: in the **Templates** tab, click a template (or ⋯ → _Use for this card_); a tick marks the ones in use. One back can be shared by the whole deck. A card's back follows its front's paired back; other backs can be picked only at the same size.

### Cards list

**Cards** tab: _+ Card_ (like the current card), search, drag to reorder, ⋯ for rename / duplicate / export image / change template / save as template / delete.

- **Change many cards at once**: press **Select**, tick cards (or _All_), then use the bar at the bottom: change the front or back template, show/hide a template part (eye buttons), set print copies, duplicate or delete. Each change is one undo step. Press **Done** to leave select mode.

### Decks

**Decks** tab (on phone: ☰ → _Decks_): _New deck_, then − / + per card for how many of each it holds (e.g. two starter decks). ⋯ renames, duplicates or deletes a deck. **Print deck** prints exactly those counts (Print view → _Print_ picks the print list or a deck).

### Gallery and proofreading

The gallery and the print preview use the card editor's controls: hold **Space** or the **middle mouse button** and drag to pan, **Ctrl/⌘ + wheel** (or pinch) to zoom, Ctrl/⌘ 0 to fit, plus the − % + buttons bottom right. In the gallery, zooming makes the cards bigger.

☰ → _Gallery and proofreading_: every card in a big grid (fronts, backs or both, with a size slider, search and a deck filter); click a card to open it. The **Proofread** tab lists each card's text with the browser's spell check; plain text can be fixed right there (formatted text is edited on the card).

### Playtest (separate app)

**Export ▾** → _Game pack for Hearthside Table…_ (on a phone, ☰) exports a **game pack** (`.cmpack`): every card's picture (as printed), its field values by field name (text as text, icon rows as numbers, hidden layers included) and your decks. **Playtest now** (in a browser) opens it straight in **Hearthside Table**, a companion app at `playtest/` on the same site (installable, offline); **Save game pack** gives a file for any device or a friend. There you can **build decks** from the pack's whole card pool (Free Company rules checked: 12 different cards, at most one Ace marked `{ace}`; saved per pack, exportable as `.asdeck.json`), pick a table and a deck per player, and play by hand: drag or tap cards between fields, hands and piles, flip and turn them, place tokens, keep score, coin and dice, _View as_ a player for hot-seat play, undo, and a copyable game log. Games are saved per pack. Built in: an Adventure Scuffle! table and a simple board-game table. For Adventure Scuffle, **Rules on** runs the Mutual Reveal rules (hot-seat with hand-over, or both sides for solo playtesting); all 45 First Quest card abilities are applied, by card code. Play against an **Easy, Normal or Hard bot**, or watch bot against bot. The **Balance lab** builds its own decks, tests every card in the pack, and ranks what to change, with The First Quest as the core set. The rules engine is described in `docs/adventure-rules-engine.md`.

### Tabletop Simulator

**Export ▾** → _Tabletop Simulator…_: pick a deck (or the print list) and download a zip of deck sheets (10 × 7, up to 69 cards each, max 4096 px) plus the back image — or matching back sheets when backs differ — and step-by-step import instructions.

### Find and replace

☰ → _Find and replace…_ (Ctrl/⌘ H): searches every card's text (and, with _Also template text_, the templates' default text). Options for matching capitals and whole words. Untick places you want to keep, click a place to open that card, then **Replace all** — one undo puts everything back.

### Card data (table and CSV export)

Rail → **Data** (or ☰ → _Card data_) shows every card as a spreadsheet-style table: name, front and back template, print copies, then every field. Search and filter by deck at the top.

- **Edit right in the table**: changes go straight onto the cards (undo works). Text cells take plain text; text with its own formatting is greyed (italic) and edited on the card. Art cells pick one of your uploaded images, icon-row cells take a number, ✕ clears a card's own value so the template default shows (greyed placeholder). A — means that card's template doesn't have the field. Click a thumbnail to open the card.
- **Export CSV** saves the shown rows as `<project> cards.csv` (opens in Excel, Google Sheets, Numbers). Art is written as image file names and icon rows as numbers, the same as mail merge reads, and each field sits in its spreadsheet column letter (shown in the table header). Empty cells mean "template default".
- To bring an edited CSV back: **Import** tab → choose the file, first row `2`, name column `A` (and copies / template columns from the header letters), then **Add as new**. "Update existing" matches cards by their original spreadsheet row, so it's meant for re-running the same sheet you first merged from.

### Mail merge (cards from a spreadsheet)

1. In template mode, select each field and set **Spreadsheet column** (e.g. Title = `B`, Art = `D`). Upload art images first; the art column holds file names like `dragon.png`. Icon-row columns hold numbers.
2. Cards → _+ Card_ ▾ → **Mail merge from spreadsheet…** (or rail → **Data** → **Import**) → choose an `.xlsx` / `.csv` file or paste cells.
3. Set the **first row** (row 1 is often headers), optional **only rows** / **skip rows** (e.g. `2-20, 25`), templates, and optional name / copies / template columns. _Use header names_ fills letters from matching headers.
4. Choose **Update existing** (cards made earlier from the same row are updated) or **Add as new**, check the issues list, then **Run merge**. One undo removes the whole merge.

### Printing (PDF)

**Print** (top bar; on phone ☰ → _Print / export PDF_) shows each sheet's fronts and mirrored backs. **Export ▾** → _Card images_ exports card images.

- **Cards to print**: tick boxes, copies (− / +), drag to set the print order; _All_ / _None_.
- **Sheet**: paper (A4, A3, A5, US Letter, US Legal), orientation (Best fit picks the most cards per sheet), printer margin, bleed, and **gap between cards** (0 = cards touch and share cut lines; a gap lets you cut each card on its own).
- **Bleed fill**: _Mirror edges_ (default) fills the bleed from each card's own edge, so a slightly off cut never shows white; _Stretch edges_; or _As designed_.
- **Cutting**: solid cut marks at the card edge and, optionally, dotted bleed marks at the bleed edge; both sit outside the bleed and run to the paper edge (switch off for short marks); optional guide lines across the sheet.
- **Backs**: _Sheets_ = fronts + backs, fronts only, or backs only. Match the long/short-edge flip to your printer, print the **Alignment test** once, and enter any offset as Back offset X/Y.
- **Colour**: _RGB_ (home printers, default) or _CMYK_ for print shops: converted with a printer profile (FOGRA39 built in, or **Load ICC profile…** for the shop's own), embedded in the PDF. The preview then shows how the colours will print and flags ones that come out duller (**Show where**). Big black areas print rich black, text 100% K; **Exact CMYK colours** fix chosen colours to given inks.
- **Draft (saves ink)**: _Greyscale_ and/or _Leave out art_ for playtest copies.
- **Export PDF**: exact mm sizes — print at 100% / "actual size".

### Card images

☰ → _Export card images…_ (or a card's ⋯ → _Export as image…_): this card or all cards, front/back, with/without bleed, PNG / JPG / WebP, 150–600 dpi. Several files download as one zip.

### Phone, tablet and offline

- Works on phones and tablets: panels become drawers and bottom sheets; pinch to zoom, two fingers to pan. On phone, Templates, Decks and Fonts are in the ☰ menu.
- **Install**: ☰ → _Settings_ → _Install app_ (when the browser offers it). After the first visit it works fully offline, including PDF export.
- Themes: ☰ → _Settings_ → _Theme…_: Light, Dark, Follow system and 37 colour themes (Hearthside, the default; hearth, job, fun, tabletop, pastel, bold dark and accessible themes). The canvas around the card stays neutral grey in every theme so card colours look true.

## Licence

Proprietary. The code and the apps' names: copyright © 2026 Hanielle Marie N. Armas, all rights reserved. The Adventure Scuffle! game content (cards, rules, art) belongs to Village Wizard, © 2026, all rights reserved. See [LICENSE](LICENSE). Third-party parts keep their own licences, listed in `public/THIRD_PARTY_NOTICES.txt`; run `npm run notices` after changing dependencies (a test checks it's up to date).

## Credits

- Icons: [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) (button icons and the app icons, `scripts/game-icons.mjs`, `assets-src/`), and [Lucide](https://lucide.dev) (ISC) for small utility icons.
- Fonts: Inter, Alegreya and Alegreya SC (SIL Open Font License).
