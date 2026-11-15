// Mécaniques propres à chaque monde (WORLDS[].mech dans config.js) :
//   sandstorm : tempête de sable périodique (portée des tourelles réduite)
//   eruption  : rochers de lave annoncés puis qui tombent (blessent les brainrots, étourdissent les tourelles touchées)
//   ice       : plaques de glace sur le chemin (les brainrots non volants y glissent plus vite)
//   grass     : hautes herbes sur le chemin (les brainrots non volants y sont cachés, sauf près d'une tourelle)
//   blackout  : coupures de courant (des tourelles clignotent puis s'éteignent quelques secondes)
//   portal    : portails sur le chemin (bleu = bond en avant, orange = retour en arrière), une fois par brainrot
//   chaos     : petite plaque de glace + hautes herbes, et à chaque fois une mécanique périodique différente
import { mulberry32 } from './maps.js';

const TAU = Math.PI * 2, INK = '#3d2c4e';
const CHAOS_CYCLE = ['sandstorm', 'eruption', 'blackout'];

// Préparation au début d'une partie : plaques et portails posés le long du chemin, minuteries
export function initMech(g, mech) {
  g.mech = mech || null; g.rangeK = 1; g.storm = 0; g.stormWarn = 0; g.rocks = []; g.patches = []; g.portals = []; g.chaosN = 0;
  if (!mech) return;
  g.mechT = mech.first || 0;
  const rnd = mulberry32(g.field.seed + 991);
  const lay = (kind, count, len) => g.paths.forEach((p, pi) => {
    const n = pi === 0 ? count : Math.max(1, count - 1);
    for (let k = 0; k < n; k++) {
      const c = p.total * (0.18 + (0.62 * (k + 0.3 + rnd() * 0.4)) / n), l = len * (0.85 + rnd() * 0.3);
      g.patches.push({ kind, pi, d0: c - l / 2, d1: c + l / 2 });
    }
  });
  if (mech.kind === 'ice' || mech.kind === 'grass') lay(mech.kind, mech.patches, mech.len);
  if (mech.kind === 'chaos') { lay('ice', 1, mech.len); g.patches.forEach((q) => { q.d0 *= 0.5; q.d1 *= 0.5; }); lay('grass', 1, mech.len); }
  if (mech.kind === 'portal') g.paths.forEach((p, pi) => {
    g.portals.push({ pi, d: p.total * 0.3, to: Math.min(p.total * 0.3 + mech.jump, p.total * 0.55), kind: 'jump' });
    g.portals.push({ pi, d: p.total * 0.72, to: p.total * 0.72 - mech.back, kind: 'back' });
  });
}
// plaque sous un brainrot (au sol)
export function patchAt(g, e) { if (e.flying || !g.patches.length) return null; for (const q of g.patches) if (q.pi === e.pathIdx && e.d >= q.d0 && e.d <= q.d1) return q; return null; }
// réglages de la mécanique périodique en cours (le chaos emprunte ceux des autres mondes)
const params = (m, kind) => (m.kind !== 'chaos' ? m : kind === 'sandstorm' ? { dur: m.storm.dur, range: m.storm.range } : m);

function storm(g, m) { g.storm = m.dur; g.rangeK = m.range; g.showBanner('TEMPÊTE DE SABLE', `Portée -${Math.round((1 - m.range) * 100)} %`, '#ffd27a', 1.8); g.shake(4); g.stormMax = m.dur; }
function eruption(g, m) {
  const rnd = Math.random;
  for (let i = 0; i < m.rocks; i++) {   // un rocher vise une tourelle (danger), les autres le chemin près des brainrots (aide)
    const t = i === 0 && g.towers.length ? g.towers[Math.floor(rnd() * g.towers.length)] : null;
    const e = !t && g.enemies.length ? g.enemies[Math.floor(rnd() * g.enemies.length)] : null;
    const p = t || e || g.slots[Math.floor(rnd() * g.slots.length)];
    g.rocks.push({ x: p.x + (rnd() - 0.5) * 50, y: (e ? e.gy : p.y) + (rnd() - 0.5) * 40, t: m.warn + i * 0.35, max: m.warn + i * 0.35, m });
  }
  g.showBanner('ÉRUPTION !', 'Attention aux rochers de lave', '#ff7a3c', 1.4); g.audio.play('boss'); g.shake(6);
}
function blackout(g, m) {
  const list = g.towers.filter((t) => t.type !== 'mine').sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.round(g.towers.length * m.part)));
  for (const t of list) t.blackWarn = m.warn;
  g.blackDur = m.dur || m.out || 3; g.showBanner('COUPURE DE COURANT', `${list.length} tourelle${list.length > 1 ? 's' : ''} vont s'éteindre`, '#ff3fb4', 1.6); g.audio.play('zap');
}

