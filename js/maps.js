// Terrains : thèmes des mondes, tracés, emplacements de tourelles, zones de mines, décor.
// Zone jouable : 600 x 940. Les brainrots sortent d'un portail en haut, le château est en bas.
import { VIEW, GAME } from './config.js';

const INK = '#3d2c4e';

export const THEMES = {
  prairie: { g1: '#8ed85f', g2: '#74c94a', g3: '#5fb53c', path: '#f3dba6', path2: '#e6c486', edge: '#b98a47', deco: 'meadow', flower: ['#ff7eb6', '#ffe45c', '#ffffff'], cloud: 'rgba(40,90,30,0.10)', stem: '#2f7d32' },
  desert:  { g1: '#f6d58c', g2: '#efc673', g3: '#e2b25c', path: '#c9935a', path2: '#b98249', edge: '#7f5330', deco: 'desert', flower: ['#ff8a5c', '#fff3c4', '#ffd23f'], cloud: 'rgba(120,80,20,0.10)', stem: '#5c8a3a' },
  volcano: { g1: '#75608a', g2: '#665179', g3: '#56436a', path: '#f7bfd0', path2: '#eda6bd', edge: '#8f3f5e', deco: 'volcano', flower: ['#8ff0e0', '#ffd23f', '#ff7a5c'], cloud: 'rgba(20,10,30,0.14)', stem: '#3f8f7a' },
  ice:     { g1: '#eaf7ff', g2: '#d3ecfb', g3: '#b9dcf2', path: '#a7bde0', path2: '#93a9d2', edge: '#55679a', deco: 'ice', flower: ['#8fe3ff', '#ffffff', '#c9a6ff'], cloud: 'rgba(40,70,120,0.10)', stem: '#5f9fbf' },
  candy:   { g1: '#ffcfe6', g2: '#ffb6d8', g3: '#f79ac6', path: '#fff3c4', path2: '#ffe39a', edge: '#c9577f', deco: 'candy', flower: ['#ffffff', '#8fe3ff', '#ffd23f'], cloud: 'rgba(140,40,90,0.10)', stem: '#3fae7a' },
};

// Tracés : listes de points [x, y]. Premier point = portail (en haut), dernier = château (300, 850).
const B = [300, 850];
export const LAYOUTS = {
  lacets:   [[[110, 24], [110, 150], [490, 150], [490, 350], [110, 350], [110, 550], [490, 550], [490, 720], [300, 720], B]],
  detour:   [[[90, 24], [90, 300], [250, 300], [250, 110], [510, 110], [510, 480], [90, 480], [90, 680], [300, 680], B]],
  fourche:  [[[90, 24], [90, 190], [250, 190], [250, 380], [90, 380], [90, 590], [300, 590], B], [[510, 24], [510, 190], [350, 190], [350, 380], [510, 380], [510, 590], [300, 590], B]],
  zigzag:   [[[300, 24], [300, 110], [90, 110], [90, 300], [510, 300], [510, 490], [90, 490], [90, 690], [300, 690], B]],
  boucle:   [[[110, 24], [110, 500], [490, 500], [490, 200], [300, 200], B]],
  ygrec:    [[[150, 24], [150, 260], [450, 260], [450, 470], [150, 470], [150, 680], [300, 680], B], [[450, 24], [450, 260], [450, 470], [150, 470], [150, 680], [300, 680], B]],
  serpent:  [[[80, 24], [80, 120], [520, 120], [520, 270], [80, 270], [80, 420], [520, 420], [520, 570], [80, 570], [80, 720], [300, 720], B]],
  croix:    [[[110, 24], [110, 330], [490, 330], [490, 600], [300, 600], B], [[490, 24], [490, 170], [300, 170], B]],
  escalier: [[[90, 24], [90, 160], [230, 160], [230, 330], [370, 330], [370, 500], [510, 500], [510, 690], [300, 690], B]],
  tour:     [[[300, 24], [300, 90], [90, 90], [90, 340], [510, 340], [510, 560], [90, 560], [90, 720], [300, 720], B]],
};

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

