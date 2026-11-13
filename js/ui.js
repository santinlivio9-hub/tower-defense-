// Interface : écrans (menu, cartes, boutique, paramètres), HUD, barre de tourelles,
// feuille d'amélioration, tutoriel, pause, fin de partie, partage, entrées tactile / souris / clavier.
import { VIEW, TOWERS, ENEMIES, RARITY, SHOP, ACHIEVEMENTS, LEVELS, WORLDS } from './config.js';
import { Meta } from './meta.js';
import { Hub } from './hub.js';
import { Loot } from './loot.js';
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
  { text: 'Touche un <b>socle</b>', target: (ui) => { const sl = ui.game.slots.find((s) => s.kind === 'tower'); return ui.fieldPoint(sl.x, sl.y); }, done: (g) => !!g.menuSlot || g.towers.length > 0 },
  { text: 'Choisis une tourelle, puis <b>touche-la encore</b>', target: () => $('#radial .rb'), done: (g) => g.towers.length > 0, keep: true },
  { text: '<b>Lance la vague !</b>', target: () => $('#btn-wave'), done: (g) => g.wave >= 1 },
  { text: 'Touche ta tourelle pour l\'<b>améliorer</b>', target: (ui) => { const t = ui.game.towers[0]; return t ? ui.fieldPoint(t.x, t.y) : null; }, wait: (g) => g.cleared < 1 || !g.towers.some((t) => t.canUp), done: (g) => (!!g.menuSlot && !!g.menuSlot.tower) || g.wave >= 4 },
];

