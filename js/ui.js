// Interface : écrans (menu, cartes, boutique, paramètres), HUD, barre de tourelles,
// panneau d'amélioration, tutoriel, écrans de fin, entrées souris / tactile / clavier.
import { VIEW, TOWERS, TOWER_ORDER, ENEMIES, RARITY, DIFFICULTIES, SHOP, ACHIEVEMENTS, GAME } from './config.js';
import { MAPS, getMap, drawMapPreview } from './maps.js';
import { Game } from './game.js';
import { computeStats, dpsOf, TARGET_MODES } from './towers.js';
import { waveSummary } from './waves.js';
import { enemyIcon, towerIcon } from './draw.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmt = (n) => (n >= 100000 ? (n / 1000).toFixed(0) + 'k' : n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)));
const num = (n) => (n >= 100 || Number.isInteger(+n.toFixed(1)) ? String(Math.round(n)) : n.toFixed(1));
const starStr = (n) => `<span class="stars"><b>${'★'.repeat(n)}</b>${'★'.repeat(3 - n)}</span>`;

const TUTORIAL = [
  { text: '👋 <b>Bienvenue !</b> Des brainrots vont suivre le chemin jusqu\'à ta base. Choisis une tourelle en bas (clic, glisser-déposer ou touches <b>1-8</b>) et pose-la près du chemin.', done: (g) => g.towers.length >= 1 },
  { text: '💪 Parfait ! Pose-en une autre si tu veux, puis <b>lance la vague</b> (bouton ▶ ou <b>Espace</b>). Lancer une vague en avance rapporte un bonus de pièces.', done: (g) => g.wave >= 1 },
  { text: '⬆️ <b>Clique sur une tourelle</b> pour l\'améliorer, choisir sa cible ou la revendre (70 %). Au niveau 4, choisis une spécialisation !', done: (g, ui) => !!g.selected || g.wave >= 3 },
  { text: '🎉 Tu sais tout ! Vitesse x1/x2/x3 en haut, <b>P</b> pour la pause. Gagne des 💎 pour débloquer de nouvelles armes dans la boutique. Bonne chance !', done: (g) => g.wave >= 3, last: true },
];

