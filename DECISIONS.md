# Decisions and assumptions

Where CLAUDE.md left room, the simplest option that fits it was picked. Each choice is listed here.

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
- **Per-card overrides are visibility only** (confirmed with the owner). Art framing (fill/fit, pan, zoom) is part of the card's image field value.
- Overrides for elements deleted from a template are ignored, not deleted, so undoing the deletion restores them.
- Two lock flags: `toggleLocked` (can't be hidden per card, from the spec) and `editLocked` (the layers panel lock: can't be selected or moved on the canvas).
- **Groups** have no transform of their own. Children are stored in card coordinates. A group is a unit for naming, visibility and selection. Groups can be moved and resized (children scale) but not rotated. On the canvas, clicking a child of an already selected group selects that child. Children can also be selected from the layers panel.
- Thumbnails are **rendered live** from the current template and card (lazily, when scrolled into view), not stored as blobs. They are always up to date with template edits. The `thumbnail` fields in the schema are unused for now.
- New projects start with an 86 × 54 mm "Basic front" (background, art field, title, rules) and a "Basic back", so a first card can be made in under a minute.
- "New card" copies the previous card's templates and part toggles ("use previous card's layout"). The dropdown has a variant with default toggles.
- Deleting a template moves its cards to another template of the same side. Their field values are kept.
- Deleting an image that is in use asks for confirmation. Places that used it show an empty box.
- Uploaded images and fonts are not part of undo history. Elements that use them are.

## Fonts

- **Inter is bundled** (`@fontsource/inter`, regular/bold/italic). Georgia, Arial, Times New Roman and Courier New are listed as system fonts and may look different on another machine.
  - For Shot 2: system fonts can't be embedded in a PDF. Export will need to use bundled or uploaded fonts, or warn about missing ones.
- Uploaded TTF/OTF files are read for their family and style names (sfnt `name` table). Upload Regular, Bold and Italic files of the same family to get real bold and italics; otherwise the browser synthesises them.

## Images

- Accepts PNG, JPG, WebP and SVG. The original file blob is stored unchanged.
- SVGs are drawn on screen from a sized copy (so they stay sharp when zoomed). The original SVG is kept for vector PDF output in Shot 2.
- The print-quality warning appears below **300 DPI** of effective resolution at the placed (and cropped or zoomed) size. Vector images never warn.
- Dropping an image onto an image field fills it. "Add → Image…" always creates a new image element. Tapping an image in the Assets panel fills the selected art box, or adds a new image if no art box is selected.
- Filling an art box on a card: double-click/double-tap an empty art box to pick a file, or use the floating bar (Choose/Replace image, Reposition, Default) that appears when an art box is selected. The picture is stored on the card; the template keeps its placeholder.
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

- Breakpoints: phone under 768 px, tablet 768–1199 px, desktop 1200 px and up.
- Phone text editing uses a panel at the top of the canvas instead of a bottom sheet, so the on-screen keyboard doesn't cover it. The card below updates live.
- The theme setting is saved in `localStorage` and applied before first paint to avoid a flash. It is a device preference, not project data.
