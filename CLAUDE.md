# Card Maker

A clean, modern card editor that runs in the browser on PC and phone. It stores cards, images, and fonts locally, supports reusable templates with fields, and exports print-ready A4 sheets with bleed and cut guides as RGB PDF.

The owner designs cards for an original 1v1 card game and cuts printed sheets by hand. Optimize for: fast design workflow, reusable layouts, and accurate print output.

## Hard constraints

- Web app first. No backend. Everything runs and is stored in the browser.
- All geometry is stored in **millimetres**. Convert to pixels only at render time.
- **RGB PDF export only.** Do not add CMYK conversion. Keep the export module separate so CMYK could be added later.
- **A4 only** for printing (210 x 297 mm). Keep paper size as a setting in code so other sizes can be added later.
- Responsive from day one: desktop, tablet, and phone. Do not leave mobile for the end.
- Dark, light, and system themes from day one.
- Dependencies: prefer well-maintained libraries. Keep the bundle reasonable.

## Stack

- React + TypeScript (strict) + Vite
- Tailwind CSS + shadcn/ui (Radix) for components
- Canvas: Konva (react-konva) or Fabric. Pick one in the planning step, justify it briefly, and stay with it. It must support per-character text styling or be extended to do so, plus touch input.
- Storage: IndexedDB through Dexie. Autosave with a visible "saved" indicator.
- PDF: pdf-lib or jsPDF, with svg2pdf.js so SVG assets stay vector in the output.
- PWA: installable, works offline.
- Tests: Vitest for pure logic (print layout math, template resolution, unit conversion).

## Architecture principles

- **Separate the editor core from everything around it.** The core (document model, tools, rendering) must not depend on storage, PDF export, or the responsive shell. Each of those is a replaceable module.
- Layout (templates) is separate from content (card values).
- Use pointer events everywhere (mouse, pen, touch), never mouse-only events.
- No hover-only interactions.
- Keep modules small and well named so they can be understood and edited independently.

Suggested layout:

```
src/
  core/        document model, units, canvas tools, render
  templates/   template resolution, fields, overrides
  storage/     Dexie schema, autosave, import/export
  print/       sheet layout math, cut marks, PDF export
  ui/          shells (desktop, tablet, phone), panels, theme
  assets/      image and font handling
```

## Card sizes (presets, all editable)

| Preset | Size (mm) | Notes |
|---|---|---|
| ID card | 86 x 54 | **Default / main format** |
| Poker | 63.5 x 88.9 | 2.5 x 3.5 in standard poker size |
| Trading card | 63 x 88 | Common rounded TCG size |
| Custom | any | User-entered width and height |

Orientation can be portrait or landscape. Bleed is set per project, adjustable from 0 mm, default 3 mm.

## Data model

All units in mm. Everything is stored in IndexedDB.

- **Project**: groups templates, cards, assets, fonts, style presets, print settings.
- **Template**: a card size, a side (front or back), and a list of elements.
  - Element types: text field, image field, shape, image (fixed), group.
  - Each element has a stable id, a name, a default visibility (on/off), and an optional lock flag meaning it cannot be toggled per card.
  - Elements can be grouped and named (e.g. "Rarity gem", "Flavor text", "Art frame").
  - A field is an element whose content comes from the card (text or image).
- **Card**: has a front template id, a back template id (the back can be shared across a whole deck), field values, and overrides.
  - Overrides are stored per card and only store differences from the template, e.g. `{ elementId: { visible: false } }`.
- **Asset**: an uploaded image (PNG, SVG, also accept JPG and WebP). Store the original file blob and metadata.
- **Font**: an uploaded TTF or OTF. Load with the FontFace API. Store the blob.
- **Style preset**: a named set of font and color settings that templates can share.

## Template behavior

- A project has any number of templates (e.g. "Creature", "Spell", "Item"), for fronts and for backs.
- Each card picks one front template and one back template, and can switch at any time.
- When a card switches template, field values with matching field names carry over. Values with no matching field stay stored on the card, so switching back restores them.
- **Editing a template updates every card that uses it** (live).
- Per card, individual template parts can be turned on or off. When a part is hidden it simply disappears. **Other parts stay exactly where they are** (no auto-expand into freed space).
- Per-card toggles survive later template edits.
- Template library with thumbnails: rename, duplicate, delete, "save current card as template".
- Export and import templates as files.

## Editor features

Canvas
- Canvas shown in mm with rulers, zoom, pan, and a toggleable overlay for bleed and safe area.
- Snapping to card edges, guides, and other elements. Alignment helpers.
- Undo and redo for everything.
- Layers panel: order, lock, show/hide, rename.
- The canvas background stays neutral in both themes so card colors always look true.