export class UI {
  constructor(save, audio) {
    this.save = save; this.audio = audio; this.game = null;
    this.haptics = new Haptics(save.data.settings, audio);
    this.shopTab = 'skins';
    this.canvas = $('#game'); this.cache = {}; this.last = 0; this.simulating = false;
    this.down = null; this.armed = null; this.tutStep = -1; this.flying = 0; this.shown = { money: 0, score: 0 };

    hydrateIcons();
    preloadSprites(save.data.skin);
    document.addEventListener('pointerdown', (e) => {
      this.audio.unlock();
      if (e.target.closest('.btn, .icon-btn, .seg button, .switch, .rb')) { this.audio.play('click'); this.haptics.pulse(0); }
    }, { capture: true });
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => this.show(b.dataset.go)));
    $$('#shop-tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { this.shopTab = b.dataset.tab; this.renderShop(); }));
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    this.bindGameInput();
    $('#btn-endless').onclick = () => this.openEndless();

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
    if (name === 'menu') { if (this.renderMenu) this.renderMenu(); this.showNotice(); }
    if (name === 'world') this.renderWorld();
    if (this.renderMeta) this.renderMeta(name);
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
    if (this.shopTab === 'boosts' && this.renderBoostShop) this.renderBoostShop(grid, price, owned);
    else if (this.shopTab === 'skins') {      for (const s of SHOP.skins) {
        const has = d.skins.includes(s.id), on = d.skin === s.id;
        const card = el('div', 'card' + (on ? ' done' : ''));
        const art = el('div', 'art multi'); art.append(towerImg('assault', 62, s.id, 3), towerImg('shotgun', 62, s.id, 4, 0));
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
    box.append(this.switchRow('Indicateurs', 'Flèche UP et socles achetables', 'up', 'hints'));
    const tut = el('div', 'setting', `<span class="lab">${icon('book')}<span>Tutoriel<small>Le revoir à la prochaine partie</small></span></span>`);
    const tb = el('button', 'btn sm ghost', 'Revoir'); tb.onclick = () => { s.tutorialDone = false; this.save.persist(); this.toast('Tutoriel réactivé', '', icon('book')); }; tut.append(tb); box.append(tut);
    const rs = el('div', 'setting', `<span class="lab">${icon('trash')}<span>Réinitialiser<small>Efface toute la progression</small></span></span>`);
    const rb = el('button', 'btn sm red', 'Effacer');
    rb.onclick = () => { if (confirm('Effacer toute la progression (gemmes, déblocages, étoiles, records) ?')) { this.save.reset(); this.audio.settings = this.haptics.settings = this.save.data.settings; this.audio.applyVolume(); this.renderSettings(); this.toast('Progression effacée', '', icon('trash')); } };
    rs.append(rb); box.append(rs);
    box.append(el('p', 'hint', 'Astuce : ajoute le jeu à ton écran d\'accueil (Partager → « Sur l\'écran d\'accueil ») pour y jouer en plein écran et hors ligne.<br>Clavier : 1-8 choix du menu · Espace vague · P pause · Échap fermer.'));
  }
  syncMute() { $('#btn-mute').innerHTML = icon(this.save.data.settings.muted ? 'mute' : 'sound'); }

  // ------------------------------------------------------------------ partie
  startGame(n, heroic = false, endless = false, boosts = []) {
    if (this.game) this.game.commit();
    const g = (this.game = new Game({ canvas: this.canvas, level: LEVELS[n - 1], heroic, endless, save: this.save, audio: this.audio, boosts }));
    this.lastArgs = [n, heroic, endless];
    this.cache = {}; this.armed = null; this.shown = { money: g.money, score: 0 }; this.aiming = null;
    g.onEvent = (name, data) => this.onGameEvent(name, data);
    this.closeOverlay(); this.closeMenu();
    this.syncMute(); if (this.buildDock) this.buildDock();
    $('#btn-speed b').textContent = 'x1'; $('#hud-money b').textContent = short(g.money); $('#hud-score b').textContent = '0';
    this.show('game');
    this.tutStep = this.save.data.settings.tutorialDone ? -1 : 0; this.cache.tut = null;
    if (g.heroic) this.toast('Défi héroïque : ' + g.heroic.name, g.heroic.desc, icon('crown'));
    window.__game = g; // pratique pour le débogage / l'équilibrage en console
  }
  // Rejouer : on reprend les mêmes boosts s'il en reste
  replay() { const [n, h, e] = this.lastArgs; this.startGame(n, h, e, this.loadoutFor ? this.loadoutFor(LEVELS[n - 1]) : []); }
  levelLabel(g = this.game) { return g.endless ? `Mode infini · ${g.world.name}` : `${g.heroic ? 'Héroïque' : 'Niveau'} ${g.level.id} · ${g.world.name}`; }
  quitGame() {
    if (this.game) { this.game.commit(); this.announce(this.save.checkAchievements()); }
    this.game = null; this.show('world');
  }
  onGameEvent(name, data) {
    if (name === 'end') setTimeout(() => this.showEnd(data), data.victory ? 1700 : 1100);
    else if (name === 'upgraded' || name === 'placed') { this.cache.radial = null; this.haptics.pulse(name === 'upgraded' ? 2 : 1); }
    else if (name === 'coins') this.flyCoins(data);
    else if (name === 'haptic') { if (!this.simulating) this.haptics.pulse(data); }
    else if (name === 'combo') { this.audio.play('combo'); const s = $('#hud-score'); s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); }
    else if (name === 'intro' && !this.simulating) this.showIntro(data.map((id) => ({ kind: 'enemy', id })));
    else if ((name === 'ability' || name === 'boost') && this.buildDock) this.cache.dock = null;
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

  // ------------------------------------------------------------------ menu radial d'un emplacement
  openMenu(slot) {
    const g = this.game; if (!g || g.over) return;
    if (slot !== g.menuSlot) this.audio.play('sheet');
    g.menuSlot = slot; g.selected = slot ? slot.tower : null; g.preview = null; this.armed = null; this.cache.radial = null;
    if (!slot) this.renderRadial();
  }
  closeMenu() { const g = this.game; if (g) { g.menuSlot = null; g.selected = null; g.preview = null; } this.armed = null; this.cache.radial = null; $('#radial').hidden = true; }
  statLine(type, s) { return this.statRows(type, s).map((r) => `${r[0]} <b>${r[1]}</b>`).join(' · '); }
  // Éléments du menu : { key, cls, art, label, price, info, preview, tap (immédiat) ou confirm (2e toucher) }
  menuItems(slot) {
    const g = this.game, t = slot.tower, skin = this.save.data.skin, items = [];
    if (!t) {
      for (const type of g.buildable(slot)) {
        const cfg = TOWERS[type], cost = g.costOf(type), st = computeStats(type, 1, null, g.mods);
        items.push({ key: type, cls: g.money < cost ? 'poor' : '', art: towerImg(type, 46, skin), price: cost, free: cost === 0,
          info: `<b>${cfg.name}</b><span>${cfg.desc}</span><small>${this.statLine(type, st)}</small>`,
          preview: { r: type === 'mine' ? st.splash : st.range, mode: g.money < cost ? 'bad' : 'ok' },
          confirm: () => { if (g.placeTower(type, slot)) this.openMenu(null); else this.haptics.pulse(1); } });
      }
      return items;
    }
    const cur = this.statRows(t.type, t.stats);
    for (const o of t.upgradeOptions()) {
      const ns = computeStats(t.type, o.level, o.branch, g.mods), nxt = this.statRows(t.type, ns);
      const diff = cur.map((r, i) => (nxt[i][1] !== r[1] ? `${r[0]} <b>${r[1]}</b> → <b class="g">${nxt[i][1]}</b>` : null)).filter(Boolean).join(' · ');
      items.push({ key: 'up' + (o.branch ?? ''), cls: 'up' + (o.kind === 'level' ? '' : ' branch') + (g.money < o.cost ? ' poor' : ''),
        art: o.kind === 'level' ? icon('up') : towerImg(t.type, 46, skin, o.level, o.branch), label: o.kind === 'level' ? 'Niv. ' + o.level : o.name, price: o.cost,
        info: `<b>${o.kind === 'level' ? 'Améliorer au niveau ' + o.level : o.name}</b>${o.kind === 'level' ? '' : `<span>${o.desc}</span>`}<small>${diff}</small>`,
        preview: { r: t.type === 'mine' ? ns.splash : ns.range, mode: g.money < o.cost ? 'bad' : 'ok' },
        confirm: () => { if (!g.upgradeTower(t, o)) this.haptics.pulse(1); this.armed = null; this.cache.radial = null; } });
    }
    if (t.cfg.targeting) {
      const names = { first: 'Premier', last: 'Dernier', strong: 'Fort', close: 'Proche' };
      items.push({ key: 'tgt', cls: 'tgt', art: icon('target'), label: names[t.mode], side: 'left',
        tap: () => { const ids = TARGET_MODES.map((m) => m[0]); t.mode = ids[(ids.indexOf(t.mode) + 1) % ids.length]; t.target = null; this.cache.radial = null; } });
    }
    items.push({ key: 'sell', cls: 'sell', art: icon('trash'), label: 'Vendre', gain: t.sellValue, side: 'bottom',
      info: `<b>Vendre pour ${t.sellValue} pièces ?</b><small>Touche encore pour confirmer</small>`,
      confirm: () => { g.sellTower(t); this.openMenu(null); } });
    return items;
  }
  renderRadial() {
    const g = this.game, box = $('#radial'), slot = g && g.menuSlot;
    if (!slot || g.over) { box.hidden = true; box.innerHTML = ''; return; }
    const items = this.menuItems(slot), t = slot.tower;
    box.hidden = false; box.innerHTML = '';
    const host = box.getBoundingClientRect(), p = this.toScreen(slot.x, slot.y);
    const n = items.length, R = !t && n >= 7 ? 88 : !t && n >= 5 ? 80 : 74;
    const top = $('#hud').offsetHeight + 46, bot = host.height - $('#dock').offsetHeight - 30;
    const cx = Math.max(R + 36, Math.min(host.width - R - 36, p.x - host.left)), cy = Math.max(top + R, Math.min(bot - R, p.y - host.top));
    const ring = el('i', 'ring'); ring.style.cssText = `left:${cx}px;top:${cy}px;--r:${R}px`; box.append(ring);
    // angles : tourelles en cercle ; pour une tourelle posée : améliorations en haut, ciblage à gauche, vente en bas
    const ups = items.filter((i) => !i.side);
    items.forEach((it, i) => {
      let a;
      if (!t) a = -90 + (360 / Math.max(n, 1)) * i + (n === 2 ? 0 : 0);
      else if (it.side === 'left') a = 180; else if (it.side === 'bottom') a = 90;
      else a = ups.length === 1 ? -90 : ups.indexOf(it) === 0 ? -128 : -52;
      if (!t && n === 1) a = -90;
      const b = el('button', 'rb ' + (it.cls || '') + (this.armed === it.key ? ' armed' : ''));
      b.style.cssText = `left:${cx + Math.cos((a * Math.PI) / 180) * R}px;top:${cy + Math.sin((a * Math.PI) / 180) * R}px;--i:${i}`;
      if (typeof it.art === 'string') b.innerHTML = it.art; else b.append(it.art);
      if (it.label) b.append(el('span', 'lab', it.label));
      if (it.price != null) b.append(el('span', 'price', it.free ? 'GRATUIT' : coin() + it.price));
      if (it.gain != null) b.append(el('span', 'price gain', '+' + it.gain + coin()));
      if (this.armed === it.key) b.append(el('span', 'ok', icon('check')));
      b.onclick = () => {
        if (it.tap) { it.tap(); return; }
        if (this.armed === it.key) { it.confirm(); return; }
        this.armed = it.key; g.preview = it.preview || null; this.cache.radial = null; this.audio.play('tick');
      };
      box.append(b);
    });
    // bulle d'information
    const armed = items.find((i) => i.key === this.armed);
    let html;
    if (armed && armed.info) html = armed.info + (armed.key === 'sell' ? '' : '<em>Touche encore pour confirmer</em>');
    else if (t) { const rar = RARITY[t.level - 1]; html = `<b style="color:${rar.color}">${t.label}</b><span class="lv">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= t.level ? 'on' : ''}" style="--rar:${rar.color}"></i>`).join('')}</span><small>${this.statLine(t.type, t.stats)}</small><small>${icon('sword')}<b class="dmg">${short(t.dmg)}</b> dégâts · ${icon('skull')}<b class="kills">${t.kills}</b> kills</small>`; }
    else html = slot.kind === 'mine' ? '<b>Zone de mine</b>' : '<b>Choisis une tourelle</b>';
    const info = el('div', 'info', html); box.append(info);
    const ih = info.offsetHeight, above = cy - R - 44 - ih >= top - 44;
    info.style.left = Math.max(info.offsetWidth / 2 + 6, Math.min(host.width - info.offsetWidth / 2 - 6, cx)) + 'px';
    info.style.top = (above ? cy - R - 44 - ih : cy + R + 48) + 'px';
  }
  updateRadial() {
    const g = this.game, slot = g.menuSlot;
    if (!slot || g.over) { if (!$('#radial').hidden) { $('#radial').hidden = true; g.menuSlot = null; } return; }
    const t = slot.tower;
    const key = [g.slots.indexOf(slot), t ? t.level + '|' + t.branch + '|' + t.mode : '', this.armed, this.menuItems(slot).map((i) => i.cls).join(), g.freeNext].join('/');
    if (this.cache.radial !== key) { this.cache.radial = key; this.renderRadial(); }
    else if (t) { const d = $('#radial .dmg'), k = $('#radial .kills'); if (d) { d.textContent = short(t.dmg); k.textContent = t.kills; } }
  }

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
  bindGameInput() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => { const g = this.game; if (!g || g.over || e.button === 2) return; this.down = this.toLogical(e); });
    cv.addEventListener('pointerup', (e) => {
      const g = this.game; if (!g || !this.down) return; this.down = null; const p = this.toLogical(e);
      if (g.paused) return;
      if (this.aiming) { const id = this.aiming; this.aiming = null; this.cache.dock = null; if (p.y > -40 && g.useAbility(id, p.x, p.y)) this.haptics.pulse(2); return; }   // cible d'une capacité
      const slot = g.slotAt(p.x, p.y);
      this.openMenu(slot && slot !== g.menuSlot ? slot : null);
    });
    cv.addEventListener('contextmenu', (e) => { e.preventDefault(); this.openMenu(null); });
    window.addEventListener('pointercancel', () => { this.down = null; });

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
    const n = parseInt(e.key, 10), btns = $$('#radial .rb');
    if (n >= 1 && n <= btns.length) btns[n - 1].click();
    else if (e.code === 'Space') { e.preventDefault(); g.startNextWave(true); }
    else if (e.code === 'Escape') { if (this.aiming) this.aiming = null; else if (g.menuSlot) this.openMenu(null); else this.togglePause(); }
  }
  togglePause() {
    const g = this.game; if (!g || g.over || this.introOpen) return;
    g.paused = !g.paused;
    if (!g.paused) { this.closeOverlay(); return; }
    this.closeMenu(); this.aiming = null;
    const m = el('div', 'panel glass', `<h2 class="win">PAUSE</h2><p class="sub">${this.levelLabel()} · vague ${g.wave}${g.endless ? '' : '/' + g.totalWaves}</p>
      <div class="score-big"><span>Score</span><b>${fmt(g.score)}</b></div>`);
    const btns = el('div', 'btns');
    const b1 = el('button', 'btn primary big', icon('play') + 'Reprendre'); b1.onclick = () => this.togglePause();
    const row = el('div', 'btn-row');
    const b2 = el('button', 'btn ghost', icon('restart') + 'Rejouer'); b2.onclick = () => this.replay();
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
    else if (this.screen === 'castle') this.tickCastle(ts);
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
    this.set('wave', g.wave, (v) => ($('#hud-wave b').textContent = g.endless ? String(v) : `${v}/${g.totalWaves}`));

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
    this.updateRadial();
    if (this.updateDock) this.updateDock();
    this.updateTutorial();
  }

  // ------------------------------------------------------------------ stats affichées
  statRows(type, s) {
    const mult = (s.pellets ? '×' + s.pellets : '') + (s.barrels > 1 ? '×' + s.barrels : '');
    const rows = [['Dégâts', num(s.damage) + mult]];
    if (type === 'mine') return rows.concat([['Recharge', (1 / s.rate).toFixed(1) + ' s'], ['Zone', num(s.splash)], ['Étourdit', s.stun ? s.stun.toFixed(1) + ' s' : '—']]);
    rows.push(['Cadence', s.rate.toFixed(1) + '/s'], ['Portée', num(s.range)]);
    rows.push(type === 'cryo' ? ['Ralenti', Math.round(s.slow * 100) + ' %'] : ['DPS', num(dpsOf(s))]);
    return rows;
  }

  // ------------------------------------------------------------------ tutoriel : bulles fléchées
  updateTutorial() {
    const box = $('#tutorial'), g = this.game;
    if (this.tutStep < 0) { if (!box.hidden) box.hidden = true; return; }
    let step = TUTORIAL[this.tutStep];
    while (step && step.done(g, this)) { this.tutStep++; step = TUTORIAL[this.tutStep]; this.cache.tut = null; }
    if (!step) { this.endTutorial(); return; }
    const hide = g.paused || g.over || (step.wait && step.wait(g)) || (!!g.menuSlot && !step.keep);
    const target = hide ? null : step.target(this);
    if (!target) { box.hidden = true; this.cache.tut = null; return; }
    const r = target.getBoundingClientRect(), key = `${this.tutStep}|${Math.round(r.left)}|${Math.round(r.top)}`;
    if (this.cache.tut === key) return; this.cache.tut = key;
    box.hidden = false; box.innerHTML = `<span>${step.text}</span>`;
    const skip = el('button', '', 'Passer'); skip.onclick = () => this.endTutorial(); box.append(skip);
    const ring = el('i', 'tut-ring'); box.append(ring);
    // le bandeau se place en bas quand la cible est dans le haut de l'écran : il ne recouvre jamais ce qu'il montre
    const sg = $('#screen-game').getBoundingClientRect();
    box.classList.toggle('low', r.top - sg.top < sg.height * 0.42);
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
    this.closeMenu(); this.aiming = null;
    if (r.towers && r.towers.length && !r._introDone) { r._introDone = true; this.showIntro(r.towers.map((id) => ({ kind: 'tower', id })), () => this.showEnd(r)); return; }
    const m = el('div', 'panel glass');
    m.append(el('h2', r.victory ? 'win' : 'lose', r.victory ? (g.level.boss ? 'BOSS VAINCU !' : 'VICTOIRE !') : r.endless ? 'FIN DE SÉRIE' : 'DÉFAITE'));
    m.append(el('p', 'sub', `${this.levelLabel(g)} · vague ${r.wavesDone}${g.endless ? '' : '/' + g.totalWaves}`));
    if (r.victory) {
      m.append(el('div', 'big-stars', [0, 1, 2].map((i) => icon('star', i < r.stars ? 'on' : '').replace('<svg', `<svg style="animation-delay:${0.5 + i * 0.4}s"`)).join('')));
      for (let i = 0; i < r.stars; i++) setTimeout(() => { this.audio.play('star'); this.haptics.pulse(1); }, 650 + i * 400);
    }
    const sb = el('div', 'score-big', '<span>Score</span><b>0</b>'); m.append(sb);
    setTimeout(() => this.countUp($('b', sb), r.score), 400);
    if (r.record) { const rec = el('div', 'record', icon('trophy') + 'NOUVEAU RECORD !'); rec.style.visibility = 'hidden'; m.append(rec); setTimeout(() => { rec.style.visibility = ''; this.audio.play('record'); this.haptics.pulse(2); }, 1900); }
    else if (r.previous) m.append(el('p', 'sub', `Record : ${fmt(r.previous)}`));
    if (r.endless && r.rank != null && r.rank >= 0) m.append(el('p', 'sub', `Classement local : <b>n° ${r.rank + 1}</b>`));
    m.append(el('div', 'earned', `<span>+${r.gems}${gem()}</span><span class="xp">+${r.xp} XP</span>`));
    if (this.xpBlock) m.append(this.xpBlock(r));
    const s = g.stats;
    m.append(el('div', 'end-stats', [['Kills', fmt(s.kills)], ['Dégâts', short(s.damage)], ['Pièces', short(s.earned)], ['PV restants', `${g.lives}/${g.maxLives}`], ['Tourelles', s.built], ['Boss vaincus', s.bossKills]].map(([k, v]) => `<div><b>${v}</b>${k}</div>`).join('')));
    const by = Object.entries(s.dmgByType).sort((a, b) => b[1] - a[1]).slice(0, 4);
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
    const lines = [];
    for (const t of r.rewards || []) lines.push(`${icon('gift')}<span><b>${t}</b>Récompense de première victoire</span>`);
    for (const t of r.towers || []) lines.push(`${icon('plus')}<span><b>${TOWERS[t].name}</b>Nouvelle tourelle débloquée</span>`);
    for (const u of r.levelUps || []) lines.push(`${icon('up')}<span><b>Niveau de joueur ${u.level}</b>${u.text}</span>`);
    if (r.firstClear && !g.heroic) lines.push(`${icon('crown')}<span><b>Défi Héroïque débloqué</b>Plus dur, récompenses doublées</span>`);
    if (r.victory && !g.heroic && g.level.n === 12 && r.firstClear) lines.push(`${icon('infinity')}<span><b>Mode infini débloqué</b>Avec classement local</span>`);
    for (const a of r.achievements || []) lines.push(`${icon('medal')}<span><b>Succès : ${a.name}</b>${a.desc}</span><span>+${a.gems}${gem()}</span>`);
    if (lines.length) m.append(el('div', 'unlocks', lines.map((l) => `<div>${l}</div>`).join('')));
    const btns = el('div', 'btns');
    const nextN = g.level.n + 1, canNext = r.victory && !g.endless && !g.heroic && nextN <= LEVELS.length;
    if (canNext) { const nx = el('button', 'btn primary big', icon('play') + 'Niveau suivant'); nx.onclick = () => { this.game = null; this.show('world'); this.openPrep(nextN); }; btns.append(nx); }
    const again = el('button', 'btn ' + (canNext ? 'ghost' : 'primary big'), icon('restart') + 'Rejouer'); again.onclick = () => this.replay();
    const share = el('button', 'btn pink', icon('share') + 'Partager mon score'); share.onclick = () => this.shareScore(r);
    const row = el('div', 'btn-row');
    const maps = el('button', 'btn ghost', icon('map') + 'Carte'); maps.onclick = () => { this.game = null; this.show('world'); };
    const home = el('button', 'btn ghost', icon('home') + 'Menu'); home.onclick = () => { this.game = null; this.show('menu'); };
    row.append(maps, home); btns.append(again, share, row); m.append(btns);
    this.openOverlay(m);
    this.refreshGems();
    this.prepareShare(r);
    if (this.afterEnd) this.afterEnd(r);
  }

  // Image de score générée à l'avance (navigator.share doit partir directement du toucher)
  prepareShare(r) {
    const g = this.game, c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    const x = c.getContext('2d'), F = (px) => `700 ${px}px Fredoka, ui-rounded, system-ui, sans-serif`;
    const bg = x.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#4a348a'); bg.addColorStop(1, '#1c1530'); x.fillStyle = bg; x.fillRect(0, 0, 1080, 1350);
    for (const [cx, cy, col] of [[120, 160, '#ff5d8f'], [980, 420, '#5c9df2'], [140, 1180, '#3fd873'], [960, 1120, '#ffb224']]) { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, 420); rg.addColorStop(0, col + '88'); rg.addColorStop(1, col + '00'); x.fillStyle = rg; x.fillRect(0, 0, 1080, 1350); }
    const text = (t, y, px, col, lw = 22) => { x.font = F(px); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = lw; x.strokeStyle = '#3d2c4e'; x.strokeText(t, 540, y); x.fillStyle = col; x.fillText(t, 540, y); };
    text('BRAINROT', 170, 150, '#ffd23f', 30); text('BASTION', 300, 150, '#ff5d8f', 30);
    text(this.levelLabel(g), 430, 46, '#fff', 14);
    text(r.victory ? 'VICTOIRE !' : `Vague ${r.wavesDone}`, 520, 70, r.victory ? '#8dffae' : '#ffb3c4', 16);
    text(fmt(r.score), 700, 210, '#fff', 34); text('POINTS', 840, 54, '#c5b5dc', 12);
    if (r.victory) for (let i = 0; i < 3; i++) { x.save(); x.translate(400 + i * 140, 950); x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? 26 : 58; x.lineTo(Math.cos(a) * q, Math.sin(a) * q); } x.closePath(); x.lineWidth = 12; x.strokeStyle = '#3d2c4e'; x.stroke(); x.fillStyle = i < r.stars ? '#ffd23f' : 'rgba(255,255,255,.2)'; x.fill(); x.restore(); }
    if (r.record) text('NOUVEAU RECORD !', 1040, 56, '#ffd23f', 14);
    const draw = (cv, cx, cy, size) => { if (cv) x.drawImage(cv, cx - size / 2, cy - size / 2, size, size); };
    ['basic', 'tank', 'armored', 'healer'].forEach((t, i) => draw(enemyFrames(t).frames[0][0].cv, 150 + i * 140, 1190, 180));
    const best = r.best || { type: 'assault', level: 1, branch: null };
    const bs = towerSprite(best.type, best.level, best.branch, skinFinish(this.save.data.skin));
    if (bs.base) draw(bs.base.cv, 900, 1180, 330); draw(bs.head.cv, 900, 1180, 330);
    text(location.host + location.pathname.replace(/index\.html$/, ''), 1300, 34, '#c5b5dc', 8);
    this.shareFile = null; this.shareCanvas = c;
    c.toBlob((b) => { if (b) this.shareFile = new File([b], 'brainrot-td-score.png', { type: 'image/png' }); }, 'image/png');
  }
  async shareScore(r) {
    const g = this.game, url = location.origin + location.pathname;
    const text = `J'ai marqué ${fmt(r.score)} points sur Brainrot TD (${this.levelLabel(g)}) ! Tu fais mieux ?`;
    try {
      if (this.shareFile && navigator.canShare && navigator.canShare({ files: [this.shareFile] })) { await navigator.share({ files: [this.shareFile], title: 'Brainrot TD', text: text + ' ' + url }); return; }
      if (navigator.share) { await navigator.share({ title: 'Brainrot TD', text, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (this.shareFile) { const a = document.createElement('a'); a.href = URL.createObjectURL(this.shareFile); a.download = this.shareFile.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    try { await navigator.clipboard.writeText(text + ' ' + url); this.toast('Image enregistrée', 'Texte et lien copiés dans le presse-papier', icon('share')); }
    catch (e) { this.toast('Image du score enregistrée', '', icon('share')); }
  }
}
Object.assign(UI.prototype, Meta, Hub, Loot);
