// Cœur du jeu : état d'une partie, boucle de mise à jour (delta time), dégâts, rendu.
import { VIEW, GAME, DIFFICULTIES, TOWERS, ENEMIES, RARITY, SHOP, STARS } from './config.js';
import { Path, drawMapBackground } from './maps.js';
import { Enemy } from './enemies.js';
import { Tower } from './towers.js';
import { Fx } from './fx.js';
import { buildWave, spawnQueue } from './waves.js';
import { drawGun, drawTowerBase, skinPalette } from './draw.js';

const TAU = Math.PI * 2;

export class Game {
  constructor({ canvas, map, difficulty, endless, save, audio }) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.map = map; this.diffId = difficulty; this.diff = DIFFICULTIES[difficulty]; this.endless = endless;
    this.save = save; this.audio = audio;
    this.paths = map.paths.map((p) => new Path(p));
    this.base = this.paths[0].end;
    const perks = save.data.perks, perk = (id) => SHOP.perks.find((p) => p.id === id).per * (perks[id] || 0);
    this.money = this.diff.money + perk('money');
    this.maxLives = this.diff.lives + perk('lives'); this.lives = this.maxLives;
    this.totalWaves = GAME.totalWaves;
    this.wave = 0; this.cleared = 0; this.queue = []; this.spawnClock = 0; this.countdown = null;
    this.enemies = []; this.towers = []; this.projectiles = []; this.delayed = [];
    this.fx = new Fx();
    this.time = 0; this.speed = 1; this.paused = false; this.over = false; this.result = null;
    this.stats = { kills: 0, bossKills: 0, earned: 0, built: 0, damage: 0, dmgByType: {}, leaks: 0, early: 0, legendaries: 0 };
    this.placing = null; this.hover = { x: 0, y: 0, active: false }; this.selected = null; this.hoverTower = null;
    this.shakeMag = 0; this.baseFlash = 0; this.banner = null; this.scale = 1; this.bg = null;
    this.onEvent = () => {};
    this._nextCache = null;
    this.setScale(1);
  }

  // --- affichage -------------------------------------------------------------
  setScale(s) {
    this.scale = s;
    this.bg = document.createElement('canvas');
    this.bg.width = Math.round(VIEW.W * s); this.bg.height = Math.round(VIEW.H * s);
    const c = this.bg.getContext('2d'); c.scale(s, s);
    drawMapBackground(c, this.map, this.paths);
  }
  shake(m) { if (this.save.data.settings.shake) this.shakeMag = Math.min(18, Math.max(this.shakeMag, m)); }
  showBanner(title, sub, color = '#fff', dur = 2.2, big = false) { this.banner = { title, sub, color, t: 0, dur, big }; }

  // --- vagues ----------------------------------------------------------------
  get nextWave() {
    const n = this.wave + 1;
    if (!this.endless && n > this.totalWaves) return null;
    if (!this._nextCache || this._nextCache.n !== n) this._nextCache = buildWave(n, this.map.id, this.paths.length);
    return this._nextCache;
  }
  get canStartNext() { return !this.over && this.queue.length === 0 && this.nextWave !== null; }
  // Bonus si on lance la vague en avance
  get earlyBonus() {
    if (this.wave === 0) return 0;
    if (this.enemies.length > 0) return GAME.earlyBonusAlive + Math.round(GAME.interWaveTime * GAME.earlyBonusPerSec);
    return Math.round((this.countdown || 0) * GAME.earlyBonusPerSec);
  }
  startNextWave(manual = true) {
    if (!this.canStartNext) return false;
    const bonus = manual ? this.earlyBonus : 0;
    if (bonus > 0) {
      this.addMoney(bonus); this.stats.early++;
      this.fx.text(VIEW.W / 2, 120, `En avance ! +${bonus}`, '#ffd23f', 24, 1.4);
      this.fx.coinBurst(VIEW.W / 2, 130, 6);
    }
    const w = this.nextWave;
    this.wave = w.n; this._nextCache = null; this.countdown = null;
    for (const q of spawnQueue(w, this.paths.length)) { q.t += this.spawnClock; this.queue.push(q); }
    this.queue.sort((a, b) => a.t - b.t);
    if (!w.boss) this.showBanner('Vague ' + w.n, this.endless ? 'Mode infini' : `sur ${this.totalWaves}`, '#fff', 1.6);
    this.audio.play('wave_start');
    this.onEvent('wave', w.n);
    return true;
  }
  spawnEnemy(type, pathIdx, d, hpScale, bossMul = 1) {
    const e = new Enemy(this, type, pathIdx, d, hpScale, bossMul);
    this.enemies.push(e);
    if (e.boss) {
      this.showBanner('⚠ BOSS ⚠', `${e.cfg.name} — ${e.cfg.title}`, '#ff4d4d', 3.4, true);
      this.shake(14); this.audio.play('boss');
      this.fx.ring(e.x, e.y, 20, 260, '#ff4d4d', 0.9, 12);
    }
    return e;
  }

  // --- économie --------------------------------------------------------------
  addMoney(n) { this.money += n; this.stats.earned += n; }

  // --- ciblage ---------------------------------------------------------------
  canTarget(t, e) {
    return !e.dead && !e.hidden && Math.hypot(e.x - t.x, e.y - t.y) <= t.stats.range + e.r * 0.5;
  }
  findTarget(t) {
    let best = null, bv = -Infinity;
    for (const e of this.enemies) {
      if (!this.canTarget(t, e)) continue;
      let v;
      if (t.mode === 'first') v = -e.remaining;
      else if (t.mode === 'last') v = e.remaining;
      else if (t.mode === 'strong') v = e.hp * 10000 - e.remaining;
      else v = -Math.hypot(e.x - t.x, e.y - t.y);
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }
  // Ennemis touchés par un rayon, du plus proche au plus loin
  lineHits(x, y, ang, len, max) {
    const dx = Math.cos(ang), dy = Math.sin(ang), out = [];
    for (const e of this.enemies) {
      if (e.dead || e.hidden) continue;
      const rx = e.x - x, ry = e.y - y, t = rx * dx + ry * dy;
      if (t < -e.r || t > len + e.r) continue;
      if (Math.abs(rx * dy - ry * dx) <= e.r + 3) out.push([t, e]);
    }
    out.sort((a, b) => a[0] - b[0]);
    return out.slice(0, max).map((o) => o[1]);
  }
  nearestEnemy(x, y, maxDist) {
    let best = null, bd = maxDist;
    for (const e of this.enemies) { if (e.dead || e.hidden) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
    return best;
  }

  // --- dégâts ----------------------------------------------------------------
  dmgText(e, amount, crit) {
    if (!this.save.data.settings.damageNumbers) return;
    const v = Math.max(1, Math.round(amount));
    if (crit) this.fx.text(e.x, e.y - e.r - 10, v + '!', '#ffb21a', 22, 0.85);
    else this.fx.text(e.x, e.y - e.r - 6, String(v), '#ffffff', 13, 0.6);
  }
  damage(e, amount, tower, o = {}) {
    if (e.dead) return;
    if (e.shieldT > 0) amount *= 0.2;
    if (e.armor && !o.ignoreArmor) amount = Math.max(amount - e.armor * (o.splash ? 0.5 : 1), amount * 0.25);
    if (e.vulnT > 0) amount *= 1 + e.vuln;
    const real = Math.min(amount, e.hp);
    if (e.cfg.stealth) e.revealT = Math.max(e.revealT, GAME.stealthRevealOnHit);
    e.hp -= amount;
    this.stats.damage += real;
    if (tower) { tower.dmg += real; this.stats.dmgByType[tower.type] = (this.stats.dmgByType[tower.type] || 0) + real; }
    if (!o.dot) { e.flash = 1; this.audio.play('hit'); }
    if (o.crit) { this.dmgText(e, amount, true); this.audio.play('crit'); }
    else if (o.dot || o.group || amount < 9) { if (e.pendingText <= 0) e.textT = 0.3; e.pendingText += amount; }
    else this.dmgText(e, amount, false);
    if (e.hp <= 0) this.kill(e, tower);
  }
  kill(e, tower) {
    e.dead = true;
    if (e.pendingText > 0) this.dmgText(e, e.pendingText, false);
    const reward = Math.round(e.cfg.reward * GAME.rewardMult);
    this.addMoney(reward);
    this.stats.kills++; if (tower) tower.kills++;
    const fx = this.fx;
    fx.burst(e.x, e.y, '#ffffff', 6, 160, 5);
    fx.confetti(e.x, e.y, e.boss ? 90 : 10 + Math.min(10, e.r * 0.4), e.boss ? 480 : 220);
    fx.ring(e.x, e.y, e.r * 0.5, e.r * 2.2, '#fff', 0.25, 4);
    fx.coinBurst(e.x, e.y, e.boss ? 8 : Math.max(1, Math.round(reward / 4)));
    fx.text(e.x, e.y - e.r - 22, '+' + reward, '#ffd23f', e.boss ? 26 : 13, 0.9);
    this.audio.play('death');
    if (e.cfg.split) {
      for (let i = 0; i < e.cfg.split.count; i++) {
        const c = this.spawnEnemy(e.cfg.split.type, e.pathIdx, Math.max(0, e.d - i * 14), e.hpScale);
        c.flash = 1;
      }
    }
    if (e.boss) {
      this.stats.bossKills++;
      this.shake(18); this.audio.play('explosion');
      fx.explosion(e.x, e.y, 150, '#ffd23f');
      for (let i = 0; i < 5; i++) this.delayed.push({ t: 0.12 * (i + 1), fn: () => { fx.explosion(e.x + (Math.random() - 0.5) * 140, e.y + (Math.random() - 0.5) * 140, 70); this.audio.play('explosion'); this.shake(8); } });
      this.showBanner('BOSS VAINCU !', '+' + reward + ' pièces', '#ffd23f', 2.2);
    }
  }
  explode(x, y, radius, damage, tower, o = {}) {
    this.fx.explosion(x, y, radius, o.mini ? '#ffd23f' : '#ff9f1a');
    this.shake(o.mini ? 2 : Math.min(8, radius / 14));
    this.audio.play('explosion');
    for (const e of this.enemies) {
      if (e.dead || (o.groundOnly && e.flying)) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > radius + e.r * 0.6) continue;
      if (o.stun) e.stun(o.stun);
      const crit = tower && Math.random() < tower.stats.crit;
      this.damage(e, damage * (1 - 0.5 * Math.min(1, d / radius)) * (crit ? tower.stats.critMult : 1), tower, { splash: true, crit });
    }
    for (let i = 0; i < (o.cluster || 0); i++) {
      const a = (i / o.cluster) * TAU + Math.random(), r = radius * (0.7 + Math.random() * 0.5);
      this.delayed.push({ t: 0.12 + i * 0.05, fn: () => this.explode(x + Math.cos(a) * r, y + Math.sin(a) * r, radius * 0.6, damage * 0.4, tower, { mini: true }) });
    }
  }

  // --- tourelles -------------------------------------------------------------
  // Renvoie { ok, x, y } (la mine est aimantée au chemin)
  canPlace(type, x, y) {
    const R = GAME.towerRadius;
    if (type === 'mine') {
      let best = null;
      for (const p of this.paths) { const n = p.nearest(x, y); if (!best || n.dist < best.dist) best = n; }
      if (best.dist > GAME.pathWidth / 2 + 14) return { ok: false, x, y };
      const ok = best.x > 30 && best.x < VIEW.W - 30 && best.y > 30 && best.y < VIEW.H - 30
        && Math.hypot(best.x - this.base.x, best.y - this.base.y) > 50
        && !this.towers.some((t) => t.type === 'mine' && Math.hypot(t.x - best.x, t.y - best.y) < 36)
        && this.towers.filter((t) => t.type === 'mine').length < GAME.maxMines;
      return { ok, x: best.x, y: best.y };
    }
    let ok = x > R && x < VIEW.W - R && y > R && y < VIEW.H - R;
    ok = ok && !this.paths.some((p) => p.nearest(x, y).dist < GAME.pathWidth / 2 + R - 2);
    ok = ok && !this.towers.some((t) => t.type !== 'mine' && Math.hypot(t.x - x, t.y - y) < R * 2 + 2);
    ok = ok && Math.hypot(x - (this.base.x + 30), y - this.base.y) > 80;
    return { ok, x, y };
  }
  placeTower(type, x, y) {
    const cfg = TOWERS[type];
    if (this.over || !this.save.towerUnlocked(type)) return null;
    const p = this.canPlace(type, x, y);
    if (!p.ok || this.money < cfg.cost) { this.audio.play('error'); return null; }
    this.money -= cfg.cost;
    const t = new Tower(this, type, p.x, p.y);
    this.towers.push(t); this.stats.built++;
    this.fx.ring(t.x, t.y, 6, 40, '#ffffff', 0.3, 5); this.fx.burst(t.x, t.y, '#d9c7a0', 10, 130, 5);
    this.audio.play('place');
    this.onEvent('placed', t);
    return t;
  }
  upgradeTower(t, opt) {
    if (this.over || !opt || this.money < opt.cost) { this.audio.play('error'); return false; }
    this.money -= opt.cost; t.invested += opt.cost;
    t.level = opt.level; t.branch = opt.branch; t.refresh(); t.lvlAnim = 1;
    const col = RARITY[t.level - 1].color;
    this.fx.ring(t.x, t.y, 10, 70, col, 0.5, 8);
    this.fx.burst(t.x, t.y, col, 16, 200, 6);
    this.fx.text(t.x, t.y - 40, t.level >= 4 ? t.label + ' !' : 'NIVEAU ' + t.level + ' !', col, t.level >= 4 ? 20 : 18, 1.3);
    if (t.level >= 5) { this.stats.legendaries++; this.fx.confetti(t.x, t.y, 40, 300); this.audio.play('legendary'); }
    else this.audio.play('upgrade');
    this.onEvent('upgraded', t);
    return true;
  }
  sellTower(t) {
    const i = this.towers.indexOf(t); if (i < 0) return;
    this.towers.splice(i, 1);
    this.money += t.sellValue;
    this.fx.coinBurst(t.x, t.y, 6); this.fx.burst(t.x, t.y, '#aab', 10, 140, 5);
    this.fx.text(t.x, t.y - 30, '+' + t.sellValue, '#ffd23f', 16, 0.9);
    this.audio.play('sell');
    if (this.selected === t) this.selected = null;
  }
  towerAt(x, y) {
    let best = null, bd = 30;
    for (const t of this.towers) { const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t; } }
    return best;
  }

  // --- boucle ----------------------------------------------------------------
  frame(dtReal) {
    const dt = Math.min(0.05, dtReal);
    if (!this.paused) for (let i = 0; i < this.speed; i++) this.update(dt);
    this.render();
  }
  update(dt) {
    this.time += dt;
    this.shakeMag *= Math.exp(-dt * 9); this.baseFlash = Math.max(0, this.baseFlash - dt * 3);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.over) {
      this.fx.update(dt);
      if (this.result && this.result.victory && Math.random() < dt * 14) this.fx.confetti(Math.random() * VIEW.W, -10, 5, 120);
      return;
    }
    // apparitions
    this.spawnClock += dt;
    while (this.queue.length && this.queue[0].t <= this.spawnClock) {
      const q = this.queue.shift();
      this.spawnEnemy(q.type, q.path, 0, q.hpScale, q.bossMul);
    }
    // révélation des invisibles par les tourelles "detect"
    for (const t of this.towers) {
      if (t.disabledT > 0 || t.type === 'mine') continue;
      const r = t.stats.detect ? t.stats.range : GAME.stealthRevealRange;
      for (const e of this.enemies) if (e.cfg.stealth && Math.hypot(e.x - t.x, e.y - t.y) <= r + e.r) e.revealT = Math.max(e.revealT, 0.4);
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.update(dt, this);
      if (e.reached) this.leak(e);
    }
    for (const t of this.towers) t.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (let i = this.delayed.length - 1; i >= 0; i--) { const d = this.delayed[i]; d.t -= dt; if (d.t <= 0) { this.delayed.splice(i, 1); d.fn(); } }
    this.fx.update(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    if (this.over) return;

    // fin de vague
    if (this.wave > 0 && this.queue.length === 0 && this.enemies.length === 0) {
      if (this.cleared < this.wave) {
        let bonus = 0;
        for (let n = this.cleared + 1; n <= this.wave; n++) bonus += GAME.waveBonusBase + GAME.waveBonusPerWave * n;
        this.cleared = this.wave;
        this.addMoney(bonus);
        this.fx.text(VIEW.W / 2, 150, `Vague terminée ! +${bonus}`, '#5dff8f', 26, 1.6);
        this.fx.coinBurst(VIEW.W / 2, 160, 8);
        this.audio.play('wave_clear');
        this.onEvent('cleared', this.wave);
        if (!this.endless && this.wave >= this.totalWaves) { this.end(true); return; }
        this.countdown = GAME.interWaveTime;
      } else if (this.countdown !== null) {
        this.countdown -= dt;
        if (this.countdown <= 0) this.startNextWave(false);
      }
    }
  }
  leak(e) {
    this.lives -= e.cfg.leak; this.stats.leaks++;
    this.baseFlash = 1; this.shake(e.boss ? 16 : 6); this.audio.play('leak');
    this.fx.burst(this.base.x, this.base.y, '#ff4d4d', 14, 220, 6);
    this.fx.text(this.base.x, this.base.y - 70, '-' + e.cfg.leak + ' ❤', '#ff4d4d', 22, 1);
    if (this.lives <= 0) { this.lives = 0; this.end(false); }
  }

  // --- fin de partie ---------------------------------------------------------
  end(victory) {
    if (this.over) return;
    this.over = true; this.selected = null; this.placing = null;
    const ratio = this.lives / this.maxLives;
    const stars = victory ? (ratio >= STARS.three ? 3 : ratio >= STARS.two ? 2 : 1) : 0;
    const wavesDone = victory ? this.wave : Math.max(0, this.cleared);
    let gems;
    if (this.endless) gems = wavesDone * SHOP.gemsPerWaveEndless;
    else if (victory) gems = SHOP.gemsWinBase + stars * SHOP.gemsPerStar;
    else gems = wavesDone * SHOP.gemsPerWaveLost;
    gems = Math.round(gems * this.diff.gems);
    let best = null;
    for (const t of this.towers) if (!best || t.dmg > best.dmg) best = t;
    this.result = { victory, stars, gems, wavesDone, best, endless: this.endless };
    this.commit(victory, stars, gems, wavesDone);
    this.audio.play(victory ? 'victory' : 'defeat');
    if (victory) for (let i = 0; i < 6; i++) this.fx.confetti(Math.random() * VIEW.W, Math.random() * VIEW.H * 0.6, 40, 400);
    this.onEvent('end', this.result);
  }
  // Écrit la progression dans la sauvegarde (appelé aussi si on abandonne)
  commit(victory = false, stars = 0, gems = 0, wavesDone = this.cleared) {
    if (this._committed) return; this._committed = true;
    const d = this.save.data, s = d.stats, g = this.stats;
    s.kills += g.kills; s.bossKills += g.bossKills; s.towersBuilt += g.built; s.legendaries += g.legendaries; s.earlyStarts += g.early; s.games++;
    d.gems += gems;
    const md = this.save.mapData(this.map.id);
    if (this.endless) { md.bestEndless = Math.max(md.bestEndless || 0, wavesDone); s.bestEndless = Math.max(s.bestEndless, wavesDone); }
    else if (victory) {
      s.wins++; if (this.lives >= this.maxLives) s.perfectWins++; if (this.diffId === 'hard') s.hardWins++;
      md.stars[this.diffId] = Math.max(md.stars[this.diffId] || 0, stars);
    }
    if (this.result) this.result.achievements = this.save.checkAchievements(); else this.save.checkAchievements();
    this.save.persist();
  }

  // --- rendu -----------------------------------------------------------------
  rangeCircle(c, x, y, r, ok = true) {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    c.fillStyle = ok ? 'rgba(255,255,255,0.12)' : 'rgba(255,60,60,0.18)'; c.fill();
    c.setLineDash([8, 6]); c.lineDashOffset = -this.time * 20; c.lineWidth = 2.5;
    c.strokeStyle = ok ? 'rgba(255,255,255,0.85)' : 'rgba(255,70,70,0.95)'; c.stroke(); c.setLineDash([]);
  }
  render() {
    const c = this.ctx, S = this.scale, { W, H } = VIEW;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#1d1a2b'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    let sx = 0, sy = 0;
    if (this.shakeMag > 0.3) { sx = (Math.random() - 0.5) * 2 * this.shakeMag; sy = (Math.random() - 0.5) * 2 * this.shakeMag; }
    c.setTransform(S, 0, 0, S, sx * S, sy * S);
    c.drawImage(this.bg, 0, 0, W, H);
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (this.baseFlash > 0) { c.fillStyle = `rgba(255,40,40,${this.baseFlash * 0.5})`; c.beginPath(); c.arc(this.base.x + 30, this.base.y - 10, 90, 0, TAU); c.fill(); }

    const skin = this.save.data.skin;
    for (const t of this.towers) if (t.type === 'mine') t.draw(c, skin);
    const ground = this.enemies.filter((e) => !e.flying).sort((a, b) => a.gy - b.gy);
    for (const e of ground) e.draw(c);
    for (const t of this.towers) if (t.type !== 'mine') t.draw(c, skin);
    for (const e of this.enemies) if (e.flying) e.draw(c);
    this.fx.drawTracers(c);
    for (const p of this.projectiles) p.draw(c);
    this.fx.draw(c);

    // portées
    const sel = this.selected, hov = this.hoverTower;
    if (hov && hov !== sel && !this.placing) this.rangeCircle(c, hov.x, hov.y, hov.rangeShown);
    if (sel) {
      this.rangeCircle(c, sel.x, sel.y, sel.rangeShown);
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(sel.x, sel.y, 27 + Math.sin(this.time * 6) * 1.5, 0, TAU); c.stroke();
    }
    // fantôme de placement
    if (this.placing && this.hover.active) {
      const type = this.placing, p = this.canPlace(type, this.hover.x, this.hover.y);
      const ok = p.ok && this.money >= TOWERS[type].cost;
      const st = TOWERS[type].base;
      this.rangeCircle(c, p.x, p.y, type === 'mine' ? st.splash : st.range, ok);
      c.save(); c.translate(p.x, p.y); c.globalAlpha = 0.75;
      if (type !== 'mine') drawTowerBase(c, 1);
      c.rotate(type === 'cryo' || type === 'mine' ? 0 : -Math.PI / 2);
      drawGun(c, type, { pal: skinPalette(skin), accent: RARITY[0].color, t: this.time, armed: true, spin: 0 });
      c.restore(); c.globalAlpha = 1;
      if (!ok) {
        c.strokeStyle = '#ff3b3b'; c.lineWidth = 6;
        c.beginPath(); c.moveTo(p.x - 14, p.y - 14); c.lineTo(p.x + 14, p.y + 14); c.moveTo(p.x + 14, p.y - 14); c.lineTo(p.x - 14, p.y + 14); c.stroke();
      }
    }
    this.fx.drawTexts(c);

    c.setTransform(S, 0, 0, S, 0, 0);
    // barre de vie du boss
    const boss = this.enemies.find((e) => e.boss);
    if (boss) {
      const bw = 520, bx = (W - bw) / 2, by = 20, k = Math.max(0, boss.hp / boss.maxHp);
      c.fillStyle = '#1d1a2b'; c.beginPath(); c.roundRect(bx - 5, by - 5, bw + 10, 32, 10); c.fill();
      c.fillStyle = '#4a1d1d'; c.beginPath(); c.roundRect(bx, by, bw, 22, 6); c.fill();
      c.fillStyle = boss.shieldT > 0 ? '#fffbe8' : boss.enraged ? '#ff3b3b' : '#ff7a3c';
      if (k > 0) { c.beginPath(); c.roundRect(bx, by, Math.max(8, bw * k), 22, 6); c.fill(); }
      c.font = '900 15px "Trebuchet MS", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = '#1d1a2b'; c.strokeText(`${boss.cfg.name}  ${Math.ceil(boss.hp)} / ${boss.maxHp}`, W / 2, by + 12);
      c.fillStyle = '#fff'; c.fillText(`${boss.cfg.name}  ${Math.ceil(boss.hp)} / ${boss.maxHp}`, W / 2, by + 12);
    }
    // bannière (vague / boss)
    const b = this.banner;
    if (b) {
      const inn = Math.min(1, b.t / 0.25), out = Math.min(1, (b.dur - b.t) / 0.3), a = Math.min(inn, out);
      const y = b.big ? H / 2 : 190;
      c.globalAlpha = a;
      if (b.big) { c.fillStyle = 'rgba(20,10,20,0.6)'; c.fillRect(0, y - 80, W, 160); c.fillStyle = b.color; c.fillRect(0, y - 84, W, 6); c.fillRect(0, y + 78, W, 6); }
      const slide = (1 - inn) * -200 + (1 - out) * 200;
      const size = b.big ? 78 : 46, jit = b.big ? Math.sin(b.t * 40) * 2 : 0;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.font = `900 ${size}px "Trebuchet MS", system-ui, sans-serif`;
      c.lineWidth = 10; c.strokeStyle = '#1d1a2b'; c.strokeText(b.title, W / 2 + slide + jit, y - (b.sub ? 14 : 0));
      c.fillStyle = b.color; c.fillText(b.title, W / 2 + slide + jit, y - (b.sub ? 14 : 0));
      if (b.sub) {
        c.font = `900 ${b.big ? 24 : 20}px "Trebuchet MS", system-ui, sans-serif`;
        c.lineWidth = 6; c.strokeText(b.sub, W / 2 - slide, y + size * 0.55); c.fillStyle = '#fff'; c.fillText(b.sub, W / 2 - slide, y + size * 0.55);
      }
      c.globalAlpha = 1;
    }
    if (this.paused && !this.over) { c.fillStyle = 'rgba(20,16,35,0.35)'; c.fillRect(0, 0, W, H); }
  }
}
