---
paths:
  - "src/core/**"
  - "src/ui/**"
  - "src/assets/**"
---

# Editor

Canvas library (Konva, react-konva) must support per-character text styling or be extended to do so, plus touch input.

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