export function updateMech(g, dt) {
  const m = g.mech; if (!m) return;
  // mécanique périodique (le chaos en change à chaque fois)
  const periodic = m.kind === 'chaos' ? CHAOS_CYCLE[g.chaosN % CHAOS_CYCLE.length] : ['sandstorm', 'eruption', 'blackout'].includes(m.kind) ? m.kind : null;
  if (periodic && g.wave > 0 && g.storm <= 0) {
    g.mechT -= dt;
    if (periodic === 'sandstorm' && g.mechT <= 3 && g.stormWarn <= 0 && g.mechT > 0) { g.stormWarn = 3; g.fx.text(300, 200, 'Tempête de sable en approche !', '#ffd27a', 20, 2.4); g.audio.play('wave_start'); }
    if (g.mechT <= 0) {
      g.mechT = m.every; g.stormWarn = 0; g.chaosN++;
      const P = params(m, periodic);
      if (periodic === 'sandstorm') storm(g, P); else if (periodic === 'eruption') eruption(g, P); else blackout(g, P);
      g.onEvent('mech', { ...m, kind: periodic });
    }
  }
  if (g.storm > 0) {
    g.storm -= dt; if (g.storm <= 0) g.rangeK = 1;
    if (Math.random() < dt * 70) g.fx.add({ k: 'dot', x: g.ext.l - 10, y: g.ext.t + Math.random() * (g.ext.b - g.ext.t), vx: 520 + Math.random() * 260, vy: 40 + Math.random() * 60, life: 1.6, max: 1.6, size: 2 + Math.random() * 2.5, color: Math.random() < 0.5 ? '#f3d29a' : '#e2b25c' });
  }
  // coupure : les tourelles prévenues clignotent, puis s'éteignent
  for (const t of g.towers) if (t.blackWarn > 0) { t.blackWarn -= dt; if (t.blackWarn <= 0) { t.disabledT = Math.max(t.disabledT, g.blackDur); g.fx.sparks(t.x, t.y, -Math.PI / 2, '#ff3fb4', 8); } }
  for (let i = g.rocks.length - 1; i >= 0; i--) {
    const r = g.rocks[i]; r.t -= dt; if (r.t > 0) continue;
    g.rocks.splice(i, 1); const M = r.m;
    g.fx.explosion(r.x, r.y, M.radius, '#ff7a3c'); g.shake(9); g.audio.play('explosion'); g.onEvent('haptic', 1);
    for (let k = 0; k < 10; k++) g.fx.add({ k: 'blob', x: r.x, y: r.y, vx: (Math.random() - 0.5) * 300, vy: -150 - Math.random() * 200, g: 600, life: 0.8, max: 0.8, size: 4 + Math.random() * 4, color: Math.random() < 0.5 ? '#ff7a3c' : '#ffd23f', drag: 1 });
    for (const e of g.enemies) if (!e.dead && !e.flying && Math.hypot(e.x - r.x, e.gy - r.y) < M.radius + e.r * 0.5) g.damage(e, M.damage * g.level.hp, null, { splash: true });
    for (const t of g.towers) if (Math.hypot(t.x - r.x, t.y - r.y) < M.radius) { t.disabledT = Math.max(t.disabledT, M.stun); g.fx.text(t.x, t.y - 40, 'ÉTOURDIE', '#ff9a7a', 16, 1.2); }
  }
  // portails : chaque brainrot (hors boss) les emprunte une fois
  for (const q of g.portals) for (const e of g.enemies) {
    if (e.dead || e.boss || e.pathIdx !== q.pi || e.d < q.d || e.d > q.d + 30 || (e.portals || (e.portals = new Set())).has(q)) continue;
    e.portals.add(q); g.fx.ring(e.x, e.y, 6, 40, q.kind === 'jump' ? '#5fd8ff' : '#ff9f1a', 0.35, 5);
    e.d = Math.max(0, q.to); e.place(); e.portals.add(q);
    g.fx.ring(e.x, e.y, 40, 6, q.kind === 'jump' ? '#5fd8ff' : '#ff9f1a', 0.35, 5);
    if (!g.simulating && Math.random() < 0.3) g.audio.play('zap');
  }
}

