// Builds the accordion rulebook: rulebook-accordion.html and rulebook-accordion.pdf.
// Run from the repo root: node game/rulebook-print/build.mjs
// Needs Playwright with Chromium (pre-installed in Claude cloud sessions; otherwise `npx playwright install chromium`).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ---- geometry (mm) ----
const PANEL_W = 54, PANEL_H = 82, PANELS = 5;
const TRIM_W = PANEL_W * PANELS; // 270
const BLEED = 3, MARK = 7; // marks sit in the 7 mm outside the bleed
const OFF = BLEED + MARK; // trim offset inside the strip box
const TRIM_H = PANEL_H * 2; // 164: two rows, folded in half along the middle
const BOX_W = TRIM_W + 2 * OFF, BOX_H = TRIM_H + 2 * OFF; // 290 x 184
const PAGE_W = 210, PAGE_H = 297; // A4 portrait; strips run down the page
const BOX_X = (PAGE_W - BOX_H) / 2, BOX_Y = (PAGE_H - BOX_W) / 2;

const card = (name, { flip = false, down = false, w = 9 } = {}) =>
  `<img class="mini${flip ? ' flip' : ''}" style="width:${w}mm" src="assets/${down ? 'card-back' : 'card-' + name}.png" alt="">`;

// ---- panel content ----
// Written as two strips (one per mode); dealt onto the map-fold sheet below.
const IG = `<svg viewBox="0 0 24 24" width="3.2mm" height="3.2mm" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>`;
const backCover = (mode, social = false) => ({ cls: 'cover', html: `<div class="redbg"></div><div class="bc"><img src="assets/logo-game.png" alt=""><div class="bcmode">${mode}</div><img class="vw" src="assets/logo-village-wizard.png" alt="">${social ? `<div class="ig">${IG}<span>@village.wizard</span></div>` : ''}</div>` });
const P = (bg, mode, html) => ({ bg, mode, html });
const field = (cells) => `<div class="field">${cells.map((c, i) => `<div class="cell${i === 4 ? ' center' : ''}"><span class="zn">${i + 1}</span>${c ? card(c[0], { flip: c[1] === 2, w: 7.4 }) : ''}</div>`).join('')}</div>`;

