---
paths:
  - "src/print/**"
---

# Print

- RGB or CMYK PDF export, no other colour modes. RGB for home printers; CMYK through an ICC printer profile (FOGRA39 built in, or the print shop's own) for print shops. CMYK added in v0.3.0.
- Keep the export module separate from the editor core.
- A4 only (210 x 297 mm); keep paper size as a setting in code so other sizes can be added later.
- For print features, generate a PDF and check sizes and positions.

## Printing

- A4 sheet. Printer margin is a setting, default 5 mm.
- Cell size = card size + 2 x bleed. The grid (columns and rows) is calculated automatically from cell size, margins, and orientation. Choose the orientation that fits the most cards, but let the user override.
- Show the number of cards per sheet in the UI.
- **Cut marks sit outside the bleed area** (small gap from the bleed edge) so they never print on the card. Option for full guide lines across the sheet as well. The user cuts by hand, so the marks and lines must be clear and accurate.
- Print preview shows the fronts sheet and the matching backs sheet.
- **Backs sheet is mirrored** so each back lines up behind its front when printed double-sided. Provide a setting for flip on the long edge or the short edge, and a one-page alignment test sheet.
- Export to RGB or CMYK PDF. Output must be exact mm sizes (check at 100% scale). Fonts embedded or converted so the PDF looks identical to the preview.
- Write unit tests for the sheet layout math (grid fit, mirrored back positions, mark positions).

