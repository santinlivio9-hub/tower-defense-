// Icône de l'appli (512 x 512) : l'escargot-pizza jette un œil derrière une tourelle dorée. Dessinée avec les vrais
// sprites du jeu ; utilisée par tools/make-icons.mjs (dans le navigateur, via Playwright).
// Style Chibi Arsenal : contours épais, fond en dégradé, aucun texte.
import { enemySvg, towerSvg } from '../js/sprites.js';

const INK = '#3d2c4e', TAU = Math.PI * 2;
const load = (svg) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });

function sparkle(c, x, y, r, color = '#fff') {
  c.save(); c.translate(x, y); c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, q = i % 2 ? r * 0.3 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  c.closePath(); c.fillStyle = color; c.lineWidth = Math.max(3, r * 0.22); c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); c.fill(); c.restore();
}
// fond : dégradé bleu ciel → violet, halo et rayons (déborde sur toute la surface, même pour l'icône « maskable »)
function background(c) {
  const g = c.createLinearGradient(0, 0, 160, 512); g.addColorStop(0, '#5fd0ff'); g.addColorStop(0.55, '#6a4cf0'); g.addColorStop(1, '#2a1a6a');
  c.fillStyle = g; c.fillRect(0, 0, 512, 512);
  const r = c.createRadialGradient(256, 230, 10, 256, 230, 330); r.addColorStop(0, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = r; c.fillRect(0, 0, 512, 512);
  c.save(); c.translate(230, 300); c.fillStyle = 'rgba(255,255,255,.09)';
  for (let i = 0; i < 14; i++) { const a = 0.1 + (i / 14) * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 620, Math.sin(a) * 620); c.lineTo(Math.cos(a + TAU / 28) * 620, Math.sin(a + TAU / 28) * 620); c.closePath(); c.fill(); }
  c.restore();
}
// premier plan : escargot derrière, tourelle dorée sur son socle devant, étincelles
async function foreground(c) {
  const snail = await load(enemySvg('basic', 0, 0, 900)), tower = await load(towerSvg('plasma', 5, null, 'gold', 900, 'icon'));
  c.save(); c.translate(318, 222); c.rotate(-0.1); c.drawImage(snail, -250, -250, 500, 500); c.restore();
  const x = 196, y = 432, r = 138;
  c.fillStyle = 'rgba(20,10,45,.45)'; c.beginPath(); c.ellipse(x, y + r * 0.5, r * 1.15, r * 0.36, 0, 0, TAU); c.fill();
  c.lineWidth = 12; c.strokeStyle = INK;
  c.fillStyle = '#b07a12'; c.beginPath(); c.ellipse(x, y + 14, r, r * 0.42, 0, 0, TAU); c.fill(); c.stroke();
  const pg = c.createLinearGradient(0, y - r * 0.4, 0, y + r * 0.4); pg.addColorStop(0, '#fff1a8'); pg.addColorStop(1, '#ffc21a');
  c.fillStyle = pg; c.beginPath(); c.ellipse(x, y, r, r * 0.42, 0, 0, TAU); c.fill(); c.stroke();
  c.save(); c.translate(196, 330); c.rotate(-0.12); c.drawImage(tower, -190, -200, 380, 380); c.restore();
  sparkle(c, 64, 82, 26, '#fff6c8'); sparkle(c, 112, 150, 13, '#fff');
}

// pad : marge de sécurité de l'icône « maskable » (le dessin reste dans la zone centrale, le fond remplit tout)
export async function renderIcon(size, pad = 0) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d'); c.scale(size / 512, size / 512);
  background(c);
  if (pad) { c.translate(256, 256); c.scale(1 - pad * 2, 1 - pad * 2); c.translate(-256, -256); }
  await foreground(c);
  return cv.toDataURL('image/png');
}
