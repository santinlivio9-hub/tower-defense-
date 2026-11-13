// Cartes en portrait (600 x 1000) : les brainrots entrent par le haut, la base est en bas.
import { VIEW, GAME } from './config.js';

const INK = '#3d2c4e';

export const MAPS = [
  {
    id: 'prairie', name: 'Prairie Pesto', unlock: null, hp: 1,          // hp = multiplicateur de PV des ennemis sur cette carte
    desc: 'Un chemin en lacets. Idéal pour débuter.',
    theme: {
      g1: '#8ed85f', g2: '#74c94a', g3: '#5fb53c', path: '#f3dba6', path2: '#e6c486', edge: '#b98a47',
      deco: 'meadow', flower: ['#ff7eb6', '#ffe45c', '#ffffff'], cloud: 'rgba(40,90,30,0.10)',
    },
    paths: [[[110, -60], [110, 170], [490, 170], [490, 390], [110, 390], [110, 610], [490, 610], [490, 800], [300, 800], [300, 905]]],
  },
  {
    id: 'desert', name: 'Désert Tiramisu', unlock: 'prairie', hp: 1.25,
    desc: 'Un long détour entre les dunes.',
    theme: {
      g1: '#f6d58c', g2: '#efc673', g3: '#e2b25c', path: '#c9935a', path2: '#b98249', edge: '#7f5330',
      deco: 'desert', flower: ['#ff8a5c', '#fff3c4', '#ffd23f'], cloud: 'rgba(120,80,20,0.10)',
    },
    paths: [[[90, -60], [90, 330], [250, 330], [250, 110], [510, 110], [510, 520], [90, 520], [90, 740], [510, 740], [510, 905], [300, 905]]],
  },
  {
    id: 'volcano', name: 'Volcan Gelato', unlock: 'desert', hp: 1,
    desc: 'Deux portails, deux chemins qui se rejoignent devant la base.',
    theme: {
      g1: '#75608a', g2: '#665179', g3: '#56436a', path: '#f7bfd0', path2: '#eda6bd', edge: '#8f3f5e',
      deco: 'volcano', flower: ['#8ff0e0', '#ffd23f', '#ff7a5c'], cloud: 'rgba(20,10,30,0.14)',
    },
    paths: [
      [[90, -60], [90, 200], [250, 200], [250, 400], [90, 400], [90, 620], [300, 620], [300, 905]],
      [[510, -60], [510, 200], [350, 200], [350, 400], [510, 400], [510, 620], [300, 620], [300, 905]],
    ],
  },
];

export const getMap = (id) => MAPS.find((m) => m.id === id);

export class Path {
  constructor(pts) {
    this.pts = pts.map(([x, y]) => ({ x, y }));
    this.segs = [];
    let total = 0;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.segs.push({ a, b, len, start: total, ang: Math.atan2(b.y - a.y, b.x - a.x) });
      total += len;
    }
    this.total = total;
    this.end = this.pts[this.pts.length - 1];
    this.startPt = this.pts[0];
  }
  pointAt(d) {
    d = Math.max(0, Math.min(this.total, d));
    let s = this.segs[this.segs.length - 1];
    for (const seg of this.segs) { if (d <= seg.start + seg.len) { s = seg; break; } }
    const t = s.len ? (d - s.start) / s.len : 0;
    return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, ang: s.ang };
  }
  // Point du chemin le plus proche : { x, y, d (distance parcourue), dist }
  nearest(x, y) {
    let best = { dist: Infinity };
    for (const s of this.segs) {
      const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
      let t = s.len ? ((x - s.a.x) * dx + (y - s.a.y) * dy) / (s.len * s.len) : 0;
      t = Math.max(0, Math.min(1, t));
      const px = s.a.x + dx * t, py = s.a.y + dy * t;
      const dist = Math.hypot(x - px, y - py);
      if (dist < best.dist) best = { x: px, y: py, d: s.start + s.len * t, dist };
    }
    return best;
  }
}

// Générateur pseudo-aléatoire déterministe
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

function strokePaths(c, paths, width, color, dx = 0, dy = 0) {
  c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round';
  for (const p of paths) {
    c.beginPath();
    p.pts.forEach((pt, i) => (i ? c.lineTo(pt.x + dx, pt.y + dy) : c.moveTo(pt.x + dx, pt.y + dy)));
    c.stroke();
  }
}
const blob = (c, x, y, r, fill, lw = 3) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = fill; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); } };

