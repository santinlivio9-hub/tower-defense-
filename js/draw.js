// Dessins vectoriels originaux : brainrots (mis en cache en sprites) et armes.
import { ENEMIES, RARITY, SHOP, TOWER_VISUAL, GAME } from './config.js';

export const OUT = '#1d1a2b';
const TAU = Math.PI * 2;

function fs(c, fill, lw = 3) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke(); }
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function poly(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
function limb(c, x1, y1, x2, y2, col, w = 5) {
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = OUT; c.lineWidth = w + 5; c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
}
function eye(c, x, y, r, look = 0.35) {
  circ(c, x, y, r); fs(c, '#fff', 2.5);
  circ(c, x + r * look, y + r * 0.05, r * 0.48); c.fillStyle = OUT; c.fill();
}
function angry(c, x, y, r) { c.beginPath(); c.moveTo(x - r * 1.2, y - r * 1.5); c.lineTo(x + r * 1.1, y - r * 0.7); c.lineWidth = 3.5; c.strokeStyle = OUT; c.stroke(); }

// --- Sprites d'ennemis (regardent vers la droite, centrés en 0,0) -------------
const SPR = {
  // Escargot-pizza
  basic(c, r) {
    rr(c, -r * 1.05, r * 0.2, r * 2.15, r * 0.75, r * 0.37); fs(c, '#f7dfae');
    limb(c, r * 0.72, r * 0.3, r * 0.9, -r * 0.4, '#f7dfae', 3);
    eye(c, r * 0.95, -r * 0.55, r * 0.3);
    circ(c, -r * 0.2, -r * 0.12, r * 0.86); fs(c, '#e59a2f');
    circ(c, -r * 0.2, -r * 0.12, r * 0.62); c.fillStyle = '#ffd866'; c.fill();
    c.fillStyle = '#d6402b';
    for (const [x, y] of [[-0.45, -0.3], [0.1, -0.35], [-0.2, 0.2]]) { circ(c, r * x, r * y, r * 0.17); c.fill(); }
    c.beginPath(); c.arc(r * 0.75, r * 0.5, r * 0.18, 0.2, 2.4); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  },
  // Piment sur rollers
  fast(c, r) {
    rr(c, -r * 0.9, r * 0.62, r * 1.8, r * 0.26, r * 0.1); fs(c, '#3d9dfc');
    circ(c, -r * 0.55, r * 0.95, r * 0.26); fs(c, '#ffd23f');
    circ(c, r * 0.55, r * 0.95, r * 0.26); fs(c, '#ffd23f');
    c.beginPath(); c.moveTo(-r * 1.0, -r * 0.5); c.quadraticCurveTo(-r * 0.2, -r * 1.2, r * 0.8, -r * 0.35);
    c.quadraticCurveTo(r * 1.25, r * 0.2, r * 0.5, r * 0.6); c.quadraticCurveTo(-r * 0.6, r * 0.75, -r * 1.0, -r * 0.5); c.closePath(); fs(c, '#e8352a');
    poly(c, [[-r * 1.0, -r * 0.5], [-r * 1.35, -r * 0.95], [-r * 0.95, -r * 0.85], [-r * 0.75, -r * 0.65]]); fs(c, '#4cd137');
    eye(c, r * 0.45, -r * 0.15, r * 0.28); angry(c, r * 0.45, -r * 0.15, r * 0.28);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(-r * 0.1, -r * 0.2, r * 0.5, 3.6, 4.6); c.stroke();
  },
  // Hippopotame grille-pain
  tank(c, r) {
    rr(c, -r * 0.75, r * 0.6, r * 0.38, r * 0.4, 3); fs(c, '#7d6fb0');
    rr(c, r * 0.3, r * 0.6, r * 0.38, r * 0.4, 3); fs(c, '#7d6fb0');
    rr(c, -r * 0.55, -r * 1.05, r * 0.42, r * 0.6, 3); fs(c, '#e8b46a');
    rr(c, r * 0.02, -r * 1.12, r * 0.42, r * 0.6, 3); fs(c, '#d99a48');
    rr(c, -r * 0.95, -r * 0.7, r * 1.9, r * 1.45, r * 0.3); fs(c, '#a99ad6');
    rr(c, -r * 0.7, -r * 0.62, r * 1.3, r * 0.14, 3); c.fillStyle = OUT; c.fill();
    rr(c, r * 0.25, -r * 0.05, r * 0.95, r * 0.7, r * 0.3); fs(c, '#c5b9ea');
    circ(c, r * 0.8, r * 0.15, r * 0.07); c.fillStyle = OUT; c.fill(); circ(c, r * 1.0, r * 0.15, r * 0.07); c.fill();
    rr(c, r * 0.55, r * 0.5, r * 0.16, r * 0.22, 2); fs(c, '#fff', 2);
    eye(c, r * 0.25, -r * 0.3, r * 0.2);
    circ(c, -r * 0.6, r * 0.25, r * 0.16); fs(c, '#e84a3c', 2.5);
  },
  // Crabe casserole (blindé)
  armored(c, r) {
    limb(c, -r * 0.7, r * 0.3, -r * 1.15, r * 0.05, '#ff7a3c', 4);
    limb(c, r * 0.7, r * 0.3, r * 1.15, r * 0.05, '#ff7a3c', 4);
    circ(c, -r * 1.2, -r * 0.1, r * 0.3); fs(c, '#ff7a3c');
    circ(c, r * 1.2, -r * 0.1, r * 0.3); fs(c, '#ff7a3c');
    ell(c, 0, r * 0.45, r * 0.95, r * 0.5); fs(c, '#ff7a3c');
    eye(c, -r * 0.3, r * 0.4, r * 0.2, 0.3); eye(c, r * 0.3, r * 0.4, r * 0.2, 0.3);
    c.beginPath(); c.arc(0, r * 0.15, r * 1.0, Math.PI, 0); c.closePath(); fs(c, '#c3ccd6');
    rr(c, -r * 1.1, r * 0.05, r * 2.2, r * 0.22, 3); fs(c, '#8d99a6');
    circ(c, 0, -r * 0.95, r * 0.18); fs(c, '#3b4350');
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 4; c.beginPath(); c.arc(0, r * 0.15, r * 0.72, 3.5, 4.4); c.stroke();
  },
  // Fromage-papillon (volant)
  flying(c, r) {
    ell(c, -r * 0.55, -r * 0.55, r * 0.75, r * 0.5, -0.6); fs(c, '#ff8fc7');
    ell(c, -r * 0.6, r * 0.4, r * 0.6, r * 0.4, 0.6); fs(c, '#8fe3ff');
    poly(c, [[-r * 0.8, r * 0.55], [r * 1.05, r * 0.1], [-r * 0.5, -r * 0.7]]); fs(c, '#ffd23f');
    c.fillStyle = '#e0a800';
    circ(c, -r * 0.35, -r * 0.15, r * 0.16); c.fill(); circ(c, -r * 0.1, r * 0.25, r * 0.11); c.fill(); circ(c, -r * 0.55, r * 0.3, r * 0.09); c.fill();
    eye(c, r * 0.35, r * 0.02, r * 0.2);
    c.lineWidth = 2.5; c.strokeStyle = OUT; c.beginPath(); c.moveTo(r * 0.2, -r * 0.3); c.quadraticCurveTo(r * 0.5, -r * 1.0, r * 0.9, -r * 0.8); c.stroke();
    circ(c, r * 0.9, -r * 0.8, r * 0.1); c.fillStyle = OUT; c.fill();
  },
  // Poulpe-tasse d'espresso (soigneur)
  healer(c, r) {
    for (let i = 0; i < 4; i++) { const x = -r * 0.6 + i * r * 0.4; limb(c, x, r * 0.3, x + (i % 2 ? 3 : -3), r * 0.95, '#b05cff', 4); }
    c.beginPath(); c.arc(r * 0.85, -r * 0.1, r * 0.32, -1.4, 1.4); c.lineWidth = 8; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke();
    poly(c, [[-r * 0.85, -r * 0.6], [r * 0.85, -r * 0.6], [r * 0.65, r * 0.45], [-r * 0.65, r * 0.45]]); fs(c, '#fff');
    ell(c, 0, -r * 0.6, r * 0.85, r * 0.2); fs(c, '#6b3e1e');
    c.fillStyle = '#2ecc71'; c.fillRect(-r * 0.12, -r * 0.3, r * 0.24, r * 0.6); c.fillRect(-r * 0.3, -r * 0.12, r * 0.6, r * 0.24);
    eye(c, -r * 0.48, -r * 0.1, r * 0.15, 0.2); eye(c, r * 0.48, -r * 0.1, r * 0.15, 0.2);
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-r * 0.2, -r * 0.85); c.quadraticCurveTo(-r * 0.4, -r * 1.1, -r * 0.15, -r * 1.3); c.stroke();
    c.beginPath(); c.moveTo(r * 0.2, -r * 0.85); c.quadraticCurveTo(0, -r * 1.1, r * 0.25, -r * 1.3); c.stroke();
  },
  // Pastèque-matriochka (se divise)
  splitter(c, r) {
    ell(c, 0, r * 0.25, r * 0.9, r * 0.8); fs(c, '#3fae49');
    circ(c, 0, -r * 0.6, r * 0.55); fs(c, '#3fae49');
    c.strokeStyle = '#256b2c'; c.lineWidth = 3;
    for (const x of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(r * x, r * 0.95); c.quadraticCurveTo(r * x * 1.5, r * 0.3, r * x, -r * 0.35); c.stroke(); }
    circ(c, 0, -r * 0.58, r * 0.36); fs(c, '#ff6b81', 2.5);
    circ(c, -r * 0.13, -r * 0.63, r * 0.06); c.fillStyle = OUT; c.fill(); circ(c, r * 0.13, -r * 0.63, r * 0.06); c.fill();
    c.beginPath(); c.arc(0, -r * 0.5, r * 0.1, 0.2, 2.9); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    c.setLineDash([4, 4]); c.beginPath(); c.moveTo(-r * 0.88, r * 0.15); c.lineTo(r * 0.88, r * 0.15); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
  },
  // Tranche de pastèque (mini)
  mini(c, r) {
    c.beginPath(); c.arc(0, -r * 0.3, r * 1.0, 0, Math.PI); c.closePath(); fs(c, '#3fae49');
    c.beginPath(); c.arc(0, -r * 0.3, r * 0.75, 0, Math.PI); c.closePath(); c.fillStyle = '#ff6b81'; c.fill();
    circ(c, -r * 0.3, 0, r * 0.12); c.fillStyle = OUT; c.fill(); circ(c, r * 0.3, 0, r * 0.12); c.fill();
  },
  // Méduse-abat-jour (invisible)
  stealth(c, r) {
    for (let i = 0; i < 4; i++) { const x = -r * 0.55 + i * r * 0.37; limb(c, x, r * 0.2, x + (i % 2 ? 4 : -4), r * 1.0, '#c9b6ff', 3); }
    circ(c, 0, r * 0.25, r * 0.3); fs(c, '#fff7a8', 2.5);
    poly(c, [[-r * 0.5, -r * 0.9], [r * 0.5, -r * 0.9], [r * 1.0, r * 0.2], [-r * 1.0, r * 0.2]]); fs(c, '#9d8cff');
    c.fillStyle = '#ffd23f'; for (let i = 0; i < 5; i++) { circ(c, -r * 0.8 + i * r * 0.4, r * 0.24, r * 0.1); c.fill(); }
    eye(c, -r * 0.25, -r * 0.3, r * 0.2, 0.3); eye(c, r * 0.3, -r * 0.3, r * 0.2, 0.3);
    rr(c, -r * 0.12, -r * 1.15, r * 0.24, r * 0.28, 2); fs(c, '#6c5ce7', 2.5);
  },
  // BOSS 1 : morse-accordéon
  boss1(c, r) {
    ell(c, -r * 0.85, r * 0.55, r * 0.35, r * 0.2, -0.4); fs(c, '#8a5a3c');
    rr(c, -r * 0.75, -r * 0.6, r * 0.9, r * 1.3, 6); fs(c, '#f4f1e6');
    c.strokeStyle = OUT; c.lineWidth = 3;
    for (let i = 1; i < 6; i++) { const x = -r * 0.75 + i * r * 0.15; c.beginPath(); c.moveTo(x, -r * 0.6); c.lineTo(x, r * 0.7); c.stroke(); }
    rr(c, -r * 1.0, -r * 0.7, r * 0.3, r * 1.5, 5); fs(c, '#d63031');
    c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { circ(c, -r * 0.85, -r * 0.45 + i * r * 0.32, r * 0.07); c.fill(); }
    ell(c, r * 0.35, 0, r * 0.75, r * 0.85); fs(c, '#a9714b', 4);
    ell(c, r * 0.7, r * 0.2, r * 0.42, r * 0.34); fs(c, '#d9a57c');
    poly(c, [[r * 0.5, r * 0.4], [r * 0.62, r * 1.05], [r * 0.72, r * 0.42]]); fs(c, '#fffbe8');
    poly(c, [[r * 0.8, r * 0.4], [r * 0.95, r * 1.0], [r * 1.02, r * 0.36]]); fs(c, '#fffbe8');
    circ(c, r * 0.95, r * 0.02, r * 0.1); c.fillStyle = OUT; c.fill();
    eye(c, r * 0.3, -r * 0.35, r * 0.16); eye(c, r * 0.7, -r * 0.35, r * 0.16);
    angry(c, r * 0.3, -r * 0.37, r * 0.16);
    c.strokeStyle = OUT; c.lineWidth = 2; for (const y of [0.12, 0.22, 0.32]) { c.beginPath(); c.moveTo(r * 0.45, r * y); c.lineTo(r * 0.2, r * (y + 0.05)); c.stroke(); }
  },
  // BOSS 2 : gorille machine à laver
  boss2(c, r) {
    limb(c, -r * 0.5, -r * 0.2, -r * 1.0, r * 0.7, '#3a3a4a', 12);
    limb(c, r * 0.6, -r * 0.2, r * 1.05, r * 0.7, '#3a3a4a', 12);
    circ(c, -r * 1.0, r * 0.75, r * 0.2); fs(c, '#55556a'); circ(c, r * 1.05, r * 0.75, r * 0.2); fs(c, '#55556a');
    ell(c, r * 0.15, -r * 0.85, r * 0.48, r * 0.42); fs(c, '#3a3a4a', 4);
    ell(c, r * 0.3, -r * 0.75, r * 0.3, r * 0.24); fs(c, '#8d8da3');
    eye(c, r * 0.12, -r * 0.95, r * 0.11); eye(c, r * 0.45, -r * 0.95, r * 0.11);
    angry(c, r * 0.12, -r * 0.97, r * 0.12);
    c.beginPath(); c.moveTo(r * 0.15, -r * 0.68); c.lineTo(r * 0.5, -r * 0.68); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    rr(c, -r * 0.72, -r * 0.5, r * 1.44, r * 1.5, 8); fs(c, '#f1f4f8', 4);
    rr(c, -r * 0.72, -r * 0.5, r * 1.44, r * 0.3, [8, 8, 0, 0]); fs(c, '#cfd6df');
    circ(c, -r * 0.5, -r * 0.35, r * 0.08); fs(c, '#e84a3c', 2); circ(c, -r * 0.25, -r * 0.35, r * 0.08); fs(c, '#4cd137', 2);
    rr(c, r * 0.1, -r * 0.42, r * 0.45, r * 0.14, 3); fs(c, '#1d1a2b', 2);
    circ(c, 0, r * 0.3, r * 0.5); fs(c, '#8d99a6', 4);
    circ(c, 0, r * 0.3, r * 0.37); fs(c, '#3d9dfc');
    c.strokeStyle = '#d6f0ff'; c.lineWidth = 4; c.beginPath(); c.arc(0, r * 0.3, r * 0.22, 0.5, 2.5); c.stroke();
    c.beginPath(); c.arc(0, r * 0.3, r * 0.22, 3.6, 5.2); c.stroke();
  },
  // BOSS 3 : dragon-cannolo
  boss3(c, r) {
    poly(c, [[-r * 0.3, -r * 0.3], [-r * 0.9, -r * 1.2], [-r * 0.45, -r * 0.95], [-r * 0.2, -r * 1.25], [r * 0.1, -r * 0.9], [r * 0.35, -r * 1.1], [r * 0.3, -r * 0.3]]); fs(c, '#e84a3c', 4);
    poly(c, [[-r * 0.7, 0], [-r * 1.25, -r * 0.25], [-r * 1.05, r * 0.05], [-r * 1.25, r * 0.4], [-r * 0.7, r * 0.3]]); fs(c, '#4cd137');
    limb(c, -r * 0.4, r * 0.4, -r * 0.45, r * 0.85, '#4cd137', 8); limb(c, r * 0.25, r * 0.4, r * 0.3, r * 0.85, '#4cd137', 8);
    rr(c, -r * 0.8, -r * 0.4, r * 1.45, r * 0.85, r * 0.3); fs(c, '#d99a48', 4);
    c.strokeStyle = '#a86a22'; c.lineWidth = 3;
    for (let i = 0; i < 5; i++) { const x = -r * 0.6 + i * r * 0.26; c.beginPath(); c.moveTo(x, -r * 0.35); c.lineTo(x + r * 0.2, r * 0.4); c.stroke(); }
    circ(c, -r * 0.8, r * 0.02, r * 0.3); fs(c, '#fffbe8');
    circ(c, -r * 0.82, -r * 0.05, r * 0.07); c.fillStyle = '#e84a3c'; c.fill(); circ(c, -r * 0.7, r * 0.12, r * 0.06); c.fillStyle = '#4cd137'; c.fill();
    rr(c, r * 0.35, -r * 0.6, r * 0.8, r * 0.75, r * 0.22); fs(c, '#4cd137', 4);
    rr(c, r * 0.75, -r * 0.2, r * 0.5, r * 0.36, r * 0.12); fs(c, '#7be36a');
    poly(c, [[r * 0.5, -r * 0.6], [r * 0.4, -r * 0.95], [r * 0.7, -r * 0.6]]); fs(c, '#fffbe8'); poly(c, [[r * 0.85, -r * 0.6], [r * 0.85, -r * 0.95], [r * 1.05, -r * 0.58]]); fs(c, '#fffbe8');
    eye(c, r * 0.72, -r * 0.35, r * 0.15); angry(c, r * 0.72, -r * 0.37, r * 0.16);
    circ(c, r * 1.15, -r * 0.1, r * 0.05); c.fillStyle = OUT; c.fill();
    poly(c, [[r * 0.85, r * 0.16], [r * 0.92, r * 0.34], [r * 1.0, r * 0.16]]); fs(c, '#fff', 2); poly(c, [[r * 1.05, r * 0.16], [r * 1.12, r * 0.32], [r * 1.2, r * 0.16]]); fs(c, '#fff', 2);
  },
};

