// Builds the tin box sleeve: sleeve.html and sleeve.pdf (A4, one flat strip with bleed, cut and fold marks).
// Run from the repo root: node game/box-sleeve/build.mjs
// Needs Playwright with Chromium (pre-installed in Claude cloud sessions; otherwise `npx playwright install chromium`).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const A = '../rulebook-print/assets';

// ---- geometry (mm) ----
// Tin: 88 x 60 x 18. The sleeve wraps front, side, back, side (open at both 60 mm ends).
const CLEAR = 0.5; // per fold, for 80-120 gsm paper
const FACE = 60 + 2 * CLEAR, SIDE = 18 + 2 * CLEAR, GLUE = 10, LEN = 88 + 1; // 61, 19, 10, 89
const PANELS = [
  ['side', SIDE], ['front', FACE], ['side', SIDE], ['back', FACE], ['glue', GLUE],
];
const TRIM_W = PANELS.reduce((s, p) => s + p[1], 0), TRIM_H = LEN; // 170 x 89
const BLEED = 3, PAGE_W = 210, PAGE_H = 297;
// two sleeves per page to save paper; GAP leaves room for both sets of marks between them
const COPIES = 2, GAP = 24;
const X0 = (PAGE_W - TRIM_W) / 2, YTOP = (PAGE_H - COPIES * TRIM_H - (COPIES - 1) * GAP) / 2;
const YS = Array.from({ length: COPIES }, (_, i) => YTOP + i * (TRIM_H + GAP));

let x = 0;
const panels = PANELS.map(([kind, w]) => { const p = { kind, x, w }; x += w; return p; });

const sideHtml = `<div class="spine"><span>BATTLELINE: MECH WARS</span><img src="${A}/logo-village-wizard.png"></div>`;
const content = {
  front: `<img class="flogo" src="${A}/logo-game.png"><img class="fvw" src="${A}/logo-village-wizard.png">`,
  side: sideHtml,
  back: `<img class="blogo" src="${A}/logo-game-red.png">
    <p class="blurb">Mechs clash in the streets. Place your cards, push enemy mechs off the grid, and be the first to get three Battleline Mechs in a straight line.</p>
    <img class="bmech" src="${A}/mech-pair.png">
    <div class="info"><b>2 PLAYERS</b> · 18 CARDS · 2 GAME MODES</div>
    <div class="vw"><img src="${A}/logo-village-wizard-red.png"><span>@village.wizard</span></div>`,
  glue: `<div class="gluelbl">GLUE</div>`,
};

// panel boxes: first and last get the outer bleed; glue flap is white
const box = (Y0) => (p, i) => {
  const l = i === 0 ? -BLEED : 0, r = i === panels.length - 1 ? BLEED : 0;
  return `<div class="p ${p.kind}" style="left:${X0 + p.x + l}mm;top:${Y0 - BLEED}mm;width:${p.w - l + r}mm;height:${TRIM_H + 2 * BLEED}mm">
    <div class="in" style="left:${-l}mm;top:${BLEED}mm;width:${p.w}mm;height:${TRIM_H}mm">${content[p.kind]}</div></div>`;
};

// marks: cut ticks at the 4 corners, fold ticks top and bottom at each inner edge
const line = (x1, y1, x2, y2, cls = '') => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const L = 6, G = BLEED + 1; // tick length, gap from trim
const marks = [];
for (const Y0 of YS) {
for (const cx of [X0, X0 + TRIM_W]) for (const cy of [Y0, Y0 + TRIM_H]) {
  const sy = cy === Y0 ? -1 : 1, sx = cx === X0 ? -1 : 1;
  marks.push(line(cx, cy + sy * G, cx, cy + sy * (G + L)), line(cx + sx * G, cy, cx + sx * (G + L), cy));
}
for (const p of panels.slice(1)) {
  const fx = X0 + p.x;
  marks.push(line(fx, Y0 - G, fx, Y0 - G - L, 'fold'), line(fx, Y0 + TRIM_H + G, fx, Y0 + TRIM_H + G + L, 'fold'));
}
}

const css = `
@font-face{font-family:Oswald;font-weight:700;src:url(${A}/fonts/oswald-latin-700-normal.woff2)}
@font-face{font-family:InterR;font-weight:400;src:url(${A}/fonts/inter-latin-400-normal.woff2)}
@font-face{font-family:InterR;font-weight:700;src:url(${A}/fonts/inter-latin-700-normal.woff2)}
@page{size:${PAGE_W}mm ${PAGE_H}mm;margin:0}
:root{--red:#aa0000}
html,body{margin:0;width:${PAGE_W}mm;height:${PAGE_H}mm;overflow:hidden;background:#fff;font-family:InterR}
.p{position:absolute;overflow:hidden}.in img{flex:none;height:auto}.in{position:absolute}
.front,.side{background:var(--red)}
.front .in,.back .in{display:flex;flex-direction:column;align-items:center}
.flogo{width:52mm;margin-top:36mm}
.fvw{width:14mm;margin-top:auto;margin-bottom:5mm}
.spine{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);display:flex;align-items:center;gap:6mm;white-space:nowrap}
.spine span{font-family:Oswald;font-weight:700;color:#fff;font-size:5.4mm;letter-spacing:.2mm}
.spine img{height:7mm}
.back .in{padding:6mm 5mm 4mm;box-sizing:border-box}
.blogo{width:46mm}
.blurb{font-size:2.6mm;line-height:1.4;text-align:center;margin:4mm 0 0;color:#111}
.bmech{width:48mm;height:26mm!important;object-fit:cover;margin:auto 0}
.info{font-family:Oswald;font-weight:700;color:var(--red);font-size:2.6mm;letter-spacing:.1mm;white-space:nowrap}
.vw{display:flex;flex-direction:column;align-items:center;margin-top:3mm;font-size:2.3mm;color:var(--red)}
.vw img{width:12mm;margin-bottom:.8mm}
.glue .in{border:.2mm dashed #999;box-sizing:border-box}
.gluelbl{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);font-family:Oswald;font-weight:700;color:#999;font-size:3mm;letter-spacing:.5mm}
svg{position:absolute;left:0;top:0}
line{stroke:#000;stroke-width:.2}line.fold{stroke-dasharray:1 .8}
.note{position:absolute;left:${X0}mm;top:${YS[COPIES - 1] + TRIM_H + 14}mm;width:${TRIM_W}mm;font-size:2.6mm;color:#444;line-height:1.5}
`;

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Battleline: Mech Wars — box sleeve</title><style>${css}</style></head><body>
${YS.map((y) => panels.map(box(y)).join('\n')).join('\n')}
<svg width="${PAGE_W}mm" height="${PAGE_H}mm" viewBox="0 0 ${PAGE_W} ${PAGE_H}">${marks.join('')}</svg>
<div class="note">Two box sleeves for the 88 × 60 × 18 mm tin. Print at 100% (actual size) on 80–120 gsm paper. Cut on the solid corner marks, fold on the dashed marks, glue the flap under the left side panel, then slide the tin in. Panels: side ${SIDE} · front ${FACE} · side ${SIDE} · back ${FACE} · glue ${GLUE} mm, height ${LEN} mm.</div>
</body></html>`;
const htmlPath = join(here, 'sleeve.html');
writeFileSync(htmlPath, html);

const { chromium } = require('playwright');
const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.goto(pathToFileURL(htmlPath).href);
await pg.evaluate(() => document.fonts.ready);
await pg.waitForLoadState('networkidle');
await pg.pdf({ path: join(here, 'sleeve.pdf'), width: `${PAGE_W}mm`, height: `${PAGE_H}mm`, printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('wrote', htmlPath);
