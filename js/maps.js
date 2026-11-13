// Cartes, chemins et décor de fond.
import { VIEW, GAME } from './config.js';

export const MAPS = [
  {
    id: 'prairie', name: 'Prairie Pesto', unlock: null, hp: 1,          // hp = multiplicateur de PV des ennemis sur cette carte
    desc: 'Un seul chemin sinueux. Idéal pour débuter.',
    colors: { g1: '#7fcf5a', g2: '#6cc04a', path: '#ecd29a', edge: '#a9813f', deco: ['#3e9b3b', '#ff7eb6', '#ffe45c'] },
    paths: [[[-50, 150], [300, 150], [300, 470], [620, 470], [620, 190], [960, 190], [960, 560], [1175, 560]]],
  },
  {
    id: 'desert', name: 'Désert Tiramisu', unlock: 'prairie', hp: 1.35,
    desc: 'Une longue spirale vers le centre.',
    colors: { g1: '#f0c878', g2: '#e6b962', path: '#c98d4e', edge: '#7d5328', deco: ['#4fae5a', '#d9773d', '#fff0c4'] },
    paths: [[[640, -50], [640, 105], [150, 105], [150, 615], [1130, 615], [1130, 255], [400, 255], [400, 445], [850, 445]]],
  },
  {
    id: 'volcano', name: 'Volcan Gelato', unlock: 'desert', hp: 1.1,
    desc: 'Deux chemins qui se rejoignent devant la base.',
    colors: { g1: '#6d5a7a', g2: '#5f4d6c', path: '#f3b7c9', edge: '#8f3f5e', deco: ['#ff7043', '#8ff0e0', '#ffd23f'] },
    paths: [
      [[-50, 125], [380, 125], [380, 325], [760, 325], [760, 140], [1040, 140], [1040, 360], [1185, 360]],
      [[-50, 605], [520, 605], [520, 475], [900, 475], [900, 590], [1040, 590], [1040, 360], [1185, 360]],
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

const OUT = '#1d1a2b';

function strokePaths(c, paths, width, color) {
  c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round';
  for (const p of paths) {
    c.beginPath();
    p.pts.forEach((pt, i) => (i ? c.lineTo(pt.x, pt.y) : c.moveTo(pt.x, pt.y)));
    c.stroke();
  }
}

// Dessine le fond d'une carte (sol, chemin, décor, portails, base) en coordonnées logiques.
export function drawMapBackground(c, map, paths) {
  const { W, H } = VIEW;
  const col = map.colors;
  const rnd = mulberry32(hashStr(map.id));
  c.fillStyle = col.g1; c.fillRect(0, 0, W, H);
  // taches de sol
  c.fillStyle = col.g2;
  for (let i = 0; i < 46; i++) {
    const x = rnd() * W, y = rnd() * H, r = 30 + rnd() * 70;
    c.beginPath(); c.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, Math.PI * 2); c.fill();
  }
  // chemin
  const pw = GAME.pathWidth;
  strokePaths(c, paths, pw + 14, OUT);
  strokePaths(c, paths, pw + 8, col.edge);
  strokePaths(c, paths, pw, col.path);
  c.setLineDash([4, 22]);
  strokePaths(c, paths, 5, 'rgba(0,0,0,0.13)');
  c.setLineDash([]);

  // décor (hors chemin)
  const base = paths[0].end;
  for (let i = 0; i < 70; i++) {
    const x = 20 + rnd() * (W - 40), y = 20 + rnd() * (H - 40), k = rnd(), s = 0.7 + rnd() * 0.7;
    if (paths.some((p) => p.nearest(x, y).dist < pw / 2 + 26)) continue;
    if (Math.hypot(x - base.x, y - base.y) < 90) continue;
    c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = OUT; c.lineJoin = 'round';
    if (k < 0.4) { // buisson / cactus / roche
      c.fillStyle = col.deco[0];
      c.beginPath(); c.arc(-8, 2, 9, 0, 7); c.arc(8, 2, 9, 0, 7); c.arc(0, -6, 11, 0, 7); c.closePath();
      c.stroke(); c.fill();
    } else if (k < 0.7) { // fleur / cristal
      c.fillStyle = col.deco[1];
      for (let j = 0; j < 5; j++) { const a = (j / 5) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 6, Math.sin(a) * 6, 4.5, 0, 7); c.stroke(); c.fill(); }
      c.fillStyle = col.deco[2]; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.stroke(); c.fill();
    } else { // caillou
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.beginPath(); c.moveTo(-10, 6); c.lineTo(-6, -6); c.lineTo(5, -8); c.lineTo(11, 5); c.closePath(); c.stroke(); c.fill();
    }
    c.restore();
  }

  // portails d'entrée
  for (const p of paths) {
    const s = p.pointAt(64);
    c.save(); c.translate(s.x, s.y);
    c.lineWidth = 4; c.strokeStyle = OUT;
    c.fillStyle = '#7b2ff7'; c.beginPath(); c.ellipse(0, 0, 14, 34, s.ang, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#d6b3ff'; c.beginPath(); c.ellipse(0, 0, 7, 22, s.ang, 0, 7); c.fill();
    c.restore();
  }

  // base : petite forteresse-pizzeria
  c.save(); c.translate(base.x + 30, base.y);
  c.lineWidth = 4; c.strokeStyle = OUT; c.lineJoin = 'round';
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(0, 46, 62, 14, 0, 0, 7); c.fill();
  c.fillStyle = '#fff3d6'; c.beginPath(); c.roundRect(-48, -30, 96, 76, 8); c.fill(); c.stroke();
  c.fillStyle = '#e84a3c'; c.beginPath(); c.moveTo(-60, -28); c.lineTo(0, -78); c.lineTo(60, -28); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#fff'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * 26, -30, 9, 0, Math.PI); c.fill(); c.stroke(); }
  c.fillStyle = '#7a4a26'; c.beginPath(); c.roundRect(-14, 4, 28, 42, [12, 12, 0, 0]); c.fill(); c.stroke();
  c.fillStyle = '#8fe3ff'; c.beginPath(); c.roundRect(-40, 0, 18, 18, 4); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(22, 0, 18, 18, 4); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(0, -78); c.lineTo(0, -108); c.stroke();
  c.fillStyle = '#4cd137'; c.beginPath(); c.moveTo(0, -108); c.lineTo(26, -100); c.lineTo(0, -91); c.closePath(); c.fill(); c.stroke();
  c.restore();
}

// Miniature pour l'écran de sélection de carte
export function drawMapPreview(canvas, map) {
  const c = canvas.getContext('2d');
  const paths = map.paths.map((p) => new Path(p));
  c.save();
  c.scale(canvas.width / VIEW.W, canvas.height / VIEW.H);
  drawMapBackground(c, map, paths);
  c.restore();
}
