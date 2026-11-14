// Mécaniques propres à chaque monde (WORLDS[].mech dans config.js) et effets des brainrots spéciaux sur le terrain.
//   sandstorm : tempête de sable périodique (portée des tourelles réduite)
//   eruption  : rochers de lave annoncés puis qui tombent (blessent les brainrots, étourdissent les tourelles touchées)
//   ice       : plaques de glace sur le chemin (les brainrots non volants y glissent plus vite)
//   grass     : hautes herbes sur le chemin (les brainrots non volants y sont cachés, sauf près d'une tourelle)
import { mulberry32 } from './maps.js';

const TAU = Math.PI * 2, INK = '#3d2c4e';

// Préparation au début d'une partie : plaques posées le long du chemin, minuteries
export function initMech(g, mech) {
  g.mech = mech || null; g.rangeK = 1; g.storm = 0; g.stormWarn = 0; g.rocks = []; g.patches = [];
  if (!mech) return;
  g.mechT = mech.first || 0;
  if (mech.kind === 'ice' || mech.kind === 'grass') {
    const rnd = mulberry32(g.field.seed + 991);
    g.paths.forEach((p, pi) => {
      const n = pi === 0 ? mech.patches : Math.max(1, mech.patches - 1);
      for (let k = 0; k < n; k++) {
        const c = p.total * (0.18 + (0.62 * (k + 0.3 + rnd() * 0.4)) / n), len = mech.len * (0.85 + rnd() * 0.3);
        g.patches.push({ pi, d0: c - len / 2, d1: c + len / 2 });
      }
    });
  }
}
// plaque sous un brainrot (au sol)
export function patchAt(g, e) { if (e.flying || !g.patches.length) return null; for (const q of g.patches) if (q.pi === e.pathIdx && e.d >= q.d0 && e.d <= q.d1) return q; return null; }

export function updateMech(g, dt) {
  const m = g.mech; if (!m) return;
  if (m.kind === 'sandstorm') {
    if (g.storm > 0) { g.storm -= dt; if (g.storm <= 0) { g.rangeK = 1; g.onEvent('mechEnd', m); } }
    else if (g.wave > 0) {
      g.mechT -= dt;
      if (g.mechT <= 3 && g.stormWarn <= 0 && g.mechT > 0) { g.stormWarn = 3; g.fx.text(300, 200, 'Tempête de sable en approche !', '#ffd27a', 20, 2.4); g.audio.play('wave_start'); }
      if (g.mechT <= 0) { g.storm = m.dur; g.rangeK = m.range; g.mechT = m.every; g.stormWarn = 0; g.showBanner('TEMPÊTE DE SABLE', `Portée -${Math.round((1 - m.range) * 100)} %`, '#ffd27a', 1.8); g.shake(4); g.onEvent('mech', m); }
    }
    if (g.storm > 0 && Math.random() < dt * 70) g.fx.add({ k: 'dot', x: g.ext.l - 10, y: g.ext.t + Math.random() * (g.ext.b - g.ext.t), vx: 520 + Math.random() * 260, vy: 40 + Math.random() * 60, life: 1.6, max: 1.6, size: 2 + Math.random() * 2.5, color: Math.random() < 0.5 ? '#f3d29a' : '#e2b25c' });
  } else if (m.kind === 'eruption') {
    if (g.wave > 0) {
      g.mechT -= dt;
      if (g.mechT <= 0) {
        g.mechT = m.every;
        const rnd = Math.random, targets = [];
        // une partie des rochers vise des tourelles (danger), le reste le chemin près des brainrots (aide)
        for (let i = 0; i < m.rocks; i++) {
          const t = i === 0 && g.towers.length ? g.towers[Math.floor(rnd() * g.towers.length)] : null;
          const e = !t && g.enemies.length ? g.enemies[Math.floor(rnd() * g.enemies.length)] : null;
          const p = t || e || g.slots[Math.floor(rnd() * g.slots.length)];
          targets.push({ x: p.x + (rnd() - 0.5) * 50, y: (e ? e.gy : p.y) + (rnd() - 0.5) * 40 });
        }
        for (const [i, q] of targets.entries()) g.rocks.push({ x: q.x, y: q.y, t: m.warn + i * 0.35, max: m.warn + i * 0.35 });
        g.showBanner('ÉRUPTION !', 'Attention aux rochers de lave', '#ff7a3c', 1.4); g.audio.play('boss'); g.shake(6); g.onEvent('mech', m);
      }
    }
    for (let i = g.rocks.length - 1; i >= 0; i--) {
      const r = g.rocks[i]; r.t -= dt; if (r.t > 0) continue;
      g.rocks.splice(i, 1);
      g.fx.explosion(r.x, r.y, m.radius, '#ff7a3c'); g.shake(9); g.audio.play('explosion'); g.onEvent('haptic', 1);
      for (let k = 0; k < 10; k++) g.fx.add({ k: 'blob', x: r.x, y: r.y, vx: (Math.random() - 0.5) * 300, vy: -150 - Math.random() * 200, g: 600, life: 0.8, max: 0.8, size: 4 + Math.random() * 4, color: Math.random() < 0.5 ? '#ff7a3c' : '#ffd23f', drag: 1 });
      for (const e of g.enemies) if (!e.dead && !e.flying && Math.hypot(e.x - r.x, e.gy - r.y) < m.radius + e.r * 0.5) g.damage(e, m.damage * g.level.hp, null, { splash: true });
      for (const t of g.towers) if (Math.hypot(t.x - r.x, t.y - r.y) < m.radius) { t.disabledT = Math.max(t.disabledT, m.stun); g.fx.text(t.x, t.y - 40, 'ÉTOURDIE', '#ff9a7a', 16, 1.2); }
    }
  }
}