// ------------------------------------------------------------------ emplacements
// Placement réfléchi : des candidats dans chaque virage (intérieur et extérieur) et des deux côtés
// des lignes droites, à intervalle régulier ; jamais collés au bord, ni sur le portail, le château
// ou la bande du bas. Choix glouton (couverture du chemin + bonus de virage) avec un écart minimal
// et un quota par bande horizontale, pour une répartition harmonieuse sur toute la carte.
function makeSlots(paths, n) {
  const pw = GAME.pathWidth / 2, base = paths[0].end, reach = 135, off = pw + 34, M = 52, TOP = 74, BOT = VIEW.H - 118;
  const samples = [];
  for (const p of paths) for (let d = 30; d < p.total - 60; d += 12) {
    const q = p.pointAt(d);
    if (!samples.some((s) => Math.abs(s.x - q.x) + Math.abs(s.y - q.y) < 8)) samples.push(q);
  }
  const cands = [];
  const add = (x, y, bonus) => {
    x = Math.round(x); y = Math.round(y);
    if (x < M || x > VIEW.W - M || y < TOP || y > BOT) return;
    let dmin = Infinity; for (const p of paths) dmin = Math.min(dmin, p.nearest(x, y).dist);
    if (dmin < pw + 26 || dmin > pw + 60) return;
    if (Math.hypot(x - base.x, y - base.y) < 125) return;
    if (paths.some((p) => Math.hypot(x - p.startPt.x, y - p.startPt.y) < 90)) return;
    if (cands.some((c) => Math.hypot(c.x - x, c.y - y) < 14)) return;
    cands.push({ x, y, bonus, near: samples.filter((s) => Math.hypot(s.x - x, s.y - y) < reach) });
  };
  for (const p of paths) {
    // virages : sur la bissectrice, côté intérieur (meilleure couverture) et côté extérieur
    for (let i = 1; i < p.pts.length - 1; i++) {
      const A = p.pts[i - 1], P = p.pts[i], C = p.pts[i + 1];
      const u = { x: A.x - P.x, y: A.y - P.y }, v = { x: C.x - P.x, y: C.y - P.y }, lu = Math.hypot(u.x, u.y), lv = Math.hypot(v.x, v.y);
      let bx = u.x / lu + v.x / lv, by = u.y / lu + v.y / lv; const lb = Math.hypot(bx, by) || 1; bx /= lb; by /= lb;
      add(P.x + bx * off * 1.35, P.y + by * off * 1.35, 1.6);
      add(P.x - bx * off * 1.05, P.y - by * off * 1.05, 0.5);
    }
    // lignes droites : des deux côtés, en quinconce, tous les ~95 px
    for (const sg of p.segs) {
      const nx = -Math.sin(sg.ang), ny = Math.cos(sg.ang), k = Math.max(1, Math.floor(sg.len / 48));
      for (let j = 1; j < k; j++) {
        const t = j / k, x = sg.a.x + (sg.b.x - sg.a.x) * t, y = sg.a.y + (sg.b.y - sg.a.y) * t, side = j % 2 ? 1 : -1;
        for (const o of [off, off + 16]) { add(x + nx * o * side, y + ny * o * side, 0.6); add(x - nx * o * side, y - ny * o * side, 0.4); }
      }
    }
  }
  const bands = 4, bandOf = (y) => Math.min(bands - 1, Math.floor(((y - TOP) / (BOT - TOP)) * bands)), quota = Math.ceil(n / bands) + 1, perBand = Array(bands).fill(0);
  const out = [], covered = new Set();
  for (let pass = 0; pass < 2 && out.length < n; pass++) {
    while (out.length < n) {
      let best = null, bv = -1;
      for (const c of cands) {
        if (out.includes(c) || out.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < (pass ? 70 : 80))) continue;
        if (pass === 0 && perBand[bandOf(c.y)] >= quota) continue;
        let v = c.bonus * 6; for (const s of c.near) v += covered.has(s) ? 0.25 : 1;
        const close = out.filter((o) => Math.hypot(o.x - c.x, o.y - c.y) < 140).length; v -= close * 4;   // pas de grappe
        if (v > bv) { bv = v; best = c; }
      }
      if (!best) break;
      out.push(best); perBand[bandOf(best.y)]++;
      for (const s of best.near) covered.add(s);
    }
  }
  return out.map((c, i) => ({ x: c.x, y: c.y, kind: 'tower', rank: i })).sort((a, b) => a.y - b.y || a.x - b.x);
}
// Zones de mines : points marqués sur le chemin, répartis régulièrement
function makeMineSpots(paths, n) {
  const out = [], base = paths[0].end;
  const per = Math.ceil(n / paths.length) + 1;
  for (const p of paths) for (let i = 1; i <= per && out.length < n; i++) {
    const q = p.pointAt((p.total * i) / (per + 1.6));
    if (q.y < 90 || Math.hypot(q.x - base.x, q.y - base.y) < 150) continue;
    if (out.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < 90)) continue;
    out.push({ x: Math.round(q.x), y: Math.round(q.y), kind: 'mine' });
  }
  return out;
}

