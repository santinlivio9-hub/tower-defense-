// Château évolutif : il change à CHAQUE amélioration (accueil, écran Château et en partie).
// - Murs : bois → palissade renforcée → pierre → créneaux → remparts doubles → muraille dorée
// - Réparation : échafaudage → atelier → forgeron animé
// - Trésorerie : sacs de pièces → coffre → toit doré → pièces qui brillent
// - Canon : 1 canon → 2 canons → grosse tourelle
// - Capacités : antenne radio + avion (frappe aérienne), cristal de glace (blizzard), emblème d'or (pluie d'or)
// - 5 paliers d'apparence (tours plus hautes, drapeaux plus grands), éclairage de nuit.
// Dessiné centré sur (0, 0) = porte, au bout du chemin ; ~180 x 230 unités au maximum.
import { CASTLE } from './config.js';

const INK = '#3d2c4e';

export const CASTLE_LOOKS = [
  { name: 'Fortin en bois', wall: ['#d9a566', '#b27a40'], roof: ['#c96a3c', '#9a4526'], flag: '#ff5d6c', h: 0, keep: 0, fs: 1, wood: true },
  { name: 'Château de pierre', wall: ['#e6e3ee', '#b3adc6'], roof: ['#ff8a7a', '#e8443c'], flag: '#ff5d6c', h: 8, keep: 0, fs: 1.15 },
  { name: 'Forteresse', wall: ['#d6dcea', '#98a2bd'], roof: ['#7fb6ff', '#3d7de0'], flag: '#3d9dfc', h: 16, keep: 1, fs: 1.3 },
  { name: 'Citadelle', wall: ['#f4f1fb', '#c6bedb'], roof: ['#c08cff', '#7a3fd8'], flag: '#b05cff', h: 24, keep: 2, fs: 1.5 },
  { name: 'Palais doré', wall: ['#fffaf0', '#f1dcae'], roof: ['#ffe27a', '#f0a81d'], flag: '#ffd23f', h: 30, keep: 3, fs: 1.7 },
];
const GOLD_WALL = ['#fff3c4', '#f0c75a'], STONE = ['#e6e3ee', '#b3adc6'], WOOD = ['#d9a566', '#b27a40'];

// Palier d'apparence à partir des niveaux d'amélioration
// plafond de palier (boss battus) fixé par la sauvegarde ; null = pas de plafond (aperçus, silhouettes)
let TIER_CAP = null;
export function setTierCap(n) { TIER_CAP = n; }
export function castleTierOf(cs, capped = true) {
  const s = Object.values(cs || {}).reduce((a, b) => a + (b || 0), 0); let t = 0;
  CASTLE.tiers.forEach((v, i) => { if (s >= v) t = i; });
  if (capped && TIER_CAP != null && !cs.__preview) t = Math.min(t, TIER_CAP);
  return Math.min(CASTLE_LOOKS.length - 1, t);
}
// Heure réelle : 0 = jour, 1 = nuit (20 h - 7 h, transitions d'une heure)
export function nightLevel(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 20 || h < 7) return 1;
  if (h >= 19) return h - 19;
  if (h < 8) return 8 - h;
  return 0;
}

