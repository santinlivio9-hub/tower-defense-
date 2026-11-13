// Château à protéger : 4 apparences (bois, pierre, forteresse, citadelle dorée).
// Dessiné centré sur (0, 0) = fin du chemin ; ~170 x 150 unités.
const INK = '#3d2c4e';

export const CASTLE_LOOKS = [
  { name: 'Fortin en bois', wall: ['#d9a566', '#b27a40'], roof: ['#c96a3c', '#9a4526'], trim: '#8a5530', gate: '#6b3e1e', flag: '#ff5d6c', h: 0, keep: 0 },
  { name: 'Château de pierre', wall: ['#e6e3ee', '#b3adc6'], roof: ['#ff8a7a', '#e8443c'], trim: '#8b85a3', gate: '#8a5530', flag: '#ff5d6c', h: 8, keep: 0 },
  { name: 'Forteresse', wall: ['#d6dcea', '#98a2bd'], roof: ['#7fb6ff', '#3d7de0'], trim: '#6b7494', gate: '#5b4a8a', flag: '#3d9dfc', h: 16, keep: 1 },
  { name: 'Citadelle dorée', wall: ['#fffaf0', '#f1dcae'], roof: ['#ffe27a', '#f0a81d'], trim: '#d99a2b', gate: '#b8721a', flag: '#ffd23f', h: 22, keep: 2 },
];

function grad(c, y0, y1, [a, b]) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function crenels(c, x, y, w, n, col) {
  const cw = w / (n * 2 - 1);
  c.fillStyle = col;
  for (let i = 0; i < n; i++) { c.beginPath(); c.roundRect(x + i * cw * 2, y - 9, cw, 11, 2); c.fill(); c.stroke(); }
}
function tower(c, x, top, bottom, w, L, time, flag) {
  c.fillStyle = grad(c, top, bottom, L.wall); c.beginPath(); c.roundRect(x - w / 2, top, w, bottom - top, 5); c.fill(); c.stroke();
  // toit pointu
  c.fillStyle = grad(c, top - w * 1.1, top, L.roof);
  c.beginPath(); c.moveTo(x - w / 2 - 6, top + 2); c.lineTo(x, top - w * 1.05); c.lineTo(x + w / 2 + 6, top + 2); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(x - w / 2 + 1, top - 2); c.lineTo(x - 2, top - w * 0.9); c.lineTo(x - w * 0.1, top - 2); c.closePath(); c.fill();
  // meurtrière
  c.fillStyle = '#3d2c4e'; c.beginPath(); c.roundRect(x - 3.5, top + 12, 7, 16, 3.5); c.fill();
  if (flag) {
    const fy = top - w * 1.05;
    c.beginPath(); c.moveTo(x, fy); c.lineTo(x, fy - 22); c.stroke();
    const wv = Math.sin(time * 5) * 3;
    c.fillStyle = L.flag; c.beginPath(); c.moveTo(x, fy - 22); c.quadraticCurveTo(x + 9, fy - 24 + wv, x + 18, fy - 17 + wv * 0.5); c.quadraticCurveTo(x + 9, fy - 12 + wv, x, fy - 11); c.closePath(); c.fill(); c.stroke();
  }
}