// Plaques (glace, herbes) dessinées une fois dans le fond du terrain
export function drawPatches(c, g) {
  for (const q of g.patches) {
    const p = g.paths[q.pi], seg = (w, col, alpha = 1) => {
      c.globalAlpha = alpha; c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      for (let d = q.d0; d <= q.d1; d += 8) { const pt = p.pointAt(d); d === q.d0 ? c.moveTo(pt.x, pt.y) : c.lineTo(pt.x, pt.y); }
      c.stroke(); c.globalAlpha = 1;
    };
    if (q.kind === 'ice') {
      seg(58, INK, 0.5); seg(52, '#cdeeff'); seg(36, '#e9f8ff');
      const rnd = mulberry32(Math.round(q.d0 * 7));
      for (let d = q.d0 + 10; d < q.d1 - 10; d += 22) { const pt = p.pointAt(d), o = (rnd() - 0.5) * 30; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 3; c.beginPath(); c.moveTo(pt.x - Math.sin(pt.ang) * o - 6, pt.y + Math.cos(pt.ang) * o - 3); c.lineTo(pt.x - Math.sin(pt.ang) * o + 6, pt.y + Math.cos(pt.ang) * o + 3); c.stroke(); }
    } else if (q.kind === 'grass') seg(60, 'rgba(20,80,30,.35)');
  }
}
// Sous les brainrots : portails
export function drawMechUnder(c, g) {
  for (const q of g.portals) {
    for (const [d, col, k] of [[q.d, q.kind === 'jump' ? '#5fd8ff' : '#ff9f1a', 1], [q.to, q.kind === 'jump' ? '#5fd8ff' : '#ff9f1a', 0.6]]) {
      const pt = g.paths[q.pi].pointAt(d), r = 30 * k;
      c.save(); c.translate(pt.x, pt.y);
      c.fillStyle = INK; c.beginPath(); c.ellipse(0, 0, r + 4, (r + 4) * 0.55, 0, 0, TAU); c.fill();
      const gr = c.createRadialGradient(0, 0, 2, 0, 0, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, col); gr.addColorStop(1, '#1d1a3a');
      c.fillStyle = gr; c.beginPath(); c.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2.5;
      for (let i = 0; i < 2; i++) { const a = g.time * 4 * (q.kind === 'jump' ? 1 : -1) + i * 3; c.beginPath(); c.ellipse(0, 0, r * (0.75 - i * 0.3), r * 0.55 * (0.75 - i * 0.3), 0, a, a + 2); c.stroke(); }
      if (k === 1) { c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; c.font = '700 16px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; const t = q.kind === 'jump' ? '>>' : '<<'; c.strokeText(t, 0, -r * 0.55 - 12); c.fillText(t, 0, -r * 0.55 - 12); }
      c.restore();
    }
  }
}
// Par-dessus les brainrots : hautes herbes, tempête, rochers en approche, tourelles qui vont s'éteindre
export function drawMechOver(c, g) {
  const m = g.mech; if (!m) return;
  for (const q of g.patches) if (q.kind === 'grass') {
    const p = g.paths[q.pi];
    for (let d = q.d0, i = 0; d <= q.d1; d += 11, i++) {
      const pt = p.pointAt(d);
      for (const o of [-22, -8, 6, 20]) {
        const x = pt.x - Math.sin(pt.ang) * o, y = pt.y + Math.cos(pt.ang) * o + 10, sw = Math.sin(g.time * 2 + i + o) * 4, h = 26 + ((i * 7 + o) % 9);
        c.fillStyle = (i + o) % 3 ? '#2fae52' : '#1f8a3a'; c.strokeStyle = INK; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x - 5, y); c.quadraticCurveTo(x + sw, y - h * 0.6, x + sw * 1.6, y - h); c.quadraticCurveTo(x + 1, y - h * 0.5, x + 5, y); c.closePath(); c.fill(); c.stroke();
      }
    }
  }
  if (g.storm > 0) {
    const k = Math.min(1, g.storm * 2, ((g.stormMax || 9) - g.storm) * 2), E = g.ext;
    c.fillStyle = `rgba(226,178,92,${0.28 * k})`; c.fillRect(E.l, E.t, E.r - E.l, E.b - E.t);
  }
  for (const t of g.towers) if (t.blackWarn > 0 && Math.sin(g.time * 30) > 0) { c.strokeStyle = '#ff3fb4'; c.lineWidth = 4; c.beginPath(); c.arc(t.x, t.y, 34, 0, TAU); c.stroke(); }
  for (const r of g.rocks) {
    const u = 1 - r.t / r.max, R = r.m.radius;
    c.strokeStyle = `rgba(255,90,40,${0.4 + u * 0.6})`; c.lineWidth = 4; c.setLineDash([10, 7]); c.beginPath(); c.arc(r.x, r.y, R, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = `rgba(255,90,40,${0.12 + u * 0.18})`; c.beginPath(); c.arc(r.x, r.y, R * u, 0, TAU); c.fill();
    const fy = r.y - 520 * (1 - u) * (1 - u);
    if (u > 0.35) { c.fillStyle = '#3a2f4a'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(r.x + (1 - u) * 60, fy, 15, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#ff7a3c'; c.beginPath(); c.arc(r.x + (1 - u) * 60 - 4, fy - 4, 6, 0, TAU); c.fill(); }
  }
}