const cache = new Map();
export function enemySprite(type) {
  if (cache.has(type)) return cache.get(type);
  const r = ENEMIES[type].r, S = 2, half = Math.ceil(r * 1.7 + 6);
  const cv = document.createElement('canvas'); cv.width = cv.height = half * 2 * S;
  const c = cv.getContext('2d'); c.scale(S, S); c.translate(half, half); c.lineJoin = 'round'; c.lineCap = 'round';
  SPR[type](c, r);
  const white = document.createElement('canvas'); white.width = white.height = cv.width;
  const w = white.getContext('2d'); w.drawImage(cv, 0, 0); w.globalCompositeOperation = 'source-in'; w.fillStyle = '#fff'; w.fillRect(0, 0, cv.width, cv.height);
  const o = { cv, white, half };
  cache.set(type, o); return o;
}

// Petite icône <canvas> d'un ennemi pour l'UI
export function enemyIcon(type, size = 34) {
  const s = enemySprite(type);
  const cv = document.createElement('canvas'); cv.width = cv.height = size * 2; cv.style.width = cv.style.height = size + 'px';
  cv.getContext('2d').drawImage(s.cv, 0, 0, size * 2, size * 2);
  return cv;
}

// --- Armes --------------------------------------------------------------------
const BASE_PAL = { metal: '#6c7888', dark: '#2f3640', wood: '#a0643a', glow: null };
export function skinPalette(skinId) {
  const s = SHOP.skins.find((k) => k.id === skinId);
  return { ...BASE_PAL, ...(s && s.pal ? s.pal : {}) };
}

