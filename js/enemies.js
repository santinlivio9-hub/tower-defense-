// Ennemis : déplacement, états (ralenti, gel, brûlure), capacités, dessin.
import { ENEMIES } from './config.js';
import { enemyFrames } from './sprites.js';

const TAU = Math.PI * 2;

export class Enemy {
  constructor(game, type, pathIdx, d, hpScale, bossMul = 1) {
    const cfg = ENEMIES[type], diff = game.diff;
    this.type = type; this.cfg = cfg;
    this.path = game.paths[pathIdx]; this.pathIdx = pathIdx;
    this.d = d; this.hpScale = hpScale;
    this.maxHp = Math.round(cfg.hp * diff.hp * (game.map.hp || 1) * (cfg.boss ? bossMul : hpScale));
    this.hp = this.maxHp;
    this.speed = cfg.speed * diff.speed * (cfg.boss ? 1 : 0.94 + Math.random() * 0.12);
    this.r = cfg.r; this.armor = cfg.armor || 0;
    this.flying = !!cfg.flying; this.boss = !!cfg.boss;
    this.off = cfg.boss ? 0 : (Math.random() - 0.5) * 22;
    this.phase = Math.random() * TAU; this.walk = 0; this.dir = 1;
    this.flash = 0; this.slowT = 0; this.slowF = 0; this.stunT = 0;
    this.burnT = 0; this.burnDps = 0; this.burnTower = null; this.burnTick = 0;
    this.vulnT = 0; this.vuln = 0; this.revealT = 0; this.shieldT = 0;
    this.abilityT = cfg.ability ? cfg.ability.every * 0.6 : 0;
    this.healT = cfg.heal ? cfg.heal.every : 0;
    this.pendingText = 0; this.textT = 0;
    this.dead = false; this.reached = false; this.enraged = false;
    this.blinkT = 1 + Math.random() * 3; this.enterT = cfg.boss ? 1 : 0;
    this.x = 0; this.y = 0; this.gy = 0;
    this.place();
  }
  get hidden() { return !!this.cfg.stealth && this.revealT <= 0; }
  get remaining() { return this.path.total - this.d; }