const BL = 'Battlelines', UW = 'Urban Warfare';
const strips = [
  {
    front: [
      { cls: 'cover', html: `<img class="coverimg" src="assets/card-back.png" alt="">` },
      P('mech-pair', '', `
<h1>Battleline:<br>Mech Wars</h1><div class="kicker">Urban Warfare Edition</div>
<p>This is an era of civil war for the Republic of Ria, Warlord-Generals reign supreme fighting for territory and resources of the once great nation. From the fields of Rianth, shadowed by the worldblood spires to the ancient city of Rianz, Battleline Mechs march, bombs fall, and the nation bleeds.</p>
<p class="em">Become a Warlord-General in this time of strife, control the battlefield and reign supreme.</p>
<p>Battleline: Mech Wars is a 2 player card game with 2 distinct game modes. Battlelines and Urban Warfare.</p>`),
      P('mech-logistics', '', `
<h2>Two ways to fight</h2>
<p>In <b>Battlelines</b> you are commanding your army to form a battleline to match or exceed your opponent to push them back and eventually rout them.</p>
<p>In <b>Urban Warfare</b> you are commanding a company trying to take the center of the city district you are assigned to capture. Move your forces in the city but be careful, enemies could be anywhere and push you out before you know it.</p>`),
      P('comic-formation', BL, `
<h1 class="u">Battlelines</h1>
<div class="box"><h2>Objective</h2>
<p>Win 3 rounds to win the game.</p>
<p>To win a round, a player must have a total Firepower that the opponent cannot match or exceed on their turn.</p>
<p class="or">Or</p>
<p>A player has 3 copies of the Battleline Mech on their battleline at the end of their opponent's turn.</p></div>`),
      P('mech-battleline', BL, `
<h2>Card types</h2><p>There are 4 card types:</p>
<div class="ct">${card('fighter-bomber', { w: 8 })}<p><b>Fighter Bomber</b> – When this card is placed on a battleline, the latest card on the opponent's battleline is turned face down. A face-down card generates 0 Firepower, has no type and has no effects. (Firepower added by a Logistics Mech still applies to it.)</p></div>
<div class="ct">${card('logistics', { w: 8 })}<p><b>Logistics Mech</b> – Generates 1 Firepower. When a card is placed after this card on the battleline, this card gives that card 2 additional Firepower.</p></div>`),
    ],
    back: [
      P('mech-advanced', BL, `
<div class="ct">${card('battleline', { w: 8 })}<p><b>Battleline Mech</b> – Generates 2 Firepower. When a player has 3 of this card on their battleline at the end of their opponent's turn, that player wins the round.</p></div>
<div class="ct">${card('advanced', { w: 8 })}<p><b>Advanced Mech</b> – Generates 3 Firepower.</p></div>
<h2>Parts of a card</h2>
<div class="parts">${card('battleline', { w: 17 })}<ul><li><i>←</i> Firepower</li><li><i>←</i> Card Illustration</li><li><i>←</i> Card Effect Symbol</li></ul></div>`),
      P('mech-pair', BL, `
<h2>Battleline layout</h2>
<div class="bl">
  <div class="lab">Player 2 Battleline</div>
  <div class="row">${card('logistics', { flip: true, w: 8.4 })}${card('battleline', { flip: true, w: 8.4 })}${card('x', { flip: true, down: true, w: 8.4 })}</div>
  <div class="deck">${card('x', { down: true, w: 8.4 })}<span>Deck</span></div>
  <div class="row">${card('advanced', { w: 8.4 })}${card('fighter-bomber', { w: 8.4 })}${card('battleline', { w: 8.4 })}</div>
  <div class="lab">Player 1 Battleline</div>
</div>
<p class="cap">Player 2 sits across the table, so their cards face them (upside down to you). Player 2's last card was turned face down by a Fighter Bomber.</p>`),
      P('mech-logistics', BL, `
<h2>Gameplay</h2><ol>
<li>Shuffle all the cards together to form a deck.</li>
<li>Each player draws 3 cards from the deck.</li>
<li>Then both players draw another card from the deck and place it on their Battleline.</li>
<li>The player with the lower Firepower goes first. If the Firepower is the same, the players decide randomly who goes first.</li>
<li>A Fighter Bomber that is the first card on a battleline is treated as having a Firepower value of 1.</li>
</ol>`),
      P('mech-advanced', BL, `
<h2>Gameplay <span class="cont">continued</span></h2><ol start="6">
<li>Players take turns playing one card at a time, attempting to match or exceed the opponent's total Firepower.</li>
<li>Players must always play a card during their turn, even if they cannot match or exceed the opponent's total Firepower, and must draw a card from the deck after playing. If the deck is empty, no card is drawn.</li>
<li>This process repeats until one player cannot match or exceed their opponent's Firepower, or a player has 3 copies of the Battleline Mech at the end of their opponent's turn. The player who won gains a point. This also ends the round.</li>
</ol>`),
      P('mech-battleline', BL, `
<h2>Next round</h2><ol start="9">
<li>For the next round, the last 2 cards on both players' Battlelines remain on the field, keeping their face-up or face-down state, and determine who goes first (lower Firepower goes first; gameplay rule 5 applies). All other cards are reshuffled to form a new deck.</li>
</ol>
<div class="box"><p class="or">Remember</p><p>Win 3 rounds to win the game.</p></div>`),
    ],
  },
  {
    front: [
      backCover(UW),
      P('comic-city', UW, `
<h1 class="u">Urban Warfare</h1>
<h2>What you need</h2><p>18 cards. Each player gets the same 9:</p>
<table><tr><th>Card</th><th>#</th><th>FP</th></tr>
<tr><td>Battleline Mech</td><td>3</td><td>2</td></tr><tr><td colspan="3" class="what">Get three of these in a straight line to win.</td></tr>
<tr><td>Advanced Mech</td><td>2</td><td>3</td></tr><tr><td colspan="3" class="what">Your strongest pusher.</td></tr>
<tr><td>Logistics Mech</td><td>2</td><td>1</td></tr><tr><td colspan="3" class="what">Gives +2 firepower to each of your adjacent cards.</td></tr>
<tr><td>Fighter-Bomber</td><td>2</td><td>—</td></tr><tr><td colspan="3" class="what">Never goes on the field. Play it to destroy one enemy card.</td></tr></table>
<p><b>Firepower</b> (FP) is how hard a card pushes and how hard it is to push.</p>`),
      P('mech-pair', UW, `
<h2>The field</h2>
<p>The field is 9 squares, 3 by 3. The middle square is the <b>center</b>. Two squares are <b>adjacent</b> if they touch on a side. Diagonals are not adjacent.</p>
<div class="sample"><div class="lab">Player 2</div>
${field([['battleline', 2], null, ['logistics', 2], null, ['advanced', 1], ['battleline', 2], ['battleline', 1], ['logistics', 1], null])}
<div class="lab">Player 1</div><div class="cap">Mid-game. Player 2's cards face them (upside down to you).</div></div>`),
      P('mech-battleline', UW, `
<h2>Starting</h2><ol>
<li>Give each player their 9 cards. Keep your hand hidden.</li>
<li>Pick who goes first at random.</li>
<li>The first player places 1 card.</li>
<li>The second player places 2 cards.</li></ol>
<p>On these first turns you must place; you can't move, bomb or pass.</p>
<h2>Turn order</h2><p>After the first turns, players take turns one after the other: first player, second player, first player, and so on, until someone wins.</p>`),
      P('comic-bomber', UW, `
<h2>On your turn</h2><p>Do <b>one</b> of these:</p><ul class="dash">
<li><b>Place</b> a card from your hand on any outside square (not the center).</li>
<li><b>Move</b> one of your cards on the field one square up, down, left or right. You may move it off the field.</li>
<li><b>Bomb:</b> play a Fighter-Bomber and destroy any enemy card on the field.</li>
<li><b>Pass.</b></li></ul>`),
    ],
    back: [
      P('comic-spires', UW, `
<h2>Pushing</h2><p>If you place or move a card onto a square that already has a card, you <b>push</b> it one square along.</p><ul class="dash">
<li>A card placed on a side square pushes toward the center. On a corner, you pick which way.</li>
<li>You can always push your own cards.</li>
<li>To push an enemy card, your card needs <b>at least as much firepower</b> as it.</li>
<li>A push can shove a whole row. Each card has to be able to push the one in front of it, or the push isn't allowed.</li>
<li>Anything pushed off the edge is removed from the game, even your own cards.</li></ul>`),
      P('mech-logistics', UW, `
<h2>Pushing <span class="cont">continued</span></h2>
<p>Logistics bonus while pushing: it only counts if the Logistics Mech is already adjacent to your card before it moves. A card being placed from your hand has no bonus yet.</p>
<p class="ex"><i>Example:</i> your Advanced Mech (3) wants to push an enemy Logistics Mech (1), but your other Advanced Mech (3) is behind it. The Logistics Mech can't push a 3, so you can't make that push.</p>
<h2>Removed cards</h2><p>A card is <b>removed from the game</b> when it is pushed or moved off the field, destroyed by a Fighter-Bomber, or is a Fighter-Bomber that has been played. Put removed cards on the shared <b>discard pile</b>. They don't come back and score nothing.</p>`),
      P('mech-battleline', UW, `
<div class="box"><h2>How to win</h2><p>There are three ways.</p>
<p><b>1. Battleline Victory.</b> Get three of your Battleline Mechs in a straight row or column. You win straight away.<br>(If your opponent accidentally pushes your mechs into a line, you win at the end of their turn.)</p>
<p><b>2. Objective Victory.</b> Put one of your cards in the center and keep a card of yours there through your opponent's next 3 turns. You win when your next turn begins.<br>If they take the center, or it ends up empty, start counting again.</p></div>`),
      P('mech-pair', UW, `
<div class="box"><h2>How to win <span class="cont">continued</span></h2>
<p><b>3. Attrition Victory.</b> When both players have no cards left in hand, the game ends and you score:</p><ul class="dash">
<li>Add up the firepower of your cards on the field (with Logistics bonuses).</li>
<li>Your card in the center counts double.</li>
<li>Highest score wins. If it's a tie, whoever has the center wins. If nobody does, it's a draw.</li></ul>
<p>If you run out of cards before your opponent, keep playing: move or pass until their hand is empty too.</p></div>`),
    ],
  },
];
strips[1].back.push(backCover('', true));