export class UI {
  constructor(save, audio) {
    this.save = save; this.audio = audio; this.game = null;
    this.diff = 'normal'; this.endless = false; this.shopTab = 'towers';
    this.canvas = $('#game'); this.cache = {}; this.last = 0; this.simulating = false;
    this.barDrag = null; this.down = null; this.tutStep = -1;

    document.addEventListener('pointerdown', () => this.audio.unlock(), { capture: true });
    document.addEventListener('click', (e) => { if (e.target.closest('.btn')) this.audio.play('click'); });
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => this.show(b.dataset.go)));
    $$('#shop-tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { this.shopTab = b.dataset.tab; this.renderShop(); }));
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.bindGameInput();

    const parade = $('#menu-parade');
    for (const t of ['basic', 'fast', 'tank', 'armored', 'flying', 'healer', 'splitter', 'stealth']) parade.append(enemyIcon(t, 52));

    this.show('menu');
    requestAnimationFrame((ts) => this.loop(ts));
  }

  // ------------------------------------------------------------------ écrans
  show(name) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    this.screen = name;
    $$('.gems').forEach((g) => (g.textContent = this.save.data.gems));
    if (name === 'maps') this.renderMaps();
    if (name === 'shop') this.renderShop();
    if (name === 'settings') this.renderSettings();
    if (name === 'game') this.resize();
  }
  toast(title, sub = '') {
    const t = el('div', 'toast', `${title}${sub ? `<small>${sub}</small>` : ''}`);
    const box = $('#toasts'); while (box.children.length >= 3) box.firstChild.remove();
    box.append(t); setTimeout(() => t.remove(), 3700);
  }
  announce(list) { for (const a of list || []) this.toast('🏆 Succès : ' + a.name, `${a.desc} · +${a.gems} 💎`); $$('.gems').forEach((g) => (g.textContent = this.save.data.gems)); }

  renderMaps() {
    const row = $('#diff-row'); row.innerHTML = '';
    for (const [id, d] of Object.entries(DIFFICULTIES)) {
      const b = el('button', 'btn sm' + (this.diff === id ? ' sel' : ''), d.name);
      b.title = `PV ennemis x${d.hp} · ${d.lives} PV · 💎 x${d.gems}`;
      b.onclick = () => { this.diff = id; this.renderMaps(); };
      row.append(b);
    }
    const anyBeaten = MAPS.some((m) => this.save.mapBeaten(m.id));
    const eb = el('button', 'btn sm' + (this.endless ? ' sel' : '') + (anyBeaten ? '' : ' off'), anyBeaten ? '♾ Mode infini' : '🔒 Mode infini');
    eb.title = 'Termine une carte pour débloquer son mode infini';
    eb.onclick = () => { if (!anyBeaten) { this.toast('🔒 Mode infini', 'Termine une carte pour le débloquer'); return; } this.endless = !this.endless; this.renderMaps(); };
    row.append(eb);

    const grid = $('#map-grid'); grid.innerHTML = '';
    for (const m of MAPS) {
      const unlocked = this.save.mapUnlocked(m), md = this.save.mapData(m.id);
      const card = el('div', 'card' + (unlocked ? '' : ' locked'));
      const cv = el('canvas', 'preview'); cv.width = 480; cv.height = 270; drawMapPreview(cv, m);
      card.append(cv, el('h3', '', m.name), el('p', '', m.desc));
      const stars = el('div', 'row');
      for (const [id, d] of Object.entries(DIFFICULTIES)) stars.append(el('span', '', `<small>${d.name}</small> ${starStr(md.stars[id] || 0)}`));
      card.append(stars);
      if (md.bestEndless) card.append(el('p', '', `♾ Record infini : vague ${md.bestEndless}`));
      if (!unlocked) card.append(el('div', 'lock-note', `🔒 Termine « ${getMap(m.unlock).name} » pour débloquer`));
      else if (this.endless && !this.save.mapBeaten(m.id)) card.append(el('div', 'lock-note', '🔒 Termine cette carte pour débloquer son mode infini'));
      else {
        const b = el('button', 'btn primary', this.endless ? '♾ Jouer en infini' : '▶ Jouer');
        b.onclick = () => this.startGame(m.id, this.diff, this.endless);
        card.append(b);
      }
      grid.append(card);
    }
  }

  renderShop() {
    const d = this.save.data, grid = $('#shop-content'); grid.innerHTML = '';
    $$('#shop-tabs [data-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.tab === this.shopTab));
    $$('.gems').forEach((g) => (g.textContent = d.gems));
    const buy = (cost, fn) => () => {
      if (!this.save.spend(cost)) { this.audio.play('error'); this.toast('Pas assez de 💎', 'Joue des parties pour en gagner'); return; }
      fn(); this.save.persist(); this.audio.play('buy'); this.renderShop();
    };
    if (this.shopTab === 'towers') {
      for (const t of TOWER_ORDER) {
        const cfg = TOWERS[t], owned = this.save.towerUnlocked(t), cost = SHOP.towerUnlocks[t] || 0;
        const card = el('div', 'card' + (owned ? ' done' : ''));
        const row = el('div', 'icon-row'); row.append(towerIcon(t, 60, d.skin), el('div', '', `<h3>${cfg.name}</h3><p>${cfg.desc}</p>`));
        card.append(row, el('p', '', `Prix en partie : 🪙 ${cfg.cost} · Spécialisations : ${cfg.branches.map((b) => b.name).join(' / ')}`));
        if (owned) card.append(el('b', '', '✓ Débloquée'));
        else { const b = el('button', 'btn primary' + (d.gems < cost ? ' off' : ''), `Débloquer · ${cost} 💎`); b.onclick = buy(cost, () => d.towers.push(t)); card.append(b); }
        grid.append(card);
      }
    } else if (this.shopTab === 'perks') {
      for (const p of SHOP.perks) {
        const lvl = d.perks[p.id] || 0, max = lvl >= p.max;
        const card = el('div', 'card' + (max ? ' done' : ''));
        card.append(el('h3', '', p.name), el('p', '', p.desc));
        card.append(el('div', 'pips', Array.from({ length: p.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')));
        if (max) card.append(el('b', '', '✓ Niveau max'));
        else { const cost = p.costs[lvl]; const b = el('button', 'btn primary' + (d.gems < cost ? ' off' : ''), `Améliorer · ${cost} 💎`); b.onclick = buy(cost, () => (d.perks[p.id] = lvl + 1)); card.append(b); }
        grid.append(card);
      }
    } else if (this.shopTab === 'skins') {
      for (const s of SHOP.skins) {
        const owned = d.skins.includes(s.id), on = d.skin === s.id;
        const card = el('div', 'card' + (on ? ' done' : ''));
        const row = el('div', 'icon-row'); row.append(towerIcon('assault', 60, s.id, 3), towerIcon('rocket', 60, s.id, 4), towerIcon('minigun', 60, s.id, 5));
        card.append(el('h3', '', s.name), row);
        if (on) card.append(el('b', '', '✓ Équipé'));
        else if (owned) { const b = el('button', 'btn green', 'Équiper'); b.onclick = () => { d.skin = s.id; this.save.persist(); this.renderShop(); }; card.append(b); }
        else { const b = el('button', 'btn primary' + (d.gems < s.cost ? ' off' : ''), `Acheter · ${s.cost} 💎`); b.onclick = buy(s.cost, () => { d.skins.push(s.id); d.skin = s.id; }); card.append(b); }
        grid.append(card);
      }
    } else {
      for (const a of ACHIEVEMENTS) {
        const done = d.achievements.includes(a.id), prog = Math.min(a.goal, this.save.achievementProgress(a));
        const card = el('div', 'card' + (done ? ' done' : ''));
        card.append(el('h3', '', (done ? '🏆 ' : '') + a.name), el('p', '', a.desc));
        card.append(el('div', 'progress', `<i style="width:${(prog / a.goal) * 100}%"></i>`));
        card.append(el('div', 'row', `<span>${fmt(prog)} / ${fmt(a.goal)}</span><b>${done ? '✓ ' : ''}+${a.gems} 💎</b>`));
        grid.append(card);
      }
    }
  }

  renderSettings() {
    const s = this.save.data.settings, box = $('#settings-content'); box.innerHTML = '';
    const toggle = (label, sub, key, after) => {
      const row = el('label', 'setting', `<span>${label}<small>${sub}</small></span>`);
      const b = el('button', 'btn sm ' + (s[key] ? 'green' : ''), s[key] ? 'Oui' : 'Non');
      b.onclick = () => { s[key] = !s[key]; this.save.persist(); if (after) after(); this.renderSettings(); };
      row.append(b); box.append(row);
    };
    const vol = el('label', 'setting', '<span>Volume<small>Sons générés en Web Audio</small></span>');
    const r = el('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.05; r.value = s.volume;
    r.oninput = () => { this.audio.setVolume(+r.value); this.save.persist(); }; r.onchange = () => this.audio.play('coin');
    vol.append(r); box.append(vol);
    toggle('Son coupé', 'Bouton mute', 'muted', () => { this.audio.applyVolume(); this.syncMute(); });
    toggle('Tremblement d\'écran', 'Sur les explosions et les boss', 'shake');
    toggle('Chiffres de dégâts', 'Nombres flottants au-dessus des ennemis', 'damageNumbers');
    const tut = el('div', 'setting', '<span>Tutoriel<small>Le revoir à la prochaine partie</small></span>');
    const tb = el('button', 'btn sm', 'Réactiver'); tb.onclick = () => { s.tutorialDone = false; this.save.persist(); this.toast('Tutoriel réactivé'); }; tut.append(tb); box.append(tut);
    const rs = el('div', 'setting', '<span>Réinitialiser<small>Efface toute la progression</small></span>');
    const rb = el('button', 'btn sm danger', 'Effacer');
    rb.onclick = () => { if (confirm('Effacer toute la progression (gemmes, déblocages, étoiles) ?')) { this.save.reset(); this.audio.settings = this.save.data.settings; this.audio.applyVolume(); this.renderSettings(); this.toast('Progression effacée'); } };
    rs.append(rb); box.append(rs);
    box.append(el('p', '', '<small>Raccourcis : <b>1-8</b> tourelles · <b>Espace</b> lancer la vague · <b>P</b> pause · <b>Échap</b> annuler · <b>Maj</b>+clic pour poser plusieurs tourelles.</small>'));
  }
  syncMute() { $('#btn-mute').textContent = this.save.data.settings.muted ? '🔇' : '🔊'; }

  // ------------------------------------------------------------------ partie
  startGame(mapId, diff, endless) {
    if (this.game) this.game.commit();
    const g = (this.game = new Game({ canvas: this.canvas, map: getMap(mapId), difficulty: diff, endless, save: this.save, audio: this.audio }));
    this.lastArgs = [mapId, diff, endless];
    this.cache = {}; this.barDrag = null;
    g.onEvent = (name, data) => this.onGameEvent(name, data);
    g.fx.onCoinArrive = () => { this.audio.play('coin'); const m = $('#hud-money'); m.classList.add('pulse'); clearTimeout(this._pt); this._pt = setTimeout(() => m.classList.remove('pulse'), 90); };
    $('#overlay').hidden = true; $('#panel').hidden = true;
    this.buildTowerBar(); this.syncMute();
    $('#btn-speed').textContent = 'x1';
    this.show('game');
    this.tutStep = this.save.data.settings.tutorialDone ? -1 : 0; this.renderTutorial();
    window.__game = g; // pratique pour le débogage / l'équilibrage en console
  }
  quitGame() {
    if (this.game) { this.game.commit(); this.announce(this.save.checkAchievements()); }
    this.game = null; this.show('maps');
  }
  onGameEvent(name, data) {
    if (name === 'end') setTimeout(() => this.showEnd(data), data.victory ? 1600 : 1100);
    if (name === 'upgraded' || name === 'placed') this.cache.panelKey = null;
    if (name === 'cleared' && !this.simulating) { // présente les nouveaux types d'ennemis de la vague suivante
      const nw = this.game.nextWave;
      for (const g of nw ? nw.groups : []) { const c = ENEMIES[g.type]; if (c.unlock === nw.n && c.hint) this.toast(`Nouveau : ${c.name} (${c.tag})`, c.hint); }
    }
  }

  buildTowerBar() {
    const bar = $('#towerbar'); bar.innerHTML = '';
    TOWER_ORDER.forEach((t, i) => {
      const cfg = TOWERS[t], unlocked = this.save.towerUnlocked(t);
      const b = el('div', 'tb' + (unlocked ? '' : ' locked'));
      b.dataset.type = t; b.title = unlocked ? `${cfg.name} — ${cfg.desc}` : `${cfg.name} — à débloquer dans la boutique`;
      b.append(el('kbd', '', String(i + 1)), towerIcon(t, 46, this.save.data.skin), el('span', 'tb-name', cfg.name), el('span', 'tb-cost', unlocked ? `🪙 ${cfg.cost}` : '🔒'));
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!unlocked) { this.audio.play('error'); this.toast('🔒 ' + cfg.name, 'À débloquer dans la boutique avec des 💎'); return; }
        const g = this.game; if (!g || g.over) return;
        this.barDrag = { type: t, wasSel: g.placing === t, moved: false };
        this.setPlacing(t);
      });
      bar.append(b);
    });
  }
  setPlacing(type) {
    const g = this.game; if (!g) return;
    if (type && !this.save.towerUnlocked(type)) { this.audio.play('error'); return; }
    g.placing = type; if (type) this.select(null);
    if (!type) g.hover.active = false;
    $$('.tb').forEach((b) => b.classList.toggle('sel', b.dataset.type === type));
  }
  select(t) { if (this.game) { this.game.selected = t; this.cache.panelKey = null; } }

  toLogical(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VIEW.W, y: ((e.clientY - r.top) / r.height) * VIEW.H, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
  }
  tryPlace(p, keep) {
    const g = this.game;
    const t = g.placeTower(g.placing, p.x, p.y);
    if (t && !keep) this.setPlacing(null);
  }
  bindGameInput() {
    const cv = this.canvas;
    cv.addEventListener('pointermove', (e) => {
      const g = this.game; if (!g) return; const p = this.toLogical(e);
      g.hover = { x: p.x, y: p.y, active: true };
      g.hoverTower = !g.placing && e.pointerType === 'mouse' ? g.towerAt(p.x, p.y) : null;
    });
    cv.addEventListener('pointerleave', () => { const g = this.game; if (g) { g.hoverTower = null; if (!this.barDrag && !this.down) g.hover.active = false; } });
    cv.addEventListener('pointerdown', (e) => {
      const g = this.game; if (!g || g.over || e.button === 2) return; const p = this.toLogical(e);
      g.hover = { x: p.x, y: p.y, active: true }; this.down = p;
    });
    cv.addEventListener('pointerup', (e) => {
      const g = this.game; if (!g || !this.down) return; this.down = null; const p = this.toLogical(e);
      const hit = g.towerAt(p.x, p.y);
      if (g.placing && hit && hit.type !== 'mine' && g.placing !== 'mine') { this.setPlacing(null); this.select(hit); }
      else if (g.placing) this.tryPlace(p, e.shiftKey); else this.select(hit);
    });
    cv.addEventListener('contextmenu', (e) => { e.preventDefault(); this.setPlacing(null); this.select(null); });
    // glisser-déposer depuis la barre de tourelles
    window.addEventListener('pointermove', (e) => {
      const g = this.game; if (!g || !this.barDrag) return; const p = this.toLogical(e);
      if (p.inside) { this.barDrag.moved = true; g.hover = { x: p.x, y: p.y, active: true }; } else g.hover.active = false;
    });
    window.addEventListener('pointerup', (e) => {
      const g = this.game, d = this.barDrag; if (!g || !d) return; this.barDrag = null;
      const p = this.toLogical(e);
      if (p.inside && d.moved) this.tryPlace(p, e.shiftKey);
      else if (d.wasSel && !d.moved) this.setPlacing(null);
    });
    window.addEventListener('pointercancel', () => { this.barDrag = null; this.down = null; });

    $('#btn-wave').addEventListener('click', () => { const g = this.game; if (g && !g.paused) g.startNextWave(true); });
    $('#btn-speed').addEventListener('click', () => { const g = this.game; if (!g) return; g.speed = (g.speed % 3) + 1; $('#btn-speed').textContent = 'x' + g.speed; });
    $('#btn-pause').addEventListener('click', () => this.togglePause());
    $('#btn-mute').addEventListener('click', () => { const s = this.save.data.settings; this.audio.setMuted(!s.muted); this.save.persist(); this.syncMute(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.game && !this.game.over && !this.game.paused && this.screen === 'game') this.togglePause(); });
  }
  onKey(e) {
    const g = this.game; if (!g || this.screen !== 'game' || e.repeat) return;
    if (e.code === 'KeyP') { this.togglePause(); return; }
    if (g.over || g.paused) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= TOWER_ORDER.length) { const t = TOWER_ORDER[n - 1]; this.setPlacing(g.placing === t ? null : t); if (g.placing) g.hover.active = g.hover.x > 0; }
    else if (e.code === 'Space') { e.preventDefault(); g.startNextWave(true); }
    else if (e.code === 'Escape') { if (g.placing) this.setPlacing(null); else if (g.selected) this.select(null); else this.togglePause(); }
  }
  togglePause() {
    const g = this.game; if (!g || g.over) return;
    g.paused = !g.paused;
    const ov = $('#overlay');
    if (!g.paused) { ov.hidden = true; return; }
    ov.innerHTML = ''; ov.hidden = false;
    const m = el('div', 'modal', `<h2 class="win">PAUSE</h2><p>${g.map.name} · ${g.diff.name}${g.endless ? ' · ♾ Infini' : ''}</p>`);
    const col = el('div', 'col');
    const b1 = el('button', 'btn big primary', '▶ Reprendre'); b1.onclick = () => this.togglePause();
    const b2 = el('button', 'btn big', '↻ Recommencer'); b2.onclick = () => this.startGame(...this.lastArgs);
    const b3 = el('button', 'btn big', '✕ Quitter'); b3.onclick = () => this.quitGame();
    col.append(b1, b2, b3); m.append(col); ov.append(m);
  }

  // ------------------------------------------------------------------ boucle
  resize() {
    const st = $('#stage').getBoundingClientRect();
    if (!st.width || !st.height) return;
    const s = Math.min(st.width / VIEW.W, st.height / VIEW.H), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.style.width = VIEW.W * s + 'px'; this.canvas.style.height = VIEW.H * s + 'px';
    this.canvas.width = Math.round(VIEW.W * s * dpr); this.canvas.height = Math.round(VIEW.H * s * dpr);
    if (this.game) {
      this.game.setScale(this.canvas.width / VIEW.W);
      const c = this.canvas.getBoundingClientRect(), m = $('#hud-money').getBoundingClientRect();
      this.game.fx.coinTarget = { x: ((m.left + m.width / 2 - c.left) / c.width) * VIEW.W, y: Math.min(-5, ((m.top + m.height / 2 - c.top) / c.height) * VIEW.H) };
    }
  }
  loop(ts) {
    const dt = Math.min(0.1, (ts - this.last) / 1000 || 0); this.last = ts;
    const g = this.game;
    if (g && this.screen === 'game' && !this.simulating) { g.frame(dt); this.updateHud(); }
    requestAnimationFrame((t) => this.loop(t));
  }
  set(key, value, fn) { if (this.cache[key] !== value) { this.cache[key] = value; fn(value); } }

  updateHud() {
    const g = this.game;
    this.set('lives', g.lives, (v) => { const e = $('#hud-lives'); $('b', e).textContent = v; if (v < g.maxLives) { e.classList.remove('hurt'); void e.offsetWidth; e.classList.add('hurt'); } });
    this.set('money', Math.floor(g.money), (v) => {
      $('#hud-money b').textContent = fmt(v);
      $$('.tb').forEach((b) => b.classList.toggle('poor', !b.classList.contains('locked') && TOWERS[b.dataset.type].cost > v));
    });
    this.set('wave', g.wave, (v) => ($('#hud-wave b').textContent = g.endless ? `${v} ♾` : `${v}/${g.totalWaves}`));
    this.set('placing', g.placing, (v) => $$('.tb').forEach((b) => b.classList.toggle('sel', b.dataset.type === v)));

    // bouton de vague + aperçu
    const nw = g.nextWave, btn = $('#btn-wave');
    let label;
    if (g.over) label = '';
    else if (!nw) label = 'Dernière vague !';
    else if (!g.canStartNext) label = `Vague ${g.wave} en cours…`;
    else {
      const bonus = g.earlyBonus, cd = g.countdown != null ? ` (${Math.ceil(g.countdown)} s)` : '';
      label = `▶ Lancer la vague ${nw.n}${cd}` + (bonus > 0 ? `<small>En avance : +${bonus} 🪙</small>` : g.wave === 0 ? '<small>Espace</small>' : '');
    }
    this.set('waveLabel', label, (v) => { btn.innerHTML = v; btn.hidden = !v; btn.disabled = !g.canStartNext; btn.classList.toggle('ready', g.canStartNext && g.wave === 0); });
    this.set('preview', g.over || !nw ? 0 : nw.n, (n) => {
      const box = $('#wave-preview'); box.innerHTML = ''; box.hidden = !n; if (!n) return;
      box.append(el('span', '', `Vague ${n} :`));
      for (const [type, count] of Object.entries(waveSummary(nw))) {
        const w = el('span', 'wp' + (ENEMIES[type].boss ? ' boss' : '')); w.title = `${ENEMIES[type].name} (${ENEMIES[type].tag})`;
        w.append(enemyIcon(type, 26), document.createTextNode(ENEMIES[type].boss ? 'BOSS' : '×' + count)); box.append(w);
      }
    });
    this.updatePanel();
    this.updateTutorial();
  }

  // ------------------------------------------------------------------ panneau d'amélioration
  statRows(type, s) {
    const rows = [];
    const mult = (s.pellets ? ' ×' + s.pellets : '') + (s.barrels > 1 ? ' ×' + s.barrels : '');
    rows.push(['Dégâts', num(s.damage) + mult]);
    if (type === 'mine') { rows.push(['Réarmement', (1 / s.rate).toFixed(1) + ' s'], ['Zone', num(s.splash)]); return rows; }
    rows.push(['Cadence', s.rate.toFixed(1) + '/s'], ['Portée', num(s.range)]);
    if (type === 'cryo') rows.push(['Ralenti', Math.round(s.slow * 100) + ' %']);
    else { if (s.splash) rows.push(['Zone', num(s.splash)]); rows.push(['DPS', num(dpsOf(s))]); }
    return rows;
  }
  updatePanel() {
    const g = this.game, t = g.selected, panel = $('#panel');
    if (!t || g.over) { if (!panel.hidden) { panel.hidden = true; this.cache.panelKey = null; } return; }
    const opts = t.upgradeOptions();
    const key = [g.towers.indexOf(t), t.level, t.branch, t.mode, opts.map((o) => g.money >= o.cost).join()].join('|');
    if (this.cache.panelKey !== key) { this.cache.panelKey = key; this.renderPanel(t, opts); }
    const d = $('.dmg', panel), k = $('.kills', panel);
    if (d) { d.textContent = fmt(t.dmg); k.textContent = t.kills; }
  }
  renderPanel(t, opts) {
    const g = this.game, panel = $('#panel'), rar = RARITY[t.level - 1];
    panel.hidden = false; panel.innerHTML = '';
    panel.className = t.x > VIEW.W / 2 ? 'left' : 'right';
    panel.style.setProperty('--rar', rar.color);
    const head = el('div', 'p-head');
    const x = el('button', 'btn sm x', '✕'); x.onclick = () => this.select(null);
    head.append(towerIcon(t.type, 44, this.save.data.skin, t.level), el('div', '', `<b>${t.label}</b><small>${rar.name} · Niv. ${t.level}/5</small>`), x);
    const stats = el('div', 'p-stats');
    const cur = this.statRows(t.type, t.stats);
    const fill = (opt) => {
      const nxt = opt ? this.statRows(t.type, computeStats(t.type, opt.level, opt.branch, this.save.data.perks)) : null;
      stats.innerHTML = cur.map((r, i) => `<span>${r[0]}</span><b>${r[1]}</b><i>${nxt && nxt[i] && nxt[i][1] !== r[1] ? '→ ' + nxt[i][1] : ''}</i>`).join('');
    };
    fill(opts.length === 1 ? opts[0] : null);
    const up = el('div', 'p-up');
    if (!opts.length) up.append(el('div', 'max', '★ NIVEAU MAX — Légendaire ★'));
    if (opts.length === 2) up.append(el('b', '', 'Choisis une spécialisation :'));
    for (const o of opts) {
      const ok = g.money >= o.cost;
      const b = el('button', 'btn ' + (o.kind === 'level' ? 'green' : 'primary') + (ok ? '' : ' off'), `<em>🪙 ${o.cost}</em>⬆ ${o.name}<small>${o.desc}</small>`);
      if (o.kind !== 'level') b.style.background = RARITY[o.level - 1].color;
      b.onpointerenter = () => fill(o);
      b.onpointerleave = () => fill(opts.length === 1 ? opts[0] : null);
      b.onclick = () => { g.upgradeTower(t, o); this.cache.panelKey = null; };
      up.append(b);
    }
    panel.append(head, stats, up);
    if (t.cfg.targeting) {
      const modes = el('div', 'p-modes', '<span>Cible :</span>');
      for (const [id, name] of TARGET_MODES) {
        const b = el('button', 'btn sm' + (t.mode === id ? ' sel' : ''), name);
        b.onclick = () => { t.mode = id; t.target = null; this.cache.panelKey = null; };
        modes.append(b);
      }
      panel.append(modes);
    }
    const foot = el('div', 'p-foot', '<span>⚔ <b class="dmg">0</b> · ☠ <b class="kills">0</b></span>');
    const sell = el('button', 'btn sm danger', `Vendre +${t.sellValue} 🪙`); sell.onclick = () => g.sellTower(t);
    foot.append(sell); panel.append(foot);
  }

  // ------------------------------------------------------------------ tutoriel
  renderTutorial() {
    const box = $('#tutorial');
    if (this.tutStep < 0 || this.tutStep >= TUTORIAL.length) { box.hidden = true; return; }
    const step = TUTORIAL[this.tutStep];
    box.hidden = false; box.innerHTML = `<div>${step.text}</div>`;
    const row = el('div', 'row');
    const end = () => { this.tutStep = -1; this.save.data.settings.tutorialDone = true; this.save.persist(); this.renderTutorial(); };
    if (step.last) { const ok = el('button', 'btn sm primary', 'C\'est parti !'); ok.onclick = end; row.append(ok); }
    else { const skip = el('button', 'btn sm', 'Passer le tutoriel'); skip.onclick = end; row.append(skip); }
    box.append(row);
  }
  updateTutorial() {
    if (this.tutStep < 0) return;
    const step = TUTORIAL[this.tutStep];
    if (step.done(this.game, this)) {
      if (step.last) { this.tutStep = -1; this.save.data.settings.tutorialDone = true; this.save.persist(); }
      else this.tutStep++;
      this.renderTutorial();
    }
  }

  // ------------------------------------------------------------------ fin de partie
  showEnd(r) {
    const g = this.game; if (!g || g.result !== r) return;
    const ov = $('#overlay'); ov.innerHTML = ''; ov.hidden = false;
    const m = el('div', 'modal');
    const title = r.victory ? 'VICTOIRE !' : r.endless ? 'FIN DE LA SÉRIE' : 'DÉFAITE…';
    m.append(el('h2', r.victory ? 'win' : 'lose', title));
    m.append(el('p', '', `${g.map.name} · ${g.diff.name}${g.endless ? ' · ♾ Infini' : ''}`));
    if (r.victory) {
      m.append(el('div', 'big-stars', [0, 1, 2].map((i) => `<span class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.4 + i * 0.35}s">★</span>`).join('')));
      for (let i = 0; i < r.stars; i++) setTimeout(() => this.audio.play('star'), 500 + i * 350);
    }
    const s = g.stats;
    m.append(el('div', 'end-stats', [
      ['Vagues', r.wavesDone + (g.endless ? '' : '/' + g.totalWaves)], ['Éliminations', fmt(s.kills)], ['Dégâts', fmt(s.damage)],
      ['Pièces gagnées', fmt(s.earned)], ['PV restants', `${g.lives}/${g.maxLives}`], ['Tourelles', s.built],
    ].map(([k, v]) => `<div><b>${v}</b>${k}</div>`).join('')));
    const by = Object.entries(s.dmgByType).sort((a, b) => b[1] - a[1]);
    if (by.length) {
      const bars = el('div', 'bars', '<div>Dégâts par type de tourelle</div>');
      for (const [type, v] of by) bars.append(el('div', 'bar', `<span>${TOWERS[type].name}</span><div><i data-w="${(v / by[0][1]) * 100}"></i></div><span>${fmt(v)}</span>`));
      m.append(bars);
      setTimeout(() => $$('i[data-w]', bars).forEach((i) => (i.style.width = i.dataset.w + '%')), 50);
    }
    if (r.best && r.best.dmg > 0) m.append(el('div', 'best', `🏅 Meilleure tourelle : ${r.best.label} (${RARITY[r.best.level - 1].name}) — ${fmt(r.best.dmg)} dégâts, ${r.best.kills} éliminations`));
    m.append(el('div', 'gain', `+${r.gems} 💎`));
    if (r.victory && !g.endless) {
      const nextMap = MAPS.find((mp) => mp.unlock === g.map.id);
      const notes = ['♾ Mode infini disponible sur cette carte'];
      if (nextMap) notes.unshift(`🗺 Carte « ${nextMap.name} » débloquée`);
      m.append(el('p', '', notes.join(' · ')));
    }
    const row = el('div', 'row');
    const again = el('button', 'btn primary', '↻ Rejouer'); again.onclick = () => this.startGame(...this.lastArgs);
    const maps = el('button', 'btn', '🗺 Cartes'); maps.onclick = () => { this.game = null; this.show('maps'); };
    const shop = el('button', 'btn', '🛒 Boutique'); shop.onclick = () => { this.game = null; this.show('shop'); };
    row.append(again, maps, shop); m.append(row); ov.append(m);
    this.announce(r.achievements);
  }
}