  place() {
    const p = this.path.pointAt(this.d);
    this.x = p.x - Math.sin(p.ang) * this.off;
    this.gy = p.y + Math.cos(p.ang) * this.off;
    this.y = this.gy - (this.flying ? 34 + Math.sin(this.walk * 0.05 + this.phase) * 5 : 0);
    const cx = Math.cos(p.ang);
    if (cx > 0.3) this.dir = 1; else if (cx < -0.3) this.dir = -1;
  }
  applySlow(f, dur) {
    if (this.boss) f *= 0.5;
    if (this.slowT <= 0 || f >= this.slowF) this.slowF = f;
    this.slowT = Math.max(this.slowT, dur);
  }
  stun(dur) { if (!this.boss) this.stunT = Math.max(this.stunT, dur); }
  ignite(dps, dur, tower) { if (dps >= this.burnDps || this.burnT <= 0) { this.burnDps = dps; this.burnTower = tower; } this.burnT = Math.max(this.burnT, dur); }
  knock(k) { if (this.boss) return; this.d = Math.max(0, this.d - (this.type === 'tank' ? k * 0.4 : k)); }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt * 5);
    this.blinkT -= dt; if (this.blinkT < -0.13) this.blinkT = 1.5 + Math.random() * 3.5;
    this.enterT = Math.max(0, this.enterT - dt * 0.9);
    this.slowT -= dt; this.stunT -= dt; this.vulnT -= dt; this.shieldT -= dt; this.revealT -= dt;
    let sp = this.speed;
    if (this.stunT > 0) sp = 0; else if (this.slowT > 0) sp *= 1 - this.slowF;
    if (this.enraged) sp *= 1.45;
    this.d += sp * dt; this.walk += sp * dt + (this.flying ? 40 * dt : 0);
    if (this.d >= this.path.total) { this.reached = true; this.dead = true; return; }
    this.place();

    if (this.burnT > 0) {
      this.burnT -= dt; this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.25;
        game.damage(this, this.burnDps * 0.25, this.burnTower, { dot: true });
        game.fx.add({ k: 'dot', x: this.x + (Math.random() - 0.5) * this.r, y: this.y - this.r * 0.5, vx: 0, vy: -60, life: 0.35, max: 0.35, size: 4, color: Math.random() < 0.5 ? '#ff9f1a' : '#ffd23f' });
      }
    }
    if (this.dead) return;
    // accumulateur de petits dégâts -> un seul chiffre flottant
    if (this.pendingText > 0) { this.textT -= dt; if (this.textT <= 0) { game.dmgText(this, this.pendingText, false); this.pendingText = 0; } }

    const cfg = this.cfg;
    if (cfg.heal) {
      this.healT -= dt;
      if (this.healT <= 0) {
        this.healT = cfg.heal.every;
        let any = false;
        for (const e of game.enemies) {
          if (e === this || e.dead || e.boss || e.hp >= e.maxHp) continue;
          if (Math.hypot(e.x - this.x, e.y - this.y) > cfg.heal.radius) continue;
          const amount = Math.min(e.maxHp - e.hp, e.maxHp * cfg.heal.pct);
          e.hp += amount; any = true;
          game.fx.text(e.x, e.y - e.r, '+' + Math.ceil(amount), '#5dff8f', 12, 0.6);
        }
        if (any) { game.fx.ring(this.x, this.y, 10, cfg.heal.radius, '#5dff8f', 0.5, 5); game.audio.play('heal'); }
      }
    }
    if (cfg.ability) {
      const a = cfg.ability;
      if (a.kind === 'rage' && !this.enraged && this.hp < this.maxHp * 0.5) {
        this.enraged = true; game.shake(10); game.fx.ring(this.x, this.y, 20, 160, '#ff3b3b', 0.6, 10);
        game.fx.text(this.x, this.y - this.r - 20, 'RAGE !', '#ff3b3b', 26, 1.2);
      }
      this.abilityT -= dt;
      if (this.abilityT <= 0) {
        this.abilityT = a.every;
        if (a.kind === 'summon') {
          for (let i = 0; i < a.count; i++) game.spawnEnemy(a.type, this.pathIdx, Math.min(this.path.total - 5, this.d + 25 + i * 22), this.hpScale);
          game.fx.ring(this.x, this.y, 10, 90, '#ffd23f', 0.5, 6); game.audio.play('wave_start');
        } else if (a.kind === 'emp') {
          for (const t of game.towers) if (Math.hypot(t.x - this.x, t.y - this.y) < a.radius) t.disabledT = a.dur;
          game.fx.ring(this.x, this.y, 20, a.radius, '#5fd8ff', 0.6, 10); game.fx.ring(this.x, this.y, 10, a.radius * 0.7, '#fff', 0.45, 5);
          game.shake(7); game.audio.play('zap');
        } else if (a.kind === 'rage') {
          this.shieldT = a.dur; this.hp = Math.min(this.maxHp, this.hp + this.maxHp * a.heal);
          game.fx.ring(this.x, this.y, 80, 20, '#fffbe8', 0.5, 8); game.audio.play('cryo');
        }
      }
    }
  }

  draw(c) {
    const f = enemyFrames(this.type), r = this.r;
    const w = this.walk * (this.boss ? 0.07 : 0.11) + this.phase;
    const bounce = Math.abs(Math.sin(w));
    const hop = this.flying ? 0 : bounce * (this.boss ? 6 : 5);
    const sq = (0.5 - bounce) * 0.14 + this.flash * 0.14;
    const hidden = this.hidden;
    const zoom = 1 + this.enterT * this.enterT * 1.6;               // entrée de boss : zoom
    const expr = this.flash > 0.2 || this.stunT > 0 ? 2 : this.blinkT < 0 ? 1 : 0;
    const step = Math.floor(w / Math.PI) & 1;
    const fr = f.frames[expr][step];
    // ombre portée au sol
    c.fillStyle = 'rgba(30,10,50,0.25)';
    c.beginPath(); c.ellipse(this.x, this.gy + r * 1.02, r * (0.9 - bounce * 0.12) * (this.flying ? 0.7 : 1), r * 0.28, 0, 0, TAU); c.fill();
    if (fr.ready) {
      if (hidden) c.globalAlpha = 0.25; else if (this.cfg.stealth) c.globalAlpha = 0.85;
      c.save();
      c.translate(this.x + (this.enterT > 0 ? (Math.random() - 0.5) * 6 * this.enterT : 0), this.y - hop + r * sq * 0.5);
      c.rotate(Math.sin(w) * (this.boss ? 0.035 : 0.07));
      c.scale(this.dir * (1 + sq) * zoom, (1 - sq) * zoom);
      const h = f.half;
      c.drawImage(fr.cv, -h, -h, h * 2, h * 2);
      if (this.flash > 0.02 && fr.white) { c.globalAlpha = Math.min(1, this.flash) * 0.85; c.drawImage(fr.white, -h, -h, h * 2, h * 2); }
      c.restore();
      c.globalAlpha = 1;
    }
    const top = this.y - hop - r * 1.35;
    if (this.slowT > 0 || this.stunT > 0) {
      c.fillStyle = this.stunT > 0 ? 'rgba(180,240,255,0.5)' : 'rgba(120,210,255,0.28)';
      c.beginPath(); c.arc(this.x, this.y - hop, r * 1.1, 0, TAU); c.fill();
    }
    if (this.shieldT > 0) {
      c.strokeStyle = '#fffbe8'; c.lineWidth = 6; c.globalAlpha = 0.6 + Math.sin(this.walk) * 0.2;
      c.beginPath(); c.arc(this.x, this.y - hop, r * 1.3, 0, TAU); c.stroke(); c.globalAlpha = 1;
    }
    if (this.cfg.stealth && !hidden) { // œil = révélé
      c.fillStyle = '#fff'; c.strokeStyle = '#3d2c4e'; c.lineWidth = 2.5;
      c.beginPath(); c.ellipse(this.x, top - 14, 9, 5.5, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#3d2c4e'; c.beginPath(); c.arc(this.x, top - 14, 2.8, 0, TAU); c.fill();
    }
    if (hidden || this.boss) return;   // le boss a sa grande barre en haut de l'écran
    // barre de vie arrondie
    const bw = Math.max(34, r * 1.9), bh = 6, bx = this.x - bw / 2, by = top - 4;
    const k = Math.max(0, this.hp / this.maxHp);
    c.fillStyle = '#3d2c4e'; c.beginPath(); c.roundRect(bx - 2.5, by - 2.5, bw + 5, bh + 5, 5); c.fill();
    c.fillStyle = '#5b2a3a'; c.beginPath(); c.roundRect(bx, by, bw, bh, 3); c.fill();
    if (k > 0) { c.fillStyle = k > 0.5 ? '#6dff7a' : k > 0.25 ? '#ffd23f' : '#ff5d6c'; c.beginPath(); c.roundRect(bx, by, Math.max(4, bw * k), bh, 3); c.fill(); }
    if (this.armor) { c.fillStyle = '#c9d3de'; c.beginPath(); c.roundRect(bx - 5, by - 3.5, 7, bh + 7, 3); c.fill(); c.strokeStyle = '#3d2c4e'; c.lineWidth = 2; c.stroke(); }
  }
}
