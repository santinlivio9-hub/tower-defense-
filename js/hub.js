// Hub de jeu mobile : barre de ressources, barre d'onglets (avec badges), accueil animé
// (château au centre), écran Château, et capacités en partie. Méthodes ajoutées à la classe UI.
import { CASTLE, TABS, LEVELS, WORLDS, XP, BOOSTS } from './config.js';
import { drawCastle, castleBounds, CASTLE_LOOKS } from './castle.js';
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
const WALKERS = ['basic', 'fast', 'tank', 'armored', 'healer', 'splitter'];   // au sol uniquement
// Écusson des boutons de l'accueil (une couleur par fonction)
const CREST = { gift: ['#ff5d8f', '#c93868'], quests: ['#ffb224', '#c9780a'], chest: ['#a8693a', '#6b3e1e'], wheel: ['#b05cff', '#7a2fd0'], pass: ['#3d9dfc', '#1b64b3'], challenge: ['#f0485a', '#a82338'] };
export function crestSvg(kind) {
  const [a, b] = CREST[kind] || CREST.pass;
  return `<svg viewBox="0 0 60 66" aria-hidden="true"><path d="M5 4h50v28c0 16-11 25-25 31C16 57 5 48 5 32z" fill="${a}" stroke="#3d2c4e" stroke-width="4" stroke-linejoin="round"/>
    <path d="M7.5 34c2 13 11 20 22.5 25 11.5-5 20.5-12 22.5-25v4c-1.5 12-10 19-22.5 24C17.5 57 9 50 7.5 38z" fill="${b}"/>
    <path d="M9.5 8.5h41v11c-13 5-28 5-41 0z" fill="#fff" opacity=".28"/><path d="M10 9h40v23c0 12-8 19-20 24" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/></svg>`;
}

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
    const sv = this.save, d = sv.data, set = (id, v) => { const e = $(`#tabbar .tab-${id} em`); if (!e) return; e.hidden = !v; e.textContent = v; };
    set('talents', d.talentPts || 0);
    set('shop', (d.chests.wood + d.chests.gold) || (this.dailyBadge ? this.dailyBadge('shop') : 0));
    set('castle', this.castleAffordable());
    set('collection', sv.collectionNew());
    set('menu', this.dailyBadge ? this.dailyBadge('menu') : 0);
  },
  castleAffordable() {
    const cs = this.save.data.castle, c = this.save.data.coins || 0;
    return [...Object.entries(CASTLE.upgrades), ...Object.entries(CASTLE.abilities)].filter(([id, u]) => cs[id] < u.costs.length && u.costs[cs[id]] <= c).length;
  },
  // Bouton d'achat (pièces ou gemmes)
  buyButton(cost, currency, label, fn, cls = '') {
    const d = this.save.data;
    // pas assez : couleur normale, prix en rouge + « Il manque X » ; sinon reflet qui passe
    const miss = cost - (d[currency] || 0), price = `${label}${label ? ' ' : ''}${cur(currency)}${fmt(cost)}`;
    const b = el('button', 'btn sm ' + cls + (miss > 0 ? ' poor' : ' can'), miss > 0 ? `<span class="price">${price}</span><small class="miss">Il manque ${fmt(miss)}</small>` : price);
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
    this.renderHomeSide();
    this.homeLay = null;
  },
  // Blasons autour du château : une couleur par fonction, info sous le label,
  // badge rouge UNIQUEMENT quand une récompense est à récupérer
  renderHomeSide() {
    const left = $('#home-left'), right = $('#home-right'); left.innerHTML = ''; right.innerHTML = '';
    const crest = (box, o) => {
      const b = el('button', 'crest' + (o.cls ? ' ' + o.cls : ''), `<span class="cs">${crestSvg(o.color)}${o.art}</span><small>${o.label}</small>${o.info ? `<i class="info${o.go ? ' go' : ''}">${o.info}</i>` : ''}${o.badge ? `<em>${o.badge}</em>` : ''}`);
      b.setAttribute('aria-label', o.label); b.onclick = o.fn; box.append(b); return b;
    };
    const d = this.save.data, nc = d.chests.wood + d.chests.gold;
    if (this.homeDaily) this.homeDaily(left, right, crest);
    crest(left, { art: icon('chest'), label: 'Coffres', color: 'chest', fn: () => { this.shopTab = 'chests'; this.show('shop'); },
      badge: nc, info: nc ? 'Ouvrir' : 'Boutique', go: !!nc, cls: nc ? 'ready' : '' });
    this.homeInfoT = performance.now();
  },
  // Zone libre pour le château, mesurée sur la page : jamais sous les blasons ni sous JOUER
  homeLayout(cv) {
    const cr = cv.getBoundingClientRect(), st = $('#home-stage').getBoundingClientRect(), play = $('.home-play').getBoundingClientRect();
    const sideBottom = Math.max($('#home-left').getBoundingClientRect().bottom, $('#home-right').getBoundingClientRect().bottom) - cr.top;
    const top = st.top - cr.top + 6, playTop = play.top - cr.top;
    const base = Math.min(playTop - 92, Math.max(sideBottom + 8, top + 140));
    return { x0: st.left - cr.left, x1: st.right - cr.left, top, base, playTop };
  },
  // Scène animée de l'accueil : ciel, nuages et oiseaux qui défilent, château entier,
  // brainrots qui marchent au sol en bas de l'écran
  tickHome(ts) {
    const cv = $('#home-scene'); if (this.screen !== 'menu' || !cv.isConnected) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); this.homeWalk = null; this.homeLay = null; }
    if (!this.homeLay) this.homeLay = this.homeLayout(cv);
    if (ts - (this.homeInfoT || 0) > 30000) this.renderHomeSide(); // minuteurs
    const c = cv.getContext('2d'), t = ts / 1000, Ly = this.homeLay;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tier = this.save.castleTier(), B = castleBounds(tier);
    const k = Math.min(1.7, (Ly.x1 - Ly.x0 - 6) / (B.half * 2), (Ly.base - Ly.top) / (B.bottom - B.top));
    const cx = (Ly.x0 + Ly.x1) / 2, oy = Ly.base - B.bottom * k, horizon = Ly.base - 34 * k;
    // ciel
    const sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#4f86e6'); sky.addColorStop(0.7, '#9fd2ff'); sky.addColorStop(1, '#d9f1ff');
    c.fillStyle = sky; c.fillRect(0, 0, W, horizon + 2);
    const sg = c.createRadialGradient(W * 0.82, Ly.top + 40, 8, W * 0.82, Ly.top + 40, W * 0.45); sg.addColorStop(0, 'rgba(255,250,210,.95)'); sg.addColorStop(0.18, 'rgba(255,240,170,.4)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, horizon);
    // nuages (2 plans, vitesses différentes)
    for (let i = 0; i < 6; i++) {
      const far = i < 3, s = far ? 0.5 + i * 0.08 : 0.75 + (i % 2) * 0.3, v = far ? 4 + i : 9 + i * 2;
      const x = ((t * v + i * 173) % (W + 280)) - 140, y = Ly.top + 10 + ((i * 53) % Math.max(40, horizon - Ly.top - 120));
      c.fillStyle = far ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.92)';
      c.beginPath(); c.ellipse(x, y, 54 * s, 18 * s, 0, 0, 7); c.ellipse(x + 30 * s, y - 11 * s, 32 * s, 20 * s, 0, 0, 7); c.ellipse(x - 28 * s, y - 5 * s, 26 * s, 16 * s, 0, 0, 7); c.fill();
    }
    // oiseaux
    c.strokeStyle = '#3d2c4e'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const v = 22 + i * 7, x = ((t * v + i * 260) % (W + 200)) - 100, y = Ly.top + 30 + i * 26 + Math.sin(t * 1.5 + i) * 8, f = Math.sin(t * 9 + i * 2) * 5, s = i % 2 ? 0.8 : 1;
      c.beginPath(); c.moveTo(x - 9 * s, y - f * s); c.quadraticCurveTo(x - 4 * s, y - 4 * s, x, y + 1); c.quadraticCurveTo(x + 4 * s, y - 4 * s, x + 9 * s, y - f * s); c.stroke();
    }
    // collines du fond
    const hill = (y0, amp, col, ph) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, y0 + Math.sin(x / W * 5 + ph) * amp + Math.sin(x / W * 11 + ph * 2) * amp * 0.35); c.lineTo(W, H); c.closePath(); c.fill(); };
    hill(horizon - 8, 12, '#a4dcaa', 1.3);
    hill(horizon + 10, 8, '#8fd47a', 0.2);
    // butte du château + sol de premier plan
    c.fillStyle = '#7fcb5c'; c.beginPath(); c.ellipse(cx, Ly.base + 4, 150 * k, 30 * k, 0, Math.PI, 0); c.fill();
    const g = c.createLinearGradient(0, Ly.base, 0, H); g.addColorStop(0, '#74c94a'); g.addColorStop(1, '#4ea832');
    c.fillStyle = g; c.fillRect(0, Ly.base, W, H - Ly.base);
    // chemin du château jusqu'en bas
    c.fillStyle = '#f3dba6'; c.strokeStyle = '#b98a47'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx - 13 * k, Ly.base - 2); c.quadraticCurveTo(cx - 30, (Ly.base + H) / 2, cx - 60, H); c.lineTo(cx + 30, H); c.quadraticCurveTo(cx + 22, (Ly.base + H) / 2, cx + 13 * k, Ly.base - 2); c.closePath(); c.fill(); c.stroke();
    // arbres et buissons sous les blasons
    const tree = (x, y, r, col) => { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y + r * 0.95, r * 0.9, r * 0.25, 0, 0, 7); c.fill(); c.fillStyle = '#8a5530'; c.fillRect(x - r * 0.14, y, r * 0.28, r * 0.9); c.fillStyle = col; c.strokeStyle = '#3d2c4e'; c.lineWidth = 3; c.beginPath(); c.arc(x, y - r * 0.2, r, 0, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.55, r * 0.3, 0, 7); c.fill(); };
    const gy = Ly.base + 18;
    tree(W * 0.08, gy, 20, '#4caf50'); tree(W * 0.2, gy + 16, 14, '#5fbf4a'); tree(W * 0.92, gy + 2, 22, '#4caf50'); tree(W * 0.8, gy + 18, 13, '#66c25a');
    // buissons, rochers et barrière (positions fixes, hors du chemin)
    const bush = (x, y, r) => { c.fillStyle = '#3f9a3a'; c.strokeStyle = '#3d2c4e'; c.lineWidth = 2.5; c.beginPath(); c.arc(x - r * 0.7, y, r * 0.75, Math.PI, 0); c.arc(x, y - r * 0.35, r, Math.PI, 0); c.arc(x + r * 0.7, y, r * 0.75, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.8, r * 0.3, 0, 7); c.fill(); };
    const rock = (x, y, r) => { c.fillStyle = '#b8b0c8'; c.strokeStyle = '#3d2c4e'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r * 0.6, y - r * 0.8); c.lineTo(x + r * 0.3, y - r); c.lineTo(x + r, y - r * 0.2); c.lineTo(x + r * 0.9, y); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x - r * 0.45, y - r * 0.7, r * 0.5, r * 0.18); };
    const span = Math.max(30, Ly.playTop - Ly.base - 20);
    bush(W * 0.3, Ly.base + 12, 11); bush(W * 0.7, Ly.base + 10, 12); bush(W * 0.06, Ly.base + span * 0.62, 13); bush(W * 0.95, Ly.base + span * 0.55, 12);
    rock(W * 0.36, Ly.base + span * 0.66, 8); rock(W * 0.84, Ly.base + span * 0.3, 7); rock(W * 0.14, Ly.base + span * 0.34, 6);
    c.strokeStyle = '#3d2c4e'; c.lineWidth = 2.5; c.fillStyle = '#d9a566';
    for (const side of [-1, 1]) { const x0 = cx + side * 92 * k, fy = Ly.base + 6; for (let j = 0; j < 3; j++) { const x = x0 + side * (j * 13 + 6); c.beginPath(); c.roundRect(x - 3, fy - 15, 6, 17, 2); c.fill(); c.stroke(); } c.beginPath(); c.moveTo(x0 + side * 3, fy - 9); c.lineTo(x0 + side * 38, fy - 9); c.stroke(); }
    for (let i = 0; i < 9; i++) { const x = (i * 97 + 23) % W, y = Ly.base + 20 + ((i * 37) % Math.max(20, Ly.playTop - Ly.base - 30)); c.fillStyle = ['#ff7eb6', '#ffe45c', '#ffffff'][i % 3]; c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); }
    // château
    c.save(); c.translate(cx, oy); c.scale(k, k);
    drawCastle(c, tier, { time: t, cannon: this.save.data.castle.cannon > 0, aim: -Math.PI / 2 + Math.sin(t * 0.8) * 0.8 });
    c.restore();
    // brainrots qui marchent au sol (2 files, dans les deux sens), au-dessus du bouton JOUER
    const lanes = [Ly.base + (Ly.playTop - Ly.base) * 0.42, Ly.playTop - 8];
    if (!this.homeWalk) this.homeWalk = Array.from({ length: 6 }, (_, i) => ({ type: WALKERS[i % WALKERS.length], lane: i % 2, dir: i % 2 ? -1 : 1, x: ((i * 0.37) % 1) * (W + 120) - 60, v: 16 + Math.random() * 10 }));
    for (const m of this.homeWalk.sort((a, b) => a.lane - b.lane)) {
      m.x += (m.dir * m.v) / 60;
      if (m.x > W + 60 || m.x < -60) { m.x = m.dir > 0 ? -60 : W + 60; m.type = WALKERS[Math.floor(Math.random() * WALKERS.length)]; }
      const f = enemyFrames(m.type), fr = f.frames[0][Math.floor(t * 5 + m.v) % 2]; if (!fr || !fr.ready) continue;
      const sz = (m.lane ? 34 : 27) + (f.half > 20 ? 6 : 0), y = lanes[m.lane] - sz / 2 - Math.abs(Math.sin(t * 8 + m.v)) * 3;
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(m.x, lanes[m.lane], sz * 0.36, sz * 0.1, 0, 0, 7); c.fill();
      c.save(); c.translate(m.x, y); if (m.dir < 0) c.scale(-1, 1); c.drawImage(fr.cv, -sz / 2, -sz / 2, sz, sz); c.restore();
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
