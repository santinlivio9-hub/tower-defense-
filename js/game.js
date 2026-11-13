// Cœur du jeu : état d'une partie, boucle de mise à jour (delta time), dégâts, rendu.
import { VIEW, GAME, DIFFICULTIES, TOWERS, TOWER_ORDER, ENEMIES, RARITY, SHOP, STARS, SCORE, BOSS_ORDER } from './config.js';
import { THEMES, buildField, drawMapBackground, drawMapAnimated, drawClouds, mapFlowers } from './maps.js';
import { Enemy } from './enemies.js';
import { Tower } from './towers.js';
import { Fx } from './fx.js';
import { buildWave, spawnQueue } from './waves.js';
import { drawPad, towerSprite, skinFinish } from './sprites.js';
import { drawCastle } from './castle.js';

const TAU = Math.PI * 2;

export class Game {
  constructor({ canvas, map, difficulty, endless, save, audio }) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.map = map; this.diffId = difficulty; this.diff = DIFFICULTIES[difficulty]; this.endless = endless;
    this.save = save; this.audio = audio;
    this.theme = THEMES[map.theme]; this.field = buildField(map.layout, !!map.mirror, map.slots);
    this.paths = this.field.paths; this.base = this.field.base;
    this.flowers = [];
    this.score = 0; this.comboN = 0; this.comboT = -9; this.cleanWave = true;
    const perks = save.data.perks, perk = (id) => SHOP.perks.find((p) => p.id === id).per * (perks[id] || 0);
    this.money = this.diff.money + perk('money');
    this.maxLives = this.diff.lives + perk('lives'); this.lives = this.maxLives;
    this.totalWaves = GAME.totalWaves;
    this.wave = 0; this.cleared = 0; this.queue = []; this.spawnClock = 0; this.countdown = null;
    this.enemies = []; this.towers = []; this.projectiles = []; this.delayed = [];
    this.fx = new Fx();
    this.time = 0; this.speed = 1; this.paused = false; this.over = false; this.result = null;
    this.stats = { kills: 0, bossKills: 0, earned: 0, built: 0, damage: 0, dmgByType: {}, leaks: 0, early: 0, legendaries: 0 };
    this.slots = [...this.field.slots, ...this.field.mines].map((s) => ({ ...s, tower: null }));
    this.selected = null; this.hoverTower = null; this.menuSlot = null; this.preview = null; this.freeNext = false;
    this.hintT = 0; this.canBuy = false;
    this.shakeMag = 0; this.baseFlash = 0; this.banner = null; this.scale = 1; this.bg = null;
    this.onEvent = () => {};
    this._nextCache = null; this.useSlots = true;
    this.setView(1, 0, 0, VIEW.W, VIEW.H);
  }

  // --- affichage -------------------------------------------------------------
  // S = pixels par unité ; (ox, oy) = position de la zone jouable dans le canvas, en unités ; cw x ch = taille du canvas.
  // Le décor est dessiné sur tout le canvas : il dépasse de la zone jouable pour remplir l'écran.
  setView(S, ox, oy, cw, ch) {
    this.scale = S; this.ox = ox; this.oy = oy;
    this.ext = { l: -ox, t: -oy, r: cw / S - ox, b: ch / S - oy };
    this.flowers = mapFlowers(this.field, this.ext);
    this.bg = document.createElement('canvas');
    this.bg.width = cw; this.bg.height = ch;
    const c = this.bg.getContext('2d'); c.setTransform(S, 0, 0, S, ox * S, oy * S);
    drawMapBackground(c, this.theme, this.field, this.ext, { slots: this.useSlots });
  }
  shake(m) { if (this.save.data.settings.shake) this.shakeMag = Math.min(18, Math.max(this.shakeMag, m)); }
  showBanner(title, sub, color = '#fff', dur = 2.2, big = false, sub2 = '') { this.banner = { title, sub, sub2, color, t: 0, dur, big }; }

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
      this.addScore(bonus * SCORE.earlyPerCoin);
      this.fx.text(VIEW.W / 2, 150, `EN AVANCE ! +${bonus}`, '#ffd23f', 26, 1.4);
      this.onEvent('coins', { x: VIEW.W / 2, y: 170, n: 6 });
    }
    const w = this.nextWave;
    this.wave = w.n; this._nextCache = null; this.countdown = null;
    for (const q of spawnQueue(w, this.paths.length)) { q.t += this.spawnClock; this.queue.push(q); }
    this.queue.sort((a, b) => a.t - b.t);
    if (!w.boss) this.showBanner('Vague ' + w.n, this.endless ? 'Mode infini' : `sur ${this.totalWaves}`, '#fff', 1.5);
    this.audio.play('wave_start');
    this.onEvent('wave', w.n);
    return true;
  }
  spawnEnemy(type, pathIdx, d, hpScale, bossMul = 1) {
    const e = new Enemy(this, type, pathIdx, d, hpScale, bossMul);
    this.enemies.push(e);
    if (e.boss) {
      this.showBanner('BOSS', e.cfg.name, '#ff5d6c', 3.4, true, e.cfg.title);
      this.shake(14); this.audio.play('boss'); this.onEvent('haptic', 2);
      this.fx.ring(e.x, e.y, 20, 260, '#ff4d4d', 0.9, 12);
    }
    return e;
  }

  // --- économie et score -----------------------------------------------------
  addMoney(n) { this.money += n; this.stats.earned += n; }
  addScore(n) { n = Math.round(n * SCORE.diffMult[this.diffId]); this.score += n; return n; }

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
    this.onEvent('coins', { x: e.x, y: e.y, n: e.boss ? 8 : Math.max(1, Math.round(reward / 5)), amount: reward });
    // score : points du kill + bonus de multi-kill
    const pts = this.addScore(e.boss ? SCORE.boss * (BOSS_ORDER.indexOf(e.type) + 1) : e.cfg.cost * SCORE.perCost);
    fx.text(e.x, e.y - e.r - 24, '+' + pts, '#8fe9ff', e.boss ? 28 : 14, 0.9);
    this.comboN = this.time - this.comboT <= SCORE.multiWindow ? this.comboN + 1 : 1; this.comboT = this.time;
    if (this.comboN >= 2) {
      const [label, bonus] = SCORE.multi[Math.min(5, this.comboN)], b = this.addScore(bonus);
      if (this.comboText) this.comboText.life = 0;
      fx.text(e.x, e.y - e.r - 50, `${label} +${b}`, ['#fff', '#fff', '#ffd23f', '#ff9f1a', '#ff5d8f', '#ff3b6b'][Math.min(5, this.comboN)], 16 + Math.min(5, this.comboN) * 3, 1.1);
      this.comboText = fx.texts[fx.texts.length - 1];
      this.onEvent('combo', this.comboN);
    }
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
    this.audio.play('explosion'); if (!o.mini) this.onEvent('haptic', 1);
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
  // Emplacement (socle ou zone de mine) sous un point du terrain
  slotAt(x, y) {
    let best = null, bd = 40;
    for (const sl of this.slots) { const d = Math.hypot(sl.x - x, sl.y - y); if (d < bd) { bd = d; best = sl; } }
    return best;
  }
  // Tourelles proposées sur un emplacement vide
  buildable(slot) {
    return TOWER_ORDER.filter((t) => this.save.towerUnlocked(t) && (t === 'mine') === (slot.kind === 'mine') && !(this.banned || []).includes(t));
  }
  costOf(type) { return this.freeNext ? 0 : TOWERS[type].cost; }
  placeTower(type, slot) {
    if (this.over || !slot || slot.tower || !this.buildable(slot).includes(type)) { this.audio.play('error'); return null; }
    const cost = this.costOf(type);
    if (this.money < cost || (this.towerLimit && this.towers.length >= this.towerLimit)) { this.audio.play('error'); return null; }
    this.money -= cost; if (cost === 0) this.freeNext = false;
    const t = new Tower(this, type, slot.x, slot.y);
    t.slot = slot; slot.tower = t; if (cost === 0) t.invested = 0;
    this.towers.push(t); this.stats.built++; this.hintT = 0;
    this.fx.ring(t.x, t.y, 6, 46, '#ffffff', 0.3, 5); this.fx.burst(t.x, t.y, '#d9c7a0', 12, 150, 5);
    this.audio.play('place');
    this.onEvent('placed', t);
    return t;
  }
  upgradeTower(t, opt) {
    if (this.over || !opt || this.money < opt.cost) { this.audio.play('error'); return false; }
    this.money -= opt.cost; t.invested += opt.cost;
    t.level = opt.level; t.branch = opt.branch; t.refresh(); t.lvlAnim = 1;
    const col = RARITY[t.level - 1].color;
    this.fx.ring(t.x, t.y, 10, 80, col, 0.5, 9); this.fx.ring(t.x, t.y, 4, 120, '#ffffff', 0.4, 4);
    this.fx.burst(t.x, t.y, col, 22, 260, 6); this.fx.burst(t.x, t.y, '#ffffff', 10, 180, 4);
    this.fx.add({ k: 'flash', x: t.x, y: t.y, vx: 0, vy: 0, life: 0.18, max: 0.18, size: 46, color: '#ffffff' });
    for (let i = 0; i < 8; i++) this.fx.add({ k: 'dot', x: t.x + (Math.random() - 0.5) * 40, y: t.y + 10, vx: 0, vy: -90 - Math.random() * 80, life: 0.7, max: 0.7, size: 3.5, color: col });
    this.shake(t.level >= 4 ? 5 : 2.5); this.hintT = 0;
    this.fx.text(t.x, t.y - 40, t.level >= 4 ? t.label + ' !' : 'NIVEAU ' + t.level + ' !', col, t.level >= 4 ? 20 : 18, 1.3);
    if (t.level >= 5) { this.stats.legendaries++; this.fx.confetti(t.x, t.y, 40, 300); this.audio.play('legendary'); }
    else this.audio.play('upgrade');
    this.onEvent('upgraded', t);
    return true;
  }
  sellTower(t) {
    const i = this.towers.indexOf(t); if (i < 0) return;
    this.towers.splice(i, 1); if (t.slot) t.slot.tower = null;
    this.money += t.sellValue;
    this.onEvent('coins', { x: t.x, y: t.y, n: 5 }); this.fx.burst(t.x, t.y, '#aab', 10, 140, 5);
    this.fx.text(t.x, t.y - 30, '+' + t.sellValue, '#ffd23f', 16, 0.9);
    this.audio.play('sell');
    if (this.selected === t) this.selected = null;
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
    this.hintT -= dt;
    if (this.hintT <= 0) { // indicateurs « UP » et socles achetables
      this.hintT = 0.3;
      for (const t of this.towers) { const o = t.upgradeOptions(); t.canUp = o.length > 0 && o.some((u) => u.cost <= this.money); }
      let min = Infinity; for (const k of TOWER_ORDER) if (k !== 'mine' && this.save.towerUnlocked(k)) min = Math.min(min, this.costOf(k));
      this.canBuy = this.money >= min && !(this.towerLimit && this.towers.length >= this.towerLimit);
    }
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
        this.fx.text(VIEW.W / 2, 210, `VAGUE TERMINÉE !`, '#6dff9a', 30, 1.6);
        this.onEvent('coins', { x: VIEW.W / 2, y: 240, n: 8, amount: bonus });
        if (this.cleanWave) { const b = this.addScore(SCORE.cleanWave + SCORE.cleanWavePerWave * this.wave); this.fx.text(VIEW.W / 2, 262, `VAGUE PARFAITE +${b}`, '#8fe9ff', 22, 1.8); }
        this.cleanWave = true;
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
    this.lives -= e.cfg.leak; this.stats.leaks++; this.cleanWave = false; this.onEvent('haptic', 2);
    this.baseFlash = 1; this.shake(e.boss ? 16 : 6); this.audio.play('leak');
    this.fx.burst(this.base.x, this.base.y, '#ff4d4d', 14, 220, 6);
    this.fx.text(this.base.x, this.base.y - 96, '-' + e.cfg.leak + ' PV', '#ff5d6c', 26, 1);
    if (this.lives <= 0) { this.lives = 0; this.end(false); }
  }

  // --- fin de partie ---------------------------------------------------------
  end(victory) {
    if (this.over) return;
    this.over = true; this.selected = null; this.menuSlot = null; this.preview = null;
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
    const lifeBonus = victory ? this.addScore(this.lives * SCORE.lifeBonus) : 0;
    const md = this.save.mapData(this.map.id), key = this.endless ? 'endless' : this.diffId;
    const previous = md.best[key] || 0, record = this.score > previous && this.score > 0;
    this.result = { victory, stars, gems, wavesDone, best, endless: this.endless, score: this.score, lifeBonus, previous, record };
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
    const md = this.save.mapData(this.map.id), key = this.endless ? 'endless' : this.diffId;
    md.best[key] = Math.max(md.best[key] || 0, this.score); s.bestScore = Math.max(s.bestScore || 0, this.score);
    if (this.endless) { md.bestEndless = Math.max(md.bestEndless || 0, wavesDone); s.bestEndless = Math.max(s.bestEndless, wavesDone); }
    else if (victory) {
      s.wins++; if (this.lives >= this.maxLives) s.perfectWins++; if (this.diffId === 'hard') s.hardWins++;
      md.stars[this.diffId] = Math.max(md.stars[this.diffId] || 0, stars);
    }
    if (this.result) this.result.achievements = this.save.checkAchievements(); else this.save.checkAchievements();
    this.save.persist();
  }

  // --- rendu -----------------------------------------------------------------
  rangeCircle(c, x, y, r, mode = 'info') {
    const col = mode === 'ok' ? '80,255,140' : mode === 'bad' ? '255,70,90' : '255,255,255';
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    c.fillStyle = `rgba(${col},${mode === 'info' ? 0.12 : 0.2})`; c.fill();
    c.setLineDash([10, 7]); c.lineDashOffset = -this.time * 24; c.lineWidth = 3;
    c.strokeStyle = `rgba(${col},0.95)`; c.stroke(); c.setLineDash([]);
  }
  label(c, text, x, y, size, color, lw = 6) {
    c.font = `700 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = lw; c.strokeStyle = '#3d2c4e'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y);
  }
  render() {
    const c = this.ctx, S = this.scale, { W, H } = VIEW;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const E = this.ext, ox = this.ox, oy = this.oy;
    let sx = 0, sy = 0;
    if (this.shakeMag > 0.3) { sx = (Math.random() - 0.5) * 2 * this.shakeMag; sy = (Math.random() - 0.5) * 2 * this.shakeMag; c.fillStyle = this.theme.g2; c.fillRect(0, 0, this.canvas.width, this.canvas.height); }
    c.drawImage(this.bg, Math.round(sx * S), Math.round(sy * S));
    c.setTransform(S, 0, 0, S, (ox + sx) * S, (oy + sy) * S);
    c.lineJoin = 'round'; c.lineCap = 'round';
    drawMapAnimated(c, this.theme, this.field, this.flowers, this.time);
    if (this.baseFlash > 0) { c.fillStyle = `rgba(255,40,60,${this.baseFlash * 0.5})`; c.beginPath(); c.arc(this.base.x, this.base.y, 105, 0, TAU); c.fill(); }

    const skin = this.save.data.skin;
    c.save(); c.translate(this.base.x, this.base.y); drawCastle(c, this.castleTier || 1, { time: this.time }); c.restore();
    c.lineWidth = 1; c.lineJoin = 'round'; c.lineCap = 'round';
    for (const t of this.towers) if (t.type === 'mine') t.draw(c, skin);
    const ground = this.enemies.filter((e) => !e.flying).sort((a, b) => a.gy - b.gy);
    for (const e of ground) e.draw(c);
    for (const t of this.towers) if (t.type !== 'mine') t.draw(c, skin);
    for (const e of this.enemies) if (e.flying) e.draw(c);
    this.fx.drawTracers(c);
    for (const p of this.projectiles) p.draw(c);
    this.fx.draw(c);
    drawClouds(c, this.theme, this.time, E);

    const hints = this.save.data.settings.hints !== false && !this.over;
    // socles libres : léger pulse quand on peut acheter
    if (hints && this.canBuy) {
      const k = (Math.sin(this.time * 4) + 1) / 2;
      c.lineWidth = 3 + k * 2; c.strokeStyle = `rgba(120,255,160,${0.35 + k * 0.45})`;
      for (const sl of this.slots) if (!sl.tower && sl.kind === 'tower' && sl !== this.menuSlot) { c.beginPath(); c.arc(sl.x, sl.y, GAME.towerRadius + 4 + k * 3, 0, TAU); c.stroke(); }
    }
    // flèche UP au-dessus des tourelles améliorables
    if (hints) for (const t of this.towers) if (t.canUp && t.slot !== this.menuSlot) {
      const by = t.y - 46 - Math.abs(Math.sin(this.time * 4 + t.x)) * 6;
      c.save(); c.translate(t.x, by);
      c.fillStyle = '#3d2c4e'; c.beginPath(); c.arc(0, 0, 12.5, 0, TAU); c.fill();
      c.fillStyle = '#3fd873'; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3.2; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(0, 5.5); c.lineTo(0, -5); c.moveTo(-4.5, -0.5); c.lineTo(0, -5.5); c.lineTo(4.5, -0.5); c.stroke();
      c.restore();
    }
    // emplacement ouvert + portée
    const ms = this.menuSlot, pv = this.preview;
    if (ms) {
      const t = ms.tower;
      if (pv) this.rangeCircle(c, ms.x, ms.y, pv.r, pv.mode || 'ok');
      else if (t) this.rangeCircle(c, t.x, t.y, t.rangeShown);
      c.strokeStyle = '#fff'; c.lineWidth = 3.5; c.beginPath(); c.arc(ms.x, ms.y, 33 + Math.sin(this.time * 6) * 2, 0, TAU); c.stroke();
    }
    this.fx.drawTexts(c);

    c.setTransform(S, 0, 0, S, ox * S, oy * S);
    // barre de vie du boss
    const boss = this.enemies.find((e) => e.boss);
    if (boss) {
      const bw = W - 120, bx = 60, by = 20, k = Math.max(0, boss.hp / boss.maxHp);
      c.fillStyle = '#3d2c4e'; c.beginPath(); c.roundRect(bx - 6, by - 6, bw + 12, 36, 18); c.fill();
      c.fillStyle = '#5b2a3a'; c.beginPath(); c.roundRect(bx, by, bw, 24, 12); c.fill();
      const g = c.createLinearGradient(0, by, 0, by + 24);
      if (boss.shieldT > 0) { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8e0c8'); } else { g.addColorStop(0, boss.enraged ? '#ff8a8a' : '#ffb347'); g.addColorStop(1, boss.enraged ? '#e0283c' : '#ff5d3c'); }
      c.fillStyle = g;
      if (k > 0) { c.beginPath(); c.roundRect(bx, by, Math.max(24, bw * k), 24, 12); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(bx + 6, by + 3, Math.max(10, bw * k - 12), 6, 3); c.fill();
      this.label(c, boss.cfg.name, W / 2, by + 13, 17, '#fff', 5);
    }
    // bannière (vague / boss)
    const b = this.banner;
    if (b) {
      const inn = Math.min(1, b.t / 0.25), out = Math.min(1, (b.dur - b.t) / 0.3), a = Math.min(inn, out);
      const y = b.big ? H * 0.42 : 120;
      c.globalAlpha = a;
      if (b.big) {
        c.fillStyle = 'rgba(30,14,40,0.72)'; c.fillRect(E.l, y - 110, E.r - E.l, 220);
        c.fillStyle = b.color; c.fillRect(E.l, y - 116, E.r - E.l, 7); c.fillRect(E.l, y + 109, E.r - E.l, 7);
        c.fillStyle = '#ffd23f'; for (let i = -1; i < 16; i++) { const x0 = i * 44 + ((this.time * 60) % 44); c.beginPath(); c.moveTo(x0, y - 109); c.lineTo(x0 + 22, y - 109); c.lineTo(x0 + 10, y - 97); c.lineTo(x0 - 12, y - 97); c.closePath(); c.fill(); }
      }
      const slide = (1 - inn) * -260 + (1 - out) * 260;
      const zoom = b.big ? 1 + (1 - inn) * 1.4 : 1, jit = b.big ? Math.sin(b.t * 40) * 2.5 : 0;
      c.save(); c.translate(W / 2 + (b.big ? jit : slide), y - (b.big ? 46 : b.sub ? 10 : 0)); c.scale(zoom, zoom);
      this.label(c, b.title, 0, 0, b.big ? 92 : 48, b.color, 12); c.restore();
      if (b.sub) this.label(c, b.sub, W / 2 - (b.big ? slide : 0), y + (b.big ? 30 : 32), b.big ? 36 : 20, '#fff', 7);
      if (b.sub2) this.label(c, b.sub2, W / 2 + slide, y + 74, 20, '#ffd23f', 6);
      c.globalAlpha = 1;
    }
    if (this.paused && !this.over) { c.fillStyle = 'rgba(30,14,40,0.35)'; c.fillRect(E.l, E.t, E.r - E.l, E.b - E.t); }
  }
}
