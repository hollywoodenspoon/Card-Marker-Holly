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
  ['sideL', SIDE], ['front', FACE], ['sideR', SIDE], ['back', FACE], ['glue', GLUE],
];
const TRIM_W = PANELS.reduce((s, p) => s + p[1], 0), TRIM_H = LEN; // 170 x 89
const BLEED = 3, PAGE_W = 210, PAGE_H = 297;
// two sleeves per page to save paper; GAP leaves room for both sets of marks between them
const COPIES = 2, GAP = 24;
const X0 = (PAGE_W - TRIM_W) / 2, YTOP = (PAGE_H - COPIES * TRIM_H - (COPIES - 1) * GAP) / 2;
const YS = Array.from({ length: COPIES }, (_, i) => YTOP + i * (TRIM_H + GAP));

let x = 0;
const panels = PANELS.map(([kind, w]) => { const p = { kind, x, w }; x += w; return p; });

const ICON_PLAYERS = `<svg viewBox="0 0 24 16" class="ic"><circle cx="7" cy="4" r="3.2"/><path d="M1 15c0-4 2.7-6 6-6s6 2 6 6z"/><circle cx="17" cy="4" r="3.2"/><path d="M11 15c0-4 2.7-6 6-6s6 2 6 6z"/></svg>`;
const ICON_CLOCK = `<svg viewBox="0 0 16 16" class="ic"><circle cx="8" cy="8" r="6.6" fill="none" stroke-width="1.6"/><path d="M8 4v4.4l3 1.8" fill="none" stroke-width="1.6" stroke-linecap="round"/></svg>`;
// as in the owner's Cover2: rotated white logo, small Village Wizard logo at the bottom
const spine = (deg) => `<img class="slogo" style="transform:translate(-50%,-50%) rotate(${deg}deg)" src="${A}/logo-game.png"><img class="svw" src="${A}/logo-village-wizard.png">`;
const CARDS = ['logistics', 'advanced', 'fighter-bomber', 'battleline'];
const content = {
  front: `<img class="flogo" src="${A}/logo-game.png">`,
  sideL: spine(90),
  sideR: spine(-90),
  back: `<img class="blogo" src="${A}/logo-game-red.png">
    <p class="blurb">BATTLELINE: MECH WARS is a 2 player card game where the players are pitted against each other by building a battleline of mechs using cards available to them, using their wits to overpower their opponent with firepower to reign supreme on the battlefield.</p>
    <p class="blurb uw"><b>Urban Warfare Edition</b> adds a new game mode: Urban Warfare.</p>
    <div class="mid"><div class="contents"><b>Contents:</b><br>1x Rule Book<br>4x Advanced Mech Cards<br>6x Battleline Mech Cards<br>4x Fighter Bomber Cards<br>4x Logistics Mech Cards</div>
      <div class="fan">${CARDS.map((c) => `<img src="${A}/card-${c}.png">`).join('')}</div></div>
    <div class="info"><span>${ICON_PLAYERS} 2</span><span>${ICON_CLOCK} 15 mins</span></div>
    <div class="logos"><img class="kal" src="assets/logo-kalaro.png"><div class="vw"><img src="${A}/logo-village-wizard-red.png"><span>@village.wizard</span></div></div>`,
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
.front,.sideL,.sideR{background:var(--red)}
.front .in,.back .in{display:flex;flex-direction:column;align-items:center}
.flogo{width:50mm;margin-top:auto;margin-bottom:14mm}
.slogo{position:absolute;left:50%;top:40%;width:56mm}
.svw{position:absolute;left:50%;bottom:4mm;width:9mm;transform:translateX(-50%)}
.back .in{padding:6mm 5mm 4mm;box-sizing:border-box}
.blogo{width:40mm}
.blurb{font-size:2.05mm;line-height:1.35;text-align:justify;margin:2.6mm 0 0;color:#111}
.blurb.uw{margin-top:1.2mm;text-align:left;color:var(--red)}
.mid{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:auto}
.contents{font-size:2.05mm;line-height:1.4;color:#111}
.fan{position:relative;width:20mm;height:16mm}
.fan img{position:absolute;width:8.4mm;bottom:0;left:6mm;transform-origin:50% 120%;box-shadow:0 .2mm .5mm rgba(0,0,0,.35)}
.fan img:nth-child(1){transform:rotate(-27deg)}.fan img:nth-child(2){transform:rotate(-9deg)}.fan img:nth-child(3){transform:rotate(9deg)}.fan img:nth-child(4){transform:rotate(27deg)}
.info{display:flex;gap:5mm;width:100%;font-family:Oswald;font-weight:700;color:var(--red);font-size:2.8mm;margin-top:auto}
.info span{display:flex;align-items:center;gap:1.2mm}
.ic{height:3mm;fill:var(--red);stroke:var(--red)}
.logos{display:flex;align-items:flex-end;justify-content:space-between;width:100%;margin-top:auto}
.kal{width:11mm}
.vw{display:flex;flex-direction:column;align-items:center;font-size:2.1mm;color:var(--red)}
.vw img{width:12mm;margin-bottom:.6mm}
.glue .in{border:.2mm dashed #999;box-sizing:border-box}
.gluelbl{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);font-family:Oswald;font-weight:700;color:#999;font-size:3mm;letter-spacing:.5mm}
svg.marks{position:absolute;left:0;top:0}
line{stroke:#000;stroke-width:.2}line.fold{stroke-dasharray:1 .8}
.note{position:absolute;left:${X0}mm;top:${YS[COPIES - 1] + TRIM_H + 14}mm;width:${TRIM_W}mm;font-size:2.6mm;color:#444;line-height:1.5}
`;

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Battleline: Mech Wars — box sleeve</title><style>${css}</style></head><body>
${YS.map((y) => panels.map(box(y)).join('\n')).join('\n')}
<svg class="marks" width="${PAGE_W}mm" height="${PAGE_H}mm" viewBox="0 0 ${PAGE_W} ${PAGE_H}">${marks.join('')}</svg>
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
