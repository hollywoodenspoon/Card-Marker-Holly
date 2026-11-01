# Spec history

The original build order and v1 definition of done, both already done. Kept for reference.

## Build order

### Shot 1: usable core

1. Project setup, responsive shell (desktop, tablet, phone), themes
2. Data model and storage with autosave
3. Canvas in mm with the card size presets, snapping, undo/redo, layers
4. Image and font upload and manipulation, text editor with auto-shrink
5. Templates: fields, template library, live updates to cards, per-card part toggles
6. Card fronts and backs

### Shot 2: print and polish

7. A4 print sheet: adjustable bleed, cut marks, guide lines, mirrored backs, alignment test, RGB PDF export (CMYK added in v0.3.0)
8. Inline symbols and style presets
9. Phone layout pass, touch behavior, PWA
10. Template and project export and import (file backup)

## Definition of done (v1)

- A user can create a 86 x 54 mm card, add text and images, resize and rotate them, and save it.
- Templates with fields work, editing a template updates its cards, and a card can switch templates and toggle template parts.
- Card fronts and backs can both be designed.
- Fonts and images persist after reloading the page.
- An A4 PDF exports with correct bleed, cut marks outside the bleed, and mirrored backs.
- The app is usable on a phone-sized screen and works in both themes.
