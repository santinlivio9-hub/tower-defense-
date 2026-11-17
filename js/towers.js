// Tourelles : stats, améliorations, ciblage, tir, dessin.
import { TOWERS, TOWER_VISUAL, GAME, RARITY, BOOSTS, REBIRTH, SHOP } from './config.js';
const AURA = Object.fromEntries(SHOP.skins.filter((k) => k.aura).map((k) => [k.id, k.aura]));
import { towerSprite, skinFinish } from './sprites.js';
import { Rocket, Plasma } from './projectiles.js';

const TAU = Math.PI * 2;

function applyMods(s, mods) {
  for (const k in mods) {
    if (k === 'cost' || k === 'name' || k === 'desc') continue;
    const v = mods[k];
    if (k.endsWith('Mul')) { const b = k.slice(0, -3); s[b] = (s[b] || 0) * v; }
    else if (k.endsWith('Add')) { const b = k.slice(0, -3); s[b] = (s[b] || 0) + v; }
    else s[k] = v;
  }
}

// Branche d'amélioration : 0 et 1 = branches normales, 2 = Mk II (boutique de Renaissance)
export const branchDef = (type, i) => (i === 2 ? REBIRTH.mk2[type] : TOWERS[type].branches[i]);
// Stats finales d'une tourelle pour un niveau / une branche donnés. m = effets des talents (save.mods()).
export function computeStats(type, level, branch, m = {}) {
  const cfg = TOWERS[type];
  const s = { crit: GAME.critChance, critMult: GAME.critMult, barrels: 1, ...cfg.base };
  for (let l = 2; l <= Math.min(level, 3); l++) applyMods(s, cfg.upgrades[l - 2]);
  if (level >= 4 && branch != null) {
    const br = branchDef(type, branch);
    applyMods(s, br.mods);
    if (level >= 5) applyMods(s, br.master.mods);
  }
  s.damage *= m.damage || 1; if (s.burn) s.burn *= m.damage || 1;
  s.rate *= m.rate || 1; if (s.minRate) s.minRate *= m.rate || 1;
  if (type !== 'mine') s.range *= m.range || 1;
  s.crit += m.crit || 0;
  return s;
}

// Dégâts par seconde théoriques (affichage)
export function dpsOf(s) {
  const extra = (s.drones || 1) * (s.beams || 1) * (s.chain ? 1 + (s.chain - 1) * (s.falloff || 0.8) * 0.5 : 1) * (s.ramp ? 1 + (s.ramp - 1) * 0.5 : 1);
  return s.damage * (s.pellets || 1) * (s.barrels || 1) * s.rate * extra + (s.burn || 0);
}

export const TARGET_MODES = [['first', 'Premier'], ['last', 'Dernier'], ['strong', 'Plus fort'], ['close', 'Plus proche']];

export class Tower {
  constructor(game, type, x, y) {
    this.game = game; this.type = type; this.cfg = TOWERS[type]; this.vis = TOWER_VISUAL[type];
    this.x = x; this.y = y; this.level = 1; this.branch = null;
    this.invested = this.cfg.cost;
    this.angle = -Math.PI / 2; this.cooldown = 0; this.recoil = 0; this.flashT = 0; this.pump = 0;
    this.mode = this.cfg.targeting || 'first';
    this.target = null; this.retargetT = 0; this.spin = 0; this.spinAng = 0;
    this.dmg = 0; this.kills = 0; this.disabledT = 0; this.lvlAnim = 0; this.spawnAnim = 1;
    this.armed = true; this.t = Math.random() * 10;
    this.heat = 0; this.beams = []; this.arcs = []; this.drones = [];
    this.refresh();
  }
  refresh() {
    this.stats = computeStats(this.type, this.level, this.branch, this.game.mods);
    if (this.type === 'drone') while (this.drones.length < this.stats.drones) { const a = this.drones.length * 2.1; this.drones.push({ x: this.x + Math.cos(a) * 30, y: this.y + Math.sin(a) * 30, a, cd: 0, tilt: 0, fire: 0 }); }
  }
  get sellValue() { return Math.floor(this.invested * GAME.sellRatio * ((this.game.mods && this.game.mods.sellMult) || 1)); }
  get rangeShown() { return this.type === 'mine' ? this.stats.splash : this.type === 'drone' ? this.stats.patrol + this.stats.range * 0.5 : this.stats.range; }
  get label() {
    if (this.level >= 5) return branchDef(this.type, this.branch).master.name;
    if (this.level >= 4) return branchDef(this.type, this.branch).name;
    return this.cfg.name;
  }

