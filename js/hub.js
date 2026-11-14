// Hub de jeu mobile : barre de ressources, barre d'onglets (avec badges), accueil animé
// (château au centre), écran Château, et capacités en partie. Méthodes ajoutées à la classe UI.
import { CASTLE, TABS, LEVELS, WORLDS, XP, BOOSTS } from './config.js';
import { drawCastle, drawCastleLights, drawCastleSilhouette, castleBounds, castleParts, nightLevel, CASTLE_LOOKS } from './castle.js';
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
    if ((name === 'menu' || name === 'world') && this.checkPendingWorld) this.checkPendingWorld();
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
    set('shop', sv.chestCount());
    set('castle', this.castleAffordable() + (d.castleFree || 0));
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
    // coffres d'étoiles prêts sur la carte
    const mb = $('.home-play .map-btn'), sc = this.save.starChestsReady(); let em = $('em', mb); if (!em) { em = el('em', 'mb-badge'); mb.append(em); } em.hidden = !sc; em.textContent = sc;
  },
  // Blasons autour du château : une couleur par fonction, info sous le label,
  // badge rouge UNIQUEMENT quand une récompense est à récupérer
  renderHomeSide() {
    const left = $('#home-left'), right = $('#home-right'); left.innerHTML = ''; right.innerHTML = '';
    const crest = (box, o) => {
      const b = el('button', 'crest' + (o.cls ? ' ' + o.cls : ''), `<span class="cs">${crestSvg(o.color)}${o.art}</span><small>${o.label}</small>${o.info ? `<i class="info${o.go ? ' go' : ''}">${o.info}</i>` : ''}${o.badge ? `<em>${o.badge}</em>` : ''}`);
      b.setAttribute('aria-label', o.label); b.onclick = o.fn; box.append(b); return b;
    };
    const d = this.save.data, nc = this.save.chestCount();
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
    const cs = this.save.data.castle, B = castleBounds(cs), night = this.nightNow(ts);
    const k = Math.min(1.7, (Ly.x1 - Ly.x0 - 6) / (B.half * 2), (Ly.base - Ly.top) / (B.bottom - B.top));
    const cx = (Ly.x0 + Ly.x1) / 2, oy = Ly.base - B.bottom * k, horizon = Ly.base - 34 * k;
    // ciel
    const sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#4f86e6'); sky.addColorStop(0.7, '#9fd2ff'); sky.addColorStop(1, '#d9f1ff');
    c.fillStyle = sky; c.fillRect(0, 0, W, horizon + 2);
    const sg = c.createRadialGradient(W * 0.82, Ly.top + 40, 8, W * 0.82, Ly.top + 40, W * 0.45); sg.addColorStop(0, 'rgba(255,250,210,.95)'); sg.addColorStop(0.18, 'rgba(255,240,170,.4)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, horizon);
    if (night > 0) this.nightSky(c, W, horizon, t, night, Ly.top);
    // nuages (2 plans, vitesses différentes)
    for (let i = 0; i < 6; i++) {
      const far = i < 3, s = far ? 0.5 + i * 0.08 : 0.75 + (i % 2) * 0.3, v = far ? 4 + i : 9 + i * 2;
      const x = ((t * v + i * 173) % (W + 280)) - 140, y = Ly.top + 10 + ((i * 53) % Math.max(40, horizon - Ly.top - 120));
      c.fillStyle = `rgba(${night ? '200,205,240' : '255,255,255'},${(far ? 0.55 : 0.92) * (1 - 0.5 * night)})`;
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
    drawCastle(c, cs, { time: t, aim: -Math.PI / 2 + Math.sin(t * 0.8) * 0.8 });
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
    if (night > 0) { // voile du soir, puis fenêtres et torches allumées
      c.fillStyle = `rgba(16,18,60,${0.42 * night})`; c.fillRect(0, horizon - 40, W, H);
      c.save(); c.translate(cx, oy); c.scale(k, k); drawCastleLights(c, cs, { time: t, night }); c.restore();
    }
  },
  // Nuit selon l'heure réelle (20 h - 7 h) ; this.forceNight pour les tests
  nightNow(ts) {
    if (this.forceNight != null) return this.forceNight;
    if (!this._nightT || ts - this._nightT > 60000) { this._nightT = ts; this._night = nightLevel(); }
    return this._night;
  },
  // Ciel du soir : dégradé sombre, étoiles qui scintillent, lune
  nightSky(c, W, horizon, t, n, top) {
    c.save(); c.globalAlpha = n;
    const g = c.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, '#141a4a'); g.addColorStop(0.7, '#3a3a86'); g.addColorStop(1, '#7a6ab8');
    c.fillStyle = g; c.fillRect(0, 0, W, horizon + 2);
    for (let i = 0; i < 40; i++) { const x = (i * 89.7) % W, y = top + ((i * 53.3) % Math.max(40, horizon - top - 30)), a = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)); c.fillStyle = `rgba(255,255,255,${a * n})`; c.fillRect(x, y, i % 5 ? 1.6 : 2.6, i % 5 ? 1.6 : 2.6); }
    const mx = W * 0.82, my = top + 40; const mg = c.createRadialGradient(mx, my, 10, mx, my, 70); mg.addColorStop(0, 'rgba(255,250,220,.5)'); mg.addColorStop(1, 'rgba(255,250,220,0)');
    c.fillStyle = mg; c.beginPath(); c.arc(mx, my, 70, 0, 7); c.fill();
    c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(mx, my, 18, 0, 7); c.fill(); c.fillStyle = '#e9dcb0'; c.beginPath(); c.arc(mx - 5, my - 4, 4, 0, 7); c.arc(mx + 6, my + 6, 3, 0, 7); c.fill();
    c.restore();
  },

  // ------------------------------------------------------------------ écran Château
  // Valeur d'une amélioration à un niveau donné (affichage « 22 → 26 PV »)
  castleEffect(id, l) {
    const U = CASTLE.upgrades, A = CASTLE.abilities;
    switch (id) {
      case 'walls': return `${20 + l * U.walls.per} PV`;
      case 'repair': return l ? `1 PV / ${U.repair.every[l]} vague${U.repair.every[l] > 1 ? 's' : ''}` : 'Aucune';
      case 'treasury': return `+${l * U.treasury.start} pièces`;
      case 'cannon': return l ? `${U.cannon.damage[l]} dégâts` : 'Aucun';
      case 'air': return l ? `${A.air.damage[l]} dégâts` : 'Verrouillée';
      case 'blizzard': return l ? `-${Math.round(A.blizzard.slow[l] * 100)} % · ${A.blizzard.dur[l]} s` : 'Verrouillée';
      case 'gold': return l ? `+${A.gold.coins[l]} pièces` : 'Verrouillée';
    }
    return '';
  },
  // améliorations offertes par la fin d'un monde
  castleFreeBtn(id, sheet = false) {
    const d = this.save.data; if (!(d.castleFree > 0)) return null;
    const b = el('button', 'btn sm green cta' + (sheet ? ' big' : ''), `${icon('gift')}Gratuit (${d.castleFree})`);
    b.onclick = (e) => { e.stopPropagation(); if (!(d.castleFree > 0)) return; d.castleFree--; this.save.persist(); if (sheet) this.closeOverlay(); this.castleBuild(id); this.show('castle', true); this.tabBadges(); };
    return b;
  },
  castleDef(id) { return CASTLE.upgrades[id] || CASTLE.abilities[id]; },
  renderCastle() {
    const sv = this.save, cs = sv.data.castle, box = $('#castle-content'), tier = sv.castleTier(), sum = sv.castleSum();
    const keep = $('#castle-scroll').scrollTop;
    box.innerHTML = '';
    const next = CASTLE.tiers[tier + 1], N = CASTLE_LOOKS.length;
    const hero = el('div', 'castle-stage', `<canvas></canvas><span class="cs-tap">${icon('arrowup')}Touche une partie du château</span>`);
    box.append(hero);
    const name = el('div', 'cs-name', `<div class="cs-txt"><small>Palier ${tier + 1}/${N}</small><b>${CASTLE_LOOKS[tier].name}</b>
      ${next ? `<div class="progress"><i style="width:${((sum - CASTLE.tiers[tier]) / (next - CASTLE.tiers[tier])) * 100}%"></i></div><span>Encore <b>${next - sum}</b> amélioration${next - sum > 1 ? 's' : ''}</span>` : '<span>Apparence maximale atteinte !</span>'}</div>
      ${next ? `<div class="cs-next"><canvas width="132" height="120"></canvas><small>Prochainement</small><b>${CASTLE_LOOKS[tier + 1].name}</b></div>` : ''}`);
    box.append(name);
    if (next) drawCastleSilhouette($('.cs-next canvas', name), tier + 1, '#8a78c4');
    this.castleCv = $('canvas', hero);
    this.castleCv.onclick = (e) => this.castleTap(e);
    const U = CASTLE.upgrades, A = CASTLE.abilities;
    const colors = { walls: '#ff5d6c', repair: '#3fd873', treasury: '#ffd23f', cannon: '#8e9aab' };
    const section = (title, entries, isAb) => {
      box.append(el('h3', 'sect', title));
      const grid = el('div', 'up-grid');
      for (const [id, u] of entries) {
        const lvl = cs[id], max = u.costs.length, done = lvl >= max;
        const tile = el('div', 'up-tile' + (done ? ' max' : '') + (!lvl && isAb ? ' locked' : ''));
        tile.style.setProperty('--ac', isAb ? u.color : colors[id]); tile.dataset.id = id;
        tile.innerHTML = `<span class="ut-ico">${icon(u.icon)}</span><b>${u.name}</b>
          <div class="fx-big">${done ? `<b>${this.castleEffect(id, lvl)}</b>` : `<span>${this.castleEffect(id, lvl)}</span><i>${icon('arrowup')}</i><b>${this.castleEffect(id, lvl + 1)}</b>`}</div>${pips(lvl, max)}`;
        tile.append(done ? el('span', 'owned', icon('check') + 'Max') : this.castleFreeBtn(id) || this.buyButton(u.costs[lvl], 'coins', '', () => this.castleBuild(id), lvl || !isAb ? '' : 'pink'));
        tile.onclick = (e) => { if (!e.target.closest('button')) this.castleSheet(id); };
        grid.append(tile);
      }
      box.append(grid);
    };
    section('Améliorations', Object.entries(U), false);
    section('Capacités en partie', Object.entries(A), true);
    $('#castle-scroll').scrollTop = keep;
  },
  // Toucher le château : ouvre l'amélioration de la partie touchée
  castleTap(e) {
    const X = this.castleXf; if (!X) return;
    const r = this.castleCv.getBoundingClientRect(), x = (e.clientX - r.left - X.cx) / X.k, y = (e.clientY - r.top - X.oy) / X.k;
    const p = castleParts(this.save.data.castle).find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
    if (p) { this.audio.play('click'); this.haptics.pulse(0); this.castleSheet(p.id); }
  },
  // Fiche d'une amélioration : aperçu avant / après, effet en gros, achat
  castleSheet(id) {
    const sv = this.save, cs = sv.data.castle, u = this.castleDef(id), lvl = cs[id], max = u.costs.length, done = lvl >= max;
    const m = el('div', 'panel glass castle-sheet');
    const x = el('button', 'icon-btn close', icon('close')); x.onclick = () => this.closeOverlay();
    m.append(x, el('div', 'csh-head', `<span class="ut-ico" style="--ac:${u.color || '#8e9aab'}">${icon(u.icon)}</span><div><b>${u.name}</b><small>${u.desc}</small></div>`));
    const ba = el('div', 'csh-ba');
    const view = (l, lab) => { const f = el('div', 'csh-view' + (l > lvl ? ' after' : ''), `<canvas width="300" height="240"></canvas><small>${lab}</small>`); ba.append(f); return $('canvas', f); };
    const parts = castleParts(cs), part = parts.find((q) => q.id === id);
    const zoom = (cv, l) => {
      const c = cv.getContext('2d'), st = { ...cs, [id]: l }, P = castleParts(st).find((q) => q.id === id) || part;
      const k = Math.min(cv.width / (Math.max(P.w, 60) * 1.9), cv.height / (Math.max(P.h, 50) * 1.9), 3);
      c.clearRect(0, 0, cv.width, cv.height);
      c.save(); c.translate(cv.width / 2 - (P.x + P.w / 2) * k, cv.height / 2 - (P.y + P.h / 2) * k); c.scale(k, k); drawCastle(c, st, { time: performance.now() / 1000 }); c.restore();
    };
    const cvA = view(lvl, lvl ? `Niveau ${lvl}` : 'Pas construit');
    if (!done) { ba.append(el('i', 'csh-arrow', icon('arrowup'))); }
    const cvB = done ? null : view(lvl + 1, `Niveau ${lvl + 1}`);
    m.append(ba);
    m.append(el('div', 'fx-big huge', done ? `<b>${this.castleEffect(id, lvl)}</b>` : `<span>${this.castleEffect(id, lvl)}</span><i>${icon('arrowup')}</i><b>${this.castleEffect(id, lvl + 1)}</b>`));
    m.append(done ? el('span', 'owned wide', icon('check') + 'Niveau maximum') : this.castleFreeBtn(id, true) || this.buyButton(u.costs[lvl], 'coins', 'Améliorer', () => { this.closeOverlay(); this.castleBuild(id); }, 'big'));
    const anim = () => { if (!m.isConnected) return; zoom(cvA, lvl); if (cvB) zoom(cvB, lvl + 1); requestAnimationFrame(anim); };
    this.openOverlay(m); requestAnimationFrame(anim);
  },
  // Achat : échafaudage, poussière et marteaux, puis « pop » de l'élément, confettis, son
  castleBuild(id) {
    const sv = this.save, before = sv.castleTier();
    sv.data.castle[id]++;
    const after = sv.castleTier();
    this.buildFx = { id, t0: performance.now(), dur: 1300, tierUp: after > before, boom: false };
    $('#castle-scroll').scrollTo({ top: 0, behavior: 'smooth' });
    let n = 0; const iv = setInterval(() => { this.audio.play(n % 2 ? 'hit' : 'place'); this.haptics.pulse(0); if (++n > 6) clearInterval(iv); }, 170);
    setTimeout(() => { this.audio.play(after > before ? 'legendary' : 'upgrade'); this.haptics.pulse(2); if (after > before) this.toast('Nouveau palier !', CASTLE_LOOKS[after].name, icon('castle')); }, 1300);
  },
  // Château animé de l'écran dédié (appelé à chaque image)
  tickCastle(ts) {
    const cv = this.castleCv; if (!cv || !cv.isConnected || this.screen !== 'castle') return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d'), t = ts / 1000, night = this.nightNow(ts);
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const fx = this.buildFx, bt = fx ? (ts - fx.t0) / fx.dur : 9;
    const building = bt >= 0 && bt < 1;
    // pendant le chantier, l'élément acheté n'est pas encore visible
    const cs = { ...this.save.data.castle }; if (building) cs[fx.id] = Math.max(0, cs[fx.id] - 1);
    const B = castleBounds(cs), ground = H - 26;
    const k = Math.min(1.9, (W - 24) / (B.half * 2), (ground - 14) / (B.bottom - B.top)), cx = W / 2, oy = ground - B.bottom * k;
    this.castleXf = { cx, oy, k };
    // ciel + collines
    const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5a8fe8'); sky.addColorStop(0.75, '#bfe4ff'); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    if (night > 0) this.nightSky(c, W, H - 30, t, night, 6);
    c.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 3; i++) { const s = 0.6 + i * 0.2, x = ((t * (5 + i * 3) + i * 170) % (W + 200)) - 100, y = 30 + i * 34; c.beginPath(); c.ellipse(x, y, 44 * s, 15 * s, 0, 0, 7); c.ellipse(x + 26 * s, y - 9 * s, 26 * s, 17 * s, 0, 0, 7); c.fill(); }
    c.fillStyle = '#9ad7a0'; c.beginPath(); c.ellipse(W * 0.2, ground + 10, W * 0.5, 40, 0, Math.PI, 0); c.ellipse(W * 0.85, ground + 14, W * 0.45, 34, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#7fcb5c'; c.fillRect(0, ground - 4, W, H); c.beginPath(); c.ellipse(cx, ground, 150 * k, 22 * k, 0, Math.PI, 0); c.fill();
    const sh = building ? Math.sin(t * 60) * 1.5 : 0;
    c.save(); c.translate(cx + sh, oy); c.scale(k, k);
    if (fx && bt >= 1 && bt < 1.25 && fx.tierUp) { const p = (bt - 1) / 0.25; c.scale(1 + Math.sin(p * Math.PI) * 0.08, 1 - Math.sin(p * Math.PI) * 0.04); }
    drawCastle(c, cs, { time: t, aim: -Math.PI / 2 + Math.sin(t) * 0.9, build: fx && bt < 1.4 ? { id: fx.id, p: bt } : null });
    c.restore();
    if (night > 0) { c.fillStyle = `rgba(16,18,60,${0.4 * night})`; c.fillRect(0, 0, W, H); c.save(); c.translate(cx, oy); c.scale(k, k); drawCastleLights(c, cs, { time: t, night }); c.restore(); }
    if (!fx) return;
    const P = castleParts(cs).find((q) => q.id === fx.id), px = cx + (P.x + P.w / 2) * k, py = oy + (P.y + P.h / 2) * k;
    if (building) { // nuages de poussière autour de l'élément
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + t * 2, r = (18 + ((bt * 90 + i * 11) % 30)) * k * 0.8;
        c.fillStyle = `rgba(235,215,185,${0.6 * (1 - bt * 0.6)})`; c.beginPath(); c.arc(px + Math.cos(a) * r * 1.3, py + P.h * k * 0.3 + Math.sin(a) * r * 0.45, (8 + (i % 3) * 4) * (0.6 + bt * 0.6), 0, 7); c.fill();
      }
    } else if (bt < 2.6) {
      if (!fx.boom) { // confettis
        fx.boom = true; fx.conf = Array.from({ length: 46 }, (_, i) => ({ x: px, y: py, vx: (Math.random() - 0.5) * 360, vy: -120 - Math.random() * 260, r: Math.random() * 6, c: ['#ff5d8f', '#ffd23f', '#3fd873', '#3d9dfc', '#b05cff', '#fff'][i % 6] }));
      }
      const p = (bt - 1) / 0.4;
      if (p < 1) { c.strokeStyle = `rgba(255,210,63,${1 - p})`; c.lineWidth = 6; c.beginPath(); c.arc(px, py, 10 + p * 90, 0, 7); c.stroke(); if (fx.tierUp) { c.fillStyle = `rgba(255,255,255,${0.8 * (1 - p)})`; c.fillRect(0, 0, W, H); } }
      const dt = 1 / 60;
      for (const q of fx.conf) { q.vy += 520 * dt; q.vx *= 0.99; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 8; c.fillStyle = q.c; c.save(); c.translate(q.x, q.y); c.rotate(q.r); c.fillRect(-4, -2.5, 8, 5); c.restore(); }
    } else this.buildFx = null;
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