Images (Canva-style)
- Upload by drag and drop, file picker, or paste.
- Move, resize with corner handles (aspect ratio locked by default, modifier key for free resize), rotate with a handle or by typing an angle.
- Flip horizontal and vertical, crop, opacity, layer order, lock, replace image while keeping position and size.
- In an image field (art box): fit or fill the frame, and reposition and zoom the image inside the frame.
- SVG stays vector through to the PDF.
- Print-quality warning: if an image would print below ~300 DPI at its placed size, show a warning on the element.

Text
- Rich text editor with per-character styling: font, size, color, bold, italic, underline, alignment, line height, letter spacing.
- Custom fonts from uploads.
- **Auto-shrink**: text fields shrink to fit their box, with a minimum size.
- **Inline symbols**: typing `{name}` (e.g. `{fire}`) in a text field inserts an icon from the project's assets. Symbols are assets tagged with a name.

Cards
- Duplicate card, and quick "use previous card's layout".
- Cards list with thumbnails, search, reorder.

## Printing

- A4 sheet. Printer margin is a setting, default 5 mm.
- Cell size = card size + 2 x bleed. The grid (columns and rows) is calculated automatically from cell size, margins, and orientation. Choose the orientation that fits the most cards, but let the user override.
- Show the number of cards per sheet in the UI.
- **Cut marks sit outside the bleed area** (small gap from the bleed edge) so they never print on the card. Option for full guide lines across the sheet as well. The user cuts by hand, so the marks and lines must be clear and accurate.
- Print preview shows the fronts sheet and the matching backs sheet.
- **Backs sheet is mirrored** so each back lines up behind its front when printed double-sided. Provide a setting for flip on the long edge or the short edge, and a one-page alignment test sheet.
- Export to RGB PDF. Output must be exact mm sizes (check at 100% scale). Fonts embedded or converted so the PDF looks identical to the preview.
- Write unit tests for the sheet layout math (grid fit, mirrored back positions, mark positions).

## UI and UX

- Style: modern and clean, in the spirit of Canva and Figma. Restrained palette, one accent color, generous spacing.
- Desktop: top bar (project name, size preset, undo/redo, zoom, Export/Print), left panel (cards, templates, assets, fonts, layers), center canvas, right properties panel.
- Tablet: side panels collapse into slide-out drawers.
- Phone: canvas fills the screen. Bottom toolbar for main tools. Properties, layers, and assets open as bottom sheets. Print view is simplified (preview + export).
- Touch: pinch-to-zoom, two-finger pan, one finger select and move. Tap targets at least 44 px. Larger selection handles on touch devices. Use `dvh` units and safe-area insets.
- Themes: Light, Dark, Follow system. Saved setting.
- Keyboard shortcuts on desktop (undo, redo, duplicate, delete, nudge, zoom).
- Empty states and first-run guidance so a new user can make a card in under a minute.

## Build order

### Shot 1: usable core
1. Project setup, responsive shell (desktop, tablet, phone), themes
2. Data model and storage with autosave
3. Canvas in mm with the card size presets, snapping, undo/redo, layers
4. Image and font upload and manipulation, text editor with auto-shrink
5. Templates: fields, template library, live updates to cards, per-card part toggles
6. Card fronts and backs

### Shot 2: print and polish
7. A4 print sheet: adjustable bleed, cut marks, guide lines, mirrored backs, alignment test, RGB PDF export
8. Inline symbols and style presets
9. Phone layout pass, touch behavior, PWA
10. Template and project export and import (file backup)

## Working rules for Claude Code

- Start in plan mode. Present the plan (stack choices, folder layout, data schema) before writing code, and wait for approval.
- Commit to git after each milestone with a clear message.
- Run the dev server and test the app yourself. For print features, generate a PDF and check sizes and positions.
- Keep `README.md` short: how to install, run, and build.
- Do not add features outside this document without asking. Do not add CMYK, accounts, or a backend.
- If a requirement is ambiguous, pick the simplest option that matches this document and note the assumption in a `DECISIONS.md` file.
- Fix type errors and lint warnings as you go. Do not leave failing tests.

## Definition of done (v1)

- A user can create a 86 x 54 mm card, add text and images, resize and rotate them, and save it.
- Templates with fields work, editing a template updates its cards, and a card can switch templates and toggle template parts.
- Card fronts and backs can both be designed.
- Fonts and images persist after reloading the page.
- An A4 PDF exports with correct bleed, cut marks outside the bleed, and mirrored backs.
- The app is usable on a phone-sized screen and works in both themes.
