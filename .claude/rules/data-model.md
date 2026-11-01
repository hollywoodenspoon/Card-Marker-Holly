---
paths:
  - "src/core/**"
  - "src/templates/**"
  - "src/storage/**"
  - "src/types/**"
---

## Card sizes (presets, all editable)

| Preset       | Size (mm)   | Notes                            |
| ------------ | ----------- | -------------------------------- |
| ID card      | 86 x 54     | **Default / main format**        |
| Poker        | 63.5 x 88.9 | 2.5 x 3.5 in standard poker size |
| Trading card | 63 x 88     | Common rounded TCG size          |
| Custom       | any         | User-entered width and height    |

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