// Dessine l'arme pointée vers +x, centrée sur la tourelle.
// o : { pal, accent, recoil, t, spin, barrels, armed, pump }
export function drawGun(c, type, o) {
  const p = o.pal, acc = o.accent;
  c.lineJoin = 'round';
  c.save();
  if (type !== 'cryo' && type !== 'mine') c.translate(-(o.recoil || 0), 0);
  switch (type) {
    case 'assault':
      rr(c, -25, -4, 13, 8, 2); fs(c, p.wood);
      rr(c, 9, -2.5, 21, 5, 1.5); fs(c, p.dark);
      rr(c, -3, 3, 8, 12, 2); fs(c, p.dark);
      rr(c, -14, -6.5, 25, 13, 3); fs(c, p.metal);
      rr(c, -10, -3.5, 13, 4, 1.5); c.fillStyle = acc; c.fill();
      rr(c, 2, -9, 6, 4, 1); fs(c, p.dark, 2);
      break;
    case 'smg': {
      const n = o.barrels || 1;
      for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * 7; rr(c, 6, y - 2.2, 18, 4.4, 1.5); fs(c, p.dark, 2.5); }
      rr(c, -2, 2, 6, 15, 2); fs(c, p.dark);
      rr(c, -14, -6 - (n - 1) * 2, 22, 12 + (n - 1) * 4, 4); fs(c, p.metal);
      rr(c, -20, -3, 8, 6, 2); fs(c, p.wood);
      circ(c, -4, 0, 3); c.fillStyle = acc; c.fill();
      break;
    }
    case 'shotgun':
      rr(c, -27, -5, 15, 10, 3); fs(c, p.wood);
      rr(c, 4, -4.5, 25, 9, 2); fs(c, p.dark);
      rr(c, -14, -6.5, 20, 13, 3); fs(c, p.metal);
      rr(c, 8 - (o.pump || 0) * 7, -6, 11, 12, 3); fs(c, p.wood);
      rr(c, -10, -3, 9, 6, 2); c.fillStyle = acc; c.fill();
      break;
    case 'sniper':
      rr(c, -28, -4, 14, 8, 2); fs(c, p.wood);
      rr(c, 6, -2, 38, 4, 1.5); fs(c, p.dark, 2.5);
      rr(c, 38, -3.5, 7, 7, 1.5); fs(c, p.dark, 2.5);
      rr(c, -16, -5.5, 26, 11, 3); fs(c, p.metal);
      rr(c, -10, -11, 20, 7, 3); fs(c, p.dark);
      circ(c, 10, -7.5, 3.5); fs(c, acc, 2);
      break;
    case 'rocket':
      poly(c, [[-26, -11], [-16, -7], [-16, 7], [-26, 11]]); fs(c, p.dark);
      rr(c, -17, -8, 44, 16, 4); fs(c, p.metal);
      rr(c, -6, -8, 8, 16, 0); c.fillStyle = acc; c.fill(); c.stroke();
      if (o.loaded !== false) { poly(c, [[27, -6], [36, 0], [27, 6]]); fs(c, '#e84a3c'); }
      rr(c, 2, 7, 7, 8, 2); fs(c, p.dark);
      break;
    case 'minigun': {
      rr(c, -22, -10, 20, 20, 4); fs(c, p.metal);
      rr(c, -18, 8, 14, 9, 2); fs(c, p.wood);
      rr(c, -3, -8, 37, 16, 3); fs(c, p.dark);
      const ph = (o.spin || 0);
      c.strokeStyle = p.metal; c.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) { const y = Math.sin(ph + i * 2.094) * 5.5; c.beginPath(); c.moveTo(0, y); c.lineTo(33, y); c.stroke(); }
      rr(c, 8, -9, 5, 18, 1.5); fs(c, acc, 2.5); rr(c, 27, -9, 5, 18, 1.5); fs(c, p.metal, 2.5);
      break;
    }
    case 'cryo': {
      const pulse = 1 + Math.sin((o.t || 0) * 4) * 0.06;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + (o.t || 0) * 0.6; poly(c, [[Math.cos(a - 0.25) * 9, Math.sin(a - 0.25) * 9], [Math.cos(a) * 19 * pulse, Math.sin(a) * 19 * pulse], [Math.cos(a + 0.25) * 9, Math.sin(a + 0.25) * 9]]); fs(c, '#bdf3ff', 2.5); }
      circ(c, 0, 0, 12); fs(c, p.metal);
      circ(c, 0, 0, 7); fs(c, '#5fd8ff', 2.5);
      circ(c, -2, -2, 2.5); c.fillStyle = '#fff'; c.fill();
      c.beginPath(); c.arc(0, 0, 12, 0.5, 2); c.strokeStyle = acc; c.lineWidth = 3; c.stroke();
      break;
    }
    case 'mine': {
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; poly(c, [[Math.cos(a - 0.2) * 11, Math.sin(a - 0.2) * 11], [Math.cos(a) * 17, Math.sin(a) * 17], [Math.cos(a + 0.2) * 11, Math.sin(a + 0.2) * 11]]); fs(c, p.dark, 2.5); }
      circ(c, 0, 0, 12.5); fs(c, p.metal);
      c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.strokeStyle = acc; c.lineWidth = 3; c.stroke();
      const on = o.armed && Math.sin((o.t || 0) * 8) > 0;
      circ(c, 0, 0, 4.5); fs(c, o.armed ? (on ? '#ff3b3b' : '#8a1f1f') : '#444', 2.5);
      break;
    }
  }
  c.restore();
}