// Éléments de décor statiques
const DECO = {
  bush(c, t) { c.lineWidth = 3; c.strokeStyle = INK; c.beginPath(); c.arc(-9, 3, 10, 0, 7); c.arc(9, 3, 10, 0, 7); c.arc(0, -7, 12, 0, 7); c.fillStyle = '#3f9e3c'; c.stroke(); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(-4, -11, 4, 0, 7); c.fill(); },
  rock(c) { c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.fillStyle = '#b9b3c6'; c.beginPath(); c.moveTo(-13, 8); c.lineTo(-8, -7); c.lineTo(5, -10); c.lineTo(14, 6); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(-6, -4); c.lineTo(3, -7); c.lineTo(1, -1); c.closePath(); c.fill(); },
  cactus(c) { c.lineWidth = 3; c.strokeStyle = INK; c.fillStyle = '#4fae5a'; c.beginPath(); c.roundRect(-6, -20, 12, 30, 6); c.fill(); c.stroke(); c.beginPath(); c.roundRect(-16, -8, 9, 14, 4); c.fill(); c.stroke(); c.beginPath(); c.roundRect(7, -13, 9, 14, 4); c.fill(); c.stroke(); blob(c, 0, -21, 3.5, '#ff7eb6', 2); },
  dune(c) { c.fillStyle = 'rgba(160,110,40,.18)'; c.beginPath(); c.ellipse(0, 0, 34, 9, 0, Math.PI, 0); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 30, 8, 0, Math.PI * 1.1, Math.PI * 1.7); c.stroke(); },
  crystal(c) { c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.fillStyle = '#8ff0e0'; c.beginPath(); c.moveTo(0, -18); c.lineTo(8, -4); c.lineTo(4, 10); c.lineTo(-5, 10); c.lineTo(-8, -3); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(-1, -12); c.lineTo(3, -4); c.lineTo(-3, -2); c.closePath(); c.fill(); },
  lava(c) { c.fillStyle = 'rgba(255,120,60,.3)'; c.beginPath(); c.ellipse(0, 0, 22, 12, 0, 0, 7); c.fill(); c.fillStyle = '#ff7a3c'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 15, 8, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(-3, -1, 6, 3, 0, 0, 7); c.fill(); },
};
const DECO_SETS = { meadow: ['bush', 'bush', 'rock'], desert: ['cactus', 'dune', 'rock', 'dune'], volcano: ['crystal', 'lava', 'rock'] };

// Positions libres pour le décor (ni sur le chemin, ni sur la base)
function decoSpots(map, paths, rnd, n, margin) {
  const out = [], base = paths[0].end;
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const x = 24 + rnd() * (VIEW.W - 48), y = 24 + rnd() * (VIEW.H - 48);
    if (paths.some((p) => p.nearest(x, y).dist < GAME.pathWidth / 2 + margin)) continue;
    if (Math.hypot(x - base.x, y - base.y) < 110) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < 34)) continue;
    out.push({ x, y, s: 0.75 + rnd() * 0.5, k: rnd() });
  }
  return out;
}

// Fleurs animées (dessinées à chaque image par drawMapAnimated)
export function mapFlowers(map, paths) {
  return decoSpots(map, paths, mulberry32(hashStr(map.id) + 77), 16, 20);
}

// Fond statique d'une carte (mis en cache par le jeu dans un canvas hors écran)
export function drawMapBackground(c, map, paths) {
  const { W, H } = VIEW, t = map.theme, rnd = mulberry32(hashStr(map.id)), pw = GAME.pathWidth;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, t.g1); g.addColorStop(1, t.g2);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // grandes taches + damier doux
  for (let i = 0; i < 36; i++) { c.fillStyle = i % 2 ? t.g3 : t.g1; c.globalAlpha = 0.35; c.beginPath(); c.ellipse(rnd() * W, rnd() * H, 40 + rnd() * 70, 22 + rnd() * 34, rnd() * 3, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  // texture : brins d'herbe / grains
  c.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const x = rnd() * W, y = rnd() * H;
    c.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.10)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 5, y - 4 - rnd() * 5); c.stroke();
  }
  // chemin : ombre portée, bordure, surface, bande claire, pointillés
  strokePaths(c, paths, pw + 16, 'rgba(0,0,0,.20)', 0, 7);
  strokePaths(c, paths, pw + 14, INK);
  strokePaths(c, paths, pw + 8, t.edge);
  strokePaths(c, paths, pw, t.path2);
  strokePaths(c, paths, pw - 12, t.path);
  for (const p of paths) for (let d = 30; d < p.total; d += 26 + rnd() * 30) {
    const q = p.pointAt(d), o = (rnd() - 0.5) * (pw - 22);
    c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.35)';
    c.beginPath(); c.ellipse(q.x - Math.sin(q.ang) * o, q.y + Math.cos(q.ang) * o, 3 + rnd() * 3, 2 + rnd() * 2, rnd() * 3, 0, 7); c.fill();
  }
  c.setLineDash([3, 20]); strokePaths(c, paths, 4, 'rgba(0,0,0,.12)'); c.setLineDash([]);
  // décor
  const set = DECO_SETS[t.deco];
  for (const s of decoSpots(map, paths, rnd, 26, 30)) {
    c.save(); c.translate(s.x, s.y); c.scale(s.s, s.s);
    c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(0, 11, 15, 5, 0, 0, 7); c.fill();
    DECO[set[Math.floor(s.k * set.length)]](c); c.restore();
  }
  drawBase(c, paths[0].end);
}