  upgradeOptions() {
    const c = this.cfg;
    if (this.level < 3) return [{ kind: 'level', name: 'Niveau ' + (this.level + 1), desc: 'Dégâts, cadence et portée améliorés.', cost: c.upgrades[this.level - 1].cost, level: this.level + 1, branch: null }];
    if (this.level === 3) { const bs = [...c.branches]; if (REBIRTH.mk2[this.type] && this.game.save.owns('mk2_' + this.type)) bs.push(REBIRTH.mk2[this.type]); return bs.map((b, i) => ({ kind: 'branch', name: b.name, desc: b.desc, cost: b.cost, level: 4, branch: i, mk2: i === 2 })); }
    if (this.level === 4) { const m = branchDef(this.type, this.branch).master; return [{ kind: 'master', name: m.name, desc: m.desc, cost: m.cost, level: 5, branch: this.branch, locked: this.legendLocked }]; }
    return [];
  }

  update(dt, game) {
    this.t += dt;
    this.recoil *= Math.exp(-dt * 16); this.pump *= Math.exp(-dt * 6);
    if (this.level >= 5 && Math.random() < dt * 5) game.fx.add({ k: 'dot', x: this.x + (Math.random() - 0.5) * 50, y: this.y + (Math.random() - 0.5) * 40, vx: 0, vy: -40, life: 0.7, max: 0.7, size: 3.5, color: '#ffe27a' });
    this.flashT -= dt; this.lvlAnim = Math.max(0, this.lvlAnim - dt * 1.4); this.spawnAnim = Math.max(0, this.spawnAnim - dt * 4);
    if (this.disabledT > 0) {
      this.disabledT -= dt; this.spin = Math.max(0, this.spin - dt);
      if (Math.random() < dt * 12) game.fx.sparks(this.x + (Math.random() - 0.5) * 24, this.y + (Math.random() - 0.5) * 24, Math.random() * TAU, '#8fe3ff', 2);
      return;
    }
    const s = this.stats, kind = this.cfg.kind;
    this.cooldown -= dt * (game.overT > 0 ? BOOSTS.over.rate : 1) * (this.chill > 0 ? GAME.chillRate : 1);   // boost Surcharge, aura glacée d'un yéti

    if (kind === 'cryo') {
      if (this.cooldown <= 0) {
        let any = false;
        for (const e of game.enemies) if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) <= s.range * game.rangeK + e.r * 0.5) { any = true; break; }
        if (any) { this.pulse(game); this.cooldown = 1 / s.rate; } else this.cooldown = 0;
      }
      return;
    }
    if (kind === 'mine') {
      if (!this.armed) { if (this.cooldown <= 0) { this.armed = true; game.fx.ring(this.x, this.y, 22, 8, '#ff3b3b', 0.3, 3); } return; }
      for (const e of game.enemies) {
        if (e.dead || e.flying) continue;
        if (Math.hypot(e.x - this.x, e.gy - this.y) <= s.range + e.r * 0.6) {
          this.armed = false; this.cooldown = 1 / s.rate; this.recoil = 0;
          game.explode(this.x, this.y, s.splash, s.damage, this, { stun: s.stun || 0, groundOnly: true });
          if (s.stun) { game.audio.play('zap'); game.fx.ring(this.x, this.y, 10, s.splash, '#8fe3ff', 0.4, 6); }
          break;
        }
      }
      return;
    }

    if (kind === 'chain') {   // Tesla : ne pivote pas, l'éclair part de la boule
      if (this.cooldown <= 0) { const tgt = game.findTarget(this); if (tgt) { this.zap(game, tgt); this.cooldown = 1 / s.rate; } else this.cooldown = 0; }
      return;
    }
    if (kind === 'drone') { this.flyDrones(dt, game); return; }

    // --- armes à visée ---
    this.retargetT -= dt;
    let tgt = this.target;
    if (!tgt || tgt.dead || !game.canTarget(this, tgt) || this.retargetT <= 0) {
      tgt = this.target = game.findTarget(this); this.retargetT = 0.2;
    }
    if (this.type === 'minigun') {
      this.spin = tgt ? Math.min(1, this.spin + dt / s.spinUp) : Math.max(0, this.spin - dt * 0.6);
      this.spinAng += this.spin * dt * 40;
    }
    if (!tgt) { if (this.cooldown < 0) this.cooldown = 0; return; }
    const want = Math.atan2(tgt.y - this.y, tgt.x - this.x);
    let d = want - this.angle; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    const turn = this.vis.turn * dt;
    this.angle += Math.max(-turn, Math.min(turn, d));
    if (this.cooldown <= 0 && Math.abs(d) < 0.25) {
      const rate = this.type === 'minigun' ? s.minRate + (s.rate - s.minRate) * this.spin * this.spin : s.rate;
      this.cooldown = Math.max(this.cooldown + 1 / rate, 0);
      if (kind === 'bullet') this.fireBullet(game, tgt);
      else if (kind === 'shotgun') this.fireShotgun(game);
      else if (kind === 'rocket') this.fireRocket(game, tgt);
      else if (kind === 'plasma') this.firePlasma(game);
      else if (kind === 'beam') this.fireBeam(game, tgt);
    }
    if (kind === 'beam' && tgt !== this.heatTgt) { this.heatTgt = tgt; this.heat = 0; }   // nouvelle cible : le rayon refroidit
    if (kind === 'beam' && tgt) this.heat += dt;
  }

  muzzle(side = 0) {
    const c = Math.cos(this.angle), s = Math.sin(this.angle), L = this.vis.muzzle;
    return { x: this.x + c * L - s * side, y: this.y + s * L + c * side };
  }
  roll(e) {
    const s = this.stats;
    const crit = Math.random() < s.crit;
    let dmg = s.damage * (crit ? s.critMult : 1) * (0.92 + Math.random() * 0.16);
    if (e.boss && s.bossMul) dmg *= s.bossMul;
    return { dmg, crit };
  }
  onHit(game, e, ang) {
    const s = this.stats;
    if (s.burn) e.ignite(s.burn, s.burnDur, this);
    if (s.stun) e.stun(s.stun);
    game.fx.sparks(e.x, e.y, ang, '#fff3b0', 3);
  }

  fireBullet(game, tgt) {
    const s = this.stats, n = s.barrels;
    const big = this.type === 'sniper';
    for (let i = 0; i < n; i++) {
      const m = this.muzzle((i - (n - 1) / 2) * 6.5);
      let hits, ex, ey;
      if (s.pierce) {
        hits = game.lineHits(m.x, m.y, this.angle, s.range + 30, 1 + s.pierce);
        if (!hits.includes(tgt)) hits.unshift(tgt);
        ex = m.x + Math.cos(this.angle) * (s.range + 30); ey = m.y + Math.sin(this.angle) * (s.range + 30);
      } else { hits = [tgt]; ex = tgt.x; ey = tgt.y; }
      for (const e of hits) {
        if (e.dead) continue;
        const { dmg, crit } = this.roll(e);
        this.onHit(game, e, this.angle);
        const ex0 = e.x, ey0 = e.y;
        game.damage(e, dmg, this, { crit, ignoreArmor: s.ignoreArmor });
        if (s.blast) game.explode(ex0, ey0, s.blast, dmg * 0.5, this, { mini: true });   // Mk II : munitions explosives
        if (s.ricochet) { // Mk II : la balle rebondit sur les ennemis proches
          let from = { x: ex0, y: ey0 }; const done = new Set([e]);
          for (let k = 0; k < s.ricochet; k++) {
            let nx = null, nd = 95; for (const o of game.enemies) { if (o.dead || o.hidden || done.has(o)) continue; const dd = Math.hypot(o.x - from.x, o.y - from.y); if (dd < nd) { nd = dd; nx = o; } }
            if (!nx) break; done.add(nx); game.fx.tracer(from.x, from.y, nx.x, nx.y, '#d6b3ff', 2, 0.1); from = { x: nx.x, y: nx.y };
            game.damage(nx, dmg * s.ricochetPct, this, { ignoreArmor: s.ignoreArmor });
          }
        }
      }
      game.fx.tracer(m.x, m.y, ex, ey, big ? '#ffffff' : s.burn ? '#ffb347' : '#fff3b0', big ? 4 : 2.5, big ? 0.16 : 0.08);
      game.fx.shell(this.x, this.y, this.angle);
    }
    const m = this.muzzle();
    this.recoil = big ? 12 : this.type === 'assault' ? 6 : 4; this.flashT = 0.05;
    if (big) { game.shake(2.5); game.fx.smoke(m.x, m.y, 7); }
    game.audio.play('shot_' + this.type);
  }

  fireShotgun(game) {
    const s = this.stats, m = this.muzzle();
    const knocked = new Set();
    for (let i = 0; i < s.pellets; i++) {
      const a = this.angle + (Math.random() - 0.5) * s.spread;
      const hits = game.lineHits(m.x, m.y, a, s.range + 15, 1 + (s.pierce || 0)), e = hits[0];   // Mk II : fléchettes qui traversent
      for (const o of hits.slice(1)) { const r = this.roll(o); game.damage(o, r.dmg * 0.8, this, { ignoreArmor: s.ignoreArmor, group: true }); }
      let len = s.range + 15;
      if (e) {
        len = Math.hypot(e.x - m.x, e.y - m.y);
        const { dmg, crit } = this.roll(e);
        this.onHit(game, e, a);
        if (!knocked.has(e)) { knocked.add(e); e.knock(s.knockback || 0); }
        game.damage(e, dmg, this, { crit, ignoreArmor: s.ignoreArmor, group: true });
      }
      game.fx.tracer(m.x, m.y, m.x + Math.cos(a) * len, m.y + Math.sin(a) * len, s.burn ? '#ff9f1a' : '#ffe9a0', 2, 0.1);
    }
    this.recoil = 13; this.pump = 1; this.flashT = 0.08;
    game.fx.shell(this.x, this.y, this.angle); game.fx.smoke(m.x, m.y, 8);
    game.shake(2); game.audio.play('shot_shotgun');
  }

  fireRocket(game, tgt) {
    const m = this.muzzle();
    game.projectiles.push(new Rocket(this, m.x, m.y, this.angle, tgt, this.stats));
    this.recoil = 11; this.flashT = 0.07;
    for (let i = 0; i < 4; i++) game.fx.smoke(this.x - Math.cos(this.angle) * 26, this.y - Math.sin(this.angle) * 26, 9);
    game.audio.play('shot_rocket');
  }

  // Laser : rayon(s) continus ; les dégâts montent tant que le rayon reste sur la même cible
  fireBeam(game, tgt) {
    const s = this.stats, k = 1 + (s.ramp - 1) * Math.min(1, this.heat / s.rampTime);
    const targets = [tgt];
    if (s.beams > 1) for (const e of game.enemies) { if (targets.length >= s.beams) break; if (e !== tgt && game.canTarget(this, e)) targets.push(e); }
    this.beams = targets.map((e) => ({ e, t: 0.13 })); this.beamK = k;
    for (const e of targets) {
      const { dmg, crit } = this.roll(e);
      if (s.burn && Math.random() < 0.2) e.ignite(s.burn, s.burnDur, this);
      game.damage(e, dmg * k, this, { crit, ignoreArmor: s.ignoreArmor, group: true });
    }
    if ((this.snd = (this.snd || 0) + 1) % 3 === 0) game.audio.play('laser');
  }
  // Tesla : l'éclair saute de cible en cible
  zap(game, first) {
    const s = this.stats, hit = [first]; let cur = first, dmg = s.damage;
    while (hit.length < s.chain) {
      let best = null, bd = s.chainRange;
      for (const e of game.enemies) { if (e.dead || e.hidden || hit.includes(e)) continue; const d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < bd) { bd = d; best = e; } }
      if (!best) break; hit.push(best); cur = best;
    }
    const pts = [{ x: this.x, y: this.y - 8 }];
    hit.forEach((e, i) => {
      const r = this.roll(e); if (s.stun) e.stun(s.stun); if (s.slowZap) e.applySlow(s.slowZap, 1.5);
      game.damage(e, r.dmg * Math.pow(s.falloff, i) * (dmg / s.damage), this, { crit: r.crit, group: true });
      pts.push({ x: e.x, y: e.y });
    });
    this.arcs.push({ pts, t: 0.18, seed: Math.random() * 99 });
    this.recoil = 1; game.audio.play('tesla'); if (hit.length >= 4) game.shake(1.5);
  }
  firePlasma(game) {
    const s = this.stats, n = s.barrels || 1;
    for (let i = 0; i < n; i++) { const m = this.muzzle((i - (n - 1) / 2) * 26); game.projectiles.push(new Plasma(this, m.x, m.y, this.angle + (i - (n - 1) / 2) * 0.06, s)); }
    this.recoil = 10; this.flashT = 0.06; game.shake(1.5); game.audio.play('plasma');
  }
  // Drones : vont vers l'ennemi le plus proche dans leur zone de patrouille, sinon tournent autour de la base
  flyDrones(dt, game) {
    const s = this.stats, P = s.patrol;
    this.drones.forEach((d, i) => {
      let tx, ty, best = null, bd = Infinity;
      for (const e of game.enemies) { if (e.dead || e.hidden || Math.hypot(e.x - this.x, e.y - this.y) > P + s.range * 0.6) continue; const dd = Math.hypot(e.x - d.x, e.y - d.y) + i * 40 * (e === this.drones[0].tgt ? 1 : 0); if (dd < bd) { bd = dd; best = e; } }
      d.tgt = best;
      if (best) { const a = Math.atan2(d.y - best.y, d.x - best.x) + i * 1.3; tx = best.x + Math.cos(a) * s.range * 0.55; ty = best.y + Math.sin(a) * s.range * 0.55; }
      else { d.a += dt * 1.1; tx = this.x + Math.cos(d.a + i * 2.1) * P * 0.4; ty = this.y + Math.sin(d.a + i * 2.1) * P * 0.4; }
      const k = Math.hypot(tx - this.x, ty - this.y); if (k > P) { tx = this.x + ((tx - this.x) / k) * P; ty = this.y + ((ty - this.y) / k) * P; }
      const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy), step = Math.min(dist, s.droneSpeed * dt);
      if (dist > 0.1) { d.x += (dx / dist) * step; d.y += (dy / dist) * step; }
      d.tilt += ((dist > 4 ? Math.max(-0.35, Math.min(0.35, dx / 120)) : 0) - d.tilt) * Math.min(1, dt * 6);
      d.cd -= dt * (game.overT > 0 ? BOOSTS.over.rate : 1) * (this.chill > 0 ? GAME.chillRate : 1); d.fire = Math.max(0, d.fire - dt);
      if (best && d.cd <= 0 && Math.hypot(best.x - d.x, best.y - d.y) <= s.range + best.r * 0.5) {
        d.cd = 1 / s.rate; d.fire = 0.06;
        if (s.splash) { game.explode(best.x, best.gy, s.splash, s.damage, this, { mini: true }); if (s.burn) best.ignite(s.burn, s.burnDur, this); game.fx.tracer(d.x, d.y, best.x, best.gy, '#ffb347', 3, 0.12); }
        else { const r = this.roll(best); this.onHit(game, best, 0); game.damage(best, r.dmg, this, { crit: r.crit }); game.fx.tracer(d.x, d.y, best.x, best.y, '#9ff6ff', 2, 0.07); game.audio.play('shot_smg'); }
      }
    });
  }
  pulse(game) {
    const s = this.stats;
    for (const e of game.enemies) {
      if (e.dead || Math.hypot(e.x - this.x, e.y - this.y) > s.range * game.rangeK + e.r * 0.5) continue;
      e.applySlow(s.slow, s.slowDur);
      if (s.freezeChance && Math.random() < s.freezeChance) { e.stun(s.freezeDur); game.fx.burst(e.x, e.y, '#d6f6ff', 6, 90, 4); }
      if (s.vuln) { e.vuln = s.vuln; e.vulnT = s.slowDur; }
      game.damage(e, s.damage, this, { dot: true, ignoreArmor: true });
    }
    game.fx.ring(this.x, this.y, 14, s.range, '#8fe3ff', 0.45, 6);
    game.fx.ring(this.x, this.y, 8, s.range * 0.7, '#ffffff', 0.35, 3);
    this.recoil = 1; game.audio.play('cryo');
  }

  draw(c, skin) {
    const game = this.game, acc = RARITY[this.level - 1].color;
    const sp = towerSprite(this.type, this.level, this.branch, skinFinish(skin));
    const pop = 1 + Math.sin(this.lvlAnim * Math.PI) * 0.55 + this.spawnAnim * 0.35, jump = Math.sin(this.lvlAnim * Math.PI) * 18;
    const h = sp.half, gold = this.level >= 5;
    if (AURA[skin] && this.type !== 'mine') { // skin de Renaissance : aura qui tourne autour du socle
      const col = AURA[skin], k = (this.t * 0.7) % 1;
      c.save(); c.translate(this.x, this.y); c.globalAlpha = 0.45 * (1 - k); c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 30 + k * 26, 0, TAU); c.stroke();
      c.globalAlpha = 0.85; c.fillStyle = col; for (let i = 0; i < 3; i++) { const a = this.t * 2 + (i * TAU) / 3; c.beginPath(); c.arc(Math.cos(a) * 36, Math.sin(a) * 30, 3.5, 0, TAU); c.fill(); }
      c.restore(); c.globalAlpha = 1;
    }
    c.save(); c.translate(this.x, this.y - jump);
    if (gold) { // halo légendaire
      const g = c.createRadialGradient(0, 0, 14, 0, 0, 52 + Math.sin(this.t * 3) * 4); g.addColorStop(0, 'rgba(255,210,63,.6)'); g.addColorStop(1, 'rgba(255,210,63,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 58, 0, TAU); c.fill();
    }
    c.scale(pop, pop);
    if (sp.ready) {
      if (sp.base) c.drawImage(sp.base.cv, -h, -h, h * 2, h * 2);
      if (this.type === 'cryo') { // aura froide
        const k = (this.t * 0.8) % 1; c.strokeStyle = `rgba(160,235,255,${0.5 * (1 - k)})`; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 16 + k * 22, 0, TAU); c.stroke();
      }
      c.save();
      const idle = gold ? 1 + Math.sin(this.t * 3) * 0.035 : 1;
      if (this.type === 'drone') { /* tête = drone, dessiné là où il vole */ }
      else if (!this.vis.turn) {
        const k = (this.type === 'cryo' ? 1 + this.recoil * 0.12 : 1) * idle;
        if (this.type === 'cryo') c.rotate(this.t * (gold ? 0.9 : 0.35));
        c.scale(k, k);
        c.drawImage(sp.head.cv, -h, -h, h * 2, h * 2);
        if (this.lvlAnim > 0.05) { c.globalAlpha = Math.min(1, this.lvlAnim * 1.4); c.drawImage(sp.head.white, -h, -h, h * 2, h * 2); c.globalAlpha = 1; }
        if (this.type === 'mine') { // voyant qui clignote
          const on = this.armed && Math.sin(this.t * 8) > 0;
          c.fillStyle = this.armed ? (on ? '#ff3b3b' : '#8a1f1f') : '#555'; c.beginPath(); c.arc(0, 0, 3.4, 0, TAU); c.fill();
          if (on) { c.fillStyle = 'rgba(255,60,60,.3)'; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill(); }
        }
      } else {
        c.rotate(this.angle + (this.target ? 0 : Math.sin(this.t * 0.9) * 0.18));
        c.translate(-this.recoil * 0.7, 0); c.scale(idle, idle);
        c.drawImage(sp.head.cv, -h, -h, h * 2, h * 2);
        if (this.lvlAnim > 0.05) { c.globalAlpha = Math.min(1, this.lvlAnim * 1.4); c.drawImage(sp.head.white, -h, -h, h * 2, h * 2); c.globalAlpha = 1; }
        if (this.type === 'minigun' && this.spin > 0.02) { // canons rotatifs
          c.strokeStyle = 'rgba(61,44,78,.6)'; c.lineWidth = 2; c.lineCap = 'round';
          for (let i = 0; i < 3; i++) { const y = Math.sin(this.spinAng + i * 2.094) * 5.5; c.beginPath(); c.moveTo(17, y); c.lineTo(this.level >= 3 ? 44 : 38, y); c.stroke(); }
        }
        if (this.flashT > 0) { // flash de bouche
          const n = this.type === 'smg' ? this.stats.barrels : 1, big = this.type === 'sniper' || this.type === 'shotgun' ? 1.7 : 1.15;
          for (let i = 0; i < n; i++) {
            c.save(); c.translate(this.vis.muzzle + 2, (i - (n - 1) / 2) * 6.5); c.rotate(Math.random() * 0.6 - 0.3); c.scale(big, big);
            c.fillStyle = '#ffb21a'; c.beginPath(); c.moveTo(-2, 0); c.lineTo(4, -9); c.lineTo(7, -3); c.lineTo(20, 0); c.lineTo(7, 3); c.lineTo(4, 9); c.closePath(); c.fill();
            c.fillStyle = '#fff6c8'; c.beginPath(); c.moveTo(0, 0); c.lineTo(4, -5); c.lineTo(13, 0); c.lineTo(4, 5); c.closePath(); c.fill();
            c.restore();
          }
        }
      }
      c.restore();
    }
    if (this.disabledT > 0) {
      c.fillStyle = 'rgba(95,216,255,0.35)'; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill();
      c.font = '700 18px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = '#3d2c4e'; c.lineWidth = 4; c.lineJoin = 'round';
      c.strokeText('zZz', 0, -34 - Math.sin(game.time * 4) * 3); c.fillText('zZz', 0, -34 - Math.sin(game.time * 4) * 3);
    }
    c.restore();
    // effets propres aux tourelles futuristes, dessinés dans le repère du terrain
    const dtv = 1 / 60;
    if (this.beams.length) {
      const k = this.beamK || 1, w = 3 + (k - 1) * 3, gold = this.level >= 5, m = this.muzzle();
      for (const b of this.beams) {
        b.t -= dtv; if (b.t <= 0 || b.e.dead) continue;
        c.lineCap = 'round'; c.strokeStyle = gold ? 'rgba(255,214,90,.55)' : 'rgba(255,63,180,.5)'; c.lineWidth = w + 7; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(b.e.x, b.e.y); c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = w; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(b.e.x, b.e.y, 4 + Math.random() * 4, 0, TAU); c.fill();
      }
      this.beams = this.beams.filter((b) => b.t > 0 && !b.e.dead);
    }
    for (const a of this.arcs) {
      a.t -= dtv; const al = Math.max(0, a.t / 0.18);
      c.strokeStyle = `rgba(160,190,255,${al})`; c.lineWidth = 7; c.lineJoin = 'round'; c.beginPath();
      a.pts.forEach((q, i) => { if (!i) { c.moveTo(q.x, q.y); return; } const p0 = a.pts[i - 1]; for (let k = 1; k <= 4; k++) { const u = k / 4, j = k < 4 ? Math.sin(a.seed + i * 3 + k * 1.7 + game.time * 40) * 10 : 0; c.lineTo(p0.x + (q.x - p0.x) * u + j, p0.y + (q.y - p0.y) * u - j); } });
      c.stroke(); c.strokeStyle = `rgba(255,255,255,${al})`; c.lineWidth = 2.5; c.stroke();
    }
    this.arcs = this.arcs.filter((a) => a.t > 0);
    if (this.type === 'drone' && sp.ready) {
      const hh = h * 0.78;
      for (const d of this.drones) {
        c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(d.x, d.y + 26, 18, 6, 0, 0, TAU); c.fill();
        c.save(); c.translate(d.x, d.y - 4 + Math.sin(this.t * 6 + d.a) * 2); c.rotate(d.tilt);
        c.drawImage(sp.head.cv, -hh, -hh, hh * 2, hh * 2);
        if (d.fire > 0) { c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(18, 0, 6, 0, TAU); c.fill(); }
        c.restore();
      }
    }
    if (this.lvlAnim > 0) { // rayons de « level up »
      const k = 1 - this.lvlAnim;
      c.save(); c.translate(this.x, this.y); c.globalAlpha = this.lvlAnim; c.strokeStyle = acc; c.lineWidth = 5; c.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + k; c.beginPath(); c.moveTo(Math.cos(a) * (34 + k * 36), Math.sin(a) * (34 + k * 36)); c.lineTo(Math.cos(a) * (46 + k * 70), Math.sin(a) * (46 + k * 70)); c.stroke(); }
      c.restore(); c.globalAlpha = 1;
    }
  }
}