const fieldCache = new Map();
// Terrain prêt à jouer : chemins, château, socles, zones de mines
export function buildField(layoutId, mirror = false, nSlots = 12, nMines = 5) {
  const key = `${layoutId}|${mirror}|${nSlots}|${nMines}`;
  let f = fieldCache.get(key);
  if (!f) {
    const paths = LAYOUTS[layoutId].map((p) => new Path(p.map(([x, y]) => [mirror ? VIEW.W - x : x, y])));
    f = { key, seed: hashStr(key), paths, base: paths[0].end, slots: makeSlots(paths, nSlots), mines: makeMineSpots(paths, nMines) };
    fieldCache.set(key, f);
  }
  return f;
}

// ------------------------------------------------------------------ dessin
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
  bush(c) { c.lineWidth = 3; c.strokeStyle = INK; c.beginPath(); c.arc(-9, 3, 10, 0, 7); c.arc(9, 3, 10, 0, 7); c.arc(0, -7, 12, 0, 7); c.fillStyle = '#3f9e3c'; c.stroke(); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(-4, -11, 4, 0, 7); c.fill(); },
  tree(c) { c.lineWidth = 3; c.strokeStyle = INK; c.fillStyle = '#8a5530'; c.beginPath(); c.roundRect(-4, 0, 8, 14, 3); c.fill(); c.stroke(); c.fillStyle = '#2f9a45'; c.beginPath(); c.arc(-10, -4, 11, 0, 7); c.arc(10, -4, 11, 0, 7); c.arc(0, -16, 14, 0, 7); c.stroke(); c.fill(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.arc(-5, -20, 5, 0, 7); c.fill(); },
  rock(c) { c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.fillStyle = '#b9b3c6'; c.beginPath(); c.moveTo(-13, 8); c.lineTo(-8, -7); c.lineTo(5, -10); c.lineTo(14, 6); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(-6, -4); c.lineTo(3, -7); c.lineTo(1, -1); c.closePath(); c.fill(); },
  cactus(c) { c.lineWidth = 3; c.strokeStyle = INK; c.fillStyle = '#4fae5a'; c.beginPath(); c.roundRect(-6, -20, 12, 30, 6); c.fill(); c.stroke(); c.beginPath(); c.roundRect(-16, -8, 9, 14, 4); c.fill(); c.stroke(); c.beginPath(); c.roundRect(7, -13, 9, 14, 4); c.fill(); c.stroke(); blob(c, 0, -21, 3.5, '#ff7eb6', 2); },
  dune(c) { c.fillStyle = 'rgba(160,110,40,.18)'; c.beginPath(); c.ellipse(0, 0, 34, 9, 0, Math.PI, 0); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 30, 8, 0, Math.PI * 1.1, Math.PI * 1.7); c.stroke(); },
  crystal(c, col = '#8ff0e0') { c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.fillStyle = col; c.beginPath(); c.moveTo(0, -18); c.lineTo(8, -4); c.lineTo(4, 10); c.lineTo(-5, 10); c.lineTo(-8, -3); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(-1, -12); c.lineTo(3, -4); c.lineTo(-3, -2); c.closePath(); c.fill(); },
  lava(c) { c.fillStyle = 'rgba(255,120,60,.3)'; c.beginPath(); c.ellipse(0, 0, 22, 12, 0, 0, 7); c.fill(); c.fillStyle = '#ff7a3c'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 15, 8, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(-3, -1, 6, 3, 0, 0, 7); c.fill(); },
  pine(c) { c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.fillStyle = '#8a5530'; c.beginPath(); c.roundRect(-3, 4, 6, 10, 2); c.fill(); c.stroke(); for (const [y, w] of [[6, 15], [-4, 12], [-13, 9]]) { c.fillStyle = '#3f9f8f'; c.beginPath(); c.moveTo(-w, y); c.lineTo(0, y - 16); c.lineTo(w, y); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-w * 0.45, y - 9); c.lineTo(0, y - 16); c.lineTo(w * 0.45, y - 9); c.closePath(); c.fill(); } },
  snow(c) { c.fillStyle = '#fff'; c.strokeStyle = 'rgba(85,103,154,.45)'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 4, 20, 9, 0, Math.PI, 0); c.fill(); c.stroke(); c.beginPath(); c.ellipse(8, 5, 10, 5, 0, Math.PI, 0); c.fill(); c.stroke(); },
  icecube(c) { DECO.crystal(c, '#bfeaff'); },
  lollipop(c, k = 0) { c.lineWidth = 3; c.strokeStyle = INK; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -4); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke(); c.strokeStyle = INK; c.lineWidth = 3; blob(c, 0, -10, 11, ['#ff5d8f', '#5fd8ff', '#ffd23f'][Math.floor(k * 3) % 3]); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -10, 6, 0.4, 4); c.stroke(); },
  gumdrop(c, k = 0) { c.lineWidth = 3; c.strokeStyle = INK; c.fillStyle = ['#9b6bff', '#3fd873', '#ff9f1a'][Math.floor(k * 3) % 3]; c.beginPath(); c.moveTo(-12, 9); c.quadraticCurveTo(-13, -12, 0, -12); c.quadraticCurveTo(13, -12, 12, 9); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-4, -5, 3, 5, 0.4, 0, 7); c.fill(); },
  donut(c) { c.lineWidth = 3; c.strokeStyle = INK; blob(c, 0, 0, 12, '#f2c27a'); c.strokeStyle = '#ff7eb6'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 7.5, 0, 7); c.stroke(); blob(c, 0, 0, 3.5, 'rgba(0,0,0,.25)', 2); },
};
const DECO_SETS = { meadow: ['bush', 'tree', 'rock', 'tree'], desert: ['cactus', 'dune', 'rock', 'dune'], volcano: ['crystal', 'lava', 'rock'], ice: ['pine', 'snow', 'icecube', 'snow'], candy: ['lollipop', 'gumdrop', 'donut', 'lollipop'] };