const lv = (cs, id) => (cs && cs[id]) || 0;
function grad(c, y0, y1, [a, b]) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function geo(cs) {
  const L = CASTLE_LOOKS[castleTierOf(cs)], w = lv(cs, 'walls');
  const wallTop = -20 - L.h * 0.4 - (w >= 2 ? 4 : 0);
  const towerTop = -30 - L.h, tw = 30 + castleTierOf(cs) * 1.5;
  const keepW = 40 + L.keep * 4, keepTop = -62 - L.h - L.keep * 10;
  return { L, w, wallTop, towerTop, tw, keepW, keepTop };
}
// Encombrement (unités du château) pour le cadrer sans le couper
export function castleBounds(cs) {
  const G = geo(cs);
  const flagTop = G.L.keep ? G.keepTop - G.keepW * 1.05 - 24 * G.L.fs : G.towerTop - G.tw * 1.05 - 24 * G.L.fs;
  const ant = lv(cs, 'air') ? G.towerTop - G.tw * 1.05 - 38 : 0, cry = lv(cs, 'blizzard') ? G.towerTop - G.tw - 30 : 0;
  return { top: Math.min(flagTop, ant, cry) - 6, bottom: 58, half: 94 };
}
// Zones touchables (unités du château), de la plus petite à la plus grande
export function castleParts(cs) {
  const G = geo(cs);
  return [
    { id: 'gold', x: -14, y: G.wallTop + 2, w: 28, h: 26 },
    { id: 'cannon', x: -30, y: G.wallTop - 30, w: 60, h: 30 },
    { id: 'air', x: -92, y: G.towerTop - G.tw * 1.05 - 40, w: 46, h: G.tw * 1.05 + 46 },
    { id: 'blizzard', x: 46, y: G.towerTop - G.tw * 1.05 - 40, w: 46, h: G.tw * 1.05 + 46 },
    { id: 'repair', x: -94, y: 4, w: 44, h: 50 },
    { id: 'treasury', x: 50, y: 10, w: 44, h: 44 },
    { id: 'walls', x: -52, y: G.wallTop - 4, w: 104, h: 58 - G.wallTop },
  ];
}
// « pop » de l'élément qui vient d'être amélioré
function pop(c, o, id, ax, ay) {
  const b = o.build; if (!b || b.id !== id || b.p < 1 || b.p > 1.4) return;
  const s = 1 + Math.sin(((b.p - 1) / 0.4) * Math.PI) * 0.28;
  c.translate(ax, ay); c.scale(s, s); c.translate(-ax, -ay);
}
const star4 = (c, x, y, r) => { c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); };

