// Tourelles : stats, améliorations, ciblage, tir, dessin.
import { TOWERS, TOWER_VISUAL, GAME, RARITY, SHOP } from './config.js';
import { towerSprite, skinFinish } from './sprites.js';
import { Rocket } from './projectiles.js';

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

// Stats finales d'une tourelle pour un niveau / une branche donnés
export function computeStats(type, level, branch, perks = {}) {
  const cfg = TOWERS[type];
  const s = { crit: GAME.critChance, critMult: GAME.critMult, barrels: 1, ...cfg.base };
  for (let l = 2; l <= Math.min(level, 3); l++) applyMods(s, cfg.upgrades[l - 2]);
  if (level >= 4 && branch != null) {
    applyMods(s, cfg.branches[branch].mods);
    if (level >= 5) applyMods(s, cfg.branches[branch].master.mods);
  }
  const perk = SHOP.perks.find((p) => p.id === 'damage');
  s.damage *= 1 + (perks.damage || 0) * perk.per;
  if (s.burn) s.burn *= 1 + (perks.damage || 0) * perk.per;
  return s;
}

// Dégâts par seconde théoriques (affichage)
export function dpsOf(s) { return s.damage * (s.pellets || 1) * (s.barrels || 1) * s.rate + (s.burn || 0); }

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
    this.refresh();
  }
  refresh() { this.stats = computeStats(this.type, this.level, this.branch, this.game.save.data.perks); }
  get sellValue() { return Math.floor(this.invested * GAME.sellRatio); }
  get rangeShown() { return this.type === 'mine' ? this.stats.splash : this.stats.range; }
  get label() {
    if (this.level >= 5) return this.cfg.branches[this.branch].master.name;
    if (this.level >= 4) return this.cfg.branches[this.branch].name;
    return this.cfg.name;
  }

  upgradeOptions() {
    const c = this.cfg;
    if (this.level < 3) return [{ kind: 'level', name: 'Niveau ' + (this.level + 1), desc: 'Dégâts, cadence et portée améliorés.', cost: c.upgrades[this.level - 1].cost, level: this.level + 1, branch: null }];
    if (this.level === 3) return c.branches.map((b, i) => ({ kind: 'branch', name: b.name, desc: b.desc, cost: b.cost, level: 4, branch: i }));
    if (this.level === 4) { const m = c.branches[this.branch].master; return [{ kind: 'master', name: m.name, desc: m.desc, cost: m.cost, level: 5, branch: this.branch }]; }
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
    this.cooldown -= dt;

    if (kind === 'cryo') {
      if (this.cooldown <= 0) {
        let any = false;
        for (const e of game.enemies) if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) <= s.range + e.r * 0.5) { any = true; break; }
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
    }
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
        game.damage(e, dmg, this, { crit, ignoreArmor: s.ignoreArmor });
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
      const e = game.lineHits(m.x, m.y, a, s.range + 15, 1)[0];
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

  pulse(game) {
    const s = this.stats;
    for (const e of game.enemies) {
      if (e.dead || Math.hypot(e.x - this.x, e.y - this.y) > s.range + e.r * 0.5) continue;
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
    const pop = 1 + Math.sin(this.lvlAnim * Math.PI) * 0.4 + this.spawnAnim * 0.35;
    const h = sp.half, gold = this.level >= 5;
    c.save(); c.translate(this.x, this.y);
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
      if (!this.vis.turn) {
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
    if (this.lvlAnim > 0) { // rayons de « level up »
      const k = 1 - this.lvlAnim;
      c.save(); c.translate(this.x, this.y); c.globalAlpha = this.lvlAnim; c.strokeStyle = acc; c.lineWidth = 5; c.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + k; c.beginPath(); c.moveTo(Math.cos(a) * (34 + k * 36), Math.sin(a) * (34 + k * 36)); c.lineTo(Math.cos(a) * (46 + k * 70), Math.sin(a) * (46 + k * 70)); c.stroke(); }
      c.restore(); c.globalAlpha = 1;
    }
  }
}