// Positions libres pour le décor (ni sur le chemin, ni sur un socle, ni sur le château)
function decoSpots(field, rnd, n, margin, ext) {
  const out = [], base = field.base, { paths, slots } = field;
  for (let i = 0; i < n * 5 && out.length < n; i++) {
    const x = ext.l + 16 + rnd() * (ext.r - ext.l - 32), y = ext.t + 16 + rnd() * (ext.b - ext.t - 32);
    if (paths.some((p) => p.nearest(x, y).dist < GAME.pathWidth / 2 + margin)) continue;
    if (Math.abs(x - base.x) < 120 && y > base.y - 110) continue;
    if (slots.some((s) => Math.hypot(s.x - x, s.y - y) < 46)) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < 34)) continue;
    out.push({ x, y, s: 0.75 + rnd() * 0.5, k: rnd() });
  }
  return out;
}
const FULL = () => ({ l: 0, t: 0, r: VIEW.W, b: VIEW.H });

// Fleurs animées (dessinées à chaque image par drawMapAnimated)
export function mapFlowers(field, ext = FULL()) {
  const area = ((ext.r - ext.l) * (ext.b - ext.t)) / (VIEW.W * VIEW.H);
  return decoSpots(field, mulberry32(field.seed + 77), Math.round(14 * area), 20, ext);
}

