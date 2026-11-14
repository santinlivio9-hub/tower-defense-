// Cœur du jeu : état d'une partie, boucle de mise à jour (delta time), dégâts, rendu.
import { icon } from './icons.js';
import { enemyFrames } from './sprites.js';
import { levelRewards } from './economy.js';
import { WORLD_REWARD, PASS, DAILY, JUICE, DROPS, COINS, VIEW, GAME, TOWERS, TOWER_ORDER, RARITY, STARS, SCORE, BOSS_ORDER, WORLDS, CAMPAIGN, HEROIC, heroicMod, CASTLE, BOOSTS, XP } from './config.js';
import { THEMES, buildField, drawMapBackground, drawMapAnimated, drawClouds, mapFlowers, drawMineSpot, SLOT_R } from './maps.js';
import { Enemy } from './enemies.js';
import { Tower } from './towers.js';
import { Fx } from './fx.js';
import { buildWave, spawnQueue } from './waves.js';
import { drawCastle, drawCastleLights, castleGunY, castleBounds, nightLevel } from './castle.js';

const TAU = Math.PI * 2;

export class Game {
  // level = entrée de LEVELS ; heroic = défi héroïque ; endless = mode infini ; boosts = identifiants des boosts emportés
  // challenge = modificateur du défi du jour (voir DAILY.challenges)
  constructor({ canvas, level, heroic = false, endless = false, save, audio, boosts = [], challenge = null }) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.challenge = challenge; const Ch = challenge || {};
    this.level = endless ? { ...level, endless: true } : Ch.density ? { ...level, density: level.density * Ch.density } : level; this.endless = endless;
    this.world = WORLDS[level.world]; this.heroic = heroic && !endless ? heroicMod(level.n) : null;
    this.save = save; this.audio = audio;
    this.theme = THEMES[this.world.theme]; this.field = buildField(level.layout, level.mirror, level.slots, CAMPAIGN.mines);
    this.paths = this.field.paths; this.base = this.field.base;
    this.flowers = [];
    this.score = 0; this.comboN = 0; this.comboT = -9; this.cleanWave = true;
    const H = this.heroic || {}, cs = save.data.castle, U = CASTLE.upgrades, m = (this.mods = save.mods());
    const len = this.paths.reduce((a, q) => a + q.total, 0) / this.paths.length;
    this.ease = Math.max(CAMPAIGN.pathEase[0], Math.min(CAMPAIGN.pathEase[1], len / CAMPAIGN.pathRef));
    this.hpMult = level.hp * this.ease * (this.heroic ? HEROIC.hp * (H.hp || 1) : 1) * (Ch.hp || 1); this.speedMult = level.speed * (H.speed || 1) * (Ch.speed || 1);
    this.sizeMult = Ch.size || 1; this.coinMult = Ch.coins || 1;
    this.scoreMult = this.heroic ? HEROIC.scoreMult : 1;
    this.banned = Ch.only ? TOWER_ORDER.filter((t) => !Ch.only.includes(t)) : H.ban || []; this.towerLimit = H.towerLimit || 0;
    this.money = Math.round(level.money * (H.money || 1) * (Ch.money || 1)) + cs.treasury * U.treasury.start + m.startMoney;
    this.maxLives = (H.lives || CAMPAIGN.lives + cs.walls * U.walls.per) + m.lives; this.lives = this.maxLives;
    this.totalWaves = level.waves;
    this.wave = 0; this.cleared = 0; this.queue = []; this.spawnClock = 0; this.countdown = null;
    this.enemies = []; this.towers = []; this.projectiles = []; this.delayed = [];
    this.fx = new Fx();
    this.time = 0; this.speed = 1; this.paused = false; this.over = false; this.result = null;
    this.stats = { kills: 0, bossKills: 0, earned: 0, built: 0, damage: 0, dmgByType: {}, leaks: 0, leakBy: {}, early: 0, legendaries: 0, cost: 0 };
    this.slots = [...this.field.slots, ...this.field.mines].map((s) => ({ ...s, tower: null }));
    this.selected = null; this.hoverTower = null; this.menuSlot = null; this.preview = null; this.freeNext = false;
    this.hintT = 0; this.canBuy = false;
    // château : apparence, canon, capacités actives
    this.castleTier = save.castleTier(); this.night = nightLevel();
    // le château garde à peu près la même emprise sur le terrain, quel que soit son palier
    { const B = castleBounds(cs); this.castleK = Math.min(1, 230 / (B.bottom - B.top)); this.gunY = castleGunY(cs) * this.castleK; }
    this.cannon = { lvl: cs.cannon, cd: 0, aim: -Math.PI / 2, recoil: 0 };
    this.abilities = Object.keys(CASTLE.abilities).filter((id) => cs[id] > 0).map((id) => { const max = CASTLE.abilities[id].cd[cs[id]] * m.cdMult; return { id, lvl: cs[id], cd: Math.min(15, max), max }; });
    // boosts emportés et effets en cours
    this.boosts = boosts.map((id) => ({ id, used: false }));
    this.overT = 0; this.blizzT = 0; this.coins2Until = 0; this.shieldUntil = 0; this.flash = null; this.strikes = [];
    this.drops = []; this.dropCount = 0; this.lastDrop = -99; this.slowT = 0; this.bolts = []; this.dome = 0;
    this.chain = 0; this.chainT = -9; this.chainBest = 0; this.hitStopT = 0; this.lastHitStop = -9; this.cine = null; this.slowK = 0;
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
    if (!this._nextCache || this._nextCache.n !== n) this._nextCache = buildWave(n, this.level, this.paths.length);
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
    // cartes de présentation : types d'ennemis jamais rencontrés
    const seen = this.save.data.seen.enemies, fresh = [...new Set(w.groups.map((g) => g.type))].filter((t) => !seen.includes(t));
    if (fresh.length) { seen.push(...fresh); this.save.persist(); this.onEvent('intro', fresh); }
    this.wave = w.n; this._nextCache = null; this.countdown = null;
    for (const q of spawnQueue(w, this.paths.length)) { q.t += this.spawnClock; this.queue.push(q); }
    this.queue.sort((a, b) => a.t - b.t);
    if (!w.boss) this.showBanner(!this.endless && w.n === this.totalWaves ? 'Vague finale' : 'Vague ' + w.n, this.endless ? 'Mode infini' : `sur ${this.totalWaves}`, '#fff', 1.5);
    this.audio.play('wave_start');
    this.onEvent('wave', w.n);
    return true;
  }
  spawnEnemy(type, pathIdx, d, hpScale, bossMul = 1, o = {}) {
    const e = new Enemy(this, type, pathIdx, d, hpScale, bossMul, o);
    this.enemies.push(e);
    if (this.blizzT > 0) e.applySlow(this.blizzSlow, this.blizzT);
    if (e.boss) {
      if (!e.mini && !this.simulating) this.cine = { t: 0, dur: JUICE.bossIntro, boss: e };
      this.showBanner(e.mini ? 'MINI-BOSS' : 'BOSS', e.cfg.name, '#ff5d6c', e.mini ? 2.4 : 3.4, true, e.cfg.title);
      this.shake(14); this.audio.play('boss'); this.onEvent('haptic', 2);
      this.fx.ring(e.x, e.y, 20, 260, '#ff4d4d', 0.9, 12);
    }
    return e;
  }

  // --- économie et score -----------------------------------------------------
  addMoney(n) { this.money += n; this.stats.earned += n; }
  addScore(n) { n = Math.round(n * this.scoreMult); this.score += n; return n; }
  get coins2() { return this.coins2Until > this.cleared; }
  get shielded() { return this.shieldUntil > this.cleared; }

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
  // Combo : kills enchaînés (moins de JUICE.chainWindow s entre deux) ; paliers = points bonus
  chainKill(e) {
    this.chain = this.time - this.chainT <= JUICE.chainWindow ? this.chain + 1 : 1; this.chainT = this.time;
    this.chainBest = Math.max(this.chainBest, this.chain);
    const tier = JUICE.chainTiers.find((t) => t[0] === this.chain);
    if (tier) { const b = this.addScore(tier[2]); this.onEvent('chainTier', { n: this.chain, label: tier[1], bonus: b }); this.shake(4 + JUICE.chainTiers.indexOf(tier) * 2); }
    this.onEvent('kill', this.chain);
  }
  hitStop(t = JUICE.hitStop) { if (this.simulating || this.time - this.lastHitStop < JUICE.hitStopGap) return; this.lastHitStop = this.time; this.hitStopT = t; }
  dmgText(e, amount, crit) {
    if (!this.save.data.settings.damageNumbers) return;
    const v = Math.max(1, Math.round(amount));
    if (crit) this.fx.text(e.x, e.y - e.r - 12, v + '!', '#ffd23f', 26, 0.95, { bounce: true, shake: true });
    else this.fx.text(e.x, e.y - e.r - 6, String(v), '#ffffff', 14, 0.7, { bounce: true });
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
    if (o.crit) { this.dmgText(e, amount, true); this.audio.play('crit'); if (amount >= e.maxHp * JUICE.bigHit) { this.hitStop(); this.shake(5); } }
    else if (o.dot || o.group || amount < 9) { if (e.pendingText <= 0) e.textT = 0.3; e.pendingText += amount; }
    else this.dmgText(e, amount, false);
    if (e.hp <= 0) this.kill(e, tower);
  }
  kill(e, tower) {
    e.dead = true;
    if (e.pendingText > 0) this.dmgText(e, e.pendingText, false);
    const reward = Math.round(e.reward * GAME.rewardMult * this.mods.coinMult * this.coinMult * (this.coins2 ? 2 : 1));
    this.addMoney(reward);
    this.stats.kills++; this.stats.cost += e.boss ? 60 : e.cfg.cost; if (tower) tower.kills++;
    const fx = this.fx;
    fx.burst(e.x, e.y, '#ffffff', 6, 160, 5);
    fx.slime(e.x, e.y, JUICE.slime[e.boss ? 'boss' : e.type] || JUICE.slime.basic, e.boss ? 40 : 10 + Math.min(10, Math.round(e.r * 0.35)), e.boss ? 520 : 240);
    fx.confetti(e.x, e.y, e.boss ? 90 : 6, e.boss ? 480 : 200);
    this.chainKill(e);
    if (e.elite || e.boss) this.hitStop(e.boss && !e.mini ? 0.09 : JUICE.hitStop);
    fx.ring(e.x, e.y, e.r * 0.5, e.r * 2.2, '#fff', 0.25, 4);
    this.onEvent('coins', { x: e.x, y: e.y, n: e.boss ? 8 : Math.max(1, Math.round(reward / 5)), amount: reward });
    // score : points du kill + bonus de multi-kill
    const pts = this.addScore(e.boss ? SCORE.boss * (BOSS_ORDER.indexOf(e.type) + 1) * (e.mini ? 0.3 : 1) : e.cfg.cost * SCORE.perCost * (e.elite ? 3 : 1));
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
    this.maybeDrop(e);
    if (e.cfg.split) {
      for (let i = 0; i < e.cfg.split.count; i++) {
        const c = this.spawnEnemy(e.cfg.split.type, e.pathIdx, Math.max(0, e.d - i * 14), e.hpScale);
        c.flash = 1;
      }
    }
    if (e.boss) {
      if (!e.mini) this.stats.bossKills++;
      this.stats.bosses = (this.stats.bosses || 0) + 1;
      this.shake(18); this.audio.play('explosion');
      fx.explosion(e.x, e.y, 150, '#ffd23f'); fx.explosion(e.x, e.y, 230, '#ff5d8f');
      if (!e.mini) { this.slowT = JUICE.bossDeathSlow; this.slowK = 0.25; this.flashScreen('255,255,255', 0.6); }
      for (let k = 0; k < (e.mini ? 30 : 80); k++) fx.add({ k: 'coin', x: e.x + (Math.random() - 0.5) * 60, y: e.y, vx: (Math.random() - 0.5) * 520, vy: -300 - Math.random() * 420, g: 700, life: 1.8, max: 1.8, size: 7 + Math.random() * 4, rot: Math.random() * 6, vr: 8 + Math.random() * 8, drag: 0.6 });
      for (let i = 0; i < 5; i++) this.delayed.push({ t: 0.12 * (i + 1), fn: () => { fx.explosion(e.x + (Math.random() - 0.5) * 140, e.y + (Math.random() - 0.5) * 140, 70); this.audio.play('explosion'); this.shake(8); } });
      this.showBanner(e.mini ? 'MINI-BOSS VAINCU !' : 'BOSS VAINCU !', '+' + reward + ' pièces', '#ffd23f', 2.2);
    }
  }
  explode(x, y, radius, damage, tower, o = {}) {
    this.fx.explosion(x, y, radius, o.mini ? '#ffd23f' : '#ff9f1a');
    this.shake(o.mini ? 2 : Math.min(8, radius / 14));
    this.audio.play('explosion'); this.onEvent('haptic', o.mini ? 1 : 2);
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
  get limitReached() { return !!this.towerLimit && this.towers.filter((t) => t.type !== 'mine').length >= this.towerLimit; }
  costOf(type) { return this.freeNext ? 0 : TOWERS[type].cost; }
  placeTower(type, slot) {
    if (this.over || !slot || slot.tower || !this.buildable(slot).includes(type)) { this.audio.play('error'); return null; }
    const cost = this.costOf(type);
    if (this.money < cost || (type !== 'mine' && this.limitReached)) { this.audio.play('error'); return null; }
    this.money -= cost; if (cost === 0) this.freeNext = false;
    const t = new Tower(this, type, slot.x, slot.y); t.legendLocked = !this.save.legendOk(type);
    t.slot = slot; slot.tower = t; if (cost === 0) t.invested = 0;
    this.towers.push(t); this.stats.built++; this.hintT = 0;
    this.fx.ring(t.x, t.y, 6, 46, '#ffffff', 0.3, 5); this.fx.ring(t.x, t.y + 6, 10, 70, 'rgba(255,240,200,.9)', 0.45, 4); this.fx.burst(t.x, t.y + 8, '#d9c7a0', 16, 170, 6); this.shake(2.2);
    this.firstOfType = !(this.save.data.placedTypes || []).includes(type);
    this.audio.play('place');
    this.onEvent('placed', t);
    return t;
  }
  upgradeTower(t, opt) {
    if (opt.locked) return false;
    if (this.over || !opt || this.money < opt.cost) { this.audio.play('error'); return false; }
    this.money -= opt.cost; t.invested += opt.cost;
    t.level = opt.level; t.branch = opt.branch; t.refresh(); t.lvlAnim = 1;
    const col = RARITY[t.level - 1].color;
    this.fx.ring(t.x, t.y, 10, 80, col, 0.5, 9); this.fx.ring(t.x, t.y, 4, 120, '#ffffff', 0.4, 4);
    this.fx.burst(t.x, t.y, col, 22, 260, 6); this.fx.burst(t.x, t.y, '#ffffff', 10, 180, 4);
    this.fx.add({ k: 'flash', x: t.x, y: t.y, vx: 0, vy: 0, life: 0.18, max: 0.18, size: 46, color: '#ffffff' });
    this.fx.beam(t.x, t.y + 20, t.level >= 5 ? '#ffe27a' : '#fff6c8'); this.audio.play('beam');
    for (let i = 0; i < 8; i++) this.fx.add({ k: 'dot', x: t.x + (Math.random() - 0.5) * 40, y: t.y + 10, vx: 0, vy: -90 - Math.random() * 80, life: 0.7, max: 0.7, size: 3.5, color: col });
    this.shake(t.level >= 4 ? 5 : 2.5); this.hintT = 0; this.stats.upgrades = (this.stats.upgrades || 0) + 1;
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
    if (this.hitStopT > 0 && !this.paused) { this.hitStopT -= dtReal; this.render(); return; }   // micro-pause
    let dt = Math.min(0.05, dtReal);
    if (this.cine && !this.paused) { this.cine.t += dtReal; dt *= 0.35; if (this.cine.t >= this.cine.dur) this.cine = null; }   // entrée du boss
    else if (this.slowT > 0 && !this.paused) { this.slowT -= dtReal; dt *= this.slowK || DROPS.slowMo; if (this.slowT <= 0) this.slowK = 0; }
    if (!this.paused) for (let i = 0; i < (this.slowT > 0 || this.cine ? 1 : this.speed); i++) this.update(dt);
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
      this.spawnEnemy(q.type, q.path, 0, q.hpScale, q.bossMul, q);
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
    this.updateCastle(dt);
    this.hintT -= dt;
    if (this.hintT <= 0) { // indicateurs « UP » et socles achetables
      this.hintT = 0.3;
      for (const t of this.towers) { const o = t.upgradeOptions(); t.canUp = o.length > 0 && o.some((u) => !u.locked && u.cost <= this.money); }
      let min = Infinity; for (const k of TOWER_ORDER) if (k !== 'mine' && this.save.towerUnlocked(k)) min = Math.min(min, this.costOf(k));
      this.canBuy = this.money >= min && !this.limitReached;
    }
    for (const p of this.projectiles) p.update(dt, this);
    for (let i = this.drops.length - 1; i >= 0; i--) { const d = this.drops[i]; d.t += dt; d.y -= 10 * dt; if (d.t > DROPS.life) this.drops.splice(i, 1); }
    for (let i = this.bolts.length - 1; i >= 0; i--) { this.bolts[i].t -= dt; if (this.bolts[i].t <= 0) this.bolts.splice(i, 1); }
    this.dome = this.shielded ? Math.min(1, this.dome + dt * 2.5) : Math.max(0, this.dome - dt * 3);
    for (let i = this.delayed.length - 1; i >= 0; i--) { const d = this.delayed[i]; d.t -= dt; if (d.t <= 0) { this.delayed.splice(i, 1); d.fn(); } }
    this.fx.update(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    if (this.over) return;

    // fin de vague
    if (this.wave > 0 && this.queue.length === 0 && this.enemies.length === 0) {
      if (this.cleared < this.wave) {
        let bonus = 0;
        const tr = this.save.data.castle.treasury * CASTLE.upgrades.treasury.perWave;
        for (let n = this.cleared + 1; n <= this.wave; n++) bonus += (this.heroic && this.heroic.noWaveBonus ? 0 : (GAME.waveBonusBase + GAME.waveBonusPerWave * n) * this.mods.waveBonus) + tr;
        bonus = Math.round(bonus);
        // réparation du château entre les vagues
        const rep = CASTLE.upgrades.repair.every[this.save.data.castle.repair];
        if (rep && this.wave % rep === 0 && this.lives < this.maxLives) { this.lives++; this.fx.text(this.base.x, this.base.y - 100, '+1 PV', '#6dff9a', 22, 1.2); }
        this.cleared = this.wave;
        this.addMoney(bonus);
        const perfect = this.cleanWave && this.wave >= 1;
        if (perfect) { bonus += GAME.perfectBonus; this.addMoney(GAME.perfectBonus); }
        if (!(this.endless ? false : this.wave >= this.totalWaves)) this.showBanner(perfect ? 'PARFAIT !' : `VAGUE ${this.wave} TERMINÉE !`, perfect ? `Aucune fuite · +${bonus} pièces` : `+${bonus} pièces`, perfect ? '#8fe9ff' : '#6dff9a', perfect ? 2.2 : 1.8, perfect);
        if (perfect) { this.audio.play('tier'); this.onEvent('haptic', 1); }
        for (let k = 0; k < 16; k++) this.fx.add({ k: 'coin', x: VIEW.W / 2 + (Math.random() - 0.5) * 220, y: 60 - Math.random() * 120, vx: 0, vy: 260 + Math.random() * 200, life: 1.1, max: 1.1, size: 7 + Math.random() * 3, rot: Math.random() * 6, vr: 9, color: '#ffd23f' });
        this.onEvent('coins', { x: VIEW.W / 2, y: 240, n: 8, amount: bonus });
        if (this.cleanWave) { const b = this.addScore(SCORE.cleanWave + SCORE.cleanWavePerWave * this.wave); this.fx.text(VIEW.W / 2, 262, `+${b} au score`, "#8fe9ff", 20, 1.6); }
        this.cleanWave = true;
        this.audio.play('wave_clear');
        this.onEvent('cleared', this.wave);
        if (!this.endless && this.wave >= this.totalWaves) { this.end(true); return; }
        this.countdown = Math.min(this.countdown ?? Infinity, GAME.interWaveTime);
      } else if (this.countdown !== null) {
        if (this.save.data.settings.autoWave === false && !this.endless) return;   // attend le bouton
        this.countdown -= dt;
        if (this.countdown <= 0) this.startNextWave(false);
      }
    } else if (this.wave > 0 && this.queue.length === 0 && this.canStartNext) {
      // des ennemis traînent encore : la vague suivante part quand même après un délai
      if (this.countdown === null) this.countdown = GAME.overlapTime;
      this.countdown -= dt;
      if (this.countdown <= 0) this.startNextWave(false);
    }
  }
  leak(e) {
    this.stats.leaks++;
    if (this.shielded) { // boost Bouclier : la fuite est bloquée
      this.fx.ring(this.base.x, this.base.y - 10, 30, 110, '#8fd2ff', 0.4, 8); this.fx.text(this.base.x, this.base.y - 96, 'BLOQUÉ !', '#8fd2ff', 24, 1); this.audio.play('zap');
      return;
    }
    const lk = e.boss ? 'boss' : e.type === 'mini' ? 'splitter' : e.type; this.stats.leakBy[lk] = (this.stats.leakBy[lk] || 0) + e.leakDmg;
    this.lives -= e.leakDmg; this.cleanWave = false; this.onEvent('haptic', 2);
    this.baseFlash = 1; this.shake(e.boss ? 16 : 6); this.audio.play('leak');
    this.fx.burst(this.base.x, this.base.y, '#ff4d4d', 14, 220, 6);
    this.fx.text(this.base.x, this.base.y - 96, e.leakDmg >= 99 ? 'CHÂTEAU DÉTRUIT' : '-' + e.leakDmg + ' PV', '#ff5d6c', 26, 1);
    if (this.lives <= 0) {
      const rv = this.boosts.find((b) => b.id === 'revive' && !b.used);
      if (rv) { this.revive(rv); return; }
      this.lives = 0; this.end(false);
    }
  }

  // --- château : canon, capacités actives, boosts ------------------------------
  updateCastle(dt) {
    for (const a of this.abilities) a.cd = Math.max(0, a.cd - dt);
    this.overT = Math.max(0, this.overT - dt); this.blizzT = Math.max(0, this.blizzT - dt);
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
    for (let i = this.strikes.length - 1; i >= 0; i--) { const s = this.strikes[i]; s.t -= dt; if (s.t <= 0) { this.strikes.splice(i, 1); this.airImpact(s); } }
    if (this.blizzT > 0 && Math.random() < dt * 60) this.fx.add({ k: 'dot', x: this.ext.l + Math.random() * (this.ext.r - this.ext.l), y: this.ext.t, vx: -30, vy: 260 + Math.random() * 160, life: 3, max: 3, size: 2.5 + Math.random() * 2, color: '#ffffff' });
    const c = this.cannon; c.recoil *= Math.exp(-dt * 14);
    if (!c.lvl) return;
    const U = CASTLE.upgrades.cannon, cx = this.base.x, cy = this.base.y + this.gunY;
    c.cd -= dt;
    const e = this.nearestEnemy(cx, cy, U.range[c.lvl]);
    if (!e) { if (c.cd < 0) c.cd = 0; return; }
    c.aim = Math.atan2(e.y - cy, e.x - cx);
    if (c.cd <= 0) {
      c.cd = 1 / U.rate[c.lvl]; c.recoil = 7;
      this.damage(e, U.damage[c.lvl] * this.level.hp, null, { ignoreArmor: true });
      // 2 canons : ils tirent chacun leur tour ; grosse tourelle : canon plus long, tir plus épais
      const ox = c.lvl >= 5 ? 0 : c.lvl >= 3 ? (c.side = -(c.side || 1)) * 22 : 0, len = c.lvl >= 5 ? 46 : 30;
      this.fx.tracer(cx + ox + Math.cos(c.aim) * len, cy + Math.sin(c.aim) * len, e.x, e.y, '#ffe9a0', c.lvl >= 5 ? 6 : 4, 0.12);
      if (c.lvl >= 5) this.fx.sparks(cx + Math.cos(c.aim) * len, cy + Math.sin(c.aim) * len, c.aim, '#ffd23f', 6); this.fx.sparks(e.x, e.y, c.aim, '#fff3b0', 4);
      this.audio.play('shot_shotgun');
    }
  }
  flashScreen(color, dur = 0.5) { this.flash = { color, t: dur, max: dur }; }
  // Capacité active du château. (x, y) = cible pour la frappe aérienne.
  useAbility(id, x, y) {
    const a = this.abilities.find((k) => k.id === id);
    if (!a || a.cd > 0 || this.over) { this.audio.play('error'); return false; }
    const C = CASTLE.abilities[id]; a.cd = a.max;
    if (id === 'air') {
      this.strikes.push({ x, y, t: 0.55, r: C.radius[a.lvl], lvl: a.lvl });
      this.audio.play('shot_rocket'); this.showBanner('FRAPPE AÉRIENNE', '', C.color, 1.1);
    } else if (id === 'blizzard') {
      const dur = C.dur[a.lvl] * this.mods.durMult; this.blizzT = dur; this.blizzSlow = C.slow[a.lvl];
      for (const e of this.enemies) { e.applySlow(C.slow[a.lvl], dur); this.fx.burst(e.x, e.y, '#d6f6ff', 5, 90, 4); }
      this.flashScreen('200,240,255', 0.7); this.audio.play('cryo'); this.audio.play('zap'); this.shake(5); this.showBanner('BLIZZARD', '', C.color, 1.2);
    } else if (id === 'gold') {
      const n = C.coins[a.lvl] + C.perWave[a.lvl] * this.wave;
      this.addMoney(n); this.flashScreen('255,220,90', 0.6); this.audio.play('buy'); this.audio.play('coin');
      for (let i = 0; i < 40; i++) this.fx.add({ k: 'dot', x: 40 + Math.random() * (VIEW.W - 80), y: -20 - Math.random() * 200, vx: 0, vy: 420 + Math.random() * 200, life: 1.6, max: 1.6, size: 6, color: i % 3 ? '#ffd23f' : '#fff6c8' });
      this.fx.text(VIEW.W / 2, 300, `PLUIE D'OR +${n}`, '#ffd23f', 30, 1.8);
      this.onEvent('coins', { x: VIEW.W / 2, y: 320, n: 12, amount: n });
    }
    this.onEvent('haptic', 2); this.onEvent('ability', id);
    return true;
  }
  airImpact(s) {
    const C = CASTLE.abilities.air;
    this.fx.explosion(s.x, s.y, s.r, '#ff7a3c'); this.fx.explosion(s.x - 30, s.y + 20, s.r * 0.6, '#ffd23f'); this.fx.explosion(s.x + 34, s.y - 16, s.r * 0.6, '#ff5d3c');
    this.flashScreen('255,200,120', 0.35); this.shake(14); this.audio.play('explosion'); this.onEvent('haptic', 2);
    for (const e of this.enemies) {
      if (e.dead || Math.hypot(e.x - s.x, e.y - s.y) > s.r + e.r * 0.6) continue;
      this.damage(e, C.damage[s.lvl] * this.level.hp + e.maxHp * (e.boss ? C.bossPct : C.pct), null, { splash: true, ignoreArmor: true });
    }
  }
  // Boost emporté (index dans this.boosts). La « Seconde chance » se déclenche toute seule à la défaite.
  useBoost(i) {
    const b = this.boosts[i];
    if (!b || b.used || this.over || b.id === 'revive') { this.audio.play('error'); return false; }
    const C = BOOSTS[b.id], next = this.queue.length || this.enemies.length ? this.wave : this.wave + 1;
    const fx = this.fx, E = this.ext;
    if (b.id === 'coins2') {
      this.coins2Until = next;
      for (let k = 0; k < 70; k++) fx.add({ k: 'coin', x: E.l + Math.random() * (E.r - E.l), y: E.t - Math.random() * 500, vx: (Math.random() - 0.5) * 40, vy: 380 + Math.random() * 260, life: 2.6, max: 2.6, size: 8 + Math.random() * 4, rot: Math.random() * 6, vr: 6 + Math.random() * 8, color: '#ffd23f' });
      fx.text(VIEW.W / 2, 330, 'PIÈCES x2 !', '#ffd23f', 34, 1.6); this.audio.play('buy'); this.audio.play('coin');
    } else if (b.id === 'shield') {
      this.shieldUntil = next; this.dome = 0;
      fx.ring(this.base.x, this.base.y - 10, 20, 160, '#8fd2ff', 0.7, 12); fx.ring(this.base.x, this.base.y - 10, 10, 260, '#ffffff', 0.5, 6);
      for (let k = 0; k < 30; k++) { const a = Math.random() * TAU; fx.add({ k: 'spark', x: this.base.x + Math.cos(a) * 110, y: this.base.y - 6 + Math.sin(a) * 110, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.5, max: 0.5, size: 3, color: '#cfe9ff', drag: 2 }); }
      this.audio.play('upgrade');
    } else if (b.id === 'heal') {
      this.lives += C.amount; fx.text(this.base.x, this.base.y - 110, `+${C.amount} PV`, '#6dff9a', 34, 1.6); fx.burst(this.base.x, this.base.y - 20, '#6dff9a', 26, 220, 7);
      for (let k = 0; k < 14; k++) fx.add({ k: 'heart', x: this.base.x + (Math.random() - 0.5) * 140, y: this.base.y + 10 - Math.random() * 40, vx: (Math.random() - 0.5) * 30, vy: -90 - Math.random() * 90, life: 1.4, max: 1.4, size: 9 + Math.random() * 6, color: '#ff5d6c', drag: 0.5 });
      fx.ring(this.base.x, this.base.y - 10, 20, 150, '#6dff9a', 0.6, 10); this.audio.play('heal');
    } else if (b.id === 'free') {
      this.freeNext = true; this.hintT = 0;
      for (const sl of this.slots) if (!sl.tower && sl.kind === 'tower') { fx.ring(sl.x, sl.y, 6, 46, '#9dffb4', 0.7, 6); fx.burst(sl.x, sl.y, '#9dffb4', 6, 120, 4); }
      fx.text(VIEW.W / 2, 330, 'PROCHAINE TOURELLE OFFERTE', '#9dffb4', 24, 1.8);
    } else if (b.id === 'over') {
      this.overT = C.dur * this.mods.durMult;
      for (const t of this.towers) { this.bolts.push({ x: t.x, y: t.y, t: 0.45, seed: Math.random() * 99 }); fx.ring(t.x, t.y, 8, 54, '#ffd23f', 0.5, 7); fx.sparks(t.x, t.y, -Math.PI / 2, '#fff3b0', 8); }
      this.audio.play('zap'); this.shake(8);
    }
    this.slowT = DROPS.slowTime;
    this.consume(b, C);
    return true;
  }
  consume(b, C) {
    b.used = true; this.stats.boosts = (this.stats.boosts || 0) + 1;
    if (!b.free) { const inv = this.save.data.boosts; inv[b.id] = Math.max(0, (inv[b.id] || 0) - 1); this.save.persist(); }
    const rgb = { coins2: '255,220,90', heal: '255,120,140', free: '120,255,160', over: '255,170,60', shield: '140,200,255', revive: '200,140,255' }[b.id];
    this.flashScreen(rgb, 0.55); this.audio.play('boost'); this.shake(4); this.onEvent('haptic', 2);
    this.showBanner(C.name.toUpperCase(), '', C.color, 1.3);
    this.onEvent('boost', b.id);
  }
  revive(b) {
    this.lives = Math.max(1, Math.ceil(this.maxLives / 2));
    for (const e of this.enemies) {
      if (e.boss) { e.d = Math.max(0, e.d - 420); e.place(); }
      else { e.dead = true; this.fx.burst(e.x, e.y, '#c9a6ff', 8, 180, 5); }
    }
    this.fx.ring(this.base.x, this.base.y, 30, 520, '#c9a6ff', 0.9, 14); this.fx.ring(this.base.x, this.base.y, 10, 320, '#ffffff', 0.7, 8);
    this.slowT = DROPS.slowTime * 1.6;
    this.consume(b, BOOSTS.revive);
  }
  // Bon moment pour un boost (le bouton pulse) : beaucoup d'ennemis, château en danger, boss en vue
  goodMoment(id) {
    if (this.over || this.wave === 0) return false;
    const n = this.enemies.length, low = this.lives <= this.maxLives * 0.4, boss = this.enemies.some((e) => e.boss && !e.mini);
    if (id === 'heal') return this.lives <= this.maxLives * 0.5;
    if (id === 'shield') return low || (boss && this.enemies.some((e) => e.boss && e.d > this.paths[e.pathIdx].total * 0.6));
    if (id === 'over') return this.overT <= 0 && (n >= DROPS.crowd || boss || low);
    if (id === 'coins2') return !this.coins2 && this.queue.length >= 8;
    if (id === 'free') return !this.freeNext && this.slots.some((s) => !s.tower && s.kind === 'tower');
    return false;
  }
  // Caisse-bulle lâchée par un brainrot : à toucher pour gagner un boost gratuit
  maybeDrop(e) {
    if (this.endless && this.dropCount >= DROPS.maxPerLevel * 2) return;
    if (this.dropCount >= DROPS.maxPerLevel && !this.endless) return;
    const ch = e.boss ? 1 : e.elite ? DROPS.eliteChance : DROPS.chance;
    if (this.time - this.lastDrop < DROPS.minGap && !e.boss) return;
    if (Math.random() >= ch) return;
    const id = DROPS.pool[Math.floor(Math.random() * DROPS.pool.length)];
    this.drops.push({ x: Math.max(40, Math.min(VIEW.W - 40, e.x)), y: Math.max(70, e.y - 10), id, t: 0 });
    this.dropCount++; this.lastDrop = this.time;
    this.audio.play('card'); this.fx.ring(e.x, e.y, 6, 40, BOOSTS[id].color, 0.4, 5);
  }
  dropAt(x, y) { return this.drops.find((d) => Math.hypot(d.x - x, d.y + Math.sin(d.t * 3) * 5 - y) < DROPS.tapRadius); }
  collectDrop(d) {
    this.drops.splice(this.drops.indexOf(d), 1);
    this.fx.burst(d.x, d.y, BOOSTS[d.id].color, 18, 220, 6); this.fx.ring(d.x, d.y, 10, 70, '#fff', 0.4, 6);
    this.fx.text(d.x, d.y - 40, '+ ' + BOOSTS[d.id].name.toUpperCase(), '#fff', 20, 1.3);
    this.audio.play('chest'); this.onEvent('haptic', 1);
    if (this.boosts.length >= DROPS.maxSlots) { const b = { id: d.id, used: false, free: true }; this.boosts.push(b); this.useBoost(this.boosts.length - 1); }
    else this.boosts.push({ id: d.id, used: false, free: true });
    this.stats.drops = (this.stats.drops || 0) + 1;
    this.onEvent('drop', d);
  }

  // --- fin de partie ---------------------------------------------------------
  end(victory) {
    if (this.over) return;
    this.over = true; this.selected = null; this.menuSlot = null; this.preview = null;
    const ratio = Math.min(1, this.lives / this.maxLives);
    const stars = victory ? (ratio >= STARS.three ? 3 : ratio >= STARS.two ? 2 : 1) : 0;
    const wavesDone = victory ? this.wave : Math.max(0, this.cleared);
    let best = null;
    for (const t of this.towers) if (!best || t.dmg > best.dmg) best = t;
    const lifeBonus = victory ? this.addScore(this.lives * SCORE.lifeBonus) : 0;
    this.result = { victory, stars, wavesDone, best, endless: this.endless, heroic: !!this.heroic, score: this.score, lifeBonus };
    this.commit(victory, stars, wavesDone);
    this.audio.play(victory ? 'victory' : 'defeat');
    if (victory) for (let i = 0; i < 6; i++) this.fx.confetti(Math.random() * VIEW.W, Math.random() * VIEW.H * 0.6, 40, 400);
    this.onEvent('end', this.result);
  }
  // Écrit la progression dans la sauvegarde (appelé aussi si on abandonne) et complète this.result
  commit(victory = false, stars = 0, wavesDone = this.cleared) {
    if (this._committed) return; this._committed = true;
    const sv = this.save, d = sv.data, s = d.stats, g = this.stats, L = this.level, r = this.result || {};
    s.kills += g.kills; s.bossKills += g.bossKills; s.towersBuilt += g.built; s.legendaries += g.legendaries; s.earlyStarts += g.early; s.games++;
    s.bestScore = Math.max(s.bestScore || 0, this.score);
    const ld = sv.levelData(L.n), hero = !!this.heroic;
    let newStars = 0;
    r.previous = this.endless ? (d.endless[0] ? d.endless[0].score : 0) : hero ? ld.heroicBest : ld.best;
    r.rewards = [];
    const E = levelRewards({ victory, stars, prevStars: ld.stars, wavesDone, boss: L.boss, hero, heroDone: !!ld.heroic, endless: this.endless, challenge: !!this.challenge, killCost: g.cost, gemMult: this.mods.gemMult });
    r.firstClear = E.firstClear;
    if (this.challenge) {
      if (victory) {
        r.challengeWin = !sv.challenge().done;
        if (r.challengeWin) { d.daily.chDay = sv.challengeDay(); r.rewards.push(sv.grant(DAILY.challengeReward)); sv.addPass(DAILY.challengePass); }
      }
    } else if (this.endless) {
      s.bestEndless = Math.max(s.bestEndless, wavesDone);
      if (this.score > 0 && this.result) r.rank = sv.addEndless({ score: this.score, wave: wavesDone, world: L.world, t: Date.now() });
    } else if (victory) {
      s.wins++; if (this.lives >= this.maxLives) s.perfectWins++; if (hero) s.heroicWins++;
      if (!hero) { newStars = E.newStars; ld.stars = Math.max(ld.stars, stars); ld.best = Math.max(ld.best, this.score); }
      else { ld.heroic = 1; ld.heroicBest = Math.max(ld.heroicBest, this.score); }
      if (r.firstClear && hero) r.rewards.push(sv.grant({ chest: 'wood', talent: E.talent }));
      if (r.firstClear && L.boss && !hero) { // fin de monde : grosse récompense (montrée par worldReward)
        const W = WORLD_REWARD; sv.grant({ chest: W.chest, gems: W.gems, boosts: W.boosts }); d.castleFree = (d.castleFree || 0) + W.castleFree;
        d.pendingWorld = L.world; r.worldDone = L.world;
      }
      { const u = sv.grantUnlocks(); sv.syncTierCap(); r.towers = u.towers; r.skins = u.skins; r.legend = u.legend; }
    }
    void newStars;
    r.coins = E.coins; d.coins = (d.coins || 0) + r.coins;
    r.record = this.score > r.previous && this.score > 0;
    r.gems = E.gems; d.gems += r.gems;
    r.xp = E.xp;
    r.xpBefore = { level: d.level, xp: d.xp };
    r.levelUps = sv.addXp(r.xp);
    sv.addPass(E.pass);
    sv.trackDaily({ kills: g.kills, wins: victory ? 1 : 0, boosts: g.boosts || 0, stars: victory && !this.endless ? stars : 0, built: g.built, upgrades: g.upgrades || 0, combo: this.chainBest || 0, bosses: g.bosses || 0, drops: g.drops || 0, waves: wavesDone });
    r.achievements = sv.checkAchievements();
    sv.persist();
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
    c.save(); c.translate(this.base.x, this.base.y); c.scale(this.castleK, this.castleK); drawCastle(c, this.save.data.castle, { time: this.time, aim: this.cannon.aim, recoil: this.cannon.recoil }); if (this.night) drawCastleLights(c, this.save.data.castle, { time: this.time, night: this.night }); c.restore();
    c.lineWidth = 1; c.lineJoin = 'round'; c.lineCap = 'round';
    // zones de mine : croix discrète, seulement si on peut poser une mine (ou zone touchée)
    const mineOk = this.save.towerUnlocked('mine') && !this.banned.includes('mine') && this.money >= TOWERS.mine.cost;
    for (const sl of this.slots) if (sl.kind === 'mine' && !sl.tower && (mineOk || sl === this.menuSlot)) drawMineSpot(c, sl, sl === this.menuSlot ? 1 : 0.55 + Math.sin(this.time * 3) * 0.15);
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
      const k = (Math.sin(this.time * 3) + 1) / 2;
      c.lineWidth = 2.5 + k * 1.5; c.strokeStyle = `rgba(160,255,190,${0.25 + k * 0.4})`;
      for (const sl of this.slots) if (!sl.tower && sl.kind === 'tower' && sl !== this.menuSlot) { c.beginPath(); c.ellipse(sl.x, sl.y + 1, SLOT_R + 5 + k * 2, (SLOT_R + 5 + k * 2) * 0.86, 0, 0, TAU); c.stroke(); }
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
    // frappes aériennes en approche
    for (const s of this.strikes) {
      const k = 1 - s.t / 0.55;
      c.strokeStyle = `rgba(255,90,60,${0.5 + k * 0.5})`; c.lineWidth = 5; c.setLineDash([12, 8]); c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.stroke(); c.setLineDash([]);
      c.fillStyle = `rgba(255,90,60,${0.15 + k * 0.2})`; c.beginPath(); c.arc(s.x, s.y, s.r * k, 0, TAU); c.fill();
      c.fillStyle = '#3d2c4e'; c.beginPath(); c.ellipse(s.x - 150 * (1 - k), s.y - 420 * (1 - k), 9, 20, 0.35, 0, TAU); c.fill();
    }
    // dôme lumineux du bouclier
    if (this.dome > 0) {
      const k = Math.sin(this.time * 3) * 0.08, R = 112 * (0.6 + 0.4 * this.dome), bx = this.base.x, by = this.base.y + 30;
      c.save(); c.globalAlpha = this.dome;
      const g = c.createRadialGradient(bx, by - R * 0.5, R * 0.2, bx, by, R); g.addColorStop(0, `rgba(200,235,255,${0.08 + k})`); g.addColorStop(1, `rgba(120,190,255,${0.35 + k})`);
      c.fillStyle = g; c.strokeStyle = 'rgba(220,240,255,.95)'; c.lineWidth = 4;
      c.beginPath(); c.arc(bx, by, R, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
      for (let i = 1; i < 4; i++) { c.beginPath(); c.arc(bx, by, R, Math.PI + i * 0.78 - 0.1 + Math.sin(this.time + i) * 0.04, Math.PI + i * 0.78 + 0.1); c.stroke(); }
      c.beginPath(); c.ellipse(bx, by - R * 0.45, R * 0.75, R * 0.18, 0, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(bx - R * 0.45, by - R * 0.6, R * 0.14, R * 0.07, -0.6, 0, TAU); c.fill();
      c.restore();
    }
    // tourelles en surcharge : halo orange + éclairs à l'activation
    if (this.overT > 0) {
      const k = (Math.sin(this.time * 14) + 1) / 2;
      c.strokeStyle = `rgba(255,190,60,${0.45 + k * 0.4})`; c.lineWidth = 3;
      for (const t of this.towers) if (t.type !== 'mine') { c.beginPath(); c.arc(t.x, t.y, 30 + k * 4, 0, TAU); c.stroke(); }
    }
    for (const bl of this.bolts) {
      const a = bl.t / 0.45; let x = bl.x + Math.sin(bl.seed) * 30, y = E.t;
      c.strokeStyle = `rgba(255,250,200,${a})`; c.lineWidth = 7; c.shadowColor = '#ffd23f'; c.shadowBlur = 14;
      c.beginPath(); c.moveTo(x, y);
      for (let i = 1; i <= 8; i++) { y = E.t + (bl.y - E.t) * (i / 8); x = (i === 8 ? bl.x : bl.x + Math.sin(bl.seed + i * 2.3) * 26 * (1 - i / 8)); c.lineTo(x, y); }
      c.stroke(); c.lineWidth = 2.5; c.strokeStyle = `rgba(255,255,255,${a})`; c.stroke(); c.shadowBlur = 0;
    }
    // bulles de boost à toucher
    for (const d of this.drops) {
      const C = BOOSTS[d.id], y = d.y + Math.sin(d.t * 3) * 5, left = DROPS.life - d.t, blink = left < 2 && Math.sin(d.t * 20) > 0;
      if (blink) continue;
      const pop = Math.min(1, d.t * 4), r = 31 * (0.4 + 0.6 * pop) * (1 + Math.sin(d.t * 6) * 0.05);
      c.save(); c.translate(d.x, y);
      const ring = (d.t * 1.4) % 1; c.strokeStyle = `rgba(255,255,255,${0.8 * (1 - ring)})`; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, r + 4 + ring * 22, 0, TAU); c.stroke();
      c.rotate(Math.sin(d.t * 4) * 0.12);
      const g = c.createRadialGradient(-r * 0.3, -r * 0.35, 2, 0, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, C.color); g.addColorStop(1, C.color);
      c.shadowColor = C.color; c.shadowBlur = 18; c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.shadowBlur = 0;
      c.lineWidth = 3.5; c.strokeStyle = '#3d2c4e'; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r - 5, -2.4, -1.5); c.stroke();
      const im = boostGlyph(d.id); if (im.complete) c.drawImage(im, -r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
      c.restore();
    }
    if (this.blizzT > 0) { c.fillStyle = `rgba(200,235,255,${Math.min(0.22, this.blizzT * 0.2)})`; c.fillRect(E.l, E.t, E.r - E.l, E.b - E.t); }
    this.fx.drawTexts(c);
    if (this.flash) { c.fillStyle = `rgba(${this.flash.color},${(this.flash.t / this.flash.max) * 0.55})`; c.fillRect(E.l, E.t, E.r - E.l, E.b - E.t); }

    c.setTransform(S, 0, 0, S, ox * S, oy * S);
    // barre de vie du boss
    // cinématique d'entrée du boss : bandes noires + zoom sur le nom
    if (this.cine) {
      const q = this.cine.t / this.cine.dur, a = Math.min(1, q * 5, (1 - q) * 5), bh = 90 * a;
      c.fillStyle = '#0c0614'; c.fillRect(E.l, E.t, E.r - E.l, bh - E.t); c.fillRect(E.l, E.b - bh, E.r - E.l, bh);
      const e = this.cine.boss; c.strokeStyle = `rgba(255,80,90,${0.8 * a})`; c.lineWidth = 6; c.beginPath(); c.arc(e.x, e.y, e.r * 2.2 + Math.sin(this.cine.t * 12) * 6, 0, TAU); c.stroke();
    }
    const boss = this.enemies.find((e) => e.boss && !e.mini) || this.enemies.find((e) => e.boss);
    if (boss) {
      const bw = W - 150, bx = 110, by = 26, k = Math.max(0, boss.hp / boss.maxHp);
      this.bossShown = this.bossShown == null ? k : this.bossShown + (k - this.bossShown) * 0.08;   // barre « fantôme » qui suit
      c.fillStyle = '#3d2c4e'; c.beginPath(); c.roundRect(bx - 8, by - 8, bw + 16, 46, 23); c.fill();
      c.fillStyle = '#5b2a3a'; c.beginPath(); c.roundRect(bx, by, bw, 30, 15); c.fill();
      c.fillStyle = '#fff3c4'; if (this.bossShown > k) { c.beginPath(); c.roundRect(bx, by, Math.max(30, bw * this.bossShown), 30, 15); c.fill(); }
      // portrait
      const f = enemyFrames(boss.type).frames[0][0]; c.fillStyle = '#3d2c4e'; c.beginPath(); c.arc(bx - 34, by + 15, 38, 0, TAU); c.fill();
      c.fillStyle = boss.enraged ? '#e0283c' : '#ff8a5c'; c.beginPath(); c.arc(bx - 34, by + 15, 32, 0, TAU); c.fill();
      if (f && f.ready) c.drawImage(f.cv, bx - 34 - 34, by + 15 - 34, 68, 68);
      const g = c.createLinearGradient(0, by, 0, by + 30);
      if (boss.shieldT > 0) { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8e0c8'); } else { g.addColorStop(0, boss.enraged ? '#ff8a8a' : '#ffb347'); g.addColorStop(1, boss.enraged ? '#e0283c' : '#ff5d3c'); }
      c.fillStyle = g;
      if (k > 0) { c.beginPath(); c.roundRect(bx, by, Math.max(30, bw * k), 30, 15); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(bx + 8, by + 4, Math.max(10, bw * k - 16), 7, 3.5); c.fill();
      this.label(c, (boss.mini ? 'Mini-boss · ' : '') + boss.cfg.name, bx + bw / 2, by + 16, 18, '#fff', 5);
      this.label(c, Math.ceil(k * 100) + ' %', bx + bw - 30, by + 44, 15, '#ffd23f', 5);
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

// Icône blanche d'un boost, rastérisée une fois (bulles en jeu)
const glyphCache = {};
function boostGlyph(id) {
  if (!glyphCache[id]) { const i = new Image(); i.src = 'data:image/svg+xml,' + encodeURIComponent(icon(BOOSTS[id].icon).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"').replaceAll('currentColor', '#ffffff')); glyphCache[id] = i; }
  return glyphCache[id];
}
