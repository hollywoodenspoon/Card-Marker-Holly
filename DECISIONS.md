# Decisions and assumptions

Where CLAUDE.md left room, the simplest option that fits it was picked. Each choice is listed here.

## README

- At the owner's request the README also holds a short feature guide ("Features and how to use them"), beyond the install/run/build commands CLAUDE.md asked for. Every feature PR updates it.

## Stack

- **Canvas: Konva (react-konva).** It works declaratively with React state, has a built-in transformer (resize with locked aspect ratio, rotation handle, rotation snaps, configurable handle size for touch), and uses pointer events. Konva has no per-character text styling, so `src/core/text/` has its own rich-text layout engine (wrapping, alignment, justify, per-run styles, letter spacing, auto-shrink). The engine works in mm with an injectable measurer, so Shot 2's PDF export can reuse the same line layout.
- **Text editing: Tiptap (ProseMirror).** It is loaded on demand (split chunk) when text editing starts. Its document is converted to and from the app's `RichText` model (`src/ui/text/pmConvert.ts`).
- **State:** zustand + immer. Undo/redo stores immutable snapshots of the document (project, templates, cards). Bursts of changes (a drag, typing, a slider) merge into one undo step.
- **Autosave** compares rows by object identity (immer structural sharing) and writes only the changed rows to IndexedDB, debounced by 600 ms. It also flushes when the page is hidden.
- **UI components** are hand-written in the shadcn/ui style on top of the `radix-ui` package. The shadcn CLI was not used.

## Data model

