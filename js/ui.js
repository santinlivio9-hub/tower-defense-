// Interface : écrans (menu, cartes, boutique, paramètres), HUD, barre de tourelles,
// feuille d'amélioration, tutoriel, pause, fin de partie, partage, entrées tactile / souris / clavier.
import { VIEW, TOWERS, TOWER_ORDER, ENEMIES, RARITY, DIFFICULTIES, SHOP, ACHIEVEMENTS } from './config.js';
import { MAPS, getMap, drawMapPreview, THEMES, buildField } from './maps.js';
import { Game } from './game.js';
import { computeStats, dpsOf, TARGET_MODES } from './towers.js';
import { waveSummary } from './waves.js';
import { enemyImg, towerImg, preloadSprites, enemyFrames, towerSprite, skinFinish } from './sprites.js';
import { icon, hydrateIcons, coin, gem } from './icons.js';
import { Haptics } from './haptics.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1000).toFixed(n >= 1e5 ? 0 : 1) + 'k' : fmt(n));
const num = (n) => (n >= 100 || Number.isInteger(+n.toFixed(1)) ? String(Math.round(n)) : n.toFixed(1));
const stars = (n, cls = 'stars') => `<span class="${cls}">${[0, 1, 2].map((i) => icon('star', i < n ? 'on' : '')).join('')}</span>`;

const TUTORIAL = [
  { text: 'Touche une <b>arme</b>', target: () => $('.tb'), done: (g) => !!g.placing || g.towers.length > 0 },
  { text: 'Pose-la <b>près du chemin</b>', target: (ui) => ui.fieldPoint(300, 285), done: (g) => g.towers.length > 0 },
  { text: '<b>Lance la vague !</b>', target: () => $('#btn-wave'), done: (g) => g.wave >= 1 },
  { text: 'Touche ta tourelle pour l\'<b>améliorer</b>', target: (ui) => { const t = ui.game.towers[0]; return t ? ui.fieldPoint(t.x, t.y - 34) : null; }, wait: (g) => g.cleared < 1, done: (g) => !!g.selected || g.wave >= 4 },
];