// tier 0..3 ; o = { time, flash (0..1), cannon (bool), aim (rad), recoil }
export function drawCastle(c, tier, o = {}) {
  const L = CASTLE_LOOKS[Math.max(0, Math.min(3, tier))], time = o.time || 0, h = L.h;
  c.save();
  c.lineWidth = 4; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = 'rgba(0,0,0,.24)'; c.beginPath(); c.ellipse(0, 52, 86, 17, 0, 0, 7); c.fill();
  if (tier >= 3) { const g = c.createRadialGradient(0, -10, 20, 0, -10, 130); g.addColorStop(0, 'rgba(255,220,90,.45)'); g.addColorStop(1, 'rgba(255,220,90,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, -10, 130, 0, 7); c.fill(); }
  // donjon central (forteresse et citadelle)
  if (L.keep) { tower(c, 0, -62 - h - L.keep * 10, -10, 40, L, time, true); }
  // tours latérales
  tower(c, -62, -30 - h, 50, 30, L, time, !L.keep);
  tower(c, 62, -30 - h, 50, 30, L, time + 1, !L.keep);
  // mur
  c.fillStyle = grad(c, -24 - h * 0.4, 50, L.wall);
  c.beginPath(); c.roundRect(-48, -20 - h * 0.4, 96, 70 + h * 0.4, 6); c.fill(); c.stroke();
  if (tier === 0) { // planches
    c.strokeStyle = 'rgba(61,44,78,.3)'; c.lineWidth = 2.5; for (let x = -36; x <= 36; x += 12) { c.beginPath(); c.moveTo(x, -16); c.lineTo(x, 46); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 4; c.fillStyle = L.wall[0];
    for (let x = -42; x <= 42; x += 12) { c.beginPath(); c.moveTo(x - 6, -18); c.lineTo(x, -30); c.lineTo(x + 6, -18); c.closePath(); c.fill(); c.stroke(); }
  } else {
    c.strokeStyle = 'rgba(61,44,78,.2)'; c.lineWidth = 2.5; // pierres
    for (const [x, y, w] of [[-38, 0, 18], [-8, -6, 20], [22, 2, 18], [-30, 22, 16], [26, 26, 16]]) { c.beginPath(); c.roundRect(x, y - h * 0.2, w, 9, 3); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 4;
    crenels(c, -48, -20 - h * 0.4, 96, 5, L.wall[0]);
  }
  // bannières (forteresse +)
  if (tier >= 2) for (const k of [-1, 1]) { c.fillStyle = L.flag; c.beginPath(); c.moveTo(k * 32 - 7, -8); c.lineTo(k * 32 + 7, -8); c.lineTo(k * 32 + 7, 16); c.lineTo(k * 32, 10); c.lineTo(k * 32 - 7, 16); c.closePath(); c.fill(); c.stroke(); }
  // porte
  c.fillStyle = L.gate; c.beginPath(); c.roundRect(-17, 6, 34, 44, [17, 17, 0, 0]); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 48); c.moveTo(-9, 12); c.lineTo(-9, 48); c.moveTo(9, 12); c.lineTo(9, 48); c.stroke();
  c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(6, 30, 2.8, 0, 7); c.fill();
  c.strokeStyle = INK; c.lineWidth = 4;
  // emblème pizza
  c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, -6 - h * 0.2, 9, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#e8443c'; c.beginPath(); c.arc(-3, -8 - h * 0.2, 2, 0, 7); c.arc(3, -4 - h * 0.2, 2, 0, 7); c.fill();
  if (tier >= 3) { // gemmes de la citadelle
    for (const [x, y] of [[-62, -4], [62, -4]]) { c.fillStyle = '#5fd8ff'; c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 6, y); c.lineTo(x, y + 7); c.lineTo(x - 6, y); c.closePath(); c.fill(); c.stroke(); }
    const s = (Math.sin(time * 3) + 1) / 2; c.fillStyle = `rgba(255,255,255,${0.4 + s * 0.6})`;
    for (const [x, y] of [[-40, -44], [44, -52], [0, -100]]) { c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 2, y - 2); c.lineTo(x + 7, y); c.lineTo(x + 2, y + 2); c.lineTo(x, y + 7); c.lineTo(x - 2, y + 2); c.lineTo(x - 7, y); c.lineTo(x - 2, y - 2); c.closePath(); c.fill(); }
  }
  // canon du château
  if (o.cannon) {
    const cy = -30 - h * 0.4;
    c.save(); c.translate(0, cy); c.rotate(o.aim == null ? -Math.PI / 2 : o.aim);
    c.fillStyle = '#4a4f63'; c.beginPath(); c.roundRect(4 - (o.recoil || 0), -6, 26, 12, 4); c.fill(); c.stroke();
    c.fillStyle = '#2f3345'; c.beginPath(); c.roundRect(26 - (o.recoil || 0), -8, 7, 16, 3); c.fill(); c.stroke();
    c.restore();
    c.fillStyle = tier >= 3 ? '#ffd23f' : '#8e9aab'; c.beginPath(); c.arc(0, cy, 11, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(-3, cy - 3, 3.5, 0, 7); c.fill();
  }
  c.restore();
}
