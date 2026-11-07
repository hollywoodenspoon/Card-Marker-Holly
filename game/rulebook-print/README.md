# Print rulebook

- `rulebook-accordion.pdf`: A4, 2 pages (outside, inside). One rulebook for both modes on one map-fold sheet of 270 × 164 mm: 2 rows of 5 panels, each 54 × 82 mm, to fit the tin with the cards. The back cover (last inside panel) carries the Instagram handle.
- Print at 100% / Actual size, double-sided, flip on long edge. Cut on the corner marks (3 mm bleed). Fold in half along the long middle line with the print outside, then zig-zag on the dotted marks with the cover on top. The cross in the side margin should line up front to back.
- `rulebook-online.pdf`: for downloading online. The same panels, one per page (54 × 82 mm), in reading order, with no marks or bleed. Built by the same `build.mjs`.
- `rulebook-accordion.html`: the page the PDF is made from. `build.mjs` builds both (`node game/rulebook-print/build.mjs`, needs Playwright). Text comes from `game/battlelines/rulebook.md`, `game/urban-warfare/rulebook.md` and the intro in `game/rulebook.md`; keep them in step.
- `assets/`: card faces, card back, logos, line-art mechs, comic panels from the Battleline Requiem prologue (`comic-*.png`), fonts (Oswald, Inter).