// Map fold: one 270 x 164 mm sheet, folded in half along the long middle
// (printed front outside), then zig-zag into 54 x 82 mm panels.
// Outside (front of sheet): top row T1..T5 reads first (T1 = cover); turn the
// folded book over and the bottom row reads B5..B1 (B1 = back cover). The bottom
// row is printed upside down so it is upright after the fold.
// Inside (back of sheet): unfold fully, read the top row then the bottom row.
// On the back, panel i of a row sits behind front panel 4-i of the same row.
const sheet = {};
{
  const c = [strips[0].front, strips[0].back, strips[1].front, strips[1].back].flat();
  const cover = c[0], back = c[19], body = c.slice(1, 19); // 18: 9 Battlelines, divider, 8 Urban Warfare
  const outside = body.slice(0, 8), inside = body.slice(8);
  sheet.front = [[cover, ...outside.slice(0, 4)], [back, ...outside.slice(4).reverse()]];
  sheet.back = [inside.slice(0, 5), inside.slice(5)];
  const order = [...sheet.front[0], ...[...sheet.front[1]].reverse(), ...sheet.back.flat()];
  let n = 0;
  for (const p of order) if (p.cls !== 'cover') p.no = ++n;
}

// ---- marks ----
function marks() {
  const s = [];
  const L = (x1, y1, x2, y2, cls = 'cut') => s.push(`<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
  const x0 = OFF, x1 = OFF + TRIM_W, y0 = OFF, y1 = OFF + TRIM_H, ym = OFF + PANEL_H;
  for (const x of [x0, x1]) { L(x, 0, x, MARK - 1); L(x, BOX_H - MARK + 1, x, BOX_H); }
  for (const y of [y0, y1]) { L(0, y, MARK - 1, y); L(BOX_W - MARK + 1, y, BOX_W, y); }
  for (let k = 1; k < PANELS; k++) { const x = x0 + k * PANEL_W; L(x, 0.5, x, MARK - 1, 'fold'); L(x, BOX_H - MARK + 1, x, BOX_H - 0.5, 'fold'); }
  L(0.5, ym, MARK - 1, ym, 'fold'); L(BOX_W - MARK + 1, ym, BOX_W - 0.5, ym, 'fold');
  return `<svg class="marks" viewBox="0 0 ${BOX_W} ${BOX_H}" width="${BOX_W}mm" height="${BOX_H}mm">${s.join('')}</svg>`;
}

// Bleed only on the sheet's outer edges: clip each panel's 3 mm overspill.
function clip(row, col, rot) {
  let t = row === 0, b = row === 1, l = col === 0, r = col === PANELS - 1;
  if (rot) [t, b, l, r] = [b, t, r, l];
  const e = (on) => (on ? `-${BLEED}mm` : '0');
  return `clip-path:inset(${e(t)} ${e(r)} ${e(b)} ${e(l)})`;
}

function panel(p, row, col, rot) {
  const st = `style="${clip(row, col, rot)}"`, cls = `panel${rot ? ' rot' : ''}`;
  if (p.cls === 'cover') return `<section class="${cls} cover" ${st}>${p.html}</section>`;
  return `<section class="${cls}" ${st}>${p.bg ? `<img class="bgart${p.bg.startsWith('comic') ? ' comic' : ''}" src="assets/${p.bg}.png" alt="">` : ''}
${p.mode ? `<div class="mode">${p.mode}</div>` : ''}<div class="body">${p.html}</div><div class="no">${p.no}</div></section>`;
}

function page(isBack) {
  const rows = isBack ? sheet.back : sheet.front;
  const grid = rows.map((row, r) => `<div class="row">${row.map((p, c) => panel(p, r, c, !isBack && r === 1)).join('')}</div>`).join('');
  const style = isBack
    ? `left:${BOX_X}mm;top:${BOX_Y + BOX_W}mm;transform:rotate(-90deg)`
    : `left:${BOX_X + BOX_H}mm;top:${BOX_Y}mm;transform:rotate(90deg)`;
  const regX = isBack ? PAGE_W - 6 : 6;
  const note = isBack
    ? 'INSIDE'
    : 'OUTSIDE · cut on corner marks · fold in half (print outside), then zig-zag';
  return `<div class="page"><div class="strip" style="${style}"><div class="trim">${grid}</div>${marks()}</div>
<div class="reg" style="left:${regX - 3}mm"><svg viewBox="0 0 6 6" width="6mm" height="6mm"><circle cx="3" cy="3" r="1.6"/><line x1="0" y1="3" x2="6" y2="3"/><line x1="3" y1="0" x2="3" y2="6"/></svg></div>
<div class="note" style="left:${isBack ? 5 : PAGE_W - 7}mm">${note} · A4 100% · flip on long edge</div></div>`;
}

const css = `
@font-face{font-family:Oswald;font-weight:500;src:url(assets/fonts/oswald-latin-500-normal.woff2)}
@font-face{font-family:Oswald;font-weight:700;src:url(assets/fonts/oswald-latin-700-normal.woff2)}
@font-face{font-family:InterR;font-weight:400;src:url(assets/fonts/inter-latin-400-normal.woff2)}
@font-face{font-family:InterR;font-weight:400;font-style:italic;src:url(assets/fonts/inter-latin-400-italic.woff2)}
@font-face{font-family:InterR;font-weight:600;src:url(assets/fonts/inter-latin-600-normal.woff2)}
@font-face{font-family:InterR;font-weight:700;src:url(assets/fonts/inter-latin-700-normal.woff2)}
@page{size:${PAGE_W}mm ${PAGE_H}mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
:root{--red:#a80000;--ink:#1a1a1a}
html,body{background:#fff}
body{font-family:InterR,sans-serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:${PAGE_W}mm;height:${PAGE_H}mm;overflow:hidden;page-break-after:always}
.strip{position:absolute;width:${BOX_W}mm;height:${BOX_H}mm;transform-origin:0 0}
.marks{position:absolute;left:0;top:0;overflow:visible}
.marks line{stroke:#000;stroke-width:.2}
.marks line.fold{stroke-dasharray:.6 .8;stroke-width:.25}
.trim{position:absolute;left:${OFF}mm;top:${OFF}mm;width:${TRIM_W}mm;height:${TRIM_H}mm}
.row{display:flex}
.panel.rot{transform:rotate(180deg)}
.panel{position:relative;width:${PANEL_W}mm;height:${PANEL_H}mm;flex:none;background:#fff}
.panel .body{position:absolute;inset:4.2mm 3.8mm 5.4mm 3.8mm;overflow:hidden}
.panel::before{content:"";position:absolute;inset:-${BLEED}mm;background:#fff;z-index:-1}
.bgart{position:absolute;width:62mm;right:-12mm;bottom:-4mm;opacity:.09;filter:grayscale(1);pointer-events:none}
.bgart.comic{left:0;top:0;right:auto;bottom:auto;width:100%;height:100%;object-fit:cover;opacity:.08;-webkit-mask-image:linear-gradient(to bottom,transparent 15%,#000 55%,#000 85%,transparent);mask-image:linear-gradient(to bottom,transparent 15%,#000 55%,#000 85%,transparent)}
.cover{overflow:visible}
.cover .coverimg{position:absolute;left:-${BLEED}mm;top:-${BLEED}mm;width:${PANEL_W + 2 * BLEED}mm;height:${PANEL_H + 2 * BLEED}mm;object-fit:cover}
.no{position:absolute;right:3.8mm;bottom:2.2mm;font:700 9pt/1 Oswald;color:var(--red)}
.mode{position:absolute;left:3.8mm;bottom:2.5mm;font:500 5.5pt/1 Oswald;letter-spacing:.12em;text-transform:uppercase;color:#888}
.mode::before{content:"";display:inline-block;width:4mm;height:.35mm;background:var(--red);vertical-align:middle;margin-right:1.2mm}
.panel::after{content:"";position:absolute;left:3.8mm;top:2.6mm;width:8mm;height:.6mm;background:var(--red)}
.cover::after{display:none}
p,li,td,th{font-size:6.6pt;line-height:1.33}
p{margin:0 0 1.1mm}
h1{font:700 15pt/0.95 Oswald;text-transform:uppercase;color:var(--ink);margin-top:.4mm}
h1.u{font-size:14pt;color:var(--red)}
.kicker{font:500 6pt/1 Oswald;letter-spacing:.16em;text-transform:uppercase;color:var(--red);margin:1mm 0 2.2mm}
h2{font:700 8pt/1 Oswald;letter-spacing:.06em;text-transform:uppercase;color:var(--red);margin:1.6mm 0 1mm}
h2:first-child{margin-top:0}
.em{font-style:italic}
b{font-weight:700}
.box{border:.35mm solid var(--red);padding:1.6mm 1.8mm .6mm;margin:0 0 1.4mm;background:rgba(255,255,255,.85)}
.or{font:500 6pt/1 Oswald;text-transform:uppercase;letter-spacing:.1em;color:var(--red)}
ol{padding-left:3.4mm}ol li{margin-bottom:.55mm}ol li::marker{font-weight:700;color:var(--red)}
ul.dash{list-style:none;margin:0 0 1.1mm}ul.dash li{padding-left:2.4mm;position:relative;margin-bottom:.4mm}
ul.dash li::before{content:"";position:absolute;left:0;top:1.05mm;width:1.2mm;height:.35mm;background:var(--red)}
.mini{display:block;border-radius:1mm;box-shadow:0 0 0 .15mm #999}
.mini.flip{transform:rotate(180deg)}
.ct{display:flex;gap:1.8mm;align-items:flex-start;margin-bottom:.6mm}.ct .mini{flex:none;margin-top:.4mm}
.parts{display:flex;gap:2.2mm;align-items:center;margin-bottom:.6mm}.parts ul{list-style:none;display:flex;flex-direction:column;justify-content:space-between;height:19mm;font-weight:600}
.parts li{font:500 6.3pt/1 Oswald;text-transform:uppercase;letter-spacing:.06em}.parts i{font-style:normal;color:var(--red);margin-right:1mm}
.bl{display:grid;grid-template-columns:9mm auto;column-gap:2mm;justify-content:center;align-items:center}
.bl .lab{grid-column:2;font:500 5.3pt/1 Oswald;text-transform:uppercase;letter-spacing:.1em;color:#666;text-align:center;margin:.6mm 0}
.bl .row{grid-column:2;display:flex;gap:1mm}
.bl .deck{grid-column:1;grid-row:2 / 5;display:flex;flex-direction:column;align-items:center;gap:.6mm;font:500 5.3pt/1 Oswald;text-transform:uppercase;color:#666}
.bl .row:nth-of-type(2){grid-row:2}
table{border-collapse:collapse;width:100%;margin:0 0 1.2mm}
th{font:500 5.6pt/1.1 Oswald;text-transform:uppercase;letter-spacing:.05em;color:var(--red);text-align:left;border-bottom:.3mm solid var(--red);padding:0 .8mm .5mm 0}
td{padding:.55mm .8mm .55mm 0;border-bottom:.15mm solid #ccc;vertical-align:top;font-size:5.9pt}
td:first-child{font-weight:600;white-space:nowrap}tr:has(+tr td.what) td{border-bottom:none;padding-bottom:.2mm}td:nth-child(2),td:nth-child(3){text-align:center}
.sample{display:flex;flex-direction:column;align-items:center}
.sample .lab{font:500 5.3pt/1 Oswald;text-transform:uppercase;letter-spacing:.1em;color:#666;margin:.4mm 0}
.field{display:grid;grid-template-columns:repeat(3,10.6mm);grid-auto-rows:13.4mm;gap:.6mm;padding:.8mm;border:.25mm solid #999;border-radius:1mm}
.cell{position:relative;border:.15mm dashed #bbb;border-radius:.8mm;display:flex;align-items:center;justify-content:center}
.cell.center{border:.35mm solid var(--red);background:rgba(168,0,0,.05)}
.zn{position:absolute;left:.5mm;top:.3mm;font:500 4.6pt/1 Oswald;color:#888}
.cell.center .zn{color:var(--red)}
.cap{font-size:6pt;line-height:1.3;font-style:italic;color:#444;text-align:center;margin-top:.4mm}
.ex{border-left:.5mm solid var(--red);padding-left:1.6mm}
.reg{position:absolute;top:${PAGE_H / 2 - 3}mm}
.reg svg{overflow:visible}.reg circle,.reg line{fill:none;stroke:#000;stroke-width:.2}
.redbg{position:absolute;inset:-3mm;background:#a80000}
.bc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4mm}
.bc img{width:38mm}.bc img.vw{width:22mm;margin-top:14mm}
.bcmode{font:500 6.5pt/1 Oswald;letter-spacing:.2em;text-transform:uppercase;color:#fff}
.covertag{position:absolute;left:0;right:0;bottom:4.5mm;text-align:center;font:500 5.4pt/1 Oswald;letter-spacing:.18em;text-transform:uppercase;color:#fff}
.small{font-size:6pt;color:#555}.cont{font-weight:500;color:#999;font-size:6pt;letter-spacing:.1em}
td.what{font-weight:400;white-space:normal;text-align:left!important;color:#333;padding-top:0}
.ig{display:flex;align-items:center;justify-content:center;gap:1.2mm;margin-top:2mm;color:#fff;font:600 7pt/1 InterR}
.note{position:absolute;top:${BOX_Y + 4}mm;width:4mm;writing-mode:vertical-rl;font:400 5pt/1 InterR;color:#777;white-space:nowrap}
`;

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Battleline: Mech Wars — accordion rulebook</title><style>${css}</style></head><body>
${page(false)}
${page(true)}
</body></html>`;

const htmlPath = join(here, 'rulebook-accordion.html');
writeFileSync(htmlPath, html);

const { chromium } = require('playwright');
const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.goto(pathToFileURL(htmlPath).href);
await pg.evaluate(() => document.fonts.ready);
await pg.waitForLoadState('networkidle');
const over = await pg.$$eval('.body', (els) => els.map((e, i) => ({ i, over: Math.round(e.scrollHeight - e.clientHeight) })).filter((x) => x.over > 0));
if (over.length) console.warn('OVERFLOW (px):', JSON.stringify(over));
await pg.pdf({ path: join(here, 'rulebook-accordion.pdf'), width: `${PAGE_W}mm`, height: `${PAGE_H}mm`, printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('wrote', htmlPath);