// Dalle d'un emplacement de tourelle, intégrée au biome (≈ 70 % de l'ancienne taille)
const SLAB = {
  meadow:  { top: '#c9c3d6', side: '#8f88a6', crack: 'rgba(61,44,78,.35)', tuft: '#4ea832' },
  desert:  { top: '#f0c98a', side: '#c48a4a', crack: 'rgba(120,70,20,.35)', tuft: '#c9a050' },
  volcano: { top: '#5c4f6e', side: '#3a2f4a', crack: '#ff7a3c', tuft: null },
  ice:     { top: '#e6f6ff', side: '#9cc4e6', crack: 'rgba(85,103,154,.35)', tuft: null },
  candy:   { top: '#ffe6f0', side: '#e8a3c4', crack: 'rgba(201,87,127,.35)', tuft: '#3fae7a' },
};
export const SLOT_R = Math.round(GAME.towerRadius * 0.72);
function drawSlot(c, s, deco = 'meadow') {
  const R = SLOT_R, S = SLAB[deco] || SLAB.meadow;
  c.save(); c.translate(s.x, s.y);
  // ombre douce
  c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(1, 6, R + 5, R * 0.75, 0, 0, 7); c.fill();
  // dalle irrégulière (octogone usé) : tranche puis dessus
  const poly = (dy, r) => { c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2, k = r * (0.9 + ((i * 37 + s.x) % 7) / 50); i ? c.lineTo(Math.cos(a) * k, Math.sin(a) * k * 0.86 + dy) : c.moveTo(Math.cos(a) * k, Math.sin(a) * k * 0.86 + dy); } c.closePath(); };
  c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round';
  c.fillStyle = S.side; poly(4, R); c.fill(); c.stroke();
  c.fillStyle = S.top; poly(0, R); c.fill(); c.stroke();
  // fissures et reflet
  c.strokeStyle = S.crack; c.lineWidth = deco === 'volcano' ? 2 : 1.8; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-R * 0.55, -R * 0.1); c.lineTo(-R * 0.15, R * 0.1); c.lineTo(-R * 0.05, R * 0.45); c.moveTo(R * 0.25, -R * 0.5); c.lineTo(R * 0.45, -R * 0.15); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, R * 0.72, -2.6, -1.6); c.stroke();
  // petit symbole discret
  c.strokeStyle = 'rgba(61,44,78,.28)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.moveTo(0, -4); c.lineTo(0, 4); c.stroke();
  // touffes autour (herbe, sable...)
  if (S.tuft) { c.strokeStyle = S.tuft; c.lineWidth = 2.4; for (const a of [2.3, 0.6, 4]) { const x = Math.cos(a) * (R + 3), y = Math.sin(a) * (R + 1) * 0.86 + 4; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x - 4, y - 6); c.moveTo(x, y); c.lineTo(x, y - 8); c.moveTo(x + 3, y); c.lineTo(x + 4, y - 6); c.stroke(); } }
  c.restore();
}
// Zone de mine : petite croix peinte au sol (dessinée seulement quand on peut en poser une)
export function drawMineSpot(c, s, a = 1) {
  c.save(); c.translate(s.x, s.y); c.globalAlpha = a;
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-8, -8); c.lineTo(8, 8); c.moveTo(8, -8); c.lineTo(-8, 8); c.stroke();
  c.strokeStyle = '#e8283f'; c.lineWidth = 3; c.stroke();
  c.restore();
}

