// Hub de jeu mobile : barre de ressources, barre d'onglets (avec badges), accueil animé
// (château au centre), écran Château, et capacités en partie. Méthodes ajoutées à la classe UI.
import { CASTLE, TABS, LEVELS, WORLDS, XP, BOOSTS } from './config.js';
import { drawCastle, CASTLE_LOOKS } from './castle.js';
import { enemyFrames } from './sprites.js';
import { icon, coin, gem } from './icons.js';
import { chestSvg } from './loot.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const pips = (n, max) => `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
const cur = (c) => (c === 'coins' ? coin() : gem());
const WALKERS = ['basic', 'fast', 'tank', 'flying', 'armored', 'healer', 'splitter'];

export const Hub = {
  renderMeta(name) {
    if (name === 'menu') this.renderHome();
    if (name === 'castle') this.renderCastle();
    if (name === 'talents' && this.renderTalents) this.renderTalents();
    if (name === 'collection' && this.renderCollection) this.renderCollection();
  },

  // ------------------------------------------------------------------ ressources et onglets
  refreshWallet() {
    const d = this.save.data;
    $$('.gems').forEach((g) => (g.textContent = fmt(d.gems)));
    $$('.coins').forEach((g) => (g.textContent = fmt(d.coins || 0)));
    const need = XP.need(d.level);
    $('#resbar .lvl').textContent = d.level;
    $('#resbar .xpbar i').style.width = (d.xp / need) * 100 + '%';
    $('#resbar .xpbar b').textContent = `${d.xp} / ${need}`;
  },
  buildTabbar() {
    const bar = $('#tabbar'); bar.innerHTML = '';
    for (const t of TABS) {
      const b = el('button', 'tab tab-' + t.id, `<span class="ti">${icon(t.icon)}</span><small>${t.label}</small><em hidden></em>`);
      b.dataset.go = t.id; b.onclick = () => { if (this.screen !== t.id) { this.audio.play('click'); this.haptics.pulse(0); this.show(t.id); } };
      bar.append(b);
    }
  },
  // Badges rouges : quelque chose à faire dans l'onglet
  tabBadges() {
    const sv = this.save, d = sv.data, set = (id, v) => { const e = $(`#tabbar .tab-${id} em`); if (!e) return; e.hidden = !v; e.textContent = v === true ? '!' : v; };
    set('talents', d.talentPts || 0);
    set('shop', (d.chests.wood + d.chests.gold) || (this.dailyBadge ? this.dailyBadge('shop') : 0));
    set('castle', this.castleAffordable() ? true : 0);
    set('collection', sv.collectionNew() ? true : 0);
    set('menu', this.dailyBadge ? this.dailyBadge('menu') : 0);
  },
  castleAffordable() {
    const cs = this.save.data.castle, c = this.save.data.coins || 0;
    return [...Object.entries(CASTLE.upgrades), ...Object.entries(CASTLE.abilities)].some(([id, u]) => cs[id] < u.costs.length && u.costs[cs[id]] <= c);
  },
  // Bouton d'achat (pièces ou gemmes)
  buyButton(cost, currency, label, fn, cls = '') {
    const d = this.save.data;
    const b = el('button', 'btn sm ' + cls + (d[currency] < cost ? ' off' : ''), `${label}${label ? ' ' : ''}${cur(currency)}${fmt(cost)}`);
    b.onclick = (e) => {
      if (!this.save.spend(cost, currency)) { this.audio.play('error'); this.toast(currency === 'coins' ? 'Pas assez de pièces' : 'Pas assez de gemmes', 'Joue des niveaux pour en gagner', cur(currency)); return; }
      const r = fn(e); this.save.persist(); this.audio.play('buy'); this.haptics.pulse(1); this.announce(this.save.checkAchievements());
      if (r !== false) this.show(this.screen, true);
    };
    return b;
  },
  gemButton(cost, label, fn, cls = '') { return this.buyButton(cost, 'gems', label, fn, cls); },

  // ------------------------------------------------------------------ accueil
  nextLevel() { const p = this.save.progress(); return LEVELS[Math.min(LEVELS.length - 1, p)]; },
  renderHome() {
    const L = this.nextLevel(), w = WORLDS[L.world];
    $('#play-sub').textContent = `${L.boss ? 'Boss' : 'Niveau'} ${L.id} · ${w.name}`;
    $('#btn-play').onclick = () => this.playNext();
    const left = $('#home-left'), right = $('#home-right'); left.innerHTML = ''; right.innerHTML = '';
    const side = (box, art, label, fn, badge = 0, cls = '') => {
      const b = el('button', 'side-btn ' + cls, `<span class="sa">${art}</span><small>${label}</small>${badge ? `<em>${badge === true ? '!' : badge}</em>` : ''}`);
      b.onclick = fn; box.append(b); return b;
    };
    const d = this.save.data, nc = d.chests.wood + d.chests.gold;
    if (this.homeDaily) this.homeDaily(left, right, side);
    side(left, chestSvg(d.chests.gold ? 'gold' : 'wood'), 'Coffres', () => { this.shopTab = 'chests'; this.show('shop'); }, nc, nc ? 'glow' : '');
  },
  // Scène animée de l'accueil : ciel, nuages, collines, château, brainrots qui passent au loin
  tickHome(ts) {
    const cv = $('#home-scene'); if (this.screen !== 'menu' || !cv.isConnected) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); this.homeWalk = null; }
    const c = cv.getContext('2d'), t = ts / 1000;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tier = this.save.castleTier();
    // ciel
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#5a8fe8'); sky.addColorStop(0.45, '#9fd2ff'); sky.addColorStop(0.62, '#d9f1ff'); sky.addColorStop(0.62, '#8ed85f'); sky.addColorStop(1, '#5fb53c');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    const sg = c.createRadialGradient(W * 0.8, H * 0.16, 10, W * 0.8, H * 0.16, W * 0.5); sg.addColorStop(0, 'rgba(255,250,210,.9)'); sg.addColorStop(0.2, 'rgba(255,240,170,.35)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, H);
    // nuages
    c.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 4; i++) {
      const s = 0.6 + (i % 2) * 0.35, x = ((t * (6 + i * 3) + i * 230) % (W + 260)) - 130, y = H * (0.12 + i * 0.075);
      c.beginPath(); c.ellipse(x, y, 54 * s, 20 * s, 0, 0, 7); c.ellipse(x + 34 * s, y - 12 * s, 34 * s, 22 * s, 0, 0, 7); c.ellipse(x - 30 * s, y - 6 * s, 28 * s, 18 * s, 0, 0, 7); c.fill();
    }
    // collines lointaines
    const hill = (y0, amp, col, ph) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, y0 + Math.sin(x / W * 5 + ph) * amp + Math.sin(x / W * 11 + ph * 2) * amp * 0.35); c.lineTo(W, H); c.closePath(); c.fill(); };
    hill(H * 0.55, 14, '#9ad7a0', 1.3);
    // brainrots qui défilent sur la colline du fond
    if (!this.homeWalk) this.homeWalk = Array.from({ length: 6 }, (_, i) => ({ type: WALKERS[i % WALKERS.length], x: (i / 6) * (W + 120) - 60, v: 14 + Math.random() * 10 }));
    for (const m of this.homeWalk) {
      m.x += m.v / 60; if (m.x > W + 60) { m.x = -60; m.type = WALKERS[Math.floor(Math.random() * WALKERS.length)]; }
      const f = enemyFrames(m.type), fr = f.frames[0][Math.floor(t * 4 + m.v) % 2]; if (!fr || !fr.ready) continue;
      const y = H * 0.55 + Math.sin(m.x / W * 5 + 1.3) * 14 + Math.sin(m.x / W * 11 + 2.6) * 5 - 12, sz = 26 + (f.half > 20 ? 6 : 0);
      c.globalAlpha = 0.9; c.drawImage(fr.cv, m.x - sz / 2, y - sz / 2 + Math.abs(Math.sin(t * 7 + m.v)) * -3, sz, sz); c.globalAlpha = 1;
    }
    hill(H * 0.6, 10, '#7fcb6a', 0.2);
    // sol de premier plan + chemin vers le château
    c.fillStyle = '#74c94a'; c.beginPath(); c.ellipse(W / 2, H * 0.98, W * 0.95, H * 0.33, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#f3dba6'; c.strokeStyle = '#b98a47'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(W * 0.42, H); c.quadraticCurveTo(W * 0.46, H * 0.8, W * 0.5 - 14, H * 0.67); c.lineTo(W * 0.5 + 14, H * 0.67); c.quadraticCurveTo(W * 0.56, H * 0.8, W * 0.6, H); c.closePath(); c.fill(); c.stroke();
    // arbres ronds
    const tree = (x, y, r, col) => { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y + r * 0.95, r * 0.9, r * 0.25, 0, 0, 7); c.fill(); c.fillStyle = '#8a5530'; c.fillRect(x - r * 0.14, y, r * 0.28, r * 0.9); c.fillStyle = col; c.strokeStyle = '#3d2c4e'; c.lineWidth = 3; c.beginPath(); c.arc(x, y - r * 0.2, r, 0, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.55, r * 0.3, 0, 7); c.fill(); };
    tree(W * 0.1, H * 0.66, 22, '#4caf50'); tree(W * 0.2, H * 0.71, 16, '#5fbf4a'); tree(W * 0.88, H * 0.67, 24, '#4caf50'); tree(W * 0.8, H * 0.73, 15, '#66c25a');
    // château
    const k = Math.min(W / 170 * 0.8, H / 150 * 0.4);
    c.save(); c.translate(W / 2, H * 0.62); c.scale(k, k);
    drawCastle(c, tier, { time: t, cannon: this.save.data.castle.cannon > 0, aim: -Math.PI / 2 + Math.sin(t * 0.8) * 0.8 });
    c.restore();
    // petits papillons / étincelles
    for (let i = 0; i < 5; i++) {
      const x = W * (0.15 + 0.17 * i) + Math.sin(t * 0.9 + i * 2) * 26, y = H * 0.72 + Math.cos(t * 1.3 + i) * 16;
      c.fillStyle = ['#ff7eb6', '#ffe45c', '#ffffff', '#8fe3ff', '#ffb224'][i]; c.globalAlpha = 0.85;
      const fl = Math.abs(Math.sin(t * 12 + i)) * 5 + 1; c.beginPath(); c.ellipse(x - 3, y, fl, 4, 0, 0, 7); c.ellipse(x + 3, y, fl, 4, 0, 0, 7); c.fill(); c.globalAlpha = 1;
    }
  },

  // ------------------------------------------------------------------ écran Château
  renderCastle() {
    const sv = this.save, cs = sv.data.castle, box = $('#castle-content'), tier = sv.castleTier(), sum = sv.castleSum();
    const keep = $('#castle-scroll').scrollTop;
    box.innerHTML = '';
    const next = CASTLE.tiers[tier + 1];
    const hero = el('div', 'castle-stage', `<canvas></canvas><div class="cs-name"><small>Apparence ${tier + 1}/4</small><b>${CASTLE_LOOKS[tier].name}</b>
      ${next ? `<div class="progress"><i style="width:${((sum - CASTLE.tiers[tier]) / (next - CASTLE.tiers[tier])) * 100}%"></i></div><span>Encore ${next - sum} amélioration${next - sum > 1 ? 's' : ''} : ${CASTLE_LOOKS[tier + 1].name}</span>` : '<span>Apparence maximale</span>'}</div>`);
    box.append(hero);
    this.castleCv = $('canvas', hero);
    const U = CASTLE.upgrades, A = CASTLE.abilities;
    const now = {
      walls: (l) => `<b>${20 + l * U.walls.per}</b> PV`,
      repair: (l) => (l ? `+1 PV / <b>${U.repair.every[l]}</b> vague${U.repair.every[l] > 1 ? 's' : ''}` : 'Inactive'),
      treasury: (l) => `+<b>${l * U.treasury.start}</b> au départ`,
      cannon: (l) => (l ? `<b>${U.cannon.damage[l]}</b> dégâts` : 'À construire'),
      air: (l) => (l ? `<b>${A.air.damage[l]}</b> dégâts` : 'Verrouillée'),
      blizzard: (l) => (l ? `<b>-${Math.round(A.blizzard.slow[l] * 100)} %</b> ${A.blizzard.dur[l]} s` : 'Verrouillée'),
      gold: (l) => (l ? `<b>+${A.gold.coins[l]}</b> pièces` : 'Verrouillée'),
    };
    const colors = { walls: '#ff5d6c', repair: '#3fd873', treasury: '#ffd23f', cannon: '#8e9aab' };
    const section = (title, entries, isAb) => {
      box.append(el('h3', 'sect', title));
      const grid = el('div', 'up-grid');
      for (const [id, u] of entries) {
        const lvl = cs[id], max = u.costs.length, done = lvl >= max;
        const tile = el('div', 'up-tile' + (done ? ' max' : '') + (!lvl && isAb ? ' locked' : ''));
        tile.style.setProperty('--ac', isAb ? u.color : colors[id]);
        tile.innerHTML = `<span class="ut-ico">${icon(u.icon)}</span><b>${u.name}</b><small>${now[id](lvl)}</small>${pips(lvl, max)}`;
        tile.append(done ? el('span', 'owned', icon('check') + 'Max') : this.buyButton(u.costs[lvl], 'coins', '', () => this.castleBuild(id), lvl || !isAb ? '' : 'pink'));
        tile.title = u.desc;
        grid.append(tile);
      }
      box.append(grid);
    };
    section('Améliorations', Object.entries(U), false);
    section('Capacités en partie', Object.entries(A), true);
    $('#castle-scroll').scrollTop = keep;
  },
  // Achat : animation de chantier (poussière, marteaux), puis nouvelle apparence éventuelle
  castleBuild(id) {
    const sv = this.save, before = sv.castleTier();
    sv.data.castle[id]++;
    const after = sv.castleTier();
    this.buildFx = { t0: performance.now(), dur: 1400, tierUp: after > before };
    let n = 0; const iv = setInterval(() => { this.audio.play(n % 2 ? 'hit' : 'place'); this.haptics.pulse(0); if (++n > 6) clearInterval(iv); }, 170);
    if (after > before) setTimeout(() => { this.audio.play('legendary'); this.haptics.pulse(2); this.toast('Nouvelle apparence !', CASTLE_LOOKS[after].name, icon('castle')); }, 1300);
  },
  // Château animé de l'écran dédié (appelé à chaque image)
  tickCastle(ts) {
    const cv = this.castleCv; if (!cv || !cv.isConnected || this.screen !== 'castle') return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d'), t = ts / 1000;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const fx = this.buildFx, bt = fx ? (ts - fx.t0) / fx.dur : 2;
    const building = bt >= 0 && bt < 1;
    // la nouvelle apparence apparaît à la fin du chantier
    let tier = this.save.castleTier(); if (building && fx.tierUp) tier = Math.max(0, tier - 1);
    const k = Math.min(W / 170 * 0.7, H / 150 * 0.6), sh = building ? Math.sin(t * 60) * 2.5 : 0;
    // colline sous le château
    c.fillStyle = '#7fcb6a'; c.beginPath(); c.ellipse(W / 2, H * 1.02, W * 0.75, H * 0.36, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#5fb53c'; c.beginPath(); c.ellipse(W / 2, H * 1.08, W * 0.9, H * 0.3, 0, Math.PI, 0); c.fill();
    c.save(); c.translate(W / 2 + sh, H * 0.7); c.scale(k, k);
    if (bt >= 1 && bt < 1.25) { const p = (bt - 1) / 0.25; c.scale(1 + Math.sin(p * Math.PI) * 0.12, 1 - Math.sin(p * Math.PI) * 0.06); }
    drawCastle(c, tier, { time: t, cannon: this.save.data.castle.cannon > 0, aim: -Math.PI / 2 + Math.sin(t) * 0.9 });
    c.restore();
    if (building) {
      // nuages de poussière
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + t, r = (40 + (bt * 120 + i * 13) % 50) * k, x = W / 2 + Math.cos(a) * r * 1.3, y = H * 0.7 + Math.sin(a) * r * 0.35 - (bt * 40 + i * 7) % 30;
        c.fillStyle = `rgba(230,210,180,${0.55 * (1 - bt)})`; c.beginPath(); c.arc(x, y, (14 + i % 3 * 6) * (0.6 + bt), 0, 7); c.fill();
      }
      // marteaux qui frappent
      for (const [hx, hy, ph] of [[-0.24, 0.4, 0], [0.26, 0.36, 1.6], [0.02, 0.18, 3.1]]) {
        const sw = Math.sin(t * 22 + ph) * 0.9;
        c.save(); c.translate(W / 2 + hx * W, H * hy); c.rotate(-0.6 + sw);
        c.lineWidth = 3; c.strokeStyle = '#3d2c4e';
        c.fillStyle = '#b5793f'; c.beginPath(); c.roundRect(-3, -2, 6, 30, 3); c.fill(); c.stroke();
        c.fillStyle = '#8e9aab'; c.beginPath(); c.roundRect(-12, -10, 24, 12, 3); c.fill(); c.stroke();
        c.restore();
      }
    } else if (fx && bt >= 1 && bt < 1.5) {
      const p = (bt - 1) / 0.5; // éclat de lumière à la fin
      c.fillStyle = `rgba(255,255,255,${(fx.tierUp ? 0.9 : 0.5) * (1 - p)})`; c.fillRect(0, 0, W, H);
      c.strokeStyle = `rgba(255,210,63,${1 - p})`; c.lineWidth = 6; c.beginPath(); c.arc(W / 2, H * 0.6, 40 + p * W * 0.6, 0, 7); c.stroke();
    }
  },

  // ------------------------------------------------------------------ en partie : capacités (et boosts) en bas de l'écran
  buildDock() {
    const g = this.game, ab = $('#abilities'), bo = $('#boosts');
    ab.innerHTML = ''; bo.innerHTML = '';
    g.abilities.forEach((a) => {
      const C = CASTLE.abilities[a.id];
      const b = el('button', 'ab', `<i class="gauge"></i>${icon(C.icon)}<span class="cd"></span>`);
      b.style.setProperty('--ac', C.color); b.dataset.id = a.id; b.setAttribute('aria-label', C.name);
      b.onclick = () => {
        if (g.paused || g.over) return;
        if (a.cd > 0) { this.audio.play('error'); this.toast(C.name, `Disponible dans ${Math.ceil(a.cd)} s`, icon(C.icon)); return; }
        if (a.id === 'air') { this.aiming = this.aiming === 'air' ? null : 'air'; this.closeMenu(); this.audio.play('tick'); }
        else if (g.useAbility(a.id)) this.haptics.pulse(2);
      };
      ab.append(b);
    });
    if (this.buildBoosts) this.buildBoosts(bo);
    this.cache.dock = null; this.resize();
  },
  updateDock() {
    const g = this.game;
    for (const b of $$('#abilities .ab')) {
      const a = g.abilities.find((k) => k.id === b.dataset.id), p = Math.round((1 - a.cd / a.max) * 100), s = Math.ceil(a.cd);
      if (b._p !== p) { b._p = p; b.style.setProperty('--p', p + '%'); b.classList.toggle('ready', p >= 100); }
      if (b._s !== s) { b._s = s; $('.cd', b).textContent = s > 0 ? s : ''; }
      b.classList.toggle('aim', this.aiming === a.id);
    }
    const hint = $('#aim-hint'); const on = !!this.aiming && !g.over;
    if (hint.hidden === on) hint.hidden = !on;
    if (this.updateBoosts) this.updateBoosts();
  },
};