// Base : petite forteresse-pizzeria, centrée sur la fin du chemin
function drawBase(c, b) {
  c.save(); c.translate(b.x, b.y + 4);
  c.lineWidth = 4; c.strokeStyle = INK; c.lineJoin = 'round';
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, 50, 70, 15, 0, 0, 7); c.fill();
  for (const k of [-1, 1]) { // tourelles latérales
    c.fillStyle = '#ffe9c2'; c.beginPath(); c.roundRect(k * 58 - 14, -34, 28, 82, 6); c.fill(); c.stroke();
    c.fillStyle = '#ff5d6c'; c.beginPath(); c.moveTo(k * 58 - 20, -32); c.lineTo(k * 58, -64); c.lineTo(k * 58 + 20, -32); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#8fe3ff'; c.beginPath(); c.roundRect(k * 58 - 6, -18, 12, 16, 5); c.fill(); c.stroke();
  }
  const g = c.createLinearGradient(0, -30, 0, 50); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#f1d9ae');
  c.fillStyle = g; c.beginPath(); c.roundRect(-46, -26, 92, 74, 8); c.fill(); c.stroke();
  const r = c.createLinearGradient(0, -80, 0, -24); r.addColorStop(0, '#ff8a7a'); r.addColorStop(1, '#e8443c');
  c.fillStyle = r; c.beginPath(); c.moveTo(-58, -24); c.lineTo(0, -78); c.lineTo(58, -24); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#fff'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * 28, -25, 10, 0, Math.PI); c.fill(); c.stroke(); }
  c.fillStyle = '#8a5530'; c.beginPath(); c.roundRect(-15, 6, 30, 42, [14, 14, 0, 0]); c.fill(); c.stroke();
  blob(c, 8, 28, 2.5, '#ffd23f', 0);
  c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, -46, 9, 0, 7); c.fill(); c.stroke(); // enseigne pizza
  blob(c, -3, -48, 2, '#e8443c', 0); blob(c, 3, -44, 2, '#e8443c', 0);
  c.restore();
}

// Éléments animés : portails, fleurs qui se balancent, ombres de nuages
export function drawMapAnimated(c, map, paths, flowers, time) {
  const t = map.theme;
  for (const f of flowers) {
    const sway = Math.sin(time * 1.6 + f.x * 0.05) * 0.22;
    c.save(); c.translate(f.x, f.y); c.scale(f.s, f.s);
    c.strokeStyle = '#2f7d32'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 10); c.quadraticCurveTo(sway * 20, 2, sway * 30, -6); c.stroke();
    c.translate(sway * 30, -6); c.rotate(sway);
    const col = t.flower[Math.floor(f.k * t.flower.length)];
    c.lineWidth = 2; c.strokeStyle = INK;
    for (let j = 0; j < 5; j++) { const a = (j / 5) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 4.2, 0, 7); c.fillStyle = col; c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, 0, 3.6, 0, 7); c.fillStyle = '#ffb21a'; c.fill(); c.stroke();
    c.restore();
  }
  // portails (en haut)
  for (const p of paths) {
    const x = p.startPt.x, y = 16, pulse = 1 + Math.sin(time * 4) * 0.05;
    c.save(); c.translate(x, y);
    c.fillStyle = INK; c.beginPath(); c.ellipse(0, 0, 50 * pulse, 21, 0, 0, 7); c.fill();
    const g = c.createRadialGradient(0, 0, 4, 0, 0, 44); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#e2b8ff'); g.addColorStop(1, '#7b2ff7');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 44 * pulse, 16, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const a = time * 3 + i * 2.1; c.beginPath(); c.ellipse(0, 0, 30 - i * 8, 10 - i * 2.6, 0, a, a + 1.6); c.stroke(); }
    c.restore();
  }
}
export function drawClouds(c, map, time) {
  c.fillStyle = map.theme.cloud;
  for (let i = 0; i < 3; i++) {
    const x = ((time * (9 + i * 4) + i * 330) % (VIEW.W + 400)) - 200, y = 140 + i * 310 + Math.sin(time * 0.2 + i) * 30;
    c.beginPath(); c.ellipse(x, y, 110, 46, 0, 0, 7); c.ellipse(x + 70, y + 18, 80, 36, 0, 0, 7); c.ellipse(x - 70, y + 14, 70, 30, 0, 0, 7); c.fill();
  }
}

// Miniature pour l'écran de sélection de carte
export function drawMapPreview(canvas, map) {
  const c = canvas.getContext('2d');
  const paths = map.paths.map((p) => new Path(p));
  c.save();
  c.scale(canvas.width / VIEW.W, canvas.height / VIEW.H);
  drawMapBackground(c, map, paths);
  drawMapAnimated(c, map, paths, mapFlowers(map, paths), 0);
  c.restore();
}
