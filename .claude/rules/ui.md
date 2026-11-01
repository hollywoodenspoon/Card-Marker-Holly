---
paths:
  - "src/ui/**"
  - "src/app/**"
  - "src/index.css"
---

## UI and UX

- Style: modern and clean, in the spirit of Canva and Figma. Restrained palette, one accent color, generous spacing.
- Desktop: top bar (project name, size preset, undo/redo, zoom, Export/Print), left panel (cards, templates, assets, fonts, layers), center canvas, right properties panel.
- Tablet: side panels collapse into slide-out drawers.
- Phone: canvas fills the screen. Bottom toolbar for main tools. Properties, layers, and assets open as bottom sheets. Print view is simplified (preview + export).
- Touch: pinch-to-zoom, two-finger pan, one finger select and move. Tap targets at least 44 px. Larger selection handles on touch devices. Use `dvh` units and safe-area insets.
- Themes: Light, Dark, Follow system. Saved setting.
- Keyboard shortcuts on desktop (undo, redo, duplicate, delete, nudge, zoom).
- Empty states and first-run guidance so a new user can make a card in under a minute.