// Fond statique d'un terrain (mis en cache par le jeu). ext = rectangle visible, qui peut dépasser la zone jouable.
export function drawMapBackground(c, theme, field, ext = FULL(), opts = {}) {
  const t = theme, rnd = mulberry32(field.seed), pw = GAME.pathWidth, { paths } = field;
  const w = ext.r - ext.l, h = ext.b - ext.t, area = (w * h) / (VIEW.W * VIEW.H);
  const g = c.createLinearGradient(0, ext.t, 0, ext.b); g.addColorStop(0, t.g1); g.addColorStop(1, t.g2);
  c.fillStyle = g; c.fillRect(ext.l, ext.t, w, h);
  for (let i = 0; i < 36 * area; i++) { c.fillStyle = i % 2 ? t.g3 : t.g1; c.globalAlpha = 0.35; c.beginPath(); c.ellipse(ext.l + rnd() * w, ext.t + rnd() * h, 40 + rnd() * 70, 22 + rnd() * 34, rnd() * 3, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  c.lineCap = 'round';
  for (let i = 0; i < 520 * area; i++) {
    const x = ext.l + rnd() * w, y = ext.t + rnd() * h;
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
  if (opts.slots !== false) for (const s of field.slots) drawSlot(c, s, t.deco);
  // décor (plus dense hors de la zone jouable, pour encadrer le terrain)
  const set = DECO_SETS[t.deco];
  for (const s of decoSpots(field, rnd, Math.round(30 * area), 30, ext)) {
    c.save(); c.translate(s.x, s.y); c.scale(s.s, s.s);
    c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(0, 11, 15, 5, 0, 0, 7); c.fill();
    DECO[set[Math.floor(s.k * set.length)]](c, s.k); c.restore();
  }
}

// Éléments animés : portails, fleurs qui se balancent
export function drawMapAnimated(c, theme, field, flowers, time) {
  const t = theme;
  for (const f of flowers) {
    const sway = Math.sin(time * 1.6 + f.x * 0.05) * 0.22;
    c.save(); c.translate(f.x, f.y); c.scale(f.s, f.s);
    c.strokeStyle = t.stem; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 10); c.quadraticCurveTo(sway * 20, 2, sway * 30, -6); c.stroke();
    c.translate(sway * 30, -6); c.rotate(sway);
    const col = t.flower[Math.floor(f.k * t.flower.length)];
    c.lineWidth = 2; c.strokeStyle = INK;
    for (let j = 0; j < 5; j++) { const a = (j / 5) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 4.2, 0, 7); c.fillStyle = col; c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, 0, 3.6, 0, 7); c.fillStyle = '#ffb21a'; c.fill(); c.stroke();
    c.restore();
  }
  // portails
  for (const p of field.paths) {
    const x = p.startPt.x, y = p.startPt.y, pulse = 1 + Math.sin(time * 4) * 0.05;
    c.save(); c.translate(x, y);
    c.fillStyle = INK; c.beginPath(); c.ellipse(0, 0, 52 * pulse, 30, 0, 0, 7); c.fill();
    const g = c.createRadialGradient(0, 0, 4, 0, 0, 46); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#e2b8ff'); g.addColorStop(1, '#7b2ff7');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 46 * pulse, 24, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const a = time * 3 + i * 2.1; c.beginPath(); c.ellipse(0, 0, 32 - i * 8, 15 - i * 4, 0, a, a + 1.6); c.stroke(); }
    c.restore();
  }
}
export function drawClouds(c, theme, time, ext = FULL()) {
  c.fillStyle = theme.cloud;
  const w = ext.r - ext.l + 400;
  for (let i = 0; i < 3; i++) {
    const x = ext.l + ((time * (9 + i * 4) + i * 330) % w) - 200, y = 140 + i * 290 + Math.sin(time * 0.2 + i) * 30;
    c.beginPath(); c.ellipse(x, y, 110, 46, 0, 0, 7); c.ellipse(x + 70, y + 18, 80, 36, 0, 0, 7); c.ellipse(x - 70, y + 14, 70, 30, 0, 0, 7); c.fill();
  }
}

// Miniature d'un terrain
export function drawMapPreview(canvas, theme, field) {
  const c = canvas.getContext('2d');
  c.save();
  c.scale(canvas.width / VIEW.W, canvas.height / VIEW.H);
  drawMapBackground(c, theme, field);
  drawMapAnimated(c, theme, field, mapFlowers(field), 0);
  c.restore();
}
