// Builds the sticker sheet: stickers.pdf and stickers.png (A4, 35 stickers of 1.5 in, very faint corner cut ticks).
// For transparent A4 sticker paper: art only, no background. Print at 100% / "Actual size".
// Run from the repo root: node game/sticker-sheet/build.mjs
// Needs Playwright with Chromium (pre-installed in Claude cloud sessions; otherwise `npx playwright install chromium`).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ---- geometry (mm) ----
const PAGE_W = 210, PAGE_H = 297, CELL = 38.1; // 1.5 in
const COLS = 5, ROWS = 7; // 35 stickers, 7 of each design
const GX = (PAGE_W - COLS * CELL) / (COLS + 1), GY = (PAGE_H - ROWS * CELL) / (ROWS + 1);
const DESIGNS = ['mech-cannon', 'mech-tank', 'mech-launcher', 'jet', 'vw-hat'];

// very faint corner ticks at each sticker's square edge, as a cutting guide
const TICK = 3;
let cells = '', ticks = '';
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++) {
    const d = DESIGNS[(c + r) % DESIGNS.length]; // shifts each row so the designs mix
    const x = GX + c * (CELL + GX), y = GY + r * (CELL + GY);
    cells += `<img src="assets/${d}.png" style="left:${x}mm;top:${y}mm">`;
    for (const [cx, sx] of [[x, 1], [x + CELL, -1]])
      for (const [cy, sy] of [[y, 1], [y + CELL, -1]])
        ticks += `<path d="M${cx + sx * TICK} ${cy}H${cx}V${cy + sy * TICK}"/>`;
  }

const html = `<!doctype html><meta charset="utf-8"><style>
@page { size: ${PAGE_W}mm ${PAGE_H}mm; margin: 0 }
html, body { margin: 0; background: transparent }
.page { position: relative; width: ${PAGE_W}mm; height: ${PAGE_H}mm; overflow: hidden }
.ticks { position: absolute; inset: 0; width: 100%; height: 100% }
img { position: absolute; width: ${CELL}mm; height: ${CELL}mm; object-fit: contain }
</style><div class="page">${cells}<svg class="ticks" viewBox="0 0 ${PAGE_W} ${PAGE_H}"><g fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="0.1">${ticks}</g></svg></div>`;
const file = join(here, 'stickers.html');
writeFileSync(file, html);

const { chromium } = require('playwright');
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
await pg.goto(pathToFileURL(file).href);
await pg.waitForLoadState('networkidle');
await pg.pdf({ path: join(here, 'stickers.pdf'), width: `${PAGE_W}mm`, height: `${PAGE_H}mm`, preferCSSPageSize: true });
await pg.screenshot({ path: join(here, 'stickers.png'), fullPage: true });
await browser.close();
console.log(`stickers.pdf: ${COLS * ROWS} stickers, ${CELL} mm, gaps ${GX.toFixed(2)} x ${GY.toFixed(2)} mm`);