function flag(c, x, y, s, col, time) {
  const wv = Math.sin(time * 5 + x) * 3 * s;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 24 * s); c.stroke();
  c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 24 * s); c.quadraticCurveTo(x + 10 * s, y - 26 * s + wv, x + 20 * s, y - 18 * s + wv * 0.5); c.quadraticCurveTo(x + 10 * s, y - 12 * s + wv, x, y - 12 * s); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, y - 25 * s, 2.6, 0, 7); c.fill(); c.stroke();
}
function tower(c, x, top, bottom, w, L, time, o = {}) {
  c.fillStyle = grad(c, top, bottom, L.wall); c.beginPath(); c.roundRect(x - w / 2, top, w, bottom - top, 5); c.fill(); c.stroke();
  c.save();
  if (L.wood) { c.strokeStyle = 'rgba(61,44,78,.3)'; c.lineWidth = 2.5; for (let k = -w / 2 + 8; k < w / 2 - 2; k += 8) { c.beginPath(); c.moveTo(x + k, top + 4); c.lineTo(x + k, bottom - 3); c.stroke(); } }
  else { c.strokeStyle = 'rgba(61,44,78,.18)'; c.lineWidth = 2; for (let y = top + 34; y < bottom - 6; y += 16) { c.beginPath(); c.moveTo(x - w / 2 + 3, y); c.lineTo(x + w / 2 - 3, y); c.stroke(); } }
  c.fillStyle = 'rgba(61,44,78,.14)'; c.fillRect(x + w / 2 - 8, top + 3, 5, bottom - top - 6);
  c.restore();
  // toit pointu (doré si demandé)
  const roof = o.goldRoof ? ['#ffe27a', '#f0a81d'] : L.roof, rh = w * 1.05;
  c.fillStyle = grad(c, top - rh, top, roof);
  c.beginPath(); c.moveTo(x - w / 2 - 6, top + 2); c.lineTo(x, top - rh); c.lineTo(x + w / 2 + 6, top + 2); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(x - w / 2 + 1, top - 2); c.lineTo(x - 2, top - rh * 0.86); c.lineTo(x - w * 0.1, top - 2); c.closePath(); c.fill();
  if (o.goldRoof && o.shine) { c.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(time * 4 + x) * 0.5})`; star4(c, x + 5, top - rh * 0.5, 4); }
  // meurtrière
  c.fillStyle = INK; c.beginPath(); c.roundRect(x - 3.5, top + 12, 7, 16, 3.5); c.fill();
  if (o.flag !== false) flag(c, x, top - rh, o.fs || 1, L.flag, time);
}
function wallBody(c, G, L, time) {
  const w = G.w, top = G.wallTop, cols = w <= 1 ? WOOD : w >= 5 ? GOLD_WALL : (L.wood ? STONE : L.wall);
  c.fillStyle = grad(c, top - 4, 50, cols);
  c.beginPath(); c.roundRect(-48, top, 96, 50 - top, 6); c.fill(); c.stroke();
  c.save();
  if (w <= 1) {
    // planches + pieux (palissade renforcée : pieux plus grands et bandes de fer)
    c.strokeStyle = 'rgba(61,44,78,.3)'; c.lineWidth = 2.5;
    for (let x = -36; x <= 36; x += 12) { c.beginPath(); c.moveTo(x, top + 4); c.lineTo(x, 46); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 4; c.fillStyle = cols[0];
    const sh = w ? 15 : 11;
    for (let x = -42; x <= 42; x += 12) { c.beginPath(); c.moveTo(x - 6, top + 2); c.lineTo(x, top - sh); c.lineTo(x + 6, top + 2); c.closePath(); c.fill(); c.stroke(); }
    if (w) {
      c.fillStyle = '#6b7494';
      for (const y of [top + 10, 34]) { c.beginPath(); c.roundRect(-47, y, 94, 6, 2); c.fill(); c.stroke(); }
      c.fillStyle = '#c9ced9'; for (let x = -40; x <= 40; x += 16) { c.beginPath(); c.arc(x, top + 13, 1.6, 0, 7); c.arc(x, 37, 1.6, 0, 7); c.fill(); }
    }
  } else {
    c.strokeStyle = w >= 5 ? 'rgba(170,110,20,.35)' : 'rgba(61,44,78,.2)'; c.lineWidth = 2.5;
    for (const [x, y, ww] of [[-40, 6, 18], [-12, 2, 20], [18, 8, 18], [-32, 26, 16], [24, 28, 16], [-6, 20, 12]]) { c.beginPath(); c.roundRect(x, top + 16 + y * 0.6, ww, 9, 3); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 4;
    if (w >= 3) { // créneaux
      const n = 6, cw = 96 / (n * 2 - 1); c.fillStyle = cols[0];
      for (let i = 0; i < n; i++) { c.beginPath(); c.roundRect(-48 + i * cw * 2, top - 10, cw, 12, 2); c.fill(); c.stroke(); }
    } else { c.fillStyle = cols[0]; c.beginPath(); c.roundRect(-50, top - 4, 100, 7, 3); c.fill(); c.stroke(); }
    if (w >= 5) { c.fillStyle = '#ffd23f'; c.beginPath(); c.roundRect(-48, top + 6, 96, 5, 2); c.fill(); c.stroke(); }
  }
  c.restore();
}
function outerWall(c, G) {
  const gold = G.w >= 5, cols = gold ? GOLD_WALL : STONE, y = 30;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -80 : 24;
    c.fillStyle = grad(c, y, 52, cols); c.beginPath(); c.roundRect(x0, y, 56, 22, 4); c.fill(); c.stroke();
    c.fillStyle = cols[0]; for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(x0 + 2 + i * 14.5, y - 8, 9, 9, 2); c.fill(); c.stroke(); }
    if (gold) { c.fillStyle = '#ffd23f'; c.beginPath(); c.roundRect(x0, y + 8, 56, 4, 2); c.fill(); }
    c.save(); c.strokeStyle = 'rgba(61,44,78,.2)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 8, y + 16); c.lineTo(x0 + 26, y + 16); c.moveTo(x0 + 32, y + 16); c.lineTo(x0 + 48, y + 16); c.stroke(); c.restore();
  }
}
function gate(c, G, L) {
  c.fillStyle = L.wood || G.w <= 1 ? '#6b3e1e' : '#8a5530'; c.beginPath(); c.roundRect(-17, 6, 34, 44, [17, 17, 0, 0]); c.fill(); c.stroke();
  c.save(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 48); c.moveTo(-9, 12); c.lineTo(-9, 48); c.moveTo(9, 12); c.lineTo(9, 48); c.stroke(); c.restore();
  if (G.w >= 3) { // herse
    c.save(); c.strokeStyle = '#4a4f63'; c.lineWidth = 2.5; c.beginPath(); for (let x = -12; x <= 12; x += 6) { c.moveTo(x, 9); c.lineTo(x, 22); } c.moveTo(-14, 16); c.lineTo(14, 16); c.stroke(); c.restore();
  }
  c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(6, 32, 2.8, 0, 7); c.fill();
}
function emblem(c, G, cs, time, o) {
  const g = lv(cs, 'gold'), y = G.wallTop + 14;
  c.save(); pop(c, o, 'gold', 0, y);
  if (g >= 2) { // rayons dorés
    c.save(); c.translate(0, y); c.rotate(time * 0.6); c.fillStyle = 'rgba(255,220,90,.55)';
    for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(-3, 10); c.lineTo(0, 20 + g * 2); c.lineTo(3, 10); c.closePath(); c.fill(); }
    c.restore();
  }
  if (g) { // pièce d'or qui tourne
    const sx = Math.abs(Math.cos(time * 2.2)) * 0.8 + 0.2;
    c.save(); c.translate(0, y); c.scale(sx, 1);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill(); c.stroke();
    c.strokeStyle = '#e09600'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.stroke();
    c.restore();
    if (g >= 3) { c.fillStyle = '#ffd23f'; c.strokeStyle = INK; c.lineWidth = 2; for (let i = 0; i < 3; i++) { const p = (time * 0.7 + i / 3) % 1; c.globalAlpha = 1 - p; c.beginPath(); c.arc(-14 + i * 14, y + 10 + p * 34, 3.4, 0, 7); c.fill(); c.stroke(); } c.globalAlpha = 1; }
  } else { // emblème pizza
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, y, 9, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#e8443c'; c.beginPath(); c.arc(-3, y - 2, 2, 0, 7); c.arc(3, y + 2, 2, 0, 7); c.fill();
  }
  c.restore();
}
function repairPart(c, cs, time, o) {
  const r = lv(cs, 'repair'); if (!r) return;
  c.save(); pop(c, o, 'repair', -72, 50);
  c.lineWidth = 3; c.strokeStyle = INK;
  if (r <= 2) { // échafaudage contre la tour gauche
    const top = r === 1 ? 2 : -24;
    c.strokeStyle = '#8a5530'; c.lineWidth = 4;
    c.beginPath(); for (const x of [-90, -78]) { c.moveTo(x, 52); c.lineTo(x, top); } c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2.5; c.fillStyle = '#d9a566';
    for (let y = top + 8; y < 50; y += 16) { c.beginPath(); c.roundRect(-94, y, 22, 5, 2); c.fill(); c.stroke(); }
    c.strokeStyle = 'rgba(138,85,48,.8)'; c.beginPath(); c.moveTo(-90, top + 8); c.lineTo(-78, top + 24); c.moveTo(-78, top + 24); c.lineTo(-90, top + 40); c.stroke();
    if (r === 2) { c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-84, top + 8); c.lineTo(-84, top + 20 + Math.sin(time * 2) * 2); c.stroke(); c.fillStyle = '#8e9aab'; c.lineWidth = 2.2; c.beginPath(); c.roundRect(-88, top + 19 + Math.sin(time * 2) * 2, 8, 8, 2); c.fill(); c.stroke(); }
  } else { // atelier
    c.fillStyle = '#e8c690'; c.beginPath(); c.roundRect(-94, 26, 28, 26, 3); c.fill(); c.stroke();
    c.fillStyle = '#c96a3c'; c.beginPath(); c.moveTo(-98, 28); c.lineTo(-80, 12); c.lineTo(-62, 28); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#6b3e1e'; c.beginPath(); c.roundRect(-86, 36, 11, 16, [5, 5, 0, 0]); c.fill(); c.stroke();
    // enseigne marteau
    c.fillStyle = '#fff1cf'; c.beginPath(); c.roundRect(-71, 30, 10, 10, 2); c.fill(); c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#4a4f63'; c.lineWidth = 2; c.beginPath(); c.moveTo(-68, 38); c.lineTo(-64, 33); c.moveTo(-66, 32); c.lineTo(-63, 35); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 3;
    if (r >= 4) { // cheminée qui fume
      c.fillStyle = '#8e9aab'; c.beginPath(); c.roundRect(-92, 10, 7, 12, 1); c.fill(); c.stroke();
      for (let i = 0; i < 3; i++) { const p = (time * 0.5 + i / 3) % 1; c.fillStyle = `rgba(230,230,240,${0.6 * (1 - p)})`; c.beginPath(); c.arc(-88 - p * 8, 6 - p * 26, 3 + p * 5, 0, 7); c.fill(); }
      // enclume
      c.fillStyle = '#4a4f63'; c.beginPath(); c.moveTo(-60, 44); c.lineTo(-46, 44); c.lineTo(-50, 48); c.lineTo(-52, 52); c.lineTo(-58, 52); c.lineTo(-56, 48); c.closePath(); c.fill(); c.stroke();
    }
    if (r >= 5) { // forgeron animé
      const sw = Math.sin(time * 8), hit = sw > 0.92;
      c.fillStyle = '#ffb27a'; c.beginPath(); c.arc(-40, 34, 5, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#3d9dfc'; c.beginPath(); c.roundRect(-45, 39, 10, 13, 3); c.fill(); c.stroke();
      c.save(); c.translate(-44, 41); c.rotate(-1.1 + (sw + 1) * 0.55);
      c.strokeStyle = '#8a5530'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(-8, -6); c.stroke();
      c.fillStyle = '#8e9aab'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.roundRect(-12, -10, 6, 7, 1.5); c.fill(); c.stroke();
      c.restore();
      if (hit) { c.fillStyle = '#ffd23f'; for (let i = 0; i < 4; i++) star4(c, -54 + Math.cos(i * 1.7) * 7, 41 + Math.sin(i * 1.7) * 5, 3); }
    }
  }
  c.restore();
}
function treasuryPart(c, cs, time, o) {
  const t = lv(cs, 'treasury'); if (!t) return;
  c.save(); pop(c, o, 'treasury', 72, 50);
  c.lineWidth = 3; c.strokeStyle = INK;
  const sack = (x, y, s) => {
    c.fillStyle = '#c98a4b'; c.beginPath(); c.moveTo(x - 7 * s, y - 14 * s); c.quadraticCurveTo(x - 13 * s, y, x - 9 * s, y + 1); c.lineTo(x + 9 * s, y + 1); c.quadraticCurveTo(x + 13 * s, y, x + 7 * s, y - 14 * s); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, y - 7 * s, 3.5 * s, 0, 7); c.fill(); c.lineWidth = 2; c.stroke(); c.lineWidth = 3;
    c.strokeStyle = '#8a5530'; c.beginPath(); c.moveTo(x - 6 * s, y - 15 * s); c.lineTo(x + 6 * s, y - 15 * s); c.stroke(); c.strokeStyle = INK;
  };
  const coins = (x, y, n) => { for (let i = 0; i < n; i++) { c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(x + (i % 3) * 6 - 6, y - Math.floor(i / 3) * 4, 5, 2.6, 0, 0, 7); c.fill(); c.lineWidth = 2; c.stroke(); } c.lineWidth = 3; };
  if (t >= 3) { // coffre
    c.fillStyle = '#c98a4b'; c.beginPath(); c.roundRect(64, 36, 26, 16, 3); c.fill(); c.stroke();
    c.fillStyle = '#d99a55'; c.beginPath(); c.roundRect(63, 28, 28, 10, [6, 6, 2, 2]); c.fill(); c.stroke();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.roundRect(74, 34, 6, 7, 2); c.fill(); c.lineWidth = 2; c.stroke(); c.lineWidth = 3;
    coins(58, 50, 3);
  }
  sack(t >= 3 ? 54 : 70, 51, 0.9);
  if (t >= 2) { sack(t >= 3 ? 94 : 84, 51, 0.75); coins(t >= 3 ? 46 : 78, 50, t >= 3 ? 4 : 2); }
  if (t >= 5) { // pièces qui brillent
    c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const a = (Math.sin(time * 3 + i * 1.7) + 1) / 2; c.globalAlpha = a; star4(c, 56 + i * 11, 26 + (i % 2) * 10, 3 + a * 3); }
    c.globalAlpha = 1;
  }
  c.restore();
}
function cannons(c, G, cs, o) {
  const n = lv(cs, 'cannon'); if (!n) return;
  const cy = G.wallTop - 10, aim = o.aim == null ? -Math.PI / 2 : o.aim, rec = o.recoil || 0;
  c.save(); pop(c, o, 'cannon', 0, cy);
  const gun = (x, s, gold) => {
    c.save(); c.translate(x, cy); c.rotate(aim);
    c.fillStyle = '#4a4f63'; c.beginPath(); c.roundRect((4 - rec) * s, -6 * s, 26 * s, 12 * s, 4); c.fill(); c.stroke();
    c.fillStyle = gold ? '#ffd23f' : '#2f3345'; c.beginPath(); c.roundRect((26 - rec) * s, -8 * s, 7 * s, 16 * s, 3); c.fill(); c.stroke();
    c.restore();
    c.fillStyle = gold ? '#ffd23f' : '#8e9aab'; c.beginPath(); c.arc(x, cy, 11 * s, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - 3 * s, cy - 3 * s, 3.5 * s, 0, 7); c.fill();
  };
  if (n >= 5) { // grosse tourelle à double canon
    c.fillStyle = '#5a6078'; c.beginPath(); c.roundRect(-24, cy - 2, 48, 14, 4); c.fill(); c.stroke();
    c.save(); c.translate(0, cy); c.rotate(aim);
    for (const dy of [-6, 6]) { c.fillStyle = '#3a3f52'; c.beginPath(); c.roundRect(6 - rec, dy - 4.5, 36, 9, 4); c.fill(); c.stroke(); c.fillStyle = '#ffd23f'; c.beginPath(); c.roundRect(38 - rec, dy - 5.5, 6, 11, 2); c.fill(); c.stroke(); }
    c.restore();
    c.fillStyle = '#8e9aab'; c.beginPath(); c.arc(0, cy, 17, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, cy - 6, 5, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(-7, cy - 9, 4, 0, 7); c.fill();
  } else if (n >= 3) { gun(-22, 0.9, n >= 4); gun(22, 0.9, n >= 4); }
  else gun(0, n >= 2 ? 1.1 : 0.95, false);
  c.restore();
}
function antenna(c, G, cs, time, o) {
  const a = lv(cs, 'air'); if (!a) return;
  const x = -62 - G.tw / 2 - 2, base = G.towerTop + 6, top = G.towerTop - G.tw * 1.05 - 30;
  c.save(); pop(c, o, 'air', x, base);
  c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(x, base); c.lineTo(x, top); c.stroke();
  c.strokeStyle = '#b8c2d6'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, base); c.lineTo(x, top); c.stroke();
  c.strokeStyle = INK; c.lineWidth = 2; for (let y = top + 8; y < base - 4; y += 10) { c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y + 5); c.stroke(); }
  const blink = Math.sin(time * 5) > 0;
  c.fillStyle = blink ? '#ff4d5e' : '#8a1d2a'; c.beginPath(); c.arc(x, top - 2, 3.5, 0, 7); c.fill(); c.stroke();
  if (blink) { c.strokeStyle = 'rgba(255,77,94,.6)'; c.lineWidth = 2; for (const r of [7, 11]) { c.beginPath(); c.arc(x, top - 2, r, -2.4, -0.7); c.stroke(); } }
  if (a >= 2) { // parabole radar qui tourne
    const sx = Math.cos(time * 1.6);
    c.save(); c.translate(x, top + 16); c.scale(sx, 1);
    c.fillStyle = '#e6ecf5'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.arc(-1, 0, 8, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  c.restore();
  if (a >= 3) { // avion qui tourne autour du château
    const ang = time * 0.9, px = Math.cos(ang) * 70, py = G.towerTop - 50 + Math.sin(ang) * 18, dir = -Math.sin(ang) >= 0 ? 1 : -1;
    c.save(); c.translate(px, py); c.scale(dir, 1); c.strokeStyle = INK; c.lineWidth = 2.5;
    c.fillStyle = '#f0485a'; c.beginPath(); c.roundRect(-12, -4, 24, 8, 4); c.fill(); c.stroke();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-3, 0); c.lineTo(3, -11); c.lineTo(7, -11); c.lineTo(4, 0); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-11, -2); c.lineTo(-14, -9); c.lineTo(-9, -9); c.lineTo(-7, -2); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#8fd2ff'; c.beginPath(); c.arc(6, -1, 2.5, 0, 7); c.fill();
    c.restore();
  }
}
function crystal(c, G, cs, time, o) {
  const b = lv(cs, 'blizzard'); if (!b) return;
  const x = 62 + G.tw / 2 + 6, y = G.towerTop - G.tw * 0.6 + Math.sin(time * 2) * 3, s = 0.8 + b * 0.22;
  c.save(); pop(c, o, 'blizzard', x, y);
  const g = c.createRadialGradient(x, y, 2, x, y, 22 * s); g.addColorStop(0, 'rgba(160,240,255,.7)'); g.addColorStop(1, 'rgba(160,240,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 22 * s, 0, 7); c.fill();
  c.strokeStyle = INK; c.lineWidth = 2.5;
  c.fillStyle = '#8fe6ff'; c.beginPath(); c.moveTo(x, y - 14 * s); c.lineTo(x + 7 * s, y); c.lineTo(x, y + 12 * s); c.lineTo(x - 7 * s, y); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#d9f7ff'; c.beginPath(); c.moveTo(x, y - 14 * s); c.lineTo(x - 7 * s, y); c.lineTo(x, y + 1); c.closePath(); c.fill();
  if (b >= 3) { c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const a = time * 1.5 + i * 2.1; star4(c, x + Math.cos(a) * 15 * s, y + Math.sin(a) * 9 * s, 2.6); } }
  c.restore();
}
function torches(c, G, L, time) {
  if (L.wood) return;
  for (const x of [-26, 26]) { c.fillStyle = '#4a4f63'; c.beginPath(); c.roundRect(x - 2.5, 14, 5, 10, 1.5); c.fill(); c.stroke(); }
}

// tier ignoré : tout se déduit des niveaux d'amélioration cs = save.data.castle
// o = { time, cannon (bool, en partie : faut-il le dessiner), aim, recoil, build: { id, p }, night }
export function drawCastle(c, cs, o = {}) {
  if (typeof cs === 'number') cs = {}; // compatibilité
  const G = geo(cs), L = G.L, tier = castleTierOf(cs), time = o.time || 0;
  c.save();
  c.lineWidth = 4; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = 'rgba(0,0,0,.24)'; c.beginPath(); c.ellipse(0, 52, 92, 17, 0, 0, 7); c.fill();
  if (tier >= 4) { const g = c.createRadialGradient(0, -20, 20, 0, -20, 140); g.addColorStop(0, 'rgba(255,220,90,.45)'); g.addColorStop(1, 'rgba(255,220,90,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, -20, 140, 0, 7); c.fill(); }
  // donjon central (et flèches du palais)
  if (L.keep) {
    if (L.keep >= 3) for (const s of [-1, 1]) tower(c, s * 26, G.keepTop + 26, -10, 18, L, time + s, { fs: L.fs * 0.6 });
    tower(c, 0, G.keepTop, -10, G.keepW, L, time, { fs: L.fs });
    if (L.keep >= 2) { c.fillStyle = INK; for (const s of [-1, 1]) { c.beginPath(); c.roundRect(s * 10 - 3, G.keepTop + 34, 6, 12, 3); c.fill(); } }
  }
  // tours latérales (la droite reçoit le toit doré de la trésorerie)
  const tr = lv(cs, 'treasury');
  tower(c, -62, G.towerTop, 50, G.tw, L, time, { flag: !L.keep, fs: L.fs });
  c.save(); pop(c, o, 'treasury', 62, G.towerTop);
  tower(c, 62, G.towerTop, 50, G.tw, L, time + 1, { flag: !L.keep, fs: L.fs, goldRoof: tr >= 4, shine: tr >= 5 });
  c.restore();
  // mur (+ remparts doubles)
  c.save(); pop(c, o, 'walls', 0, 50);
  wallBody(c, G, L, time);
  if (tier >= 2) for (const k of [-1, 1]) { c.fillStyle = L.flag; c.beginPath(); c.moveTo(k * 32 - 7, G.wallTop + 12); c.lineTo(k * 32 + 7, G.wallTop + 12); c.lineTo(k * 32 + 7, G.wallTop + 36); c.lineTo(k * 32, G.wallTop + 30); c.lineTo(k * 32 - 7, G.wallTop + 36); c.closePath(); c.fill(); c.stroke(); }
  gate(c, G, L);
  torches(c, G, L, time);
  emblem(c, G, cs, time, o);
  if (G.w >= 4) outerWall(c, G);
  c.restore();
  if (tier >= 4) { // gemmes et étincelles du palais
    for (const [x, y] of [[-62, G.towerTop + 34], [62, G.towerTop + 34]]) { c.fillStyle = '#5fd8ff'; c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 6, y); c.lineTo(x, y + 7); c.lineTo(x - 6, y); c.closePath(); c.fill(); c.stroke(); }
    const s = (Math.sin(time * 3) + 1) / 2; c.fillStyle = `rgba(255,255,255,${0.4 + s * 0.6})`;
    for (const [x, y] of [[-40, -44], [44, -52], [0, G.keepTop - 10]]) star4(c, x, y, 6);
  }
  repairPart(c, cs, time, o);
  treasuryPart(c, cs, time, o);
  if (o.cannon !== false) cannons(c, G, cs, o);
  antenna(c, G, cs, time, o);
  crystal(c, G, cs, time, o);
  // échafaudage + marteau pendant la construction
  if (o.build && o.build.p < 1) scaffold(c, castleParts(cs).find((p) => p.id === o.build.id), time);
  c.restore();
}

function scaffold(c, r, time) {
  if (!r) return;
  c.save(); c.lineWidth = 3; c.strokeStyle = '#8a5530';
  c.beginPath(); c.moveTo(r.x, r.y + r.h); c.lineTo(r.x, r.y); c.moveTo(r.x + r.w, r.y + r.h); c.lineTo(r.x + r.w, r.y); c.stroke();
  c.strokeStyle = INK; c.lineWidth = 2; c.fillStyle = '#d9a566';
  for (let y = r.y + 6; y < r.y + r.h; y += 14) { c.beginPath(); c.roundRect(r.x - 3, y, r.w + 6, 4, 2); c.fill(); c.stroke(); }
  // marteau qui tape
  const sw = Math.sin(time * 22) * 0.9;
  c.save(); c.translate(r.x + r.w * 0.7, r.y + 4); c.rotate(-0.6 + sw); c.lineWidth = 2.5;
  c.fillStyle = '#b5793f'; c.beginPath(); c.roundRect(-2.5, -2, 5, 22, 2); c.fill(); c.stroke();
  c.fillStyle = '#8e9aab'; c.beginPath(); c.roundRect(-9, -8, 18, 9, 2); c.fill(); c.stroke();
  c.restore(); c.restore();
}

// Hauteur des canons (pour le tir en partie)
export function castleGunY(cs) { return geo(cs).wallTop - 10; }

// Lumières de nuit : fenêtres, torches, lanternes (à dessiner APRÈS un voile sombre éventuel)
export function drawCastleLights(c, cs, o = {}) {
  const night = o.night || 0; if (night <= 0) return;
  const G = geo(cs), L = G.L, time = o.time || 0;
  const glow = (x, y, r, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,214,110,${a})`); g.addColorStop(1, 'rgba(255,214,110,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  const win = (x, y) => { c.fillStyle = `rgba(255,210,90,${0.9 * night})`; c.beginPath(); c.roundRect(x - 3, y, 6, 14, 3); c.fill(); glow(x, y + 7, 16, 0.45 * night); };
  c.save();
  win(-62, G.towerTop + 13); win(62, G.towerTop + 13);
  if (L.keep) { win(0, G.keepTop + 13); if (L.keep >= 2) { win(-10, G.keepTop + 35); win(10, G.keepTop + 35); } }
  if (!L.wood) for (const x of [-26, 26]) { // torches
    const f = 1 + Math.sin(time * 13 + x) * 0.15;
    glow(x, 10, 22 * f, 0.6 * night);
    c.fillStyle = '#ff9f1a'; c.beginPath(); c.ellipse(x, 10, 3.5 * f, 6 * f, 0, 0, 7); c.fill();
    c.fillStyle = '#fff3a0'; c.beginPath(); c.ellipse(x, 11, 1.8, 3.2 * f, 0, 0, 7); c.fill();
  }
  glow(0, 28, 26, 0.35 * night); // lumière de la porte
  if (lv(cs, 'repair') >= 3) { c.fillStyle = `rgba(255,190,80,${0.9 * night})`; c.beginPath(); c.roundRect(-84, 38, 7, 12, 3); c.fill(); glow(-80, 44, 16, 0.5 * night); }
  if (castleTierOf(cs) >= 3) for (const x of [-48, 48]) { // lanternes
    c.strokeStyle = INK; c.lineWidth = 2; c.fillStyle = `rgba(255,220,120,${night})`; c.beginPath(); c.roundRect(x - 3, G.wallTop - 2, 6, 8, 2); c.fill(); c.stroke(); glow(x, G.wallTop + 2, 18, 0.5 * night);
  }
  c.restore();
}

// Silhouette d'un palier (aperçu « Prochainement ») dessinée sur un canvas à part
export function drawCastleSilhouette(cv, tier, color = '#2a1d52') {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const ids = ['walls', 'cannon', 'treasury', 'repair', 'air', 'blizzard', 'gold'], max = (id) => (CASTLE.upgrades[id] || CASTLE.abilities[id]).costs.length;
  const fake = Object.fromEntries(ids.map((id) => [id, 0])); Object.defineProperty(fake, '__preview', { value: true }); let need = CASTLE.tiers[tier] || 0, i = 0;
  while (need > 0 && i < 400) { const id = ids[i++ % ids.length]; if (fake[id] < max(id)) { fake[id]++; need--; } }
  const B = castleBounds(fake), k = Math.min(W / (B.half * 2), H / (B.bottom - B.top)) * 0.95;
  c.clearRect(0, 0, W, H); c.save(); c.translate(W / 2, H - B.bottom * k); c.scale(k, k);
  drawCastle(c, fake, { time: 0 }); c.restore();
  c.save(); c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, W, H); c.restore();
}
