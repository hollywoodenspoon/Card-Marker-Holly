# Print rulebook

- `rulebook-accordion.pdf`: A4, 2 pages (front, back). One rulebook for both modes, printed as two strips that you tape together: cut both strips, then tape the bottom end of the left strip (front panel 5) to the top end of the right strip, on both sides. Each strip is 270 × 82 mm and folds zig-zag into 5 panels of 54 × 82 mm, to fit the tin with the cards.
- Print at 100% / Actual size, double-sided, flip on long edge. Cut on the corner marks (3 mm bleed), fold on the dotted marks. The cross in the middle should line up front to back.
- `rulebook-accordion.html`: the page the PDF is made from. `build.mjs` builds both (`node game/rulebook-print/build.mjs`, needs Playwright). Text comes from `game/battlelines/rulebook.md`, `game/urban-warfare/rulebook.md` and the intro in `game/rulebook.md`; keep them in step.
- `assets/`: card faces, card back, logos, line-art mechs, comic panels from the Battleline Requiem prologue (`comic-*.png`), fonts (Oswald, Inter).