// Socle d'une tourelle (anneau coloré selon la rareté)
export function drawTowerBase(c, level) {
  const col = RARITY[level - 1].color, R = GAME.towerRadius;
  ell(c, 0, 5, R, R * 0.85); c.fillStyle = 'rgba(0,0,0,.25)'; c.fill();
  circ(c, 0, 0, R - 1); fs(c, '#3a4150', 3.5);
  circ(c, 0, 0, R - 5); c.strokeStyle = col; c.lineWidth = 4; c.stroke();
  circ(c, 0, 0, R - 9); c.fillStyle = '#566074'; c.fill();
}

// Icône d'arme pour la barre de tourelles
export function towerIcon(type, size = 56, skin = 'default', level = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size * 2; cv.style.width = cv.style.height = size + 'px';
  const c = cv.getContext('2d'); c.scale(size * 2 / 72, size * 2 / 72); c.translate(36, 36);
  const noBase = type === 'mine';
  if (!noBase) drawTowerBase(c, level);
  c.rotate(type === 'cryo' || type === 'mine' ? 0 : -0.5);
  const len = TOWER_VISUAL[type].muzzle; if (len > 34) c.scale(0.82, 0.82);
  drawGun(c, type, { pal: skinPalette(skin), accent: RARITY[level - 1].color, t: 0, armed: true, spin: 0 });
  return cv;
}
