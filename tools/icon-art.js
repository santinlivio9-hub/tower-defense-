// Dessins des icônes de l'appli (512 x 512), à partir des vrais sprites du jeu. Utilisé par tools/make-icons.mjs
// (dans le navigateur, via Playwright). Style Chibi Arsenal : contours épais, fond en dégradé, aucun texte.
import { enemySvg, towerSvg } from '../js/sprites.js';
import { drawCastle, castleBounds, setTierCap } from '../js/castle.js';

const INK = '#3d2c4e', TAU = Math.PI * 2;
const load = (svg) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });

function sky(c, top, mid, bot, glow) {
  const g = c.createLinearGradient(0, 0, 160, 512); g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(0, 0, 512, 512);
  const r = c.createRadialGradient(256, 230, 10, 256, 230, 330); r.addColorStop(0, glow); r.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = r; c.fillRect(0, 0, 512, 512);
}
function rays(c, x, y, n, color, a0 = 0) {
  c.save(); c.translate(x, y); c.fillStyle = color;
  for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 520, Math.sin(a) * 520); c.lineTo(Math.cos(a + TAU / n / 2) * 520, Math.sin(a + TAU / n / 2) * 520); c.closePath(); c.fill(); }
  c.restore();
}
function sparkle(c, x, y, r, color = '#fff') {
  c.save(); c.translate(x, y); c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, q = i % 2 ? r * 0.3 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  c.closePath(); c.fillStyle = color; c.lineWidth = Math.max(3, r * 0.22); c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); c.fill(); c.restore();
}
function shadow(c, x, y, rx, ry, a = 0.4) { c.fillStyle = `rgba(20,10,45,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
// socle rond doré de la tourelle
function plinth(c, x, y, r) {
  shadow(c, x, y + r * 0.5, r * 1.15, r * 0.36, 0.45);
  c.lineWidth = 12; c.strokeStyle = INK;
  c.fillStyle = '#b07a12'; c.beginPath(); c.ellipse(x, y + 14, r, r * 0.42, 0, 0, TAU); c.fill(); c.stroke();
  const g = c.createLinearGradient(0, y - r * 0.4, 0, y + r * 0.4); g.addColorStop(0, '#fff1a8'); g.addColorStop(1, '#ffc21a');
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.42, 0, 0, TAU); c.fill(); c.stroke();
}

// A. l'escargot-pizza jette un œil derrière une tourelle dorée
async function drawA(c) {
  sky(c, '#5fd0ff', '#6a4cf0', '#2a1a6a', 'rgba(255,255,255,.45)');
  rays(c, 230, 300, 14, 'rgba(255,255,255,.09)', 0.1);
  const snail = await load(enemySvg('basic', 0, 0, 900)), tower = await load(towerSvg('plasma', 5, null, 'gold', 900, 'icon'));
  // l'escargot, derrière la tourelle : coquille-pizza au-dessus, tête et yeux qui dépassent à droite
  c.save(); c.translate(318, 222); c.rotate(-0.1); c.drawImage(snail, -250, -250, 500, 500); c.restore();
  plinth(c, 196, 432, 138);
  c.save(); c.translate(196, 330); c.rotate(-0.12); c.drawImage(tower, -190, -200, 380, 380); c.restore();
  sparkle(c, 64, 82, 26, '#fff6c8'); sparkle(c, 112, 150, 13, '#fff');
}

// B. blason du château : tourelle dorée, créneaux, étincelles
async function drawB(c) {
  sky(c, '#ff8ab8', '#7a3fd0', '#24145a', 'rgba(255,220,120,.5)');
  rays(c, 256, 270, 18, 'rgba(255,255,255,.08)');
  const tower = await load(towerSvg('assault', 5, null, 'gold', 900, 'icon'));
  const shield = () => { c.beginPath(); c.moveTo(256, 470); c.bezierCurveTo(120, 420, 92, 330, 92, 230); c.lineTo(92, 130); c.lineTo(420, 130); c.lineTo(420, 230); c.bezierCurveTo(420, 330, 392, 420, 256, 470); c.closePath(); };
  // créneaux au-dessus du blason
  c.lineJoin = 'round'; c.lineWidth = 14; c.strokeStyle = INK;
  for (let i = 0; i < 5; i++) { const x = 104 + i * 64; c.fillStyle = '#9aa0c8'; c.beginPath(); c.roundRect(x, 70, 48, 72, 8); c.fill(); c.stroke(); }
  shadow(c, 256, 478, 150, 22, 0.45);
  shield(); c.fillStyle = '#ffd23f'; c.fill(); c.lineWidth = 16; c.stroke();
  c.save(); c.translate(256, 300); c.scale(0.86, 0.86); c.translate(-256, -300); shield(); c.restore();
  c.save(); c.translate(256, 300); c.scale(0.86, 0.86); c.translate(-256, -300); shield(); c.clip();
  const g = c.createLinearGradient(0, 120, 0, 470); g.addColorStop(0, '#7b5cff'); g.addColorStop(1, '#3c2496'); c.fillStyle = g; c.fillRect(0, 0, 512, 512);
  c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(80, 120); c.lineTo(256, 120); c.lineTo(80, 400); c.closePath(); c.fill();
  c.restore();
  c.save(); c.translate(256, 300); c.scale(0.86, 0.86); c.translate(-256, -300); shield(); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); c.restore();
  c.drawImage(tower, 256 - 190, 290 - 205, 380, 380);
  sparkle(c, 62, 92, 26, '#fff6c8'); sparkle(c, 456, 72, 30, '#fff'); sparkle(c, 452, 330, 20, '#fff6c8'); sparkle(c, 58, 330, 16, '#fff');
}

// C. château assiégé, portail violet derrière
async function drawC(c) {
  sky(c, '#2a1650', '#4a2390', '#1a0f3d', 'rgba(200,120,255,.35)');
  // portail : anneaux et tourbillon
  c.save(); c.translate(256, 176);
  const pg = c.createRadialGradient(0, 0, 10, 0, 0, 200); pg.addColorStop(0, '#ffe2ff'); pg.addColorStop(0.25, '#d27bff'); pg.addColorStop(0.7, '#7a2fd0'); pg.addColorStop(1, '#3a1680');
  c.fillStyle = pg; c.beginPath(); c.ellipse(0, 0, 200, 170, 0, 0, TAU); c.fill(); c.lineWidth = 14; c.strokeStyle = INK; c.stroke();
  c.lineCap = 'round';
  for (let k = 0; k < 5; k++) { c.strokeStyle = `rgba(255,255,255,${0.55 - k * 0.08})`; c.lineWidth = 12 - k; c.beginPath(); for (let t = 0; t < 1; t += 0.02) { const a = k * 1.25 + t * 4.2, r = 30 + t * 150; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.85); } c.stroke(); }
  c.restore();
  // sol
  c.fillStyle = '#5bbf5a'; c.beginPath(); c.ellipse(256, 520, 340, 140, 0, 0, TAU); c.fill(); c.lineWidth = 12; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#e8c48a'; c.beginPath(); c.moveTo(196, 512); c.quadraticCurveTo(250, 420, 256, 380); c.quadraticCurveTo(262, 420, 316, 512); c.closePath(); c.fill();
  // brainrots qui sortent du portail
  const snail = await load(enemySvg('basic', 0, 0, 600)), fast = await load(enemySvg('fast', 0, 0, 600));
  c.drawImage(fast, 18, 236, 170, 170); c.save(); c.translate(430, 318); c.scale(-1, 1); c.drawImage(snail, -85, -85, 170, 170); c.restore();
  // château, grand et centré
  setTierCap(null);
  const cs = { walls: 4, cannon: 4, treasury: 3, repair: 3, air: 2, blizzard: 0, gold: 0, __preview: true };
  const B = castleBounds(cs), k = 350 / (B.bottom - B.top);
  shadow(c, 256, 492, 190, 28, 0.5);
  c.save(); c.translate(256, 486 - B.bottom * k); c.scale(k, k); drawCastle(c, cs, { time: 0.6, aim: -Math.PI / 2, recoil: 0 }); c.restore();
  sparkle(c, 440, 84, 24, '#fff'); sparkle(c, 74, 110, 18, '#ffd23f');
}

export const ICONS = { A: drawA, B: drawB, C: drawC };
export async function renderIcon(id, size, pad = 0) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d'); c.scale(size / 512, size / 512);
  if (pad) {   // icône « maskable » : le dessin reste dans la zone centrale, le fond déborde
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 512; await ICONS[id](tmp.getContext('2d'));
    c.drawImage(tmp, 0, 0, 512, 512); c.filter = 'none';
    const k = 1 - pad * 2; c.drawImage(tmp, 512 * pad, 512 * pad, 512 * k, 512 * k);
  } else await ICONS[id](c);
  return cv.toDataURL('image/png');
}