export class UI {
  constructor(save, audio) {
    this.save = save; this.audio = audio; this.game = null;
    this.haptics = new Haptics(save.data.settings, audio);
    this.diff = 'normal'; this.endless = false; this.shopTab = 'towers';
    this.canvas = $('#game'); this.cache = {}; this.last = 0; this.simulating = false;
    this.barDrag = null; this.down = null; this.tutStep = -1; this.flying = 0; this.shown = { money: 0, score: 0 };

    hydrateIcons();
    preloadSprites(save.data.skin);
    document.addEventListener('pointerdown', (e) => {
      this.audio.unlock();
      if (e.target.closest('.btn, .icon-btn, .seg button, .switch, .tb')) { this.audio.play('click'); this.haptics.pulse(0); }
    }, { capture: true });
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => this.show(b.dataset.go)));
    $$('#shop-tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { this.shopTab = b.dataset.tab; this.renderShop(); }));
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    this.bindGameInput();

    const parade = $('#menu-parade');
    for (const t of ['basic', 'fast', 'tank', 'armored', 'flying', 'healer']) parade.append(enemyImg(t, 68));

    this.show('menu');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.resize());
    requestAnimationFrame((ts) => this.loop(ts));
  }

  // ------------------------------------------------------------------ écrans
  show(name) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    this.screen = name;
    this.refreshGems();
    if (name === 'menu') $('#menu-best').textContent = fmt(this.save.bestScore());
    if (name === 'maps') this.renderMaps();
    if (name === 'shop') this.renderShop();
    if (name === 'settings') this.renderSettings();
    if (name === 'game') this.resize();
    if (name !== 'game') { this.closeOverlay(); $('#tutorial').hidden = true; }
  }
  refreshGems() { $$('.gems').forEach((g) => (g.textContent = fmt(this.save.data.gems))); }
  toast(title, sub = '', art = icon('medal')) {
    const box = $('#toasts'); while (box.children.length >= 2) box.firstChild.remove();
    const t = el('div', 'toast', `<div><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>`);
    if (typeof art === 'string') t.insertAdjacentHTML('afterbegin', art); else t.prepend(art);
    box.append(t); setTimeout(() => t.remove(), 3900);
  }
  announce(list) { for (const a of list || []) this.toast('Succès : ' + a.name, `${a.desc} · +${a.gems} gemmes`); this.refreshGems(); }
  openOverlay(node) { const ov = $('#overlay'); ov.innerHTML = ''; ov.append(node); ov.classList.add('show'); }
  closeOverlay() { $('#overlay').classList.remove('show'); }

  renderMaps() {
    const row = $('#diff-row'); row.innerHTML = '';
    for (const [id, d] of Object.entries(DIFFICULTIES)) {
      const b = el('button', this.diff === id && !this.endless ? 'sel' : '', d.name);
      b.onclick = () => { this.diff = id; this.endless = false; this.renderMaps(); };
      row.append(b);
    }
    const anyBeaten = MAPS.some((m) => this.save.mapBeaten(m.id));
    const eb = el('button', (this.endless ? 'sel' : '') + (anyBeaten ? '' : ' locked'), icon(anyBeaten ? 'infinity' : 'lock') + 'Infini');
    eb.onclick = () => { if (!anyBeaten) { this.toast('Mode infini verrouillé', 'Termine une carte pour le débloquer', icon('lock')); return; } this.endless = !this.endless; this.renderMaps(); };
    row.append(eb);

    const grid = $('#map-grid'); grid.innerHTML = '';
    const d = DIFFICULTIES[this.diff];
    for (const m of MAPS) {
      const unlocked = this.save.mapUnlocked(m), md = this.save.mapData(m.id);
      const card = el('div', 'card' + (unlocked ? '' : ' locked'));
      const cv = el('canvas', 'thumb'); cv.width = 312; cv.height = 489; drawMapPreview(cv, THEMES[m.theme], buildField(m.layout, false, m.slots));
      const body = el('div', 'body');
      body.append(el('h3', '', m.name), el('p', '', m.desc));
      if (this.endless) body.append(el('div', 'meta', `${icon('infinity')}Record : <b>vague ${md.bestEndless || 0}</b>`), el('div', 'meta', `${icon('trophy', 'gold')}Meilleur score : <b>${fmt(md.best.endless || 0)}</b>`));
      else body.append(el('div', 'row', `<span class="meta">${d.name}</span>${stars(md.stars[this.diff] || 0)}`), el('div', 'meta', `${icon('trophy', 'gold')}Meilleur score : <b>${fmt(md.best[this.diff] || 0)}</b>`));
      const spacer = el('div'); spacer.style.flex = '1'; body.append(spacer);
      if (!unlocked) body.append(el('div', 'note', `${icon('lock')}Termine « ${getMap(m.unlock).name} »`));
      else if (this.endless && !this.save.mapBeaten(m.id)) body.append(el('div', 'note', `${icon('lock')}Termine d'abord cette carte`));
      else {
        const b = el('button', 'btn primary', icon(this.endless ? 'infinity' : 'play') + 'Jouer');
        b.onclick = () => this.startGame(m.id, this.diff, this.endless);
        body.append(b);
      }
      card.append(cv, body); grid.append(card);
    }
  }

  renderShop() {
    const d = this.save.data, grid = $('#shop-content'); grid.innerHTML = '';
    $$('#shop-tabs [data-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.tab === this.shopTab));
    this.refreshGems();
    const price = (cost, label, fn) => {
      const b = el('button', 'btn sm' + (d.gems < cost ? ' off' : ''), `${label} ${gem()}${cost}`);
      b.onclick = () => {
        if (!this.save.spend(cost)) { this.audio.play('error'); this.toast('Pas assez de gemmes', 'Joue des parties pour en gagner', gem()); return; }
        fn(); this.save.persist(); this.audio.play('buy'); this.haptics.pulse(1); this.announce(this.save.checkAchievements()); this.renderShop();
      };
      return b;
    };
    const owned = (txt) => el('span', 'owned', icon('check') + txt);
    if (this.shopTab === 'towers') {
      for (const t of TOWER_ORDER) {
        const cfg = TOWERS[t], has = this.save.towerUnlocked(t), cost = SHOP.towerUnlocks[t] || 0;
        const card = el('div', 'card' + (has ? ' done' : ''));
        const art = el('div', 'art'); art.append(towerImg(t, 76, d.skin, has ? 3 : 1));
        const body = el('div', 'body');
        body.append(el('h3', '', cfg.name), el('p', '', cfg.desc), el('p', '', `Spécialisations : ${cfg.branches.map((b) => b.name).join(' ou ')}`));
        const row = el('div', 'row', `<span class="meta">${coin()}<b>${cfg.cost}</b> en partie</span>`);
        row.append(has ? owned('Débloquée') : price(cost, 'Débloquer', () => d.towers.push(t)));
        body.append(row); card.append(art, body); grid.append(card);
      }
    } else if (this.shopTab === 'perks') {
      for (const p of SHOP.perks) {
        const lvl = d.perks[p.id] || 0, max = lvl >= p.max;
        const card = el('div', 'card' + (max ? ' done' : ''));
        const art = el('div', 'art', icon({ damage: 'sword', money: 'cart', lives: 'heart' }[p.id]));
        if (p.id === 'money') art.innerHTML = coin(); art.firstChild.style.cssText = 'width:40px;height:40px';
        const body = el('div', 'body');
        body.append(el('h3', '', p.name), el('p', '', p.desc), el('div', 'pips', Array.from({ length: p.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')));
        const row = el('div', 'row', `<span class="meta">Niveau <b>${lvl}/${p.max}</b></span>`);
        row.append(max ? owned('Niveau max') : price(p.costs[lvl], 'Améliorer', () => (d.perks[p.id] = lvl + 1)));
        body.append(row); card.append(art, body); grid.append(card);
      }
    } else if (this.shopTab === 'skins') {
      for (const s of SHOP.skins) {
        const has = d.skins.includes(s.id), on = d.skin === s.id;
        const card = el('div', 'card' + (on ? ' done' : ''));
        const art = el('div', 'art multi'); art.append(towerImg('assault', 62, s.id, 3), towerImg('rocket', 62, s.id, 4, 0));
        const body = el('div', 'body'); body.append(el('h3', '', s.name), el('p', '', 'Finition appliquée à toutes tes armes.'));
        const row = el('div', 'row', '<span></span>');
        if (on) row.append(owned('Équipé'));
        else if (has) { const b = el('button', 'btn sm green', 'Équiper'); b.onclick = () => { d.skin = s.id; this.save.persist(); preloadSprites(s.id); this.renderShop(); }; row.append(b); }
        else row.append(price(s.cost, 'Acheter', () => { d.skins.push(s.id); d.skin = s.id; preloadSprites(s.id); }));
        body.append(row); card.append(art, body); grid.append(card);
      }
    } else {
      for (const a of ACHIEVEMENTS) {
        const done = d.achievements.includes(a.id), prog = Math.min(a.goal, this.save.achievementProgress(a));
        const card = el('div', 'card' + (done ? ' done' : ''));
        const art = el('div', 'art', icon(done ? 'medal' : 'lock')); art.firstChild.style.cssText = `width:38px;height:38px;color:${done ? 'var(--gold)' : 'var(--text-soft)'}`;
        const body = el('div', 'body');
        body.append(el('h3', '', a.name), el('p', '', a.desc), el('div', 'progress', `<i style="width:${(prog / a.goal) * 100}%"></i>`),
          el('div', 'row', `<span class="meta"><b>${short(prog)}</b> / ${short(a.goal)}</span><span class="meta">${done ? icon('check') : ''}+<b>${a.gems}</b>${gem()}</span>`));
        card.append(art, body); grid.append(card);
      }
    }
  }

  switchRow(label, sub, ico, key, after) {
    const s = this.save.data.settings;
    const row = el('div', 'setting', `<span class="lab">${icon(ico)}<span>${label}${sub ? `<small>${sub}</small>` : ''}</span></span>`);
    const sw = el('button', 'switch' + ((key === 'muted' ? !s[key] : s[key]) ? ' on' : '')); sw.setAttribute('role', 'switch');
    sw.onclick = () => { s[key] = !s[key]; this.save.persist(); if (after) after(); sw.classList.toggle('on', key === 'muted' ? !s[key] : s[key]); };
    row.append(sw); return row;
  }
  renderSettings() {
    const s = this.save.data.settings, box = $('#settings-content'); box.innerHTML = '';
    box.append(this.switchRow('Son', 'Bruitages synthétisés', 'sound', 'muted', () => { this.audio.applyVolume(); this.syncMute(); }));
    const vol = el('div', 'setting', `<span class="lab">${icon('sound')}<span>Volume</span></span>`);
    const r = el('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.05; r.value = s.volume;
    r.oninput = () => { this.audio.setVolume(+r.value); this.save.persist(); }; r.onchange = () => this.audio.play('coin');
    vol.append(r); box.append(vol);
    box.append(this.switchRow('Vibrations', 'Retour haptique', 'vibrate', 'haptics', () => this.haptics.pulse(1)));
    box.append(this.switchRow('Tremblement d\'écran', 'Explosions et boss', 'quake', 'shake'));
    box.append(this.switchRow('Chiffres de dégâts', 'Nombres flottants', 'numbers', 'damageNumbers'));
    const tut = el('div', 'setting', `<span class="lab">${icon('book')}<span>Tutoriel<small>Le revoir à la prochaine partie</small></span></span>`);
    const tb = el('button', 'btn sm ghost', 'Revoir'); tb.onclick = () => { s.tutorialDone = false; this.save.persist(); this.toast('Tutoriel réactivé', '', icon('book')); }; tut.append(tb); box.append(tut);
    const rs = el('div', 'setting', `<span class="lab">${icon('trash')}<span>Réinitialiser<small>Efface toute la progression</small></span></span>`);
    const rb = el('button', 'btn sm red', 'Effacer');
    rb.onclick = () => { if (confirm('Effacer toute la progression (gemmes, déblocages, étoiles, records) ?')) { this.save.reset(); this.audio.settings = this.haptics.settings = this.save.data.settings; this.audio.applyVolume(); this.renderSettings(); this.toast('Progression effacée', '', icon('trash')); } };
    rs.append(rb); box.append(rs);
    box.append(el('p', 'hint', 'Astuce : ajoute le jeu à ton écran d\'accueil (Partager → « Sur l\'écran d\'accueil ») pour y jouer en plein écran et hors ligne.<br>Clavier : 1-8 armes · Espace vague · P pause · Échap annuler.'));
  }
  syncMute() { $('#btn-mute').innerHTML = icon(this.save.data.settings.muted ? 'mute' : 'sound'); }

  // ------------------------------------------------------------------ partie
  startGame(mapId, diff, endless) {
    if (this.game) this.game.commit();
    const g = (this.game = new Game({ canvas: this.canvas, map: getMap(mapId), difficulty: diff, endless, save: this.save, audio: this.audio }));
    this.lastArgs = [mapId, diff, endless];
    this.cache = {}; this.barDrag = null; this.shown = { money: g.money, score: 0 };
    g.onEvent = (name, data) => this.onGameEvent(name, data);
    this.closeOverlay(); this.closeSheet();
    this.buildTowerBar(); this.syncMute();
    $('#btn-speed b').textContent = 'x1'; $('#hud-money b').textContent = short(g.money); $('#hud-score b').textContent = '0';
    this.show('game');
    this.tutStep = this.save.data.settings.tutorialDone ? -1 : 0; this.cache.tut = null;
    window.__game = g; // pratique pour le débogage / l'équilibrage en console
  }
  quitGame() {
    if (this.game) { this.game.commit(); this.announce(this.save.checkAchievements()); }
    this.game = null; this.show('maps');
  }
  onGameEvent(name, data) {
    if (name === 'end') setTimeout(() => this.showEnd(data), data.victory ? 1700 : 1100);
    else if (name === 'upgraded' || name === 'placed') { this.cache.sheetKey = null; this.haptics.pulse(1); }
    else if (name === 'coins') this.flyCoins(data);
    else if (name === 'haptic') { if (!this.simulating) this.haptics.pulse(data); }
    else if (name === 'combo') { this.audio.play('combo'); const s = $('#hud-score'); s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); }
    else if (name === 'cleared' && !this.simulating) { // présente les nouveaux types d'ennemis de la vague suivante
      const nw = this.game.nextWave;
      for (const g of nw ? nw.groups : []) { const c = ENEMIES[g.type]; if (c.unlock === nw.n && c.hint) this.toast(`Nouveau : ${c.name}`, c.hint, enemyImg(g.type, 40)); }
    }
  }

  // pièces qui s'envolent de l'ennemi vers le compteur
  flyCoins({ x, y, n }) {
    if (this.simulating || document.hidden || this.screen !== 'game') return;
    const dst = $('#hud-money .coin-ico').getBoundingClientRect();
    const { x: sx, y: sy } = this.toScreen(x, y);
    const dx = dst.left + dst.width / 2 - sx, dy = dst.top + dst.height / 2 - sy;
    for (let i = 0; i < n && this.flying < 18; i++) {
      const c = el('i', 'coin-ico coin-fly'); c.style.left = sx + 'px'; c.style.top = sy + 'px';
      document.body.append(c); this.flying++;
      const bx = (Math.random() - 0.5) * 60, by = (Math.random() - 0.5) * 50 - 14;
      const done = () => { c.remove(); this.flying--; this.audio.play('coin'); this.pop('#hud-money'); };
      if (!c.animate) { done(); continue; }
      c.animate([
        { transform: 'translate(0,0) scale(.4)', opacity: 0 },
        { transform: `translate(${bx}px,${by}px) scale(1.15)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${bx}px,${by - 6}px) scale(1)`, opacity: 1, offset: 0.42 },
        { transform: `translate(${dx}px,${dy}px) scale(.7)`, opacity: 0.9 },
      ], { duration: 620 + i * 55 + Math.random() * 80, easing: 'cubic-bezier(.5,0,.4,1)' }).onfinish = done;
    }
  }
  pop(sel) { const e = $(sel); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }

  buildTowerBar() {
    const bar = $('#towerbar'); bar.innerHTML = '';
    TOWER_ORDER.forEach((t) => {
      const cfg = TOWERS[t], unlocked = this.save.towerUnlocked(t);
      const b = el('div', 'tb' + (unlocked ? '' : ' locked'));
      b.dataset.type = t; b.setAttribute('aria-label', cfg.name);
      b.append(towerImg(t, 46, this.save.data.skin), el('span', 'cost', unlocked ? coin() + cfg.cost : icon('lock')));
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!unlocked) { this.audio.play('error'); this.toast(cfg.name, 'À débloquer dans la boutique avec des gemmes', icon('lock')); return; }
        const g = this.game; if (!g || g.over || g.paused) return;
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
  select(t) { if (this.game) { if (t && t !== this.game.selected) this.audio.play('sheet'); this.game.selected = t; this.cache.sheetKey = null; } }

  toLogical(e) {
    const r = this.canvas.getBoundingClientRect(), v = this.view;
    return { x: (e.clientX - r.left - v.ox) / v.s, y: (e.clientY - r.top - v.oy) / v.s, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
  }
  // Rectangle écran d'un point du terrain (pour le tutoriel)
  fieldPoint(x, y) {
    const p = this.toScreen(x, y);
    return { getBoundingClientRect: () => ({ left: p.x, top: p.y, width: 0, height: 0 }) };
  }
  // Point du terrain -> coordonnées écran (px CSS)
  toScreen(x, y) {
    const r = this.canvas.getBoundingClientRect(), v = this.view;
    return { x: r.left + v.ox + x * v.s, y: r.top + v.oy + y * v.s };
  }
  tryPlace(p, keep) {
    const g = this.game, t = g.placeTower(g.placing, p.x, p.y);
    if (t && !keep) this.setPlacing(null);
    if (!t) this.haptics.pulse(1);
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

    $('#btn-wave').addEventListener('click', () => { const g = this.game; if (g && !g.paused && g.startNextWave(true)) this.haptics.pulse(1); });
    $('#btn-speed').addEventListener('click', () => { const g = this.game; if (!g) return; g.speed = (g.speed % 3) + 1; $('#btn-speed b').textContent = 'x' + g.speed; });
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
    if (!g.paused) { this.closeOverlay(); return; }
    this.setPlacing(null); this.select(null);
    const m = el('div', 'panel glass', `<h2 class="win">PAUSE</h2><p class="sub">${g.map.name} · ${g.endless ? 'Mode infini' : g.diff.name} · vague ${g.wave}</p>
      <div class="score-big"><span>Score</span><b>${fmt(g.score)}</b></div>`);
    const btns = el('div', 'btns');
    const b1 = el('button', 'btn primary big', icon('play') + 'Reprendre'); b1.onclick = () => this.togglePause();
    const row = el('div', 'btn-row');
    const b2 = el('button', 'btn ghost', icon('restart') + 'Rejouer'); b2.onclick = () => this.startGame(...this.lastArgs);
    const b3 = el('button', 'btn ghost', icon('home') + 'Quitter'); b3.onclick = () => this.quitGame();
    row.append(b2, b3); btns.append(b1, row);
    m.append(btns, this.switchRow('Son', '', 'sound', 'muted', () => { this.audio.applyVolume(); this.syncMute(); }), this.switchRow('Vibrations', '', 'vibrate', 'haptics', () => this.haptics.pulse(1)));
    this.openOverlay(m);
  }

  // ------------------------------------------------------------------ boucle
  resize() {
    // Le canvas couvre tout l'écran ; la zone jouable (600 x 940) est calée entre le HUD et la barre du bas,
    // à la largeur de l'écran dès que la hauteur le permet. Le décor remplit le reste.
    const st = $('#stage').getBoundingClientRect();
    if (!st.width || !st.height) return;
    const top = $('#hud').offsetHeight, bot = $('#dock').offsetHeight, dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const free = st.height - top - bot, s = Math.min(st.width / VIEW.W, free / VIEW.H);
    const w = Math.round(st.width * dpr), h = Math.round(st.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.view = { s, ox: (st.width - VIEW.W * s) / 2, oy: top + (free - VIEW.H * s) / 2 };   // en px CSS
    const key = [w, h, s, top, bot].join();
    if (this.game && this.game.viewKey !== key) { this.game.viewKey = key; this.game.setView(s * dpr, this.view.ox / s, this.view.oy / s, w, h); }
    this.cache.tut = null;
  }
  loop(ts) {
    const dt = Math.min(0.1, (ts - this.last) / 1000 || 0); this.last = ts;
    const g = this.game;
    if (g && this.screen === 'game' && !this.simulating) { g.frame(dt); this.updateHud(); }
    requestAnimationFrame((t) => this.loop(t));
  }
  set(key, value, fn) { if (this.cache[key] !== value) { this.cache[key] = value; fn(value); } }
  // compteur qui défile vers sa valeur
  roll(key, target, sel) {
    const cur = this.shown[key];
    if (cur === target) return;
    const d = target - cur, step = Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * 0.18));
    this.shown[key] = Math.abs(d) <= Math.abs(step) ? target : cur + step;
    $(sel + ' b').textContent = short(this.shown[key]);
    if (d > 0 && key === 'score' && this.shown[key] === target) this.pop(sel);
  }

  updateHud() {
    const g = this.game;
    this.set('lives', g.lives, (v) => { const e = $('#hud-lives'); $('b', e).textContent = v; if (v < g.maxLives) { e.classList.remove('hurt'); void e.offsetWidth; e.classList.add('hurt'); } });
    this.roll('money', Math.floor(g.money), '#hud-money');
    this.roll('score', g.score, '#hud-score');
    this.set('afford', Math.floor(g.money), (v) => $$('.tb').forEach((b) => b.classList.toggle('poor', !b.classList.contains('locked') && TOWERS[b.dataset.type].cost > v)));
    this.set('wave', g.wave, (v) => ($('#hud-wave b').textContent = g.endless ? String(v) : `${v}/${g.totalWaves}`));
    this.set('placing', g.placing, (v) => $$('.tb').forEach((b) => b.classList.toggle('sel', b.dataset.type === v)));

    // bouton de vague + aperçu
    const nw = g.nextWave, btn = $('#btn-wave');
    let label;
    if (g.over) label = '';
    else if (!nw) label = '<span class="l">Dernière vague !</span>';
    else if (!g.canStartNext) label = `<span class="l">Vague ${g.wave} en cours</span><small>${g.queue.length + g.enemies.length} brainrots restants</small>`;
    else {
      const bonus = g.earlyBonus;
      label = `<span class="l">${icon('play')}${g.wave === 0 ? 'Lancer la vague 1' : 'Lancer la vague ' + nw.n}</span>`
        + (g.countdown != null ? `<small>Départ auto dans ${Math.ceil(g.countdown)} s${bonus > 0 ? ` · +${bonus}${coin()}` : ''}</small>` : bonus > 0 ? `<small>En avance +${bonus}${coin()}</small>` : '');
    }
    this.set('waveLabel', label, (v) => { btn.innerHTML = v; btn.style.visibility = v ? '' : 'hidden'; btn.disabled = !g.canStartNext; btn.classList.toggle('ready', g.canStartNext); btn.classList.toggle('busy', !g.canStartNext); });
    this.set('preview', g.over || !nw ? 0 : nw.n, (n) => {
      const box = $('#wave-preview'); box.innerHTML = ''; if (!n) return;
      box.append(el('span', 'lbl', 'Suivante'));
      for (const [type, count] of Object.entries(waveSummary(nw))) {
        const w = el('span', 'wp' + (ENEMIES[type].boss ? ' boss' : ''));
        w.append(enemyImg(type, 30), document.createTextNode(ENEMIES[type].boss ? 'BOSS' : '×' + count)); box.append(w);
      }
    });
    this.updateSheet();
    this.updateTutorial();
  }

  // ------------------------------------------------------------------ feuille d'amélioration (bottom sheet)
  statRows(type, s) {
    const mult = (s.pellets ? '×' + s.pellets : '') + (s.barrels > 1 ? '×' + s.barrels : '');
    const rows = [['Dégâts', num(s.damage) + mult]];
    if (type === 'mine') return rows.concat([['Recharge', (1 / s.rate).toFixed(1) + ' s'], ['Zone', num(s.splash)], ['Étourdit', s.stun ? s.stun.toFixed(1) + ' s' : '—']]);
    rows.push(['Cadence', s.rate.toFixed(1) + '/s'], ['Portée', num(s.range)]);
    rows.push(type === 'cryo' ? ['Ralenti', Math.round(s.slow * 100) + ' %'] : ['DPS', num(dpsOf(s))]);
    return rows;
  }
  closeSheet() { const sh = $('#sheet'); sh.classList.remove('open'); sh.setAttribute('aria-hidden', 'true'); this.cache.sheetKey = null; }
  updateSheet() {
    const g = this.game, t = g.selected, sheet = $('#sheet');
    if (!t || g.over) { if (sheet.classList.contains('open')) this.closeSheet(); return; }
    const opts = t.upgradeOptions();
    const key = [g.towers.indexOf(t), t.level, t.branch, t.mode, opts.map((o) => g.money >= o.cost).join()].join('|');
    if (this.cache.sheetKey !== key) { this.cache.sheetKey = key; this.renderSheet(t, opts); }
    const d = $('.dmg', sheet), k = $('.kills', sheet);
    if (d) { d.textContent = short(t.dmg); k.textContent = t.kills; }
  }
  renderSheet(t, opts) {
    const g = this.game, sheet = $('#sheet'), rar = RARITY[t.level - 1];
    sheet.innerHTML = ''; sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
    sheet.style.setProperty('--rar', rar.color);
    const head = el('div', 's-head');
    const art = el('div', 'art'); art.append(towerImg(t.type, 58, this.save.data.skin, t.level, t.branch));
    const x = el('button', 'icon-btn', icon('close')); x.onclick = () => this.select(null);
    head.append(art, el('div', 'ttl', `<b>${t.label}</b><small>${rar.name}<span class="lv">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= t.level ? 'on' : ''}"></i>`).join('')}</span></small>`), x);
    const stats = el('div', 's-stats');
    const cur = this.statRows(t.type, t.stats);
    const fill = (opt) => {
      const nxt = opt ? this.statRows(t.type, computeStats(t.type, opt.level, opt.branch, this.save.data.perks)) : null;
      stats.innerHTML = cur.map((r, i) => `<div><span>${r[0]}</span><b>${r[1]}</b><i>${nxt && nxt[i][1] !== r[1] ? '→ ' + nxt[i][1] : ''}</i></div>`).join('');
    };
    fill(opts.length === 1 ? opts[0] : null);
    const up = el('div', 's-up');
    if (!opts.length) up.append(el('div', 'max', icon('star') + 'Niveau max · Légendaire'));
    for (const o of opts) {
      const ok = g.money >= o.cost;
      const b = el('button', 'btn ' + (o.kind === 'level' ? 'green' : o.level === 5 ? '' : o.branch ? 'blue' : 'pink') + (ok ? '' : ' off'),
        `<span class="t">${icon('up')}${o.name}</span>${o.kind === 'level' ? '' : `<small>${o.desc}</small>`}<span class="price">${coin()}${o.cost}</span>`);
      b.onpointerenter = () => fill(o);
      b.onpointerleave = () => fill(opts.length === 1 ? opts[0] : null);
      b.onclick = () => { if (!g.upgradeTower(t, o)) this.haptics.pulse(1); this.cache.sheetKey = null; };
      up.append(b);
    }
    const foot = el('div', 's-foot');
    if (t.cfg.targeting) {
      const modes = el('div', 'seg');
      for (const [id, name] of TARGET_MODES) {
        const b = el('button', t.mode === id ? 'sel' : '', { first: 'Premier', last: 'Dernier', strong: 'Fort', close: 'Proche' }[id]);
        b.onclick = () => { t.mode = id; t.target = null; this.cache.sheetKey = null; };
        modes.append(b);
      }
      foot.append(modes);
    } else foot.append(el('div', 'tally', ''));
    const sell = el('button', 'btn sm red', `Vendre ${coin()}${t.sellValue}`); sell.onclick = () => g.sellTower(t);
    foot.append(sell);
    const tally = el('div', 's-foot', `<div class="tally"><span>${icon('sword')}<b class="dmg">0</b> dégâts</span><span>${icon('skull')}<b class="kills">0</b> kills</span></div>`);
    sheet.append(el('div', 'grab'), head, stats, up, foot, tally);
  }

  // ------------------------------------------------------------------ tutoriel : bulles fléchées
  updateTutorial() {
    const box = $('#tutorial'), g = this.game;
    if (this.tutStep < 0) { if (!box.hidden) box.hidden = true; return; }
    let step = TUTORIAL[this.tutStep];
    while (step && step.done(g, this)) { this.tutStep++; step = TUTORIAL[this.tutStep]; this.cache.tut = null; }
    if (!step) { this.endTutorial(); return; }
    const hide = g.paused || g.over || (step.wait && step.wait(g)) || !!g.selected;
    const target = hide ? null : step.target(this);
    if (!target) { box.hidden = true; this.cache.tut = null; return; }
    const r = target.getBoundingClientRect(), key = `${this.tutStep}|${Math.round(r.left)}|${Math.round(r.top)}`;
    if (this.cache.tut === key) return; this.cache.tut = key;
    box.hidden = false; box.innerHTML = `<span>${step.text}</span>`;
    const skip = el('button', '', 'Passer'); skip.onclick = () => this.endTutorial(); box.append(skip);
    const ring = el('i', 'tut-ring'); box.append(ring);
    const host = box.getBoundingClientRect();
    ring.style.left = r.left + r.width / 2 - host.left + 'px'; ring.style.top = r.top + r.height / 2 - host.top + 'px';
    ring.style.setProperty('--d', Math.max(58, Math.min(110, Math.max(r.width, r.height) + 16)) + 'px');
  }
  endTutorial() { this.tutStep = -1; $('#tutorial').hidden = true; this.save.data.settings.tutorialDone = true; this.save.persist(); }

  // ------------------------------------------------------------------ fin de partie
  countUp(node, to, dur = 1400) {
    const t0 = performance.now(); let lastTick = 0;
    const f = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      node.textContent = fmt(to * e);
      if (now - lastTick > 55 && k < 1) { lastTick = now; this.audio.play('tick'); }
      if (k < 1 && node.isConnected) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }
  showEnd(r) {
    const g = this.game; if (!g || g.result !== r) return;
    this.closeSheet();
    const m = el('div', 'panel glass');
    m.append(el('h2', r.victory ? 'win' : 'lose', r.victory ? 'VICTOIRE !' : r.endless ? 'FIN DE SÉRIE' : 'DÉFAITE'));
    m.append(el('p', 'sub', `${g.map.name} · ${g.endless ? 'Mode infini' : g.diff.name} · vague ${r.wavesDone}${g.endless ? '' : '/' + g.totalWaves}`));
    if (r.victory) {
      m.append(el('div', 'big-stars', [0, 1, 2].map((i) => icon('star', i < r.stars ? 'on' : '').replace('<svg', `<svg style="animation-delay:${0.5 + i * 0.4}s"`)).join('')));
      for (let i = 0; i < r.stars; i++) setTimeout(() => { this.audio.play('star'); this.haptics.pulse(1); }, 650 + i * 400);
    }
    const sb = el('div', 'score-big', '<span>Score</span><b>0</b>'); m.append(sb);
    setTimeout(() => this.countUp($('b', sb), r.score), 400);
    if (r.record) { const rec = el('div', 'record', icon('trophy') + 'NOUVEAU RECORD !'); rec.style.visibility = 'hidden'; m.append(rec); setTimeout(() => { rec.style.visibility = ''; this.audio.play('record'); this.haptics.pulse(2); }, 1900); }
    else if (r.previous) m.append(el('p', 'sub', `Record : ${fmt(r.previous)}`));
    m.append(el('div', 'earned', `+${r.gems}${gem()}`));
    const s = g.stats;
    m.append(el('div', 'end-stats', [['Kills', fmt(s.kills)], ['Dégâts', short(s.damage)], ['Pièces', short(s.earned)], ['PV restants', `${g.lives}/${g.maxLives}`], ['Tourelles', s.built], ['Boss vaincus', s.bossKills]].map(([k, v]) => `<div><b>${v}</b>${k}</div>`).join('')));
    const by = Object.entries(s.dmgByType).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (by.length) {
      const bars = el('div', 'bars');
      for (const [type, v] of by) { const row = el('div', 'bar', `<div><i data-w="${(v / by[0][1]) * 100}"></i></div><span>${short(v)}</span>`); row.prepend(towerImg(type, 26, this.save.data.skin)); bars.append(row); }
      m.append(bars);
      setTimeout(() => $$('i[data-w]', bars).forEach((i) => (i.style.width = i.dataset.w + '%')), 60);
    }
    if (r.best && r.best.dmg > 0) {
      const mvp = el('div', 'mvp', `<div><b>MVP · ${r.best.label}</b>${short(r.best.dmg)} dégâts · ${r.best.kills} kills</div>`);
      mvp.prepend(towerImg(r.best.type, 48, this.save.data.skin, r.best.level, r.best.branch)); m.append(mvp);
    }
    if (r.victory && !g.endless) {
      const nextMap = MAPS.find((mp) => mp.unlock === g.map.id);
      m.append(el('p', 'sub', (nextMap ? `Carte « ${nextMap.name} » débloquée · ` : '') + 'Mode infini disponible'));
    }
    const btns = el('div', 'btns');
    const again = el('button', 'btn primary big', icon('restart') + 'Rejouer'); again.onclick = () => this.startGame(...this.lastArgs);
    const share = el('button', 'btn pink', icon('share') + 'Partager mon score'); share.onclick = () => this.shareScore(r);
    const row = el('div', 'btn-row');
    const maps = el('button', 'btn ghost', icon('map') + 'Cartes'); maps.onclick = () => { this.game = null; this.show('maps'); };
    const shop = el('button', 'btn ghost', icon('cart') + 'Boutique'); shop.onclick = () => { this.game = null; this.show('shop'); };
    row.append(maps, shop); btns.append(again, share, row); m.append(btns);
    if (r.achievements && r.achievements.length) btns.before(el('div', 'unlocks', r.achievements.map((a) => `<div>${icon('medal')}<span><b>Succès : ${a.name}</b>${a.desc}</span><span>+${a.gems}${gem()}</span></div>`).join('')));
    this.openOverlay(m);
    this.refreshGems();
    this.prepareShare(r);
  }

  // Image de score générée à l'avance (navigator.share doit partir directement du toucher)
  prepareShare(r) {
    const g = this.game, c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    const x = c.getContext('2d'), F = (px) => `700 ${px}px Fredoka, ui-rounded, system-ui, sans-serif`;
    const bg = x.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#4a348a'); bg.addColorStop(1, '#1c1530'); x.fillStyle = bg; x.fillRect(0, 0, 1080, 1350);
    for (const [cx, cy, col] of [[120, 160, '#ff5d8f'], [980, 420, '#5c9df2'], [140, 1180, '#3fd873'], [960, 1120, '#ffb224']]) { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, 420); rg.addColorStop(0, col + '88'); rg.addColorStop(1, col + '00'); x.fillStyle = rg; x.fillRect(0, 0, 1080, 1350); }
    const text = (t, y, px, col, lw = 22) => { x.font = F(px); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = lw; x.strokeStyle = '#3d2c4e'; x.strokeText(t, 540, y); x.fillStyle = col; x.fillText(t, 540, y); };
    text('BRAINROT', 170, 150, '#ffd23f', 30); text('BASTION', 300, 150, '#ff5d8f', 30);
    text(`${g.map.name} · ${g.endless ? 'Mode infini' : g.diff.name}`, 430, 52, '#fff', 14);
    text(r.victory ? 'VICTOIRE !' : `Vague ${r.wavesDone}`, 520, 70, r.victory ? '#8dffae' : '#ffb3c4', 16);
    text(fmt(r.score), 700, 210, '#fff', 34); text('POINTS', 840, 54, '#c5b5dc', 12);
    if (r.victory) for (let i = 0; i < 3; i++) { x.save(); x.translate(400 + i * 140, 950); x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? 26 : 58; x.lineTo(Math.cos(a) * q, Math.sin(a) * q); } x.closePath(); x.lineWidth = 12; x.strokeStyle = '#3d2c4e'; x.stroke(); x.fillStyle = i < r.stars ? '#ffd23f' : 'rgba(255,255,255,.2)'; x.fill(); x.restore(); }
    if (r.record) text('NOUVEAU RECORD !', 1040, 56, '#ffd23f', 14);
    const draw = (cv, cx, cy, size) => { if (cv) x.drawImage(cv, cx - size / 2, cy - size / 2, size, size); };
    ['basic', 'tank', 'armored', 'healer'].forEach((t, i) => draw(enemyFrames(t).frames[0][0].cv, 170 + i * 150, 1190, 190));
    const best = r.best || { type: 'assault', level: 1, branch: null };
    draw(towerSprite(best.type, best.level, best.branch, skinFinish(this.save.data.skin)).cv, 900, 1180, 330);
    text(location.host + location.pathname.replace(/index\.html$/, ''), 1300, 34, '#c5b5dc', 8);
    this.shareFile = null; this.shareCanvas = c;
    c.toBlob((b) => { if (b) this.shareFile = new File([b], 'brainrot-td-score.png', { type: 'image/png' }); }, 'image/png');
  }
  async shareScore(r) {
    const g = this.game, url = location.origin + location.pathname;
    const text = `J'ai marqué ${fmt(r.score)} points sur Brainrot TD (${g.map.name}, ${g.endless ? 'mode infini' : g.diff.name}) ! Tu fais mieux ?`;
    try {
      if (this.shareFile && navigator.canShare && navigator.canShare({ files: [this.shareFile] })) { await navigator.share({ files: [this.shareFile], title: 'Brainrot TD', text: text + ' ' + url }); return; }
      if (navigator.share) { await navigator.share({ title: 'Brainrot TD', text, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (this.shareFile) { const a = document.createElement('a'); a.href = URL.createObjectURL(this.shareFile); a.download = this.shareFile.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    try { await navigator.clipboard.writeText(text + ' ' + url); this.toast('Image enregistrée', 'Texte et lien copiés dans le presse-papier', icon('share')); }
    catch (e) { this.toast('Image du score enregistrée', '', icon('share')); }
  }
}