- All geometry is in **mm**. **Font sizes are in pt** (the typographic convention), converted to mm when drawn.
- Rotation is in degrees around the element's top-left corner (Konva's convention).
- **Card size is per project.** Changing it updates every template, because fronts and backs must match to print double-sided. Templates still store their own `size` so per-template sizes could come later. Elements keep their mm positions when the size changes.
- **Every text element is a field.** It shows its template default text until a card sets a value. Card values are keyed by **field name**, overrides by **element id**.
- Renaming a field in a template moves existing card values for cards that use that template to the new name, unless the card already has a value under the new name.
- Several parts of one template may share a field name. They then show the same value.
- **Card-only layer** (confirmed with the owner): elements added in card mode belong to that card only and are drawn above the template. "Save card as template" merges the template parts (with the card's visibility and values as the new defaults) and the card layer into a new template.
- **Card elements can sit between template parts.** Each top-level card element may name a template part it is drawn directly below (`zBelow`). Without one, or if that part is deleted from the template, it goes on top. The anchor follows the part when the template is reordered. In card mode the Layers list shows template parts and card elements in one stack: card elements can be dragged anywhere, template parts are fixed.
- **Per-card overrides are visibility only** (confirmed with the owner). Art framing (fill/fit, pan, zoom) is part of the card's image field value.
- Overrides for elements deleted from a template are ignored, not deleted, so undoing the deletion restores them.
- Two lock flags: `toggleLocked` (can't be hidden per card, from the spec) and `editLocked` (the layers panel lock: can't be selected or moved on the canvas).
- **Groups** have no transform of their own. Children are stored in card coordinates. A group is a unit for naming, visibility and selection. Groups can be moved and resized (children scale) but not rotated. On the canvas, clicking a child of an already selected group selects that child. Children can also be selected from the layers panel.
- Thumbnails are **rendered live** from the current template and card (lazily, when scrolled into view), not stored as blobs. They are always up to date with template edits. The `thumbnail` fields in the schema are unused for now.
- **New projects start portrait** (owner's request): the ID card preset is 54 × 86 mm, and the size panel's Portrait/Landscape toggle turns it to 86 × 54. Existing projects keep their size.
- New projects start with a "Basic front" (background, art field, title, rules) and a "Basic back", so a first card can be made in under a minute.
- "New card" copies the previous card's templates and part toggles ("use previous card's layout"). The dropdown has a variant with default toggles.
- Deleting a template moves its cards to another template of the same side. Their field values are kept.
- Deleting an image that is in use asks for confirmation. Places that used it show an empty box.
- Uploaded images and fonts are not part of undo history. Elements that use them are.

## Fonts

- **Bundled fonts: Inter, Alegreya and Alegreya SC** (`@fontsource/*`, regular, bold, italic and bold italic). They are always available and can be embedded in the Shot 2 PDF export. Georgia, Arial, Times New Roman and Courier New are listed as system fonts and may look different on another machine.
  - For Shot 2: system fonts can't be embedded in a PDF. Export will need to use bundled or uploaded fonts, or warn about missing ones.
- Uploaded TTF/OTF files are read for their family and style names (sfnt `name` table). Upload Regular, Bold and Italic files of the same family to get real bold and italics; otherwise the browser synthesises them.

## Images

- Accepts PNG, JPG, WebP and SVG. The original file blob is stored unchanged.
- SVGs are drawn on screen from a sized copy (so they stay sharp when zoomed). The original SVG is kept for vector PDF output in Shot 2.
- The print-quality warning appears below **300 DPI** of effective resolution at the placed (and cropped or zoomed) size. Vector images never warn.
- Dropping an image onto an image field fills it. "Add → Image…" always creates a new image element. Tapping an image in the Assets panel fills the selected art box, or adds a new image if no art box is selected.
- Filling an art box on a card: double-click/double-tap an empty art box to pick a file, or use the floating bar (Choose/Replace image, Reposition, Default) that appears when an art box is selected. The picture is stored on the card; the template keeps its placeholder.
- **Icon rows (stats as icons):** a field element that repeats one icon N times in a row or column, centred in its box. The icon and layout come from the template; the count is per card (stored under the field name like other values, so it carries over on template switches). Icons keep their aspect ratio in square cells; "shrink to fit" scales icons and gaps together when the row would overflow. Count 0 draws nothing on the card. Renaming a field also renames its layer if the two were the same.
- Crop mode: drag the picture to move it; drag the frame handles to show more or less of it. For rotated images the frame maths uses the element's own axes.

## Canvas and interaction

- Zoom 100 % means real size on a 96 dpi screen.
- Snapping targets: card edges and centre, bleed and safe lines, guides, and the edges and centres of other elements. The threshold is 6 screen pixels.
  - Snapping while resizing is turned off for rotated selections.
- Guides are dragged out of the rulers and stored on the template. Drag a guide back onto a ruler to remove it.
- The bleed overlay toggle also controls clipping. With it on, the bleed area is shown shaded. With it off, the card is shown clipped to the trim, as it will look after cutting.
- Touch gestures:
  - one finger selects and moves
  - two fingers pinch-zoom and pan
  - double-tap edits text or enters crop mode
- Desktop extras: mouse marquee selection, space-drag or middle-drag to pan, ctrl/⌘-wheel to zoom.
- Tooltips use `title` attributes only as a supplement. Every action is reachable without hover.

## Responsive shell

- Layers live in the right pane above Properties (collapsible, remembered per device); tablet shows both in the right drawer; phone keeps a Layers bottom sheet.
- Breakpoints: phone under 768 px, tablet 768–1199 px, desktop 1200 px and up.
- Phone text editing uses a panel at the top of the canvas instead of a bottom sheet, so the on-screen keyboard doesn't cover it. The card below updates live.
- The theme setting is saved in `localStorage` and applied before first paint to avoid a flash. It is a device preference, not project data.

## Printing (Shot 2)

- **Sheet layout** (`src/print/layout.ts`, pure and unit-tested):
  - cell = card + 2 × bleed; cells touch, with no gap between them
  - the grid is centred on A4 inside the printer margin plus room for cut marks
  - "Best fit" picks the orientation that fits more cards (ties go to portrait); you can override it
  - cards are never rotated on the sheet
  - **print list** (Print view → Cards to print): every card prints once by default, in Cards-list order
    - a tick box leaves a card out, a copies count (0–99) prints it several times; copies fill cells next to each other
    - dragging the list sets a print order of its own; the Cards list is not changed. Cards added later go at the end. "Use Cards list order" drops the custom order.
    - stored in the project's print settings, so it is undoable and kept in backups
- **Bleed fill** (auto-bleed; default "Mirror edges"):
  - each finished card is rendered to an image (300 dpi in the PDF, 150 dpi in the preview), and its outer strip is mirrored outward into the bleed. "Stretch edges" repeats the outermost pixel row instead. "As designed" prints only what is drawn in the bleed.
  - the filled bleed is drawn over the card, so it always follows the card edge, even where a shape already reaches into the bleed
  - only the bleed becomes an image (it is cut off); inside the cut line the card stays vector
  - the image is made with the PDF's own card renderer (on a canvas), so it matches the printed card
- **Cut marks** (on by default, 3.5 mm long, 2 mm gap from the bleed edge):
  - 3.5 mm (not 4) so that 9 portrait ID cards with 3 mm bleed fit on A4 (3 × 92 mm = 276 mm, exactly the space left inside a 5 mm margin)
  - drawn on the outer edges of the grid, one mark per cut line on each side, like a standard gang-up sheet, so they never touch any card or its bleed
  - by default (owner's request) each mark runs from the 2 mm gap all the way to the paper edge, so a ruler lines up easily. The printer leaves out the part inside its unprintable margin. The 3.5 mm "Room for marks" is still kept free around the grid, so the card count doesn't change. Turn "Run marks to paper edge" off for short fixed-length marks.
  - nothing is drawn around each card; corners are left square for a corner-rounding cutter
  - the space for them is reserved inside the printer margin
  - optional **guide lines** run through every cut line across the printable area
- **Backs:**
  - pages go front 1, back 1, front 2, … so a duplex printer can print them double-sided
  - each back sits exactly behind its front: a long-edge flip mirrors left/right on a portrait page and top/bottom on a landscape page; a short-edge flip is the opposite
  - back contents stay upright, so the flip setting must match the printer's duplex setting
  - back offset X/Y nudges the whole backs page to correct printer drift
  - a card without a back template leaves its back cell empty
  - **Sheets** (owner's request): "Fronts + backs" (default), "Fronts" or "Backs". Backs-only keeps the mirrored back layout, so it still lines up if fed back through the printer behind a printed fronts sheet. For a full sheet of one card back, set that card's copies in Cards to print. Older projects with backs switched off open as "Fronts".
- **Alignment test:** a separate 2-page PDF with crosshairs at the corners and centre. The back page has the same crosshairs mirrored, plus ±3 mm scales for reading any offset.
- **PDF output:**
  - library: jsPDF (RGB), drawn through a small `DrawTarget` interface, so another output (for example CMYK) could be added without touching the card renderer
  - page size: exact mm (A4 = 595.28 × 841.89 pt)
  - text: drawn as **vector glyph outlines** with fontkit, from uploaded font files and the bundled Inter / Alegreya / Alegreya SC WOFF2 files, so it looks like the preview without embedding fonts
    - text in a system font with no file (Georgia, Arial, …) is drawn as a 600 dpi image, and the export lists a warning
    - bold or italic missing from a font file is imitated (stroke or slant), as the browser does
  - images:
    - SVGs stay vector (svg2pdf.js)
    - PNG and JPEG are embedded at full resolution (PNG Flate-compressed)
    - WebP is converted to PNG
  - empty art boxes and icon rows without an icon print nothing, and the print preview matches
  - low-DPI images are listed as warnings after export
  - the export libraries load only when you export

## Symbols and shared styles

- **Inline symbols:** any image becomes a symbol when you give it a symbol name (Assets → ⋯ → Symbol name…; stored as the asset's first tag).
  - Typing `{name}` in any text draws that image inline: 1 em high, with its own width/height ratio, and slightly below the baseline.
  - Unknown names stay as typed text.
  - A symbol sticks to the word next to it, so "3{fire}" never wraps apart. Words made of differently styled runs also no longer break apart.
  - Symbols work the same on the canvas, in the PDF and in auto-shrink.
- **Shared styles** (the spec's "style presets"):
  - a style holds font, size, colour, bold, italic, underline and letter spacing
  - a text linked to a style takes those values over its own base style, live, across every template and card; per-character formatting in the text still wins
  - while a text is linked, the style controls edit the shared style (and say how many texts use it)
  - "Detach" unlinks a text and keeps its look; deleting a style does the same for every text that used it
  - in the text editor, the brush menu applies a style's look to selected words as plain formatting
- Template files carry the styles and symbol images their texts use. On import, a style with the same name, or a symbol with the same name, already in the project is reused instead of duplicated.

## Phone, touch and offline

- Drags start after 4 px of movement, so a tap selects without nudging.
- Controls use `touch-action: manipulation` (no double-tap zoom). The canvas has no long-press callout or text selection.
- Bottom sheets close by swiping the header down. The properties sheet is taller (85 % of the screen).
- The canvas refits when its width changes a lot (device rotation), not for small changes such as a drawer opening.
- On phone, the template banner is shortened to "Template ‹name› · n cards" with a "Done" button.
- **PWA:**
  - installable, with a manifest and icons at 192, 512 and maskable
  - the service worker precaches everything, including the on-demand text editor and PDF export code and the bundled fonts, so the editor and PDF export work fully offline
  - updates install automatically; a small notice says when the app is ready offline or when a new version is available
  - "Install app" appears in the ☰ menu when the browser offers it

## Backups (project and template files)

- **Project backup** (`.cardproject.json`): the whole project — templates, cards, shared styles, images and fonts (stored inside the file as base64). Export it from the ☰ menu in the editor or from a project's ⋯ menu on the Home screen.
- Importing (Home → Import) always creates a **new** project, so it never overwrites anything. Every stored item gets a new id and all references are rewritten. Element ids are kept, so per-card part toggles and card-layer positions still match.
- Template files (Templates panel → ⋯ → Export file / Import) carry the template's images, fonts, shared styles and symbol images.
- Files are versioned (`format`, `version`); anything else is refused with a clear message.

## Card images

- ☰ → **Export card images…**, or a card's ⋯ → **Export as image…** (that card is preselected).
- Choose this card or all cards; front and/or back; without and/or with bleed; any of PNG, JPG and WebP; 150, 300 or 600 dpi. One file downloads directly; several are saved as one zip (fflate, images stored uncompressed since they already are).
- Images are drawn by the PDF card renderer, so they match the print, including the bleed fill setting. Sizes are exact: e.g. 54 × 86 mm at 300 dpi = 638 × 1016 px; with 3 mm bleed, 708 × 1086 px.
- PNG and JPG files carry their dpi, so they open at their real mm size. WebP has no standard dpi field.
- JPG gets a white background (no transparency); PNG and WebP keep transparent areas.
- Cards without a back template get no back image; the dialog lists them.
- Files are named "01 Card name - front (bleed).png"; the number keeps cards in order and keeps duplicate names apart.
- Browsers that can't write WebP (some Safari versions) show a clear error instead of saving a PNG under a .webp name.

## Hosting

- Published on **GitHub Pages** at `/<repo>/` by a GitHub Action on every push to `main`. The tests must pass before it deploys.
- The base path comes from `BASE_PATH` at build time; local `npm run dev` and `npm run preview` stay at `/`. The PWA manifest and service worker use paths relative to the base, so install and offline work on Pages too.
- `404.html` is a copy of the app, so a mistyped or old link still opens it.
- **Projects live in each browser.** The Pages site, `localhost` and each computer or browser keep their own projects. Move a project with ☰ → Export backup file, then Home → Import.

## Mail merge

- Cards panel → "+ Card" ▾ → **Mail merge from spreadsheet…**. Reads `.xlsx` (any sheet), `.csv`/`.tsv`, or cells pasted from Excel or Google Sheets (tab-separated). Old `.xls` files are refused with a message to save as `.xlsx` or `.csv`.
- **Column letters on template fields** (owner's design): each text, art box or icon-row field can be tagged with a spreadsheet column (A, B, … AA), in the template's properties ("Spreadsheet column") or in the merge dialog. The Layers panel shows the letter. "Use header names" fills letters for header cells that match field names.
- Cell values by field type: text as typed (line breaks and `{symbols}` work); art boxes take an uploaded image's **file name** (extension optional, any case); icon rows take a number. An empty cell keeps the template default. Unknown images and non-numbers are listed as issues and skipped, not guessed.
- Optional columns: card name, print copies, and a front/back template name per row (unknown names fall back to the templates chosen in the dialog).
- **Rows:** first row (default 2, so row 1 can hold headers), "only rows" and "skip rows" lists such as `2-20, 25`. Empty rows are skipped.
- **Modes:** "Update existing" updates cards an earlier merge made from the same row number (each card remembers its row), writing only the tagged fields, so part toggles, card-only layers and untagged values stay; other rows become new cards; nothing is deleted. "Add as new" always creates new cards (names are made unique).
- A merge is one undo step. The dialog's choices are saved on the project and in backups.
- Parsing libraries (papaparse, read-excel-file) load only when the dialog reads a file.

## Design tools

- **Show only when** (conditional parts): a template part can carry one rule on a field value (is / is not / contains / is filled in / is empty, ignoring capitals). The card's own value is compared, or the template default when the card has none. A part whose rule fails is hidden like a toggled-off part (nothing else moves). A per-card eye toggle still wins. Template mode shows every part so the layout can be edited.
- **Card numbers** are text tokens resolved when a card is drawn: `{#}`, `{#:3}` (zero-padded) and `{total}`. The number is the card's place in the Cards list plus the project's "first card is number" (default 1); print copies of a card share its number. Add → Card number adds a small `{#}/{total}` text, so numbers appear only where added. In template mode the first number is shown as a preview. The tokens take precedence over a symbol with the same name.
- **Keywords** are a project list of words/phrases with a partial style (bold, italic, underline, colour, font). Matching is whole-word and case-insensitive; phrases match any spacing; `{symbol}` names are never styled. Explicit formatting on the text wins over the keyword style. Each text part can opt out. Template files carry the project keywords; importing adds the ones the project doesn't have.
- All three happen when a card is resolved, so the canvas, thumbnails, print preview, PDF and image export always agree. The stored text is never changed.
- **Outline and shadow** are text-style fields (so shared styles and per-character formatting can carry them), sized in em so they scale with auto-shrink. Drawing order for a whole text is: every shadow, then every outline, then the letters, on the canvas and in the PDF (vector glyph paths; the system-font raster fallback draws the same effects). Outlines are stroked at twice the width with round joins, half hidden under the letters. Shadows are hard (no blur) on purpose, so screen and vector PDF match exactly. Shapes get a hard shadow too (Konva's shadow with blur 0 on screen, an offset copy in the PDF).

## Print & cutting additions

- **Paper sizes**: A4 (default), A3, A5, US Letter, US Legal (`print/paper.ts`). The PDF page is exactly the chosen size. CLAUDE.md asked for A4 only with the size kept as a setting; the owner asked for more sizes.
- **Gap between cards** (default 0): cells are spaced by the gap and the grid stays centred. With a gap every card has its own cut lines; marks are still drawn for each one at the grid edges. Fewer cards may fit.
- **Draft printing**: _Greyscale_ converts every colour to its luminance grey and every picture to a grey copy (SVGs are rasterised at 300 dpi for this); the preview uses a CSS greyscale filter. _Leave out art_ drops pictures and art boxes from the print, keeping shapes, text and icon rows. Neither changes the project.
- **Corner cutter guide**: a project setting (off by default, radius 3 mm). It shades the corners a corner cutter removes and outlines the rounded card, in the editor and the print preview only; never in the PDF or image export.

## Bulk editing

- **Select mode** in the Cards panel (Select / Done) ticks cards; a bar changes them together: front/back template (values carry over by field name, as for one card), show/hide a template part (only on chosen cards whose template has that part; a part's "show when" rule is respected), print copies (other cards keep theirs), duplicate (copies go after the last chosen card, in list order; copies don't inherit the mail-merge row), delete (asks once). Each action is one undo step.
- **Find and replace** searches each card's own text values, card-only text parts and, optionally, template default text. Matching is literal (no patterns), with options for capitals and whole words; it works within runs of same-formatted text, so a word whose letters have mixed formatting isn't matched. Formatting of the surrounding text is kept. Text a card shows from its template default is changed by the template option, not per card. Replace all is one undo step. Shortcut Ctrl/⌘ H.

## Review and playtest

- **Decks** are stored on the project (undoable, in backups with card ids remapped): a name and a count per card. Printing a deck uses its counts instead of the print list's copies (order still follows the print order); cards not in the deck don't print. Deleting a deck that is being printed goes back to the print list.
- **Gallery** is a full-screen view of live card thumbnails (front, back or both; size slider; search; deck filter). **Proofread** lists each card's text fields (front then back, once per field name) in text boxes with the browser's spell check. Plain text is edited in place (one undo step per field while typing); text with per-word formatting or paragraph settings is shown read-only so formatting is never lost — edit it on the card. Template defaults show greyed as placeholders; typing gives the card its own value.
- **Tabletop Simulator export**: 10 × 7 sheets of card fronts with up to 69 cards each; the last slot holds the back so "Back is hidden" works. Cards are sized so a full sheet fits 4096 px (54 × 86 mm → 367 × 585 px, about 173 dpi). One shared back image when every card shows the same back (same template, no card values, toggles or card-only layers on it); otherwise matching back sheets for "Unique backs". JPEG, no bleed, full colour (draft print options don't apply). A text file explains the import.
- **Phone**: Templates, Decks and Fonts were not reachable from the phone's bottom bar; they are now in the ☰ menu.

## Left pane and card data

- **Left rail** (desktop and tablet): Templates, Cards, Decks, Fonts, then action buttons (Print, Gallery, Images, Keywords, Data) that open the same views as the ☰ menu. Assets left the rail and is docked at the bottom of the left pane (up to 45 % of its height, collapsible, state per device in localStorage). The phone keeps Assets in its bottom bar.
- **Asset folders** are one level deep, named (no ids). An image's folder is stored on the asset (`folder`), saved with the library like its name; the folder list and order live on the project (`assetFolders`) so empty folders stay. Undo covers the folder list only (assets are library data, which is not on the undo stack); an image naming an unknown folder still shows, in a folder added at the end. Which folders are closed is per device. Drag to a folder uses pointer events for mouse and pen only, so touch keeps scrolling the list; touch uses _Move to folder…_.
- **Card data table**: rows follow the Cards list (search and deck filter apply). Columns are placed at the letters mail merge uses (the saved merge settings for name / templates / copies, then each field's spreadsheet column); a clash or a field without a letter takes the next free letter. On screen the name column always comes first and stays put. Edits use the existing commands (text like proofreading: plain text only, formatted text read-only).
- **CSV export** holds each card's _own_ values (empty = template default), so merging it back recreates the same cards; formatted text is exported as plain text. UTF-8 with a byte-order mark for Excel. Re-importing an export is "Add as new": "Update existing" keys on the original spreadsheet row number, which an export doesn't keep.
- Mail merge moved from its own dialog into the Data view's Import tab (Cards → + Card ▾ → Mail merge opens it there).

## Grey icons and themes

- **Grey icons on icon rows** are a per-card value next to the count (`grey` on the card's count value; the template has `defaultGrey`, 0 by default). Grey icons are extra greyscale copies of the same icon, placed at the start (left / top) or end (right / bottom, default) — a template layout setting (`greyAt`). Setting only the grey number on a card also stores its current count, so the card keeps that count if the template default changes later; _Default_ resets both. Mail merge and the card data table read and write the coloured count only. Greyscale copies are made per picture (canvas, SVGs at 512 px) and per printed size in the PDF (SVGs rasterised at 300 dpi, like draft printing), so grey icons are raster in the PDF. (The first version used a template-level total; the owner asked for a per-card count instead.)
- **Accent colour** is now blue-green (teal) in light and dark, including canvas selection handles, the app icon and the PWA colour.
- **Colour themes** are extra choices beside Light / Dark / Follow system, set by `data-theme` on the page; each is built on light or dark. Bubblegum pop uses the owner's colours (#FF69B4 accent, #069494 secondary text, #FFFFFF panels, #00F0FF focus ring and cyan borders). Midnight arcade (dark, neon green and magenta), Forest and Sunset were added as extras. The canvas surround stays neutral grey in every theme (CLAUDE.md).

## Units and card sizes

- **Units** (mm, cm, in, px) are a project setting for display only; every stored length stays in mm (CLAUDE.md). Number boxes marked as millimetres convert in and out, with steps and decimals that suit the unit (px whole numbers, in/cm 3 decimals). Pixels need a resolution: pixels per inch per project, default 300. Font sizes stay in points. Paper names in the print settings keep their mm sizes. The last choice is remembered on the device for new projects.
- **New project** always opens the setup dialog (name, size preset or custom, orientation, units, bleed); the starter layout is built for the chosen size and bleed.
- **More presets**, grouped: Japanese TCG 59 × 86 (Yu-Gi-Oh!, Vanguard), Bridge, the common sleeve sizes for board games (Mini American, Mini Euro, American, Euro, Tarot, square 70 and 80, Dixit) and business cards. Sizes follow the common sleeve-maker sizes; exact sizes vary a little by publisher, so Custom stays for anything else.

## Vector Maker

- A separate module (`src/vector/`) with its own document (artboard in px, layers of paths; each path is cubic Bézier subpaths with handles relative to their anchor), its own undo history and its own shortcuts; the card editor's shortcuts and paste are paused while it is open. It is loaded only when opened. Konva draws it, like the card canvas.
- Fill uses the even-odd rule everywhere, so compound paths and shapes with holes (frame, ring, gear) need no winding care.
- Pathfinder uses **paper.js 0.12.18** for the curve maths only (it keeps curves exact; polygon libraries would flatten them). It downloads only when a combine button is used. 0.12.18 is pinned: the two newer releases appeared within days of each other after two years without one, so they were not used yet. paper needs a canvas, so the boolean wrapper is tested in the browser; the geometry, shapes, path parser and SVG round trip are unit-tested.
- No groups inside a layer (layers do the grouping); objects move between layers with the Layer select. Item order changes with Arrange; layers reorder by drag.
- Saving: SVG, PNG or JPEG into the chosen asset folder. The editable document is stored on the asset (`vectorDoc`, JSON) and travels in backups. _Replace_ updates the asset in place (same id), so cards using it update. AI and EPS are not offered (not writable reliably in a browser); SVG and PDF open in Illustrator, Inkscape and Affinity.
- SVG import reads paths and basic shapes with fill / stroke / opacity and transforms (also in `style`); top-level groups become layers. Text, images, gradients, masks, clip paths and filters are skipped.
- The saved picture is the whole artboard; _Fit to artwork_ crops it to the drawing.

## Pen, tracing, view controls

- **Pen** follows Illustrator with Auto Add/Delete on. What a click does is decided in one pure function (`src/vector/pen.ts`): close on the first point, convert the last point (click drops its out-handle, drag pulls a new one), join onto another open end (the two become one path, drawing ends), continue an open end, add on a selected path's segment, delete on its anchor, else place / start. The cursor is a pen nib with Illustrator's badges (✱ new, ○ close, ^ convert, / continue, + add, − delete, join). Space during a drag moves the point; Ctrl/⌘ is Direct Selection while held; Backspace removes the last point. Points snap onto existing anchors.
- **Tracing** uses **imagetracerjs 1.2.6** (public domain, unchanged since 2020) in a Web Worker. Pictures are scaled to 512–1024 px on the long side first (small ones are enlarged smoothly, which gives smoother outlines). Mostly transparent shapes (soft edges of transparent pictures) and, optionally, the corner colour are dropped. The result is fitted into the artboard as a new layer. Each shape keeps a 1 px stroke in its own colour so neighbouring shapes have no hairline gaps.
- **Gallery and print preview** share a pan/zoom hook (`src/ui/components/usePanZoom.ts`) with the card editor's controls. The print preview redraws the sheets at the zoomed size once a zoom settles (sharp), with a CSS scale in between. The gallery maps zoom to its card size (80–800 px) rather than scaling pixels.
- Phone/tablet sheets inside the Vector Maker were hidden behind its full-screen layer; they now sit above it.

## Speed and polish (review)

- **Measured** with 300 cards (production build): canvas typing went from ~90 ms per key to no frame over 50 ms; switching cards has no long frames; Data-table typing is ~7× lighter; a 300-card PDF went from 155 s to ~28 s.
- **PDF bleed bands** (Mirror / Stretch edges) are JPEGs (opaque on purpose; jsPDF embeds JPEG as is, while PNGs were decoded and re-compressed in JavaScript), with a flat middle (only the bleed shows), and shared between cards whose side looks the same. The export yields between pages so progress shows.
- **Rendering**: thumbnails mount their canvas only near the screen and unmount when far away; each subscribes only to its own template, styles, number and keywords. Card list, Data table and Proofread rows are memoized. Image decodes and font loads are batched into one redraw per frame; the asset resolver is updated once from the store.
- **Shortcuts** of the card editor are paused whenever any dialog, sheet or full-screen view is open (anything with role="dialog"), so Delete or the arrows never change the hidden card. Esc closes Print, Gallery and Card data (Esc in a text box only leaves the box).
- **Feedback**: the browser's prompt / confirm / alert were replaced by in-app dialogs and short messages (`src/ui/components/feedback.ts`). Deletes act at once with an Undo message; deleting a font (not in the undo history) asks first.
- **First steps** checklist on the canvas for projects with up to 3 cards, ticking itself (a text value, a picture, Print opened); dismissed per device.
- **Phone**: the Edit (properties) sheet is lower (55 %) and non-modal, so the card stays visible and tappable. Touch targets brought to 44 px where they were smaller (layer handles and group arrows, Vector layer buttons, print copies, mode switch, print tabs).
- **Names**: the rail's card-image export is labelled _Export_; the phone Edit tab opens _Edit_; the bleed / safe-area toggle no longer uses the eye (which means show / hide a layer). Bubblegum's secondary text is darker for contrast; rail labels are 11 px.
- **Vector Maker** keeps a draft per project in the browser while there are unsaved changes; closing doesn't ask any more.

## Desktop app (0.1.0-alpha.1)

- **Electron, not Tauri.** Electron ships the same Chromium everywhere, so cards, fonts and PDFs come out identical on Windows, Linux and (later) Android. Tauri would use WebKitGTK on Linux, which renders differently. The cost is size: about 95 MB for the Arch package and 125 MB for the AppImage.
- **Electron 44.5.1 and electron-builder 26.15.3 are pinned exactly** (both releases were weeks old when picked).
- **Storage behind one interface** (`src/storage/backend.ts`). The website keeps IndexedDB (`dexieBackend`). The desktop app uses project folders (`folderBackend`) through a small bridge (`src/platform/desktop.ts`, `electron/preload.ts`). Autosave computes the same per-row changes for both.
- **Folder format** (`src/storage/folderFormat.ts`, format `card-maker-folder` version 1):
  - `project.json` holds everything except the files. It is pretty-printed and is always fully rewritten, atomically: temp file, fsync, then rename. The previous copy is kept as `project.json.bak`.
  - Pictures and fonts are separate files named by id, written only when they change and deleted only after `project.json` no longer points at them.
  - A missing picture file keeps its entry (with a warning when opening), so saving never drops it.
  - Thumbnails are not stored (they are drawn live).
- **A copied project folder** whose id is already in the list gets a new id when opened, so both copies can be open in turn.
- **Renaming a project** changes its name, not its folder's name.
- **No file watching:** editing `project.json` by hand while the project is open gets overwritten by the next save.
- **Settings:**
  - The Recent list, the projects folder and the last-open project live in `settings.json` in the app's data folder. Theme and units stay in the page's local storage, which lives in that same data folder.
  - The portable exe sets that data folder to `Card Maker data` next to the exe (`PORTABLE_EXECUTABLE_DIR`). Linux uses `~/.config/card-maker`.
  - The folder names are fixed rather than taken from the product name. The projects folder is saved when first created. So renaming the app never moves anyone's data.
- **Safety:**
  - The page is served from a custom `app://` scheme with a strict Content-Security-Policy.
  - Every request that isn't the app's own files is blocked, so it never goes online.
  - Node is off in the page (context isolation and sandbox on).
  - The main process only reads and writes inside the data folder, the projects folder, listed projects and folders the user picked, checked on real paths so links can't escape.
  - Deleting a project folder needs a `project.json` inside, and goes to the Trash / Recycle Bin rather than being erased.
- **The app's own zoom only.** Page zoom and the default menu are off, so Ctrl + / − / wheel reach the app. F12 or Ctrl+Shift+I opens developer tools for bug reports.
- **Closing the window** waits (up to 5 s) for the last autosave to finish.
- **Windows:** a single portable exe, at the owner's request. It unpacks itself to a temp folder on each start, so it starts a few seconds slower than an installed app. It isn't code-signed (a yearly cost), so SmartScreen warns once.
- **Linux:** an AppImage plus a pacman package with Arch dependency names (`gtk3 nss alsa-lib libxtst xdg-utils`). electron-builder's default list includes packages Arch no longer has.
- **No auto-updater.** New versions come from GitHub Releases.
- **The website build** is unchanged and keeps its service worker. The desktop build (`VITE_TARGET=desktop`) has none.
- **Name and version:**
  - "Card Maker" is a working title. The display name lives in `src/app/appInfo.ts`, `electron-builder.yml` (productName), `index.html` and the PWA manifest in `vite.config.ts`.
  - Internal ids stay fixed: the app id, the IndexedDB name, the `cardmaker.*` keys and the file formats.
  - Versions follow `0.1.0-alpha.N`, then `-beta.N`, then `1.0.0`. The Release workflow refuses a tag that doesn't match `package.json`, and marks alpha, beta and rc versions as pre-releases.
- **Android** is next: Capacitor, reusing the storage interface.

## Android app

- **Capacitor 8.5.2** (pinned) wraps the same web build (`VITE_TARGET=android`, no service worker) in Android's WebView, which is Chromium, so cards and PDFs come out as on desktop. `android/` is committed as Capacitor expects; `npm run android:sync` copies the build in.
- **Real folders, through Android's folder picker (Storage Access Framework).** A small native plugin (`android/.../FoldersPlugin.java`, Java like the rest of the generated project) gives the same file API as the desktop app (`src/platform/android.ts`), so the folder storage (`src/storage/folderBackend.ts`) and format are shared and project folders move between phone and PC.
  - Paths are virtual: `/tree/N/...` inside the N-th picked folder (its access is kept across restarts), `/app/...` the app's private storage (settings.json, written atomically).
  - SAF can't replace a file in one step, so project.json is saved as: write `project.json.tmp`, move the old file to `.bak`, rename `.tmp`. Opening a project now falls back to `.tmp`, then `.bak`, when project.json is missing or damaged (on every platform), with a message.
  - Folder providers that can't rename (some cloud folders) get the file written in place.
  - Document ids are cached per path to keep lookups fast.
  - Deleting a project folder is permanent on Android (no Trash), and the dialog says so. "Show in folder" is hidden: Android has no way to open a file manager at a folder.
- **First start asks for the projects folder** (the picker opens in Documents). If access to it is lost (e.g. the folder was deleted), it asks again.
- **No INTERNET permission** (removed from the manifest): the app's files are served from inside the APK, so it is offline at the system level.
- **Back button:** an open dialog or sheet closes first (Escape), then a full-screen view (views like the Vector Maker that don't close on Escape register their own handler), then the editor goes Home, then the app closes.
- **Saving** also runs whenever the app goes to the background (Android may stop it there without warning).
- **System bars** follow the app theme (Capacitor's SystemBars); the layout already uses safe-area insets.
- **versionCode** (`scripts/versionCode.mjs`, tested): major·1 000 000 + minor·10 000 + patch·100 + stage, where alpha.N = N, beta.N = 40+N, rc.N = 80+N, final = 99. Every later version gets a larger code, as Android requires for updates. versionName is the package.json version.
- **Signing:** releases are signed with the owner's key from repo secrets; trial runs without the secrets use the debug key, and a publishing run without them stops. `allowBackup` is off (Android's cloud backup would restore folder permissions that no longer work).
- **Large heap** is requested, since big PDF exports can need a lot of memory on phones.
- **Font picking:** the font file filter lists the generic types Android often gives font files, so .ttf / .otf aren't greyed out in the picker.
- **Testing:** the plugin's behaviour is covered by an in-memory stand-in (unit tests, and dev builds can run the Android code path in a normal browser via `window.__fakeAndroidFolders`). The APK itself is built in GitHub Actions; this project's development environment has no Android SDK or emulator.

## In-app Help

- **The guide lives inside the app** (☰ → Help, the rail's Help button, F1 anywhere, **?** in the editor, and a ? button in Print, Gallery, Card data and the Vector Maker that opens the matching page), so it works offline in every version. The README's feature list stays as a short overview.
- **Pages are Markdown** (`src/help/pages/<id>.md`), listed in `src/help/topics.ts`, rendered with **marked 18.1.0** (pinned). A few additions: `[[Ctrl+Z]]` key caps, `help:page#heading` links handled in-app, `> **Tip:**` / `> **Note:**` callouts, and screenshots by id. Raw HTML in a page is shown as text, never run. The whole Help (pages, renderer, view) is one lazily loaded chunk (~64 kB gzipped), so start-up is unchanged.
- **Search** is a small in-house scorer (title > keywords > text, every word must match), with no index library.
- **Screenshots** come from `scripts/help-screenshots.mjs`, which builds a demo project (generated art in `scripts/help-demo/`, six cards via a real mail merge) in the running app and saves WebP pictures to `public/help/` (≈0.9 MB, precached for offline use). Re-run it after UI changes; a test fails if a page shows a picture that doesn't exist or a listed picture is unused.
- **Checks** (`src/help/topics.test.ts`): one page per topic, exact titles, every `help:` link and `#anchor` exists, only known pictures, no HTML, and the shortcuts page mentions every Ctrl+letter shortcut in the editor code.
- **Escape closes only the top-most view** now (a small stack in `src/ui/components/overlay.ts`), so Escape in Help opened over Print closes Help. Help also registers for Android's Back button.
- **Help sits above full-screen views** (z-index 70) but below dialogs; F1 closes the export dialogs first, since a dialog can't have a view on top of it.
- **Found while writing the pages:** the left pane could grow wider than its column (cut-off buttons in the Decks panel with long card names); fixed with `min-w-0`. The Tabletop Simulator "How to import.txt" named the wrong menu path; it now says Objects → Components → Custom → Deck.

## Touch editing, undo in dialogs, Vector Maker mirroring

- **Touch screens get a small edit bar** over the canvas whenever something is selected: **Select several** (taps then add or remove parts, since fingers have no Shift key), **Duplicate** and **Delete** (only for parts that can be changed here: a card's own layers, or template parts in Template mode). In Select several, a tap on a selected part takes it out, but pressing it to drag keeps the selection, so several parts can be moved together. Esc or **Done** ends it. The flag lives in the editor view state (`multiSelect`).
- **Mail merge and Find and replace** show an **Undo** button next to their "Done" message. The card editor's shortcuts are paused while these are open, so the old "Undo with Ctrl+Z" hint didn't work there.
- **Vector Maker mirroring:** **Flip horizontal** / **Flip vertical** in Arrange and align (Shift+H / Shift+V), mirroring about the centre of the selection. Dragging a side of the selection box past the opposite side now turns the shape over (Konva's transformer flipping), and the result is baked into the path like any other transform.

## Desktop updates

- **Opt-in.** At first start the app asks once ("Check for updates automatically?"). The answer is kept in `updates.json` in the app's data folder; ☰ has **Check for updates** and **Automatic update checks**. With checks off, nothing changes: every request stays blocked.
- **Network allowlist, main process only:** with checks on, requests from the main process (never the page) may reach `github.com`, `api.github.com` and `*.githubusercontent.com` over https (`electron/updateHosts.ts`, tested). The page's Content-Security-Policy still blocks all outside connections.
- **electron-updater 6.8.10** (pinned), bundled into `main.cjs`, so the app still ships without `node_modules`. It reads `latest.yml` / `latest-linux.yml` from the GitHub release, which the Release workflow now uploads with the blockmaps.
- **Which copies update themselves:** the Windows installer (new: NSIS one-click, per user, no admin) and the AppImage download in the background and install on quit or **Restart now** (the page saves first). The portable exe and the Arch package can't replace themselves; they read the public `releases.atom` feed (no API rate limit) and offer a **Download** link. The portable exe stays, as a second Windows download.
- **Pre-releases** count while the running version is one (alpha, beta, rc), so alpha testers get the next alpha.
- **Unsigned:** Windows updates work without code signing; SmartScreen may still warn once per new installer download.
- **Versions before 0.1.0-alpha.2 have no updater;** they need one manual download.

## Playtest (step 1: a table played by hand, as a separate app)

- **Requested by the owner**, beyond the original feature list: a playtesting module for their game, Adventure Scuffle!, and for **other games they design later** (possibly board games). Step 1 is a table you play by hand; rules and a computer opponent come later.
- **A separate app in the same repo** (owner's choice), so Card Maker stays about designing cards: **Card Maker Playtest** (`playtest/index.html`, `src/playtest-app/`), built in the same Vite build as a second page and deployed next to Card Maker (`…/playtest/`). It shares the theme, UI components and the pure engine in `src/playtest/`. One service worker precaches both pages (Card Maker's navigation fallback skips `playtest/`); the Playtest page has its own manifest, so it installs as its own app. Packaged desktop and Android builds of it can come later; for now it is web / PWA (installable on Android from the browser).
- **Game packs** (`.cmpack`, `src/playtest/pack.ts`): a zip with `pack.json` (format and version, project id, card size, the **whole card pool**, decks, optional setups) and the card pictures as 200 dpi JPEG drawn with the print renderer; identical pictures (a shared back) are stored once (SHA-256). Each card carries its **field values by field name**: text as plain text, icon rows as numbers, fields on hidden layers included, pictures left out, so a later rules engine can read stats such as `A_AS`, `D_AS`, `FS_AS`. Reading checks the format, refuses newer versions and names a missing picture.
- **Getting a pack across:** _Save game pack_ downloads the file (desktop app: Save as). On the web, _Playtest now_ stores the pack in the Playtest app's own IndexedDB database (`card-maker-playtest`; same site, so shared) and opens `playtest/#pack=<project id>` in a new tab. A newer export of the same project replaces the older pack; its game in progress continues.
- **Games are saved** per pack in that database (the table state and the last 100 undo steps, debounced), so a reload continues; _New game_ removes the saved game.
- **Field name = layer name.** Renaming a field renames its layer and renaming a field's layer renames the field (card values move along, one undo step), so the names a game reads are the names the Layers panel shows. Existing parts whose names differ stay as they are until one is renamed. When another part still uses the old field name, cards keep the old value for it too.
- **Game setups are data**, not code (`src/playtest/setup.ts`): seats, zones (`grid`, `stack`, `row`, `area`, each per player or shared, sized in mm), card states (a name and a turn), tokens, counters (with an optional winning value), phases, coin and dice, and where each player's deck is dealt. The engine and views know nothing about a particular game. Two built-in setups: **Adventure Scuffle! — Mutual Reveal** and **Simple board game**, both sized from the pack's card size. User-made setups (an editor) are the next step and will live in the Playtest app (and can travel in a pack).
- **Every move is a plain action** applied by a pure reducer (`src/playtest/actions.ts`, using immer). The random number generator is seeded and its state is part of the table, so a list of actions replays a game exactly. This gives undo/redo, the game log, and what a rules engine (legal actions) and an AI (simulating games) will need. `observe()` already removes what a player can't see.
- **Who sees what:** a zone is `public` (face-down cards known to their owner), `owner` (a hand) or `hidden` (a deck: nobody). _View as_ a player applies it for hot-seat play; _Everyone_ (playing all sides yourself) shows face-down cards dimmed.
- **Facing seats:** with two players, the top player's area is turned 180°, so both front lines face each other and "same row, opposite column" is straight across. A setup is drawn from its owner's side; the Adventure Scuffle seat area is symmetric around the field (an empty strip as wide as the Rest zone on the other side), so the two fields line up exactly and each Rest zone is on its owner's right. Cards themselves stay upright to be readable.
- **A drop on an occupied slot swaps** the two cards (the game swaps a lot); a card going into a pile or a row is turned upright and its tokens go back to the tray.
- **Escape** in the Playtest app lets go of the selection and never leaves the game; Android's Back goes back to the pack list.

### To decide later (rules engine)

- **Stats from fields:** a setup will map game stats to field names (e.g. Attack ← `A_AS`, Defense ← `D_AS`, Fighting Spirit ← `FS_AS`, Fate Number ← `Fate_AS`), filled in automatically by a suffix such as `_AS`.
- **Effects from the card text:** the rulebook writes every ability as `[Condition/Cost]: [Effect]` with a closed keyword list (positional zones, Initiative / Attacking Side, N+ Rest Zone, the archetype keywords Field, Fallen, Strike, Return, Maneuver, Unbound, Rest N costs, swaps). A parser for a game's keywords can turn the ability field into effect blocks and list, per card, sentences it doesn't understand. Odd cards could use a hidden field (e.g. `Effect_AS`) with a short machine-readable line, or an effect set per card in the Playtest app.
- **Blocks, scripts, or both** for writing effects: blocks (menus, no code, limited to what the blocks offer), small sandboxed scripts per card (anything, but code), or blocks with a script for the odd card (most work). The text parser produces blocks, so it fits any choice. Decide when the rules engine starts, after playing real cards on the table.
- **Decks: a fixed deck list, or building from the card pool.** Today games use Card Maker's decks. A deck builder in the Playtest app (the whole pool, with the setup's deck rules such as Adventure Scuffle's 12 cards, one copy each, at most one Ace from a field like `Role_AS`) would let friends build decks without Card Maker, and an AI could try decks later. Packs already carry the whole card pool, so both stay possible.

## Hearthside (0.1.0-alpha.3)

### The name

- **Hearthside Cardworks** (the editor) and **Hearthside Table** (the playtest app), chosen by the owner. Only what users see is renamed: titles, manifests (short names "Hearthside" and "HS Table"), `productName`, Android `app_name`, artifact names, Help, README and messages.
- **Kept, so nothing is lost:** `appId` and the Android `applicationId` (installers upgrade in place), the IndexedDB names, the `cardmaker.*` localStorage keys, the file formats (`card-maker-project`, `card-maker-template`, `card-maker-folder`, `card-maker-game-pack`) and the package.json `name`. The desktop settings folder stays `card-maker` (`DATA_ID`); an existing `Card Maker data` portable folder and `Documents/Card Maker` projects folder keep being used, otherwise the new names are used. CLAUDE.md keeps the old name as the project's working document.
- **Arch package** renamed `hearthside-cardworks`, with `provides`, `conflicts` and `replaces` set to `card-maker`, so pacman swaps it on the next update (checked in the trial build).

### Icons

- **App icons** come from one SVG each (`assets-src/app-icon.svg`: game-icons `tavern-sign` on Hearthside amber over the night blue; `assets-src/table-icon.svg`: `rolling-dices`). `npm run icons` renders every PWA, Electron and Android size with the Playwright Chromium, so no image library is added. The owner may draw their own icon later: replace the SVG and rerun.
- **Button icons** are game-icons.net silhouettes (CC BY 3.0, credited in Help → About and credits and the README). `@iconify-json/game-icons` is a pinned devDependency; `npm run icons:gen` copies only the mapped paths into `src/ui/gameIcons.gen.ts`, so the bundle carries a few kB, not the pack. `src/ui/icons.tsx` re-exports lucide and replaces the mapped names with game icons that take lucide's props, so call sites only changed their import. Small utility glyphs (close, chevrons, ticks, alignment) stay lucide: silhouettes don't read at 16 px.

### Themes

- **37 themes in `src/ui/theme/themes.json`**, one source for the CSS (generated by `scripts/themesCss.ts` as `virtual:themes.css`), the picker and the tests. Optional decoration tokens (top bar glow, rail tint, rail active colour) style `.app-topbar` and `.app-rail`; themes without them look plain.
- **Hearthside is the default** for new users (no saved theme). Saved choices are kept. `theme-init.js` paints the right mode before React using `cardmaker.themeDark`.
- **Contrast is tested** for every theme (`themes.test.ts`): text on background and panel ≥ 7:1, muted text ≥ 4.5:1, accent text on accent ≥ 4.5:1, accent on panel ≥ 3:1 (Chocobo themes, whose accent is the yellow panel colour, mark the selected rail item with dark brown instead). The canvas surround is fixed neutral grey in every theme.
- **A picker dialog** (☰ → Settings → Theme…) instead of a long menu list: 37 entries don't fit a menu, and swatches show what you get.

### Menu and modes

- **☰ is at the top right everywhere** (Home, editor, Hearthside Table), with a **Settings** submenu: Help, Units…, Theme…, the desktop update items and Install app.
- **No duplicates of the rail:** what the left rail has (Print, Gallery, Playtest, panels, Export images, Keywords, Vector, Data) is in ☰ only on phones, where there is no rail. Help is the exception and is always in Settings (the rail also has it).
- **Templates and Cards tabs set the mode:** Templates → Template mode on the current card's template for the side shown (else the first template of that side); Cards → Card mode. Changing the mode moves the tab the same way (`src/ui/panels/editMode.ts`). Decks and Fonts don't change the mode.

### Import over an existing project

- When a backup's project id is already on this device, the app asks **Make a new copy** (the old behaviour, "(copy)") or **Overwrite…** (a second confirm). Overwrite replaces the stored project in one step (`StorageBackend.replaceBundle`: a Dexie transaction, or a folder rewrite that removes images and fonts the backup doesn't have), after exporting the current copy in memory; the toast's **Undo** writes that copy back.

### Front/back pairs and mixed sizes

- **Fronts are anchored to a back** (`Template.backId`). A back and its fronts form a size group with one size; different groups can have different sizes. This replaces "one size per project": double-sided printing only needs a front and its back to match.
- **Resizing** (`setGroupSize`) changes the group only, and `project.defaultSize` becomes the size for new templates. It asks first when a template in the group was designed (`Template.edited`, set by edits in template mode) or a card of the group has its own layers. Parts keep their mm positions (as before), except top-level parts that exactly cover the card or card + bleed, which stretch: otherwise every new template's background would stop short after a resize.
- **Cards:** switching a card's front switches its back to the front's anchor; any other back of the same size can then be picked. Backs of another size are refused (single, bulk and data-view switches, and mail merge falls back to the anchor).
- **New and imported fronts** anchor to a back of their size (the current card's back first); with none, a starter back of that size is made. Imported templates keep their own size.
- **Migration:** projects from before open with every front anchored (the back most of its cards use, if it has the same size; else the oldest back of its size; else a new starter back), saved straight away, no undo step.
- **Print:** cards are grouped by printed size (front template's, else back's), each group with its own sheet layout, marks and mirrored backs; the PDF holds each group's pages in turn. The alignment test uses the first group's layout. **Tabletop Simulator:** one deck per size (TTS decks have one card shape). **Game packs:** the built-in tables are sized from the largest card.

### Pacman repository

- **A fixed pre-release `pacman-repo`** holds the newest package and the repository database (`cardworks.db`/`.files` as real files: release assets can't be symlinks), updated by the Release workflow with `repo-add` in an `archlinux` container. Users add `[cardworks]` to `/etc/pacman.conf` once, then `pacman -Syu` updates the app. The updater skips the non-version tag, and the Arch build's update message says to run `sudo pacman -Syu`.
- **Unsigned for now** (`SigLevel = Optional TrustAll`): signing needs a GPG key the owner creates and adds as a secret; it can be added later without users changing more than the SigLevel line.

## Android releases paused

- **At the owner's request**, after 0.1.0-alpha.3: no Android release of any kind for now. The Release workflow no longer has an Android job, and the release notes, README and Help no longer offer an APK (the Help page "Android app" is gone).
- **The source stays** (`android/`, `capacitor.config.ts`, `scripts/android.mjs`, the `android:*` scripts, the native folder plugin and the platform bridge), so Android can come back without redoing it. It doesn't affect the website or desktop builds. Phone users are served by the website (installable, offline).
- **To ship it again:**
  - Bring back the Android job from git history (before this change), together with the Help page and README section.
  - Create the signing key once: `keytool -genkeypair -v -keystore card-maker.jks -alias cardmaker -keyalg RSA -keysize 4096 -validity 36500`, then `base64 -w0 card-maker.jks`.
  - Add the secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`cardmaker`) and `ANDROID_KEY_PASSWORD`.
  - Back the key up in two places: a lost key means everyone uninstalls once.
- **Ways to ship, discussed when paused:**
  - **The APK on GitHub Releases**, with [Obtainium](https://obtainium.imranr.dev) for automatic updates. This needs nothing more on our side.
  - **IzzyOnDroid** (F-Droid clients, free, uses our signed APKs).
  - **Main F-Droid**: they build and sign it themselves.
  - **Google Play**: $25, and new personal accounts need a 14-day closed test with 12+ testers.
  - Whatever the choice, check Google's Android developer verification first: from 2026 to 2027 it requires verified developers even for installs outside Play.
  - The app has no internet permission on purpose, so it won't update itself.
- **Later:** the owner wants a public website version without the parts made for their own use (such as Playtest). That will be planned separately.

## Hearthside Table: deck builder

- **Adventure Scuffle cards are read from the pack's `_AS` fields** (`src/adventure/cards.ts`): `Name_AS`, `Code_AS`, `Type_AS`, `FS_AS`, `A_AS`, `D_AS`, `Fate_AS`, `Ability_AS`, `Deck_AS`. An Ace is a card whose `Name_AS` contains `{ace}` (the owner's inline symbol), so no separate role field is needed. Bad or missing values are listed, not fatal, so a half-finished set can still be played. `src/adventure/` is pure TypeScript with no React or storage, so its logic can be ported to the Godot game.
- **Free Company rules** (`src/adventure/deck.ts`): exactly 12 cards, one copy each, at most one Ace, as in the rulebook. Packs without `_AS` fields get the same size and copy checks without the Ace rule.
- **Decks are stored per pack** in the Playtest database (`decks` table, Dexie version 2); removing a pack removes its decks. A deck lists card ids; the export file (`.asdeck.json`) lists card codes too, so it can be read into another pack with the same codes.
- **Edits show at once and are saved behind them** (a small zustand store), so quick taps never work on an outdated copy of the deck.
- **Start panel:** decks built here are listed first ("Your decks"), then the pack's decks; a saved deck that breaks a rule shows its first problem. With the rules on, illegal decks are refused.

## Hearthside Table: Adventure Scuffle rules engine

- **A separate rules module** (`src/adventure/`: `state.ts`, `engine.ts`, `stats.ts`, `observe.ts`, `table.ts`), pure TypeScript and plain data. `legalMoves(state)` and `apply(state, move)` are the only way to play, for the UI now and the bot later. The generic table engine (`src/playtest/`) is unchanged; a rules game is drawn on it with `toTable`. Described for the Godot port in `docs/adventure-rules-engine.md`.
- **Rule calls confirmed with the owner:** the initiative player reveals Fighting Spirit first in each Engagement; a pass locks that player's total for that Engagement only; with no defender on or next to the attacked position the attacker scores without Fighting Spirit; at Regroup each player chooses which rest-zone cards refill which positions; a player left with no attacker plays no Engagement (0 points), and the log flags it (⚑) because the rules don't cover it.
- **Assumptions (simplest reading of the rulebook):** initiative is random at the start (the rulebook's "winner chooses to take or give" is left out); the initiative player places first, at setup and at Regroup; after the opening pairs, single reveals alternate starting with the initiative player, and a player with nothing left to reveal is skipped; if no adjacent face-down pair is left, a single card is revealed instead; the defender scores when their total is higher.
- **Responses with nothing to use are skipped** automatically.
- **Hot-seat** uses the table's existing view: the view follows the player to act, behind a hand-over screen. Undo stays available (move by move), even though it can show the other player's last move.
- **Saved games** keep the rules state and its undo history in the `games` row (an optional `rules` field, so no database version bump).
- **Scripted games** are saved as JSON in `src/adventure/fixtures/games/` (decks, seed, moves, expected log and score), so a port can replay them and prove it plays the same.

## Hearthside Table: card abilities (The First Quest)

- **The rules follow the owner's answers, written up as the v2 rulebook** (`Playtest_Rulebook_MutualReveal (v2).md`), and the v2 card list, which changes five texts:
  - TFQ-01 Crimson Duelist: "May not be the target of an opponent's Field Ability."
  - TFQ-08 Spatial Witch and TFQ-16 Azure Assassin: "ready card".
  - TFQ-11 Mission Handler: the +1 A is dropped.
  - TFQ-29 Grave Acolyte: "Return a Grave card from your rest zone to your Support" with its Discount.
- **Abilities were first code, registered by `Code_AS`.** Since v3.2 they are read from the card text instead (see "Effects from the card text" below).
- **An ability declares its parts:**
  - an Inherent `stat`
  - a Battle `fs` value
  - `field`, `support`, `flip` or `battle` abilities
  - `restFs`
  - flags: `fieldProof`, `fixed`, `defenseUnbound`, `runaway`, `copies`
- **Choices are re-runnable plans.** `plan(io)` only reads the state and asks through `io.pick`. It runs again after each answer, then `apply` changes the state once. That makes each choice an ordinary move (`{t:'choose', id}`), so undo, saving, replays and the bot all work the same way.
  - A choice with a single option is made without asking.
  - "You may" abilities first ask whether to use them.
  - An ability is offered only if a trial run finds an answer to every choice.
- **The owner's calls, as built:**
  - Field Abilities can be used in any later response, by face-up Ready cards.
  - Flip Abilities are mandatory, and the card stays Ready.
  - Rest N is paid from Support, by the player's choice. A Runaway Familiar can't pay, since that would make the cost free.
  - Inherent abilities apply anywhere, and field checks count face-up cards only. Necromancer's Defense Unbound applies on the field only.
  - An archetype is "name contains the word", and a card never counts itself.
  - Rest-zone Fighting Spirit cards stay in the rest zone, and each can be used once per Engagement.
  - Won and Lost mean scored, this round only.
  - A swapped-in card keeps the replaced card's face.
  - Howling Barbarian is an extra attacker.
  - Strategic Vanguard's switched-in card becomes the Main Attacker when the Main Attacker switches.
  - Decoy Ninja's Ready card becomes the Fighting Spirit, at its printed value.
- **My calls where the text was still open:**
  - **Grave Acolyte's Discount** is checked after the returned card has left. It needs another Grave card still resting, otherwise it could be used in every response for free.
  - **Battle conditions** are checked once, at reveal: Strike counts Ghoulish cards revealed earlier in that Engagement.
  - **"Second Engagement"** means the second Engagement actually fought this round.
  - **Doppelganger Thief** pays its Rest 2 and then the copied ability's own cost.
  - **Crimson Duelist and Ranger of the Tower** are protected only once face up (known).
  - **Rianz Sentinel's** shown card is written in the shared game log.
- **Hidden information:** the log names a chosen position and its card only if that card is face up. Choice buttons show only to the player choosing.
- **Tests:**
  - One test per card or group of cards (`effects/cards.test.ts`).
  - The First Quest cards as test data (`fixtures/firstQuest.ts`).
  - 200 random-move games over the three premade decks and a Bonus Card test mix, which check that every game ends and no card is lost or duplicated (`selfplay.test.ts`).

## Maneuver (Ghoulish Trickster, Grave Reclaimer)

- **A Maneuver card may move itself:** it is a card of its own archetype (owner's ruling). This is an exception to "never counts itself".
- **A face-down card of the archetype may be the one moved.** Its owner shows it to the opponent to prove the archetype, and it stays face down. The game log names it, so both players know it.
- **The point** is to set up the field to look like one attack, then move the likely Main Attacker (the lowest Fate Ready card) to hit the opponent's weakest position. The bots don't plan this yet, so their numbers undervalue these cards.

## Hearthside Table: bots and balance runs

- **Three levels in `src/adventure/bot/`**, all choosing from `legalMoves`:
  - **Easy:** a random legal move.
  - **Normal:** rules of thumb for placing and revealing (`policies.ts`), plus **Skirmish and Combat Tricks** (`tricks.ts`) for every ability response and choice, owner's terms.
    - Each option is tried on 3 guesses of the hidden cards (the same guesses for every option), with the bot's next own choice tried too.
    - The board after it is scored by `evaluate`: points so far, plus the expected points of this round's Engagements. Those are predicted from the Attack/Defense Assignment the engine will make (`projectAssignment`), the Attack and Defense on each side, and each side's Fighting Spirit left.
    - **Timing:** before the final response, an ability is used only when it beats passing by at least 0.12 expected points. Otherwise it is kept for later, when more of the board is known.
    - **Fighting Spirit:** free rest-zone cards first. In the round's last Engagement, Support is spent while it can still change the result, since unused Support is rested at Regroup. A tie is taken when the opponent has locked their total.
    - Normal beat the plain rules of thumb in 63–65% of 120 games, at about 0.3 s a game.
  - **Hard:** the same Tricks for abilities and choices. For Fighting Spirit and the First Engagement it uses determinized Monte Carlo: for each candidate move (at most 8, pass always among them) it guesses the hidden cards, plays to the end of the round with quick rules of thumb on both sides, and scores the points gained, a win, and the Support kept. The number of playouts is its strength: 96 by default in the app.
- **Fair play:**
  - The bots read only what their seat may know, plus the options of the choice they are making.
  - A test checks that Easy and Normal pick the same move however the opponent's hidden cards are arranged.
  - Hard guesses by shuffling the opponent's hidden cards. That assumes open decklists: the bot knows which 12 cards the opponent's Free Company holds, not where they are.
- **In the app:**
  - The bot runs in a Web Worker. Its moves wait for the chosen speed (slow 1.6 s, normal 0.75 s, fast 0.12 s), so they can be followed.
  - Pause, and step one move at a time.
  - Against the bot you play Player 1. You see your side, and there is no hand-over screen.
  - Undo goes back past the bot's moves to your own last decision.
  - Bot against bot shows everything.
  - Taps on the table do nothing while it is the bot's turn.
  - The bot levels are saved with the game.
- **Balance runs** (`npm run as:sim`, `scripts/as-sim.mjs`) load the rules through Vite in Node.
  - Without `--pack`, they play The First Quest's three premade decks (the Bonus Cards aren't a Free Company of their own). With `--pack`, they play every legal deck in a game pack.
  - Every pairing is played in turn, and seats swap on alternate games.
  - The Markdown report has:
    - win rates per deck, deck against deck, and per bot level
    - per card: the win rate of the decks it was in, Fighting Spirit reveals and ability uses per game
    - how often the player with the first initiative won
    - any game that broke a rule check (a refused move, or a card lost or doubled)

## The First Quest v3 (balance)

- **Changes:** the owner approved all of them, after the tier review with the smarter bots (300 random decks, 8,000 games per version, Skirmish and Combat Tricks).
  - **Fighting Spirit:**
    - Runaway Familiar 2 → 1 (the strongest card in every version, at about +8 points)
    - Haughty Knight 3 → 2 (A in every version, and the most picked)
    - Grave Whisperer 1 → 2 (C in every version)
  - **Costs:**
    - "Rest 1" is dropped from Hunter Dragoon (D in every version, about −9), Strategic Vanguard and Light Dragoon.
    - Mission Handler is now once per round and stays in Support after use.
  - **Effects:**
    - Spatial Witch rests the card it swaps out (Azure Assassin is unchanged).
    - Lucky Charm Bearer: "2 or more cards in your rest zone: +1 FS" (it was "exactly 3: +2", which held about 9% of the time).
    - Gambler's Gambit: on Tails, the player still takes their Fighting Spirit turn.
- **Before v3,** the premade decks were already close with the smarter bots: Retinue 56%, Guild 50%, Necromancer 44%. The old bots had made Necromancer look dominant. So the Retinue got no buffs, and Necromancer cards no nerfs.
- **Where the changes live:**
  - The test data (`fixtures/firstQuest.ts`) holds the v3 values and texts.
  - The engine rules for the changed abilities came from `effects/cards.ts`, which the card reader has since replaced.
  - The Gambit's Tails is handled in `engine.ts`.
  - The v3 CSV for Hearthside Cardworks is made from the v2 one, changing only these cards.

## Archetype_AS

- **An explicit archetype field:** `Archetype_AS` holds a list separated by commas, semicolons or slashes (for example "Rianz, Hero"). It is read into `AsCard.archetypes`.
- **Which source decides:** when the list isn't empty, it alone decides a card's archetypes. A card named "Grave …" but tagged "Ghoulish" is not a Grave card. When it is empty, the archetype comes from the name, as before (the word appears anywhere in the name), so older packs play the same.
- **Where it's used:** every archetype check goes through `inArchetype` in `effects/helpers.ts`. That covers Field, Fallen, Strike, Maneuver, Discount and Return, and the Grave, Ghoulish and Rianz conditions. The deck builder's search matches archetypes too.
- **The First Quest v3.1 CSV** adds the column: Grave for the six Grave cards, Ghoulish for the four Ghoulish cards, and Rianz for the four Rianz cards, Hero of Rianz included. It plays exactly the same as v3.

## Playtest readability, Rush and replays

- **Action by action:** `applyFrames` in the engine gives one state per log line a move produces, so the table can show a move step by step. `apply` is unchanged, and so are the bots, the sim and the fixtures. The Engagement is now cleared just after its result line instead of just before, so the step-by-step view still shows the finished combat. Rules and logs are the same.
- **Action speed** (Slow 1.8 s, Normal 1 s, Fast 0.35 s per action, and Rush with no pauses) applies to every move, the player's own too, and replaces the bot speed. It is saved per device. Rush stands in for an "instant" setting.
- **Choices wait** until the step-by-step view is over (or Skip). The hot-seat hand-over waits too.
- **Cues** come from comparing two frames (`cues.ts`): a glow per kind of change, a double-headed arrow for two cards that trade places (or a card that replaces another on the field), and a one-way arrow for a card moving onto the field.
- **The card preview** opens on a tap on any card the viewer can see and never blocks the tap's move. It is a corner window on a desktop and a strip along the bottom on a phone.
- **The combat stage** shows only while an Engagement is fought, up to its result and score lines. It is centred on the table, with the attacker on the left on a wide screen, or on their own side of the table on a tall one.
  - **Active cards lie sideways,** as on the table. The attackers that count are turned clockwise (swords up), with the Main Attacker in front (marked with its cube) and the others stepping up behind it, each showing a quarter of the card width. The defenders that count are turned counter-clockwise (shields up). The owner's picture shows this: its upright card is the Fighting Spirit card, not the Main Attacker.
  - **Fighting Spirit cards** stand upright in front of their stack, below its strips, the newest lowest and in front (an older one's flames show above it).
  - **On the field,** the stage's cards are drawn faint.
- **Rush** plays one deck against the other only (not the sim's mirror pairings), with seats swapped every other game and each deck keeping its bot level. Game `g` has a fixed seed, so the batch is split over up to 4 workers. A batch is saved as one row: its decks, its cards, the card-use counts and each match's seed and moves. The last 5 batches per pack are kept.
- **Replays** store the start (cards, decks, names, seed) and the moves. The engine is deterministic, so that is the whole game.
  - **When they're kept:** when a rules game ends, and when it is left by New game after round 1. The id follows the game, so a game replayed after an undo replaces its own replay.
  - **How many:** the newest 100 unpinned per pack, and pinned ones are never pruned.
  - **Older saves:** a game saved before this change has no record of its start, so it can't become a replay.
  - **The open game:** watching a replay puts the open game aside, unsaved changes included, and gives it back on Leave. Autosave skips while a replay is on screen.

## App updates (website)

- **Offered, not forced:** a new version is offered by the "A new version is available. Update" message (`registerType: 'prompt'`), never applied by itself. A game in progress or a card being edited is never reloaded underneath the user. Both are autosaved, so Update resumes them.
- **When it looks:** an open tab or installed app brought back from the background doesn't reload, so the browser never looked for updates. The app now looks when it comes back into view and every 30 minutes (`registration.update()` in `src/ui/pwa/pwa.ts`).
- **Check for updates** (Home screen and ☰ menu, the Hearthside Table packs screen) asks the site at once. It says when the version is already the latest, or offers the update.
- **A build stamp** (the commit and date from GitHub Actions, "dev" locally) is shown next to the version, so it's clear which version is running.

## Regroup hand, and rock-paper-scissors for initiative

- **Regroup is shown as at the table:** while players refill the field from the rest zone, each player's Support row shows their rest-zone cards (face up, since the rest zone is public), and the Support is set aside: not drawn, with its count in the rest-zone label. This is drawing only (`regroupHand` in `table.ts`); the rules state is unchanged. A card dragged back onto that row is taken back.
- **Initiative:**
  - **The opening:** `NewGame.opening: 'rps'` opens the game with rock-paper-scissors. Player 1 throws, then Player 2, and a throw is hidden from the other player until both have thrown (`observeAs`). A tie throws again. The winner takes or gives the initiative.
  - **The default:** a coin, as before, so the sim, Rush and the saved test games are unchanged.
  - **A fixed initiative:** `NewGame.initiative` sets the starting initiative directly. Tournament games after the first use it.
  - **The app:** the start panel offers rock-paper-scissors (the default) or Random.
  - **Bots:** every level throws at random and always takes the initiative, because the first player wins slightly more often in the sims.

## Deck auto-builder

- **Card values** come from a league of 60 random legal decks and 1,600 games played by the quick rules-of-thumb bot, about 10× faster than Normal. A logistic fit of "deck A beat deck B" on which cards each deck holds gives each card a value in log-odds of winning, as in the tier lists (`deckgen/values.ts`). Values are cached per pack and per card-data hash, so they're recomputed only when the cards change.
- **The levels** (`deckgen/build.ts`):
  - **Suboptimal:** random legal picks from all but the top 30% of cards.
  - **Optimal:** greedy by value plus an archetype synergy bonus, then swaps while the score improves. A card whose ability names an archetype ("a Grave card") earns half the bonus with one other card of it in the deck, and the full bonus with two. The bonus is half the spread of the card values.
  - **Very optimal:** Optimal, then up to 16 swaps, each kept only if the deck wins more games against the pack's legal decks and itself. Normal bots play 2 seeds × both seats per opponent, on the same seeds for every deck (`deckgen/climb.ts`).
- **Checked on The First Quest** (Normal bots, 60 games per deck against the three premades): Suboptimal 33–40%, the premades 47–55%, Optimal 70%.

## Tournaments

- **The formats** come from the owner's game roadmap: Locals, Regionals, Nationals, Pro Tour and World Championship. A custom format can be round robin, Swiss with an optional top cut, groups then a knockout, or single elimination. The match length can be changed for any of them.
- **The engine** (`src/adventure/tournament/`) is pure and portable, like the rules engine:
  - **Pairings:** round robin by the circle method. Swiss by record, best first, with backtracking to avoid rematches, and a bye going to the lowest-ranked player who hasn't had one. Groups are filled by snake seeding.
  - **The knockout** is seeded 1–8, 4–5, 2–7, 3–6. From groups, the seeds go A1 B1 A2 B2 …, so players from one group don't meet in the first round.
  - **Standings:** match points (3 a win, and a bye counts as a 2–0 win), then opponents' match-win % (at least 33%), game-win %, and opponents' game-win %.
- **The owner's initiative rule:** game 1 of a match uses the tournament's opening (rock-paper-scissors or a coin). After that the player who went second in the game before starts with the initiative (`NewGame.initiative`). Seat 0 is always the match's first player.
- **Who plays:**
  - People play their own matches on the table, against a bot or hot-seat against each other. The game is recorded when it ends.
  - Bot-against-bot matches are played in a worker pool. A game nobody wins (the move limit) is played again with the next seed.
  - Every game's seed comes from the tournament seed, the match and the game number, so a result can be reproduced.
- **Watching:** as with the roadmap's spectating, any played game can be watched afterwards with the replay player and its speed controls. Tournament games are kept in the tournament, not in the Replays list, so a big event doesn't push your own replays out. Your own games are also kept as normal replays.
- **Saving:** each tournament is saved in the `tournaments` table (Dexie version 5) after every change.

## Effects from the card text (v3.2)

- **No Effect_AS field.** The owner asked why a card needs a hidden effect field when `Ability_AS` already says what it does. The rules engine now reads every ability from `Ability_AS` and `Type_AS` (`src/adventure/effects/reader.ts`). There is no per-card code and no code lookup.
- **How it reads:** each clause is `[Conditions: ]Phrase.`, matched against a closed list of phrases and conditions. Archetype words, numbers and conditions combine freely, so a new card written with the known phrases plays without a code change. `docs/card-text-phrases.md` lists them and doubles as the writing guide.
- **The card type decides how an action is used:** Field, Support, Flip or Battle. Inherent and Rest cards have no action. A card has at most one action.
- **A card the reader can't fully read plays with its stats only.** It isn't blocked, so a half-written set still plays. The deck builder lists it with the other card problems, and the card zoom and preview quote the words it couldn't read.
- **General reading rules, from the owner's answers:**
  - "Swap this card's position with a card on your field" from Support: each card goes where the other was (TFQ-21 Light Dragoon).
  - The same swap from a Fighting Spirit card: the field card takes its place as the Fighting Spirit (TFQ-05 Decoy Ninja).
  - "Reveal this card": the card stays in Support (TFQ-20 Rianz Sentinel).
  - Being swapped off the field counts as being repositioned (TFQ-22 Ranger of the Tower).
  - Swapping an attacker and a defender: they change roles, and the combat rules work out the new Main Attacker and the totals (TFQ-04 Strategic Vanguard).
  - A copied Field Ability is used as the copier's own, with its own costs and choices (TFQ-44 Doppelganger Thief).
- **The First Quest v3.2** rewords three cards so their text says everything the engine did:
  - TFQ-41 Runaway Familiar adds "This card cannot be rested to pay a cost."
  - TFQ-39 Ghoulish Trickster and TFQ-30 Grave Reclaimer: "Swap the position of a [Ghoulish/Grave] card on your field (this card included) with another card on your field. To choose a face-down [Ghoulish/Grave] card, show it to your opponent; it stays face down."
  - With the v3.1 texts these three still read, but as printed: the Familiar can pay costs, and the Maneuver cards can't move themselves or a face-down card.
- **Same play:** every card ability test passes unchanged with the rules the reader builds, so v3.2 plays exactly like v3.1 did with the per-card code.

## Keywords from the design archive

- **The owner's archive of cut and future cards** came with the old rulebook texts. The reader now knows the keywords those define:
  - **First Blood:** no card has been revealed as Fighting Spirit yet this Engagement. **Ambush:** the opponent has already passed this Engagement.
  - **Echo Bond:** you revealed a W card before this one this Engagement. A card's archetype check never counts itself, which matches how the First Quest's "a Ghoulish card was revealed" already worked.
  - **Field and Fallen Bond, Attack and Defense Override, Surge and Unbound** are read as keyword names when the clause spells out their rule.
  - **The Kindred names are not read** (owner's ruling). The owner retired the word Kindred and its types (Strike, Return, Maneuver, Discount). Their effects live on as plain text on the archetype cards, which the reader already knows. A card still worded with Kindred gets the can't-read warning, so it's reworded.
  - **Overrides:** "Non-adjacent cards are counted for defense", and the archetype variant "Non-adjacent [W] cards are counted for attack", last for the round (`RoundFlags.unbound`).
  - **Smaller phrases:** "Put a card from your rest zone into your Support" (any card), "Target player rests a card from their Support", a field card swapping itself with another field card, First Engagement, the opponent's rest-zone count, your Support count, and the opponent's Main Attacker in the Center or Flank.
- **Only Battle Abilities give Fighting Spirit:** an "+N FS" clause on a Field, Flip, Inherent or Support card is left unread, as the rulebook says. The archive's Falconer Knight is the example.
- **Support count includes the card itself** while it's still in Support ("if you have 3 or fewer cards in Support"), checked after the action, like the Discount.
- **Onslaught is not read** (owner's call). Its rule counts "your own cards (including itself)" that are attacking, but its bonus is Fighting Spirit, which only a card revealed from Support gets, and such a card is never on the field. The archive's Onslaught cards play on their stats with the usual warning until they're redesigned.
- **Not read yet, waiting on the owner:**
  - Final Blow and "the last one revealed this Engagement": the archive marks Final Blow as reconstructed, and the last card is only known when the Engagement ends, after this card's value is set.
  - "Reveal this card" with a keep clause on the same card (Whispering Bond, Dawnguard Gauntlet): under the TFQ-20 ruling the reveal already keeps the card, which would make the second clause do nothing.
  - Lockouts, Sahuagin Reef-Strider's adjacent-defender check, and the Fear boss deck (Solo Mode, debuff tokens, X values).
- **Cut by the owner:** Garrison Defender (Bulwark) and Hollow Presence. Neither keyword will be read.