// Plaques (glace, herbes) dessinées une fois dans le fond du terrain
export function drawPatches(c, g) {
  const m = g.mech; if (!m || !g.patches.length) return;
  for (const q of g.patches) {
    const p = g.paths[q.pi], seg = (w, col, alpha = 1) => {
      c.globalAlpha = alpha; c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      for (let d = q.d0; d <= q.d1; d += 8) { const pt = p.pointAt(d); d === q.d0 ? c.moveTo(pt.x, pt.y) : c.lineTo(pt.x, pt.y); }
      c.stroke(); c.globalAlpha = 1;
    };
    if (m.kind === 'ice') {
      seg(58, INK, 0.5); seg(52, '#cdeeff'); seg(36, '#e9f8ff');
      const rnd = mulberry32(Math.round(q.d0 * 7));
      for (let d = q.d0 + 10; d < q.d1 - 10; d += 22) { const pt = p.pointAt(d), o = (rnd() - 0.5) * 30; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 3; c.beginPath(); c.moveTo(pt.x - Math.sin(pt.ang) * o - 6, pt.y + Math.cos(pt.ang) * o - 3); c.lineTo(pt.x - Math.sin(pt.ang) * o + 6, pt.y + Math.cos(pt.ang) * o + 3); c.stroke(); }
    } else if (m.kind === 'grass') seg(60, 'rgba(20,80,30,.35)');
  }
}
// Herbes hautes dessinées PAR-DESSUS les brainrots, tempête, rochers en approche
export function drawMechOver(c, g) {
  const m = g.mech; if (!m) return;
  if (m.kind === 'grass') {
    for (const q of g.patches) {
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
  }
  if (m.kind === 'sandstorm' && g.storm > 0) {
    const k = Math.min(1, g.storm * 2, (m.dur - g.storm) * 2), E = g.ext;
    c.fillStyle = `rgba(226,178,92,${0.28 * k})`; c.fillRect(E.l, E.t, E.r - E.l, E.b - E.t);
  }
  for (const r of g.rocks) {
    const u = 1 - r.t / r.max;
    c.strokeStyle = `rgba(255,90,40,${0.4 + u * 0.6})`; c.lineWidth = 4; c.setLineDash([10, 7]); c.beginPath(); c.arc(r.x, r.y, g.mech.radius, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = `rgba(255,90,40,${0.12 + u * 0.18})`; c.beginPath(); c.arc(r.x, r.y, g.mech.radius * u, 0, TAU); c.fill();
    const fy = r.y - 520 * (1 - u) * (1 - u);
    if (u > 0.35) { c.fillStyle = '#3a2f4a'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(r.x + (1 - u) * 60, fy, 15, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#ff7a3c'; c.beginPath(); c.arc(r.x + (1 - u) * 60 - 4, fy - 4, 6, 0, TAU); c.fill(); }
  }
}
