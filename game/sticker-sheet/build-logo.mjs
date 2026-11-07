// Builds the red logo sticker sheet: logo-stickers.pdf and logo-stickers.png
// (A4 transparent sticker paper, Urban Warfare Edition logo in the game's red #aa0000,
// 86 mm wide, so almost a card's 88 mm height). Print at 100% / "Actual size".
// Run from the repo root: node game/sticker-sheet/build-logo.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ---- geometry (mm) ----
const PAGE_W = 210, PAGE_H = 297;
const W = 86, H = Math.round((W * 182) / 659 * 10) / 10; // logo art is 659 x 182 px
const COLS = 2, ROWS = Math.floor((PAGE_H - 8) / (H + 3)); // keep at least ~3 mm between rows
const GX = (PAGE_W - COLS * W) / (COLS + 1), GY = (PAGE_H - ROWS * H) / (ROWS + 1);
const TICK = 3; // very faint corner ticks, as on the art sticker sheet

let cells = '', ticks = '';
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++) {
    const x = GX + c * (W + GX), y = GY + r * (H + GY);
    cells += `<img src="assets/logo-urban-red.png" style="left:${x}mm;top:${y}mm">`;
    for (const [cx, sx] of [[x - 1, 1], [x + W + 1, -1]])
      for (const [cy, sy] of [[y - 1, 1], [y + H + 1, -1]])
        ticks += `<path d="M${cx + sx * TICK} ${cy}H${cx}V${cy + sy * TICK}"/>`;
  }

const html = `<!doctype html><meta charset="utf-8"><style>
@page { size: ${PAGE_W}mm ${PAGE_H}mm; margin: 0 }
html, body { margin: 0; background: transparent }
.page { position: relative; width: ${PAGE_W}mm; height: ${PAGE_H}mm; overflow: hidden }
.ticks { position: absolute; inset: 0; width: 100%; height: 100% }
img { position: absolute; width: ${W}mm; height: ${H}mm }
</style><div class="page">${cells}<svg class="ticks" viewBox="0 0 ${PAGE_W} ${PAGE_H}"><g fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="0.1">${ticks}</g></svg></div>`;
const file = join(here, 'logo-stickers.html');
writeFileSync(file, html);

const { chromium } = require('playwright');
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
await pg.goto(pathToFileURL(file).href);
await pg.waitForLoadState('networkidle');
await pg.pdf({ path: join(here, 'logo-stickers.pdf'), width: `${PAGE_W}mm`, height: `${PAGE_H}mm`, preferCSSPageSize: true });
await pg.screenshot({ path: join(here, 'logo-stickers.png'), fullPage: true });
await browser.close();
console.log(`logo-stickers.pdf: ${COLS * ROWS} logos, ${W} x ${H} mm, gaps ${GX.toFixed(2)} x ${GY.toFixed(2)} mm`);
