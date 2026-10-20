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
- **Draft printing**: *Greyscale* converts every colour to its luminance grey and every picture to a grey copy (SVGs are rasterised at 300 dpi for this); the preview uses a CSS greyscale filter. *Leave out art* drops pictures and art boxes from the print, keeping shapes, text and icon rows. Neither changes the project.
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
- **Asset folders** are one level deep, named (no ids). An image's folder is stored on the asset (`folder`), saved with the library like its name; the folder list and order live on the project (`assetFolders`) so empty folders stay. Undo covers the folder list only (assets are library data, which is not on the undo stack); an image naming an unknown folder still shows, in a folder added at the end. Which folders are closed is per device. Drag to a folder uses pointer events for mouse and pen only, so touch keeps scrolling the list; touch uses *Move to folder…*.
- **Card data table**: rows follow the Cards list (search and deck filter apply). Columns are placed at the letters mail merge uses (the saved merge settings for name / templates / copies, then each field's spreadsheet column); a clash or a field without a letter takes the next free letter. On screen the name column always comes first and stays put. Edits use the existing commands (text like proofreading: plain text only, formatted text read-only).
- **CSV export** holds each card's *own* values (empty = template default), so merging it back recreates the same cards; formatted text is exported as plain text. UTF-8 with a byte-order mark for Excel. Re-importing an export is "Add as new": "Update existing" keys on the original spreadsheet row number, which an export doesn't keep.
- Mail merge moved from its own dialog into the Data view's Import tab (Cards → + Card ▾ → Mail merge opens it there).

## Grey icons and themes

- **Grey icons on icon rows** are a per-card value next to the count (`grey` on the card's count value; the template has `defaultGrey`, 0 by default). Grey icons are extra greyscale copies of the same icon, placed at the start (left / top) or end (right / bottom, default) — a template layout setting (`greyAt`). Setting only the grey number on a card also stores its current count, so the card keeps that count if the template default changes later; *Default* resets both. Mail merge and the card data table read and write the coloured count only. Greyscale copies are made per picture (canvas, SVGs at 512 px) and per printed size in the PDF (SVGs rasterised at 300 dpi, like draft printing), so grey icons are raster in the PDF. (The first version used a template-level total; the owner asked for a per-card count instead.)
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
- Saving: SVG, PNG or JPEG into the chosen asset folder. The editable document is stored on the asset (`vectorDoc`, JSON) and travels in backups. *Replace* updates the asset in place (same id), so cards using it update. AI and EPS are not offered (not writable reliably in a browser); SVG and PDF open in Illustrator, Inkscape and Affinity.
- SVG import reads paths and basic shapes with fill / stroke / opacity and transforms (also in `style`); top-level groups become layers. Text, images, gradients, masks, clip paths and filters are skipped.
- The saved picture is the whole artboard; *Fit to artwork* crops it to the drawing.

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
- **Names**: the rail's card-image export is labelled *Export*; the phone Edit tab opens *Edit*; the bleed / safe-area toggle no longer uses the eye (which means show / hide a layer). Bubblegum's secondary text is darker for contrast; rail labels are 11 px.
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
