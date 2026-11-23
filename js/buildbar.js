// Barre de choix des tourelles : toujours en bas de l'écran, juste au-dessus des boutons du bas, quel que soit
// l'emplacement touché. Cartes de taille fixe (icône entière, nom complet, prix) dans une rangée qui défile au doigt
// avec aimantation, ombres sur les bords, flèche, indicateur de position. 1er toucher : la carte est choisie (panneau
// de stats au-dessus de la barre, cercle de portée) ; 2e toucher sur la même carte ou « Poser » : la tourelle est posée.
// La barre est construite UNE fois par liste de tourelles : quand l'argent change, seuls les états (prix rouge,
// GRATUIT) changent sur place. Si l'emplacement touché est sous la barre, elle devient transparente à son niveau et un
// repère pulsant le montre. Méthodes ajoutées à la classe UI.
import { TOWERS, BUILDBAR } from './config.js';
import { computeStats } from './towers.js';
import { towerImg } from './sprites.js';
import { icon, coin } from './icons.js';
import { barStats, barRef } from './radial.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const CHEV = '<svg viewBox="0 0 12 20" aria-hidden="true"><path d="M3 3l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export const BuildBar = {
  // appelé à chaque image : ouvre / ferme la barre selon l'emplacement choisi, sans jamais la reconstruire
  updateBuildBar() {
    const g = this.game, slot = g && g.menuSlot, B = this._bb;
    if (!slot || slot.tower || g.over) { if (B && B.open) this.hideBuildBar(); return; }
    const types = g.buildable(slot), key = types.join(',') + '|' + this.save.data.skin;
    if (!B || B.key !== key) this.makeBuildBar(types, key);
    const b = this._bb;
    if (!b.open) { b.slot = slot; this.showBuildBar(); }
    else if (b.slot !== slot) { b.slot = slot; b.markKey = null; this.bbPanel(); }   // autre emplacement : rien de choisi
    this.bbLive(false); this.bbMark();
  },

  makeBuildBar(types, key) {
    const bar = $('#buildbar'), skin = this.save.data.skin, hint = this.save.data.hintTowers || [], old = this._bb;
    bar.innerHTML = '';
    const panel = el('div', 'bb-panel'); panel.hidden = true;
    const body = el('div', 'bb-body');
    const wrap = el('div', 'bb-wrap'), sc = el('div', 'bb-scroll');
    const cards = {};
    types.forEach((type, i) => {
      const c = el('button', 'bb-card'); c.dataset.type = type; c.style.setProperty('--i', i);
      c.setAttribute('aria-label', TOWERS[type].name);
      const art = el('span', 'bb-art'); art.append(towerImg(type, BUILDBAR.icon, skin));
      const nm = el('span', 'bb-name'); nm.textContent = TOWERS[type].name;
      c.append(art, nm, el('span', 'bb-price', `${coin()}<b></b>`), el('span', 'bb-free', 'GRATUIT'));
      if (hint.includes(type)) c.append(el('span', 'bb-new', 'NOUVEAU'));
      // tap ou swipe : un toucher ne choisit la carte que si le doigt n'a presque pas bougé ET que la rangée n'a pas
      // défilé entre l'appui et le relâchement
      let d = null;
      c.addEventListener('pointerdown', (e) => { d = { x: e.clientX, y: e.clientY, s: sc.scrollLeft }; c.classList.add('press'); });
      c.addEventListener('pointerup', (e) => {
        c.classList.remove('press'); if (!d) return;
        const ok = Math.hypot(e.clientX - d.x, e.clientY - d.y) < BUILDBAR.tapSlop && Math.abs(sc.scrollLeft - d.s) < 4; d = null;
        if (ok) { e.preventDefault(); this.bbTap(type); }
      });
      c.addEventListener('pointercancel', () => { d = null; c.classList.remove('press'); });
      c.addEventListener('pointerleave', () => c.classList.remove('press'));
      c.addEventListener('click', (e) => { if (e.detail === 0) this.bbTap(type); });   // clavier
      sc.append(c); cards[type] = c;
    });
    const arrow = el('button', 'bb-arrow', CHEV); arrow.setAttribute('aria-label', 'Tourelles suivantes');
    arrow.onclick = () => this.bbScrollBy(2);
    wrap.append(sc, el('i', 'bb-shade l'), el('i', 'bb-shade r'), arrow);
    const prog = el('div', 'bb-prog', '<i></i>');
    body.append(wrap, prog);
    bar.append(panel, el('div', 'bb-hint', `${CHEV}Glisse pour voir toutes les tourelles`), body);
    // molette (souris) : une carte par cran, dans le sens de la molette
    let wt = 0;
    sc.addEventListener('wheel', (e) => {
      const dv = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : 0; if (!dv) return;
      e.preventDefault(); const now = performance.now(); if (now - wt < 110) return; wt = now; this.bbScrollBy(Math.sign(dv));
    }, { passive: false });
    let raf = 0;
    sc.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; this.bbScrolled(); }); }, { passive: true });
    this._bb = { key, types, cards, bar, panel, sc, wrap, prog, thumb: $('i', prog), open: false, slot: null, money: null, scroll: old ? old.scroll : 0, markKey: null, panelKey: null };
  },

  showBuildBar() {
    const B = this._bb, bar = B.bar;
    clearTimeout(B.hideT); bar.hidden = false; bar.classList.remove('out');
    this.bbPlace();
    bar.classList.remove('in'); void bar.offsetWidth; bar.classList.add('in');
    B.open = true; B.money = null; this.armed = null; this.bbPanel();
    B.sc.scrollLeft = B.scroll;   // même position qu'à la dernière ouverture pendant cette partie
    this.bbScrolled();
    document.querySelectorAll('.tower-tip').forEach((e) => e.remove());
    // toute première ouverture : la rangée glisse vers la gauche puis revient (une seule fois, mémorisé)
    const st = this.save.data.settings;
    if (!st.barHint && B.sc.scrollWidth > B.sc.clientWidth + 4) {
      st.barHint = true; this.save.persist();
      bar.classList.add('hinting');
      const step = this.bbStep();
      B.hintT = setTimeout(() => { B.sc.scrollTo({ left: Math.min(step * 1.6, B.sc.scrollWidth), behavior: 'smooth' });
        B.hintT = setTimeout(() => { B.sc.scrollTo({ left: 0, behavior: 'smooth' }); B.hintT = setTimeout(() => bar.classList.remove('hinting'), 1400); }, 750); }, 350);
    }
  },
  hideBuildBar(now) {
    const B = this._bb; if (!B) return;
    B.open = false; B.slot = null; clearTimeout(B.hintT); B.bar.classList.remove('hinting');
    $('#bb-mark').hidden = true;
    if (now) { B.bar.hidden = true; return; }
    B.bar.classList.add('out'); clearTimeout(B.hideT);
    B.hideT = setTimeout(() => { if (!B.open) B.bar.hidden = true; }, BUILDBAR.outMs);
  },
  // position : juste au-dessus des boutons du bas ; largeur de carte telle que la dernière visible soit coupée à moitié
  bbPlace() {
    const B = this._bb, sg = $('#screen-game'), dock = $('#dock');
    const bottom = Math.max(0, sg.clientHeight - dock.offsetTop) + 4, W = sg.clientWidth;
    if (B.placed === bottom + '|' + W) return; B.placed = bottom + '|' + W;
    B.bar.style.bottom = bottom + 'px';
    // largeur visible de la rangée = marge + 3 cartes + 3 écarts + une demi-carte
    const inner = B.sc.clientWidth || W - 16, cw = Math.floor((inner - BUILDBAR.pad - BUILDBAR.gap * Math.floor(BUILDBAR.visible)) / BUILDBAR.visible);
    B.bar.style.setProperty('--cw', Math.max(BUILDBAR.minW, Math.min(BUILDBAR.maxW, cw)) + 'px');
    B.markKey = null;
  },
  bbStep() { const c = this._bb.sc.querySelector('.bb-card'); return c ? c.offsetWidth + BUILDBAR.gap : 100; },
  bbScrollBy(n) { const B = this._bb; if (B) B.sc.scrollBy({ left: n * this.bbStep(), behavior: 'smooth' }); },
  // ombres, flèche et indicateur de position selon le défilement
  bbScrolled() {
    const B = this._bb; if (!B) return;
    const sc = B.sc, max = sc.scrollWidth - sc.clientWidth, x = sc.scrollLeft, can = max > 4;
    if (B.open) B.scroll = x;
    B.wrap.classList.toggle('more-l', can && x > 4);
    B.wrap.classList.toggle('more-r', can && x < max - 4);
    B.prog.hidden = !can;
    if (can) { const f = sc.clientWidth / sc.scrollWidth; B.thumb.style.width = f * 100 + '%'; B.thumb.style.transform = `translateX(${(x / max) * (1 / f - 1) * 100}%)`; }
  },

  // 1er toucher : choisit la carte (panneau + portée) ; 2e toucher sur la même carte : pose
  bbTap(type) {
    const g = this.game, B = this._bb; if (!g || g.over || !B || !B.open) return;
    if (this.armed === type) { this.bbBuild(type); return; }
    this.armed = type;
    const st = computeStats(type, 1, null, g.mods);
    g.preview = { r: type === 'mine' ? st.splash : st.range, mode: g.money < g.costOf(type) ? 'bad' : 'ok' };
    this.audio.play('tick'); this.haptics.pulse(0);
    // la carte choisie est entièrement visible
    const c = B.cards[type], sc = B.sc, l = c.offsetLeft - sc.offsetLeft, r = l + c.offsetWidth;
    if (l < sc.scrollLeft || r > sc.scrollLeft + sc.clientWidth) sc.scrollTo({ left: l < sc.scrollLeft ? l - BUILDBAR.pad : r - sc.clientWidth + BUILDBAR.pad, behavior: 'smooth' });
    this.bbPanel(); this.bbLive(true);
  },
  bbBuild(type) {
    const g = this.game, slot = g.menuSlot;
    if (g.money < g.costOf(type)) { this.audio.play('error'); this.haptics.pulse(1); const p = this._bb.panel; p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); this.bbLive(true); return; }
    if (g.placeTower(type, slot)) {
      const h = this.save.data.hintTowers || [];
      if (h.includes(type)) { this.save.data.hintTowers = h.filter((x) => x !== type); this.save.persist(); const n = this._bb.cards[type].querySelector('.bb-new'); if (n) n.remove(); }
      this.openMenu(null);
    } else this.haptics.pulse(1);
  },
  // petit panneau au-dessus de la barre : nom, rôle, dégâts / cadence / portée, bouton « Poser »
  bbPanel() {
    const B = this._bb, g = this.game, type = this.armed, panel = B.panel;
    for (const [k, c] of Object.entries(B.cards)) c.classList.toggle('armed', k === type);
    if (B.panelKey === (type || '')) return; B.panelKey = type || '';
    panel.innerHTML = ''; panel.hidden = !type; B.markKey = null;
    if (!type) return;
    const cfg = TOWERS[type], st = computeStats(type, 1, null, g.mods), ref = barRef(type, g.mods);
    const txt = el('div', 'bb-ptxt', '<b></b><small></small>');
    $('b', txt).textContent = cfg.name; $('small', txt).textContent = cfg.desc;
    const stats = el('div', 'bb-stats');
    barStats(type, st).forEach((s, i) => stats.append(el('span', 'bb-stat', `<small>${s.k}</small><b>${s.t}</b><span class="bar"><i style="width:${Math.min(100, (s.v / ref[i]) * 100)}%"></i></span>`)));
    const go = el('button', 'btn primary bb-go', `<span class="t">Poser</span><span class="c">${coin()}<b></b></span>`);
    go.onclick = () => { if (this.armed) this.bbBuild(this.armed); };
    panel.append(el('div', 'bb-pl', ''), go);
    $('.bb-pl', panel).append(txt, stats);
    panel.classList.remove('pop'); void panel.offsetWidth; panel.classList.add('pop');
    B.money = null;
  },
  // ce qui change avec l'argent : classes et textes mis à jour sur les mêmes éléments
  bbLive(force) {
    const B = this._bb, g = this.game; if (!B) return;
    const sig = g.money + '|' + g.freeNext;
    if (!force && B.money === sig) return; B.money = sig;
    for (const [type, c] of Object.entries(B.cards)) {
      const cost = g.costOf(type), free = cost === 0, poor = g.money < cost;
      if (c._poor !== poor) { c._poor = poor; c.classList.toggle('poor', poor); }
      if (c._free !== free) { c._free = free; c.classList.toggle('free', free); }
      const b = c.querySelector('.bb-price b'), v = String(TOWERS[type].cost); if (b.textContent !== v) b.textContent = v;
    }
    const type = this.armed;
    if (type && !B.panel.hidden) {
      const cost = g.costOf(type), poor = g.money < cost, go = $('.bb-go', B.panel);
      go.classList.toggle('poor', poor);
      const t = poor ? `Il manque ${Math.ceil(cost - g.money)}` : cost === 0 ? 'Poser gratuitement' : 'Poser';
      const tt = $('.t', go); if (tt.textContent !== t) tt.textContent = t;
      const cb = $('.c b', go), v = String(cost); if (cb.textContent !== v) cb.textContent = v;
      $('.c', go).hidden = poor || cost === 0;
      if (g.preview) g.preview.mode = poor ? 'bad' : 'ok';
    }
  },
  // emplacement sous la barre : la barre devient transparente à son niveau et un repère pulse sur l'emplacement
  bbMark() {
    const B = this._bb, g = this.game, slot = B.slot, mark = $('#bb-mark');
    this.bbPlace();
    const v = this.view, key = [g.slots.indexOf(slot), B.panelKey, v.s, v.ox, v.oy, B.placed].join('|');
    if (B.markKey === key) return; B.markKey = key;
    const sg = $('#screen-game'), sgr = sg.getBoundingClientRect(), p = this.toScreen(slot.x, slot.y);
    const x = p.x - sgr.left, y = p.y - sgr.top, R = Math.max(26, BUILDBAR.markR * v.s);
    const covered = y + R > B.bar.offsetTop;   // la barre (et le panneau s'il est ouvert) recouvre l'emplacement
    if (covered) {
      const lx = x - B.bar.offsetLeft, ly = y - B.bar.offsetTop, m = `radial-gradient(circle ${R + 10}px at ${lx}px ${ly}px, rgba(0,0,0,${BUILDBAR.seeAlpha}) ${R}px, #000 ${R + 10}px)`;
      B.bar.style.webkitMaskImage = m; B.bar.style.maskImage = m;
      mark.hidden = false; mark.style.left = x + 'px'; mark.style.top = y + 'px'; mark.style.setProperty('--mr', R + 'px');
    } else { B.bar.style.webkitMaskImage = ''; B.bar.style.maskImage = ''; mark.hidden = true; }
    B.covered = covered;
  },
};
