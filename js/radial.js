// Menu radial d'un emplacement (poser / améliorer / branche / ciblage / vendre) et panneau d'aperçu visuel :
// tourelle actuelle → niveau suivant, 3 barres de stats (gain en vert brillant) et badge « +68 % DPS ».
// Le panneau se place automatiquement là où il ne recouvre ni la tourelle, ni les boutons, ni le chemin proche.
// Méthodes ajoutées à la classe UI.
import { TOWERS, TOWER_SHORT, RARITY, LEVELS, UNLOCKS, RADIAL } from './config.js';
import { computeStats, dpsOf, TARGET_MODES } from './towers.js';
import { towerImg, TOWER_COLOR } from './sprites.js';
import { icon, coin } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
// nombres affichés : entiers au-delà de 20, sinon une décimale à la française (virgule) si elle compte
const fr = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const num = (n) => (n >= 20 || Number.isInteger(+n.toFixed(1)) ? String(Math.round(n)) : fr(n));
const short = (n) => (n >= 1e4 ? (n / 1000).toFixed(n >= 1e5 ? 0 : 1) + 'k' : String(Math.round(n)));
const pct = (a, b) => (a > 0 ? Math.round((b / a - 1) * 100) : 0);

// DPS « réel » affiché sur le badge : critiques comprises
const effDps = (s) => dpsOf(s) * (1 + (s.crit || 0) * ((s.critMult || 1) - 1));

// Les 3 barres d'une tourelle : [{ k (libellé), v (valeur pour la barre), t (texte) }]
export function barStats(type, s) {
  const dmg = s.damage * (s.pellets || 1) * (s.barrels || 1);
  const d = { k: 'Dégâts', v: dmg, t: num(dmg) };
  if (type === 'mine') return [d, { k: 'Recharge', v: s.rate, t: fr(1 / s.rate) + ' s' }, { k: 'Zone', v: s.splash, t: num(s.splash) }];
  if (type === 'cryo') return [d, { k: 'Ralenti', v: s.slow, t: Math.round(s.slow * 100) + ' %' }, { k: 'Portée', v: s.range, t: num(s.range) }];
  return [d, { k: 'Cadence', v: s.rate, t: fr(s.rate) + '/s' }, { k: 'Portée', v: s.range, t: num(s.range) }];
}
// Valeur maximale atteignable de chaque barre pour ce type (niveau 5, meilleure branche) : échelle des barres
const refCache = new Map();
function barRef(type, mods) {
  const key = type + JSON.stringify(mods || {});
  if (!refCache.has(key)) {
    const all = [computeStats(type, 1, null, mods), ...TOWERS[type].branches.map((b, i) => computeStats(type, 5, i, mods))].map((s) => barStats(type, s));
    refCache.set(key, [0, 1, 2].map((i) => Math.max(...all.map((r) => r[i].v)) * 1.04));
  }
  return refCache.get(key);
}
// Gain principal d'une amélioration : { pct, label } (DPS, ou ralenti pour la cryo)
export function mainGain(type, cur, next) {
  if (type === 'cryo' && next.slow > cur.slow + 0.001) return { pct: pct(cur.slow, next.slow), label: 'ralenti' };
  const p = pct(effDps(cur), effDps(next));
  return p > 0 ? { pct: p, label: type === 'mine' ? 'dégâts' : 'DPS' } : null;
}

export const Radial = {
  // ------------------------------------------------------------------ stats affichées
  statRows(type, s) {
    const mult = (s.pellets ? '×' + s.pellets : '') + (s.barrels > 1 ? '×' + s.barrels : '');
    const rows = [['Dégâts', num(s.damage) + mult]];
    if (type === 'mine') return rows.concat([['Recharge', fr(1 / s.rate) + ' s'], ['Zone', num(s.splash)], ['Étourdit', s.stun ? fr(s.stun) + ' s' : '—']]);
    rows.push(['Cadence', fr(s.rate) + '/s'], ['Portée', num(s.range)]);
    rows.push(type === 'cryo' ? ['Ralenti', Math.round(s.slow * 100) + ' %'] : ['DPS', num(dpsOf(s))]);
    return rows;
  },
  statLine(type, s) { return this.statRows(type, s).map((r) => `${r[0]} <b>${r[1]}</b>`).join(' · '); },

  // Éléments du menu : { key, cls, art, label, price, panel | info, preview, tap (immédiat) ou confirm (2e toucher) }
  menuItems(slot) {
    const g = this.game, t = slot.tower, skin = this.save.data.skin, items = [];
    if (!t) {
      for (const type of g.buildable(slot)) {
        const cfg = TOWERS[type], cost = g.costOf(type), st = computeStats(type, 1, null, g.mods);
        const isNew = (this.save.data.hintTowers || []).includes(type);   // arme débloquée à la partie précédente
        items.push({ key: type, cls: isNew ? 'isnew' : '', cost, dot: TOWER_COLOR[type], short: TOWER_SHORT[type], art: towerImg(type, 42, skin), price: cost, free: cost === 0, label: isNew ? 'NOUVEAU' : '',
          panel: { kind: 'build', type, cur: st, name: cfg.name, desc: cfg.desc, poor: g.money < cost, cost },
          preview: { r: type === 'mine' ? st.splash : st.range, mode: g.money < cost ? 'bad' : 'ok' },
          confirm: () => { if (g.money < g.costOf(type)) { this.audio.play('error'); this.haptics.pulse(1); this.radialLive(true); return; } if (g.placeTower(type, slot)) { const h = this.save.data.hintTowers || []; if (h.includes(type)) { this.save.data.hintTowers = h.filter((x) => x !== type); this.save.persist(); } this.openMenu(null); } else this.haptics.pulse(1); } });
      }
      return items;
    }
    for (const o of t.upgradeOptions()) {
      if (o.locked) { // amélioration légendaire pas encore débloquée par la campagne
        const n = UNLOCKS.legend[t.type], at = LEVELS[Math.max(0, n - 2)].id;
        items.push({ key: 'lock', cls: 'up br locked', isBranch: true, art: towerImg(t.type, 42, skin, o.level, o.branch), label: 'Légendaire', lockText: `Bats le niveau ${at} pour la débloquer`, lockName: o.name, tap: () => { this.audio.play('error'); this.toast(`${o.name} : verrouillée`, `Bats le niveau ${at} pour débloquer les améliorations légendaires`, icon('lock')); } });
        continue;
      }
      const ns = computeStats(t.type, o.level, o.branch, g.mods);
      items.push({ key: 'up' + (o.branch ?? ''), cls: 'up' + (o.kind === 'level' ? '' : ' br') + (o.mk2 || (o.branch === 2) ? ' mk2' : ''), cost: o.cost, isBranch: o.kind !== 'level',
        art: o.kind === 'level' ? icon('up') : towerImg(t.type, 42, skin, o.level, o.branch), label: o.kind === 'level' ? 'Niv. ' + o.level : o.name, price: o.cost,
        panel: { kind: 'up', type: t.type, cur: t.stats, next: ns, from: [t.level, t.branch], to: [o.level, o.branch], name: o.kind === 'level' ? 'Niveau ' + o.level : o.name, desc: o.kind === 'level' ? '' : o.desc, poor: g.money < o.cost, cost: o.cost },
        preview: { r: t.type === 'mine' ? ns.splash : ns.range, mode: g.money < o.cost ? 'bad' : 'ok' },
        // 2e toucher : validé si l'argent suffit encore ; sinon le bouton reste choisi et affiche « Il manque X »
        confirm: () => { if (g.money < o.cost) { this.audio.play('error'); this.haptics.pulse(1); this.radialLive(true); return; } if (g.upgradeTower(t, o)) { this.armed = null; this.cache.radial = null; } else this.haptics.pulse(1); } });
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
  },

  // Panneau visuel : avant → après, barres, badge
  upgradePanel(p) {
    const skin = this.save.data.skin, g = this.game, ref = barRef(p.type, g.mods);
    const cur = barStats(p.type, p.cur), next = p.next ? barStats(p.type, p.next) : null;
    const gain = p.next ? mainGain(p.type, p.cur, p.next) : null;
    const box = el('div', 'upp' + (p.kind === 'up' ? ' up' : ' build') + (p.poor ? ' poor' : '') + (p.idle ? ' idle' : ''));
    if (p.hdr) box.append(this.towerHdr(p.hdr));
    // ligne du haut : dessins (avant → après) à gauche, nom et badge à droite
    const head = el('div', 'upp-head', `<div class="upp-art"></div><div class="upp-title"><b></b>${gain ? `<span class="upp-badge">+${gain.pct} %<small>${gain.label}</small></span>` : p.kind === 'up' ? '<span class="upp-badge new">Nouveau<small>pouvoir</small></span>' : ''}</div>`);
    $('b', head).textContent = p.name; box.append(head);
    const art = $('.upp-art', head);
    if (p.kind === 'up') {
      const a = el('span', 'from'), b = el('span', 'to');
      a.append(towerImg(p.type, 52, skin, p.from[0], p.from[1])); b.append(towerImg(p.type, 68, skin, p.to[0], p.to[1]));
      b.style.setProperty('--rar', RARITY[p.to[0] - 1].color);
      art.append(a, el('i', 'arrow', icon('up')), b);
    } else { const b = el('span', 'to'); b.append(towerImg(p.type, 72, skin)); art.append(b); const d = el('span', 'upp-desc', ''); d.textContent = p.desc; $('.upp-title', head).append(d); }
    const bars = el('div', 'upp-bars');
    cur.forEach((c, i) => {
      const n = next ? next[i] : null, w0 = Math.min(100, (c.v / ref[i]) * 100), w1 = n ? Math.min(100, (n.v / ref[i]) * 100) : w0, up = n && n.v > c.v * 1.001;
      const row = el('div', 'upp-row' + (up ? ' gain' : ''), `<span class="k">${c.k}</span><span class="bar"><i class="base" style="width:${w0}%"></i>${up ? `<i class="plus" style="left:${w0}%;width:${w1 - w0}%"></i>` : ''}</span><span class="v">${up ? `${c.t}<i>${icon('up')}</i><b>${n.t}</b>` : `<b>${c.t}</b>`}</span>`);
      bars.append(row);
    });
    box.append(bars);
    if (p.kind === 'up' && p.desc) { const d = el('p', 'upp-desc', ''); d.textContent = p.desc; box.append(d); }
    const foot = el('div', 'upp-foot', `<em class="upp-ok"></em><b class="upp-cost">${coin()}<span>${p.cost}</span></b>`);
    box.append(foot); box.dataset.cost = p.cost; this.panelMoney(box);
    return box;
  },
  // en-tête d'une tourelle posée : nom (couleur de rareté), niveau, dégâts infligés et kills (mis à jour sur place)
  towerHdr(t) {
    const rar = RARITY[t.level - 1];
    return el('div', 'upp-hdr', `<b style="color:${rar.color}">${t.label}</b><span class="lv">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= t.level ? 'on' : ''}" style="--rar:${rar.color}"></i>`).join('')}</span><small>${icon('sword')}<b class="dmg">${short(t.dmg)}</b>${icon('skull')}<b class="kills">${t.kills}</b></small>`);
  },
  // Panneau affiché dès qu'on touche une tourelle (rien de choisi) : niveau suivant (barres, gain, prix), liste des
  // branches (nom, effet, prix, gain principal) ou stats au niveau maximum
  towerPanel(t, items) {
    const ups = items.filter((i) => i.panel && i.panel.kind === 'up'), lock = items.find((i) => i.key === 'lock');
    if (ups.length === 1 && !ups[0].isBranch && !lock) return this.upgradePanel({ ...ups[0].panel, hdr: t, idle: true });
    const skin = this.save.data.skin, g = this.game;
    const box = el('div', 'upp up list'); box.append(this.towerHdr(t));
    if (!ups.length && !lock) {
      const ref = barRef(t.type, g.mods), bars = el('div', 'upp-bars');
      for (const [i, c] of barStats(t.type, t.stats).entries()) bars.append(el('div', 'upp-row', `<span class="k">${c.k}</span><span class="bar"><i class="base" style="width:${Math.min(100, (c.v / ref[i]) * 100)}%"></i></span><span class="v"><b>${c.t}</b></span>`));
      box.append(bars, el('div', 'upp-max', `${icon('crown')}Niveau maximum`));
      return box;
    }
    box.append(el('div', 'upp-sub', 'Choisis une spécialisation'));
    for (const it of [...ups, ...(lock ? [lock] : [])]) {
      const row = el('div', 'upp-br' + (it === lock ? ' locked' : '')), art = el('span', 'bi');
      art.append(it === lock ? towerImg(t.type, 34, skin, 5, 0) : towerImg(t.type, 34, skin, it.panel.to[0], it.panel.to[1]));
      const txt = el('span', 'bt', '<b></b><small></small>');
      $('b', txt).textContent = it === lock ? it.lockName || 'Légendaire' : it.panel.name; $('small', txt).textContent = it === lock ? it.lockText : it.panel.desc;
      row.append(art, txt);
      if (it === lock) row.append(el('span', 'bp', icon('lock')));
      else { const gn = mainGain(t.type, it.panel.cur, it.panel.next); row.append(el('span', 'bp', `${gn ? `<em>+${gn.pct} %<small>${gn.label}</small></em>` : ''}<b class="upp-cost" data-cost="${it.cost}">${coin()}<span>${it.cost}</span></b>`)); }
      box.append(row);
    }
    box.dataset.list = 1; this.panelMoney(box);
    return box;
  },
  // pied du panneau selon l'argent du moment : prix rouge et « Il manque X », ou « Touche encore pour valider »
  panelMoney(box) {
    const g = this.game;
    if (box.dataset.list) { for (const c of box.querySelectorAll('.upp-cost[data-cost]')) c.classList.toggle('poor', g.money < +c.dataset.cost); return; }
    const cost = +box.dataset.cost, poor = g.money < cost, ok = $('.upp-ok', box);
    box.classList.toggle('poor', poor);
    const html = poor ? `Il manque ${Math.ceil(cost - g.money)} pièces` : box.classList.contains('idle') ? `${icon('up')}Touche UP 2 fois pour améliorer` : `${icon('check')}Touche encore pour valider`;
    if (ok._h !== html) { ok._h = html; ok.innerHTML = html; }
  },

  // Position du panneau : candidats autour du menu, score = recouvrement (boutons, tourelle, chemin proche)
  placePanel(node, cx, cy, R, slot, host, boxes = []) {
    const gl = $('#goals'), g = this.game, W = host.width, top = Math.max($('#hud').getBoundingClientRect().bottom, gl && !gl.hidden ? gl.getBoundingClientRect().bottom : 0) - host.top + 4, bot = $('#dock').getBoundingClientRect().top - host.top - 4;
    const w = node.offsetWidth, h = node.offsetHeight, ring = R + RADIAL.ringPad;
    // points du chemin proches de l'emplacement (en px écran, relatifs à #radial)
    const pts = [], near = RADIAL.pathNear;
    for (const p of g.paths) for (let d = 0; d < p.total; d += 12) { const q = p.pointAt(d), s = this.toScreen(q.x, q.y); pts.push([s.x - host.left, s.y - host.top, Math.hypot(q.x - slot.x, q.y - slot.y) <= near ? 6 : 2]); }
    const pw = RADIAL.pathHalf * this.view.s;
    const cands = [];
    for (const [x, y] of [
      [cx - w / 2, cy - ring - h], [cx - w / 2, cy + ring], [cx - ring - w, cy - h / 2], [cx + ring, cy - h / 2],
      [cx - ring - w + 30, cy - ring - h + 30], [cx + ring - 30, cy - ring - h + 30], [cx - ring - w + 30, cy + ring - 30], [cx + ring - 30, cy + ring - 30],
      // replis : tout en haut ou tout en bas de la zone de jeu, à gauche, au centre ou à droite
      ...[6, (W - w) / 2, W - w - 6].flatMap((x) => [[x, top], [x, bot - h]]),
      // et une grille sur toute la hauteur de la zone de jeu (petits écrans, menu près d'un bord)
      ...[6, (W - w) / 2, W - w - 6].flatMap((x) => Array.from({ length: Math.max(0, Math.floor((bot - h - top) / 24)) }, (_, k) => [x, top + 12 + k * 24])),
    ]) {
      const l = Math.max(6, Math.min(W - w - 6, x)), t = Math.max(top, Math.min(bot - h, y));
      // recouvrement avec le disque des boutons
      const nx = Math.max(l, Math.min(cx, l + w)), ny = Math.max(t, Math.min(cy, t + h)), dd = Math.hypot(nx - cx, ny - cy);
      let score = dd < ring ? (ring - dd) * 40 : 0;
      for (const b of boxes) { const ox = Math.min(l + w, b.r) - Math.max(l, b.l), oy = Math.min(t + h, b.b) - Math.max(t, b.t); if (ox > 0 && oy > 0) score += 3000 + ox * oy; }
      for (const [px, py, k] of pts) if (px > l - pw && px < l + w + pw && py > t - pw && py < t + h + pw) score += k;
      score += Math.hypot(l + w / 2 - cx, t + h / 2 - cy) * 0.02 + (t + h > bot || t < top ? 500 : 0);
      cands.push({ l, t, score });
    }
    cands.sort((a, b) => a.score - b.score);
    // aucune place libre (petit écran) : panneau court (dessins, gain, prix), sans les barres
    if (cands[0].score >= 3000 && node.classList.contains('upp') && !node.classList.contains('mini')) { node.classList.add('mini'); this.placePanel(node, cx, cy, R, slot, host, boxes); return; }
    node.style.left = cands[0].l + 'px'; node.style.top = cands[0].t + 'px';
    node.dataset.score = Math.round(cands[0].score);
  },

  // Menu radial : le DOM est construit UNE fois par structure (emplacement, niveau / branche / ciblage de la
  // tourelle, options proposées). Ensuite on ne fait que mettre à jour ce qui change (argent, choix en cours) sur les
  // mêmes éléments : un toucher commencé sur un bouton n'est jamais perdu.
  // zone du menu ouvert (boutons + panneau), en coordonnées du terrain : les textes flottants y sont atténués
  menuDim() {
    const R0 = this._rad, g = this.game; if (!g) return;
    if (!R0) { g.fx.dim = null; return; }
    const q = R0.panel ? R0.panel.getBoundingClientRect() : null, H = R0.host;
    const all = R0.boxes.map((b) => ({ l: b.l + H.left, r: b.r + H.left, t: b.t + H.top, b: b.b + H.top }));
    if (q) all.push({ l: q.left, r: q.right, t: q.top, b: q.bottom });
    const c = this.canvas.getBoundingClientRect(), v = this.view, w = (x, y) => ({ x: (x - c.left - v.ox) / v.s, y: (y - c.top - v.oy) / v.s });
    g.fx.dim = all.map((b) => { const a = w(b.l, b.t), z = w(b.r, b.b); return { l: a.x, t: a.y, r: z.x, b: z.y }; });
  },
  renderRadial() {
    const g = this.game, box = $('#radial'), slot = g && g.menuSlot;
    this._rad = null; if (g) g.fx.dim = null;
    if (!slot || g.over) { box.hidden = true; box.innerHTML = ''; return; }
    const items = this.menuItems(slot), t = slot.tower;
    box.hidden = false; box.innerHTML = '';
    document.querySelectorAll('.tower-tip').forEach((e) => e.remove());   // la bulle « Nouvelle arme » ne cache pas le menu
    const host = box.getBoundingClientRect(), p = this.toScreen(slot.x, slot.y), n = items.length;
    const ups = items.filter((i) => !i.side);
    const gl = $('#goals'), top = Math.max($('#hud').getBoundingClientRect().bottom, gl && !gl.hidden ? gl.getBoundingClientRect().bottom : 0) - host.top + 6, bot = $('#dock').getBoundingClientRect().top - host.top - 6;
    const tx = p.x - host.left, ty = p.y - host.top, W = host.width;
    box.classList.toggle('build', !t); box.classList.toggle('two', !t && n > RADIAL.ringMax);   // deux anneaux : boutons compacts
    const btns = {}, pos = [];
    // un bouton : mêmes écouteurs partout (pointerdown puis pointerup sur le même bouton ; clic clavier en secours)
    const make = (it, i, cls) => {
      const b = el('button', 'rb ' + (it.cls || '') + (cls ? ' ' + cls : ''));
      b.style.setProperty('--i', i);
      if (typeof it.art === 'string') b.innerHTML = it.art; else b.append(it.art);
      if (!t) { const nm = el('span', 'lab bname', ''); nm.textContent = it.short || ''; b.append(nm); if (it.label === 'NOUVEAU') b.append(el('span', 'snew', 'NOUVEAU')); }
      else if (it.isBranch) b.append(el('span', 'lab name', it.label));
      else if (it.label) b.append(el('span', 'lab' + (it.side === 'left' ? ' under' : ''), it.label));
      if (it.dot) { const d = el('i', 'tdot'); d.style.background = it.dot; b.append(d); }
      if (it.price != null) b.append(el('span', 'price', it.free ? 'GRATUIT' : coin() + it.price));
      if (it.gain != null) b.append(el('span', 'price gain', '+' + it.gain + coin()));
      b.append(el('span', 'ok', icon('check')));
      let x0 = 0;
      b.addEventListener('pointerdown', (e) => { this._rbDown = it.key; x0 = e.clientX; b.classList.add('press'); e.stopPropagation(); });
      b.addEventListener('pointerup', (e) => { b.classList.remove('press'); if (this._rbDown !== it.key) return; this._rbDown = null; if (Math.abs(e.clientX - x0) > 10) return; e.preventDefault(); this.radialTap(it); });
      b.addEventListener('pointercancel', () => { b.classList.remove('press'); this._rbDown = null; });
      b.addEventListener('pointerleave', () => b.classList.remove('press'));
      b.addEventListener('click', (e) => { if (e.detail === 0) this.radialTap(it); });   // clavier (touches 1 à 9)
      btns[it.key] = b; return b;
    };
    if (!t) {
      // Choix d'une tourelle : boutons de taille fixe sur un anneau (6 tourelles ou moins) ou sur deux anneaux
      // concentriques (au-delà), le nom court et le prix sous chaque icône. Les rayons grandissent juste assez pour
      // qu'aucun bouton ni étiquette ne se touche ; l'ensemble est ensuite décalé d'un bloc pour rester dans la zone
      // de jeu (l'anneau devient un arc autour d'un emplacement proche d'un bord).
      const E = n > RADIAL.ringMax ? RADIAL.buildBox2 : RADIAL.buildBox, boxOf = (q) => ({ l: q.x - E.w, r: q.x + E.w, t: q.y - E.up, b: q.y + E.down });
      const hit = (P) => { for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = boxOf(P[i]), c = boxOf(P[j]); if (a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b) return true; } return false; };
      const inZone = (q) => q.x - E.w >= 6 && q.x + E.w <= W - 6 && q.y - E.up >= top && q.y + E.down <= bot;
      // k boutons sur le cercle de centre (cx, cy) et de rayon r, uniquement sur la partie du cercle qui tient dans
      // l'écran (un ou plusieurs arcs), espacés régulièrement ; null si ça ne tient pas
      const onCircle = (cx, cy, k, r, a0 = -90, ry = r) => {
        const at = (deg) => ({ x: cx + Math.cos((deg * Math.PI) / 180) * r, y: cy + Math.sin((deg * Math.PI) / 180) * ry });
        const STEP = 3, N = 360 / STEP, ok = Array.from({ length: N }, (_, i) => inZone(at(a0 + i * STEP)));
        if (ok.every(Boolean)) return Array.from({ length: k }, (_, i) => at(a0 + (360 * i) / k));
        const gapDeg = (2 * Math.asin(Math.min(1, (n > RADIAL.ringMax ? RADIAL.buildGap2 : RADIAL.buildGap) / (2 * Math.min(r, ry)))) * 180) / Math.PI;
        const safeDeg = (2 * Math.asin(Math.min(1, Math.hypot(2 * E.w, E.up + E.down) / (2 * Math.min(r, ry)))) * 180) / Math.PI;   // écart sûr, quel que soit l'angle
        const runs = []; const st = ok.indexOf(false);
        for (let i = 1, cur = null; i <= N; i++) { const j = (st + i) % N; if (ok[j]) { if (!cur) runs.push((cur = { s: j, len: 0 })); cur.len++; } else cur = null; }
        const cap = runs.map((u) => Math.floor(((u.len - 1) * STEP) / gapDeg) + 1);
        if (cap.reduce((x, y) => x + y, 0) < k) return null;
        // répartition des boutons entre les arcs, au prorata de leur longueur
        const nb = runs.map(() => 0); for (let i = 0; i < k; i++) { let best = -1, sc = -1; runs.forEach((u, j) => { if (nb[j] < cap[j]) { const v = u.len / (nb[j] + 1); if (v > sc) { sc = v; best = j; } } }); nb[best]++; }
        const out = []; runs.forEach((u, j) => { const m = nb[j]; if (!m) return; const span = Math.min((u.len - 1) * STEP, (m - 1) * safeDeg), s0 = a0 + u.s * STEP + ((u.len - 1) * STEP - span) / 2; for (let i = 0; i < m; i++) out.push(at(s0 + (m > 1 ? (span * i) / (m - 1) : 0))); });
        return out;
      };
      // l'emplacement reste visible : aucun bouton ni étiquette ne le recouvre
      const clear = (P) => P.every((q) => { const c = boxOf(q), m = RADIAL.slotClear; return tx < c.l - m || tx > c.r + m || ty < c.t - m || ty > c.b + m; });
      const good = (P) => P && !hit(P) && clear(P);
      const layout = (cx, cy) => {
        if (n <= RADIAL.ringMax) { for (let r = RADIAL.rRing; r <= 170; r += 6) { const c = onCircle(cx, cy, n, r); if (good(c)) return c; } return null; }
        for (const k1 of [4, 3, 5]) for (let r1 = RADIAL.rInner; r1 <= 128; r1 += 8) {
          const inner = onCircle(cx, cy, k1, r1); if (!good(inner)) continue;
          // anneau extérieur : cercle, ou ellipse plus haute que large quand l'écran est étroit
          const rxMax = (W - 12) / 2 - E.w;
          for (let r2 = r1 + RADIAL.ringStep2; r2 <= 220; r2 += 8) { const rx = Math.min(r2, Math.max(r1 + 50, rxMax)); const outer = onCircle(cx, cy, n - k1, rx, -90 + 180 / (n - k1), r2); if (outer && good(inner.concat(outer))) return inner.concat(outer); }
        }
        return null;
      };
      // centre des anneaux : l'emplacement, sinon légèrement décalé (l'emplacement reste dans le trou de l'anneau)
      let P = null;
      for (const d of [0, 14, 28, 42, 56, 70]) { for (let k = 0; k < (d ? 8 : 1) && !P; k++) { const a = (k * Math.PI) / 4; P = layout(tx + Math.cos(a) * d, ty + Math.sin(a) * d); } if (P) break; }
      // près d'un bord : arcs concentriques remplis de l'intérieur vers l'extérieur (autant de boutons que chaque arc
      // en accepte), toujours autour de l'emplacement
      const arcs = (cx, cy) => {
        const out = []; let left = n;
        for (let r = n <= RADIAL.ringMax ? RADIAL.rRing : RADIAL.rInner, ring = 0; left > 0 && ring < 5; r += Math.hypot(2 * E.w, E.up + E.down), ring++) {   // écart entre arcs : aucun chevauchement, quel que soit l'angle
          let best = null; for (let m = left; m >= 1 && !best; m--) for (const a0 of [-90 + ring * 17, -60 + ring * 17, -120 + ring * 17]) { const c = onCircle(cx, cy, m, r, a0); if (c && good(out.concat(c))) { best = c; break; } }
          if (best) { out.push(...best); left -= best.length; }
        }
        return left ? null : out;
      };
      for (const d of [0, 20, 40, 60]) { for (let k = 0; k < (d ? 8 : 1) && !P; k++) { const a = (k * Math.PI) / 4; P = arcs(tx + Math.cos(a) * d, ty + Math.sin(a) * d); } if (P) break; }
      this._radMode = P ? 'ok' : 'secours';
      if (!P) {   // secours (écran minuscule) : un seul anneau décalé d'un bloc pour rester dans la zone de jeu
        const r = RADIAL.rRing + 20; P = Array.from({ length: n }, (_, i) => { const a = ((-90 + (360 * i) / n) * Math.PI) / 180; return { x: tx + Math.cos(a) * r, y: ty + Math.sin(a) * r }; });
        const o = P.reduce((o, q) => ({ l: Math.max(o.l, 6 - (q.x - E.w)), r: Math.max(o.r, q.x + E.w - (W - 6)), t: Math.max(o.t, top - (q.y - E.up)), b: Math.max(o.b, q.y + E.down - bot) }), { l: 0, r: 0, t: 0, b: 0 });
        for (const q of P) { q.x += o.l - o.r; q.y += o.t - o.b; }
      }
      P.forEach((q, i) => { pos[i] = { x: q.x, y: q.y, e: E }; });
    } else {
      // Tourelle posée : une barre groupée, toujours dans le même ordre (ciblage, améliorations, vente), juste sous la
      // tourelle (au-dessus si elle est trop bas). Si la barre est trop large (3 branches), ciblage et vente passent
      // sur une 2e rangée.
      const order = [...items.filter((i) => i.side === 'left'), ...ups, ...items.filter((i) => i.side === 'bottom')];
      const cw = (it) => (it.isBranch ? RADIAL.cellBranch : RADIAL.cell), gap = RADIAL.barGap;
      const tr = RADIAL.towerR * this.view.s;
      let rows = [order]; const wOf = (r) => r.reduce((a, it) => a + cw(it), 0) + gap * (r.length - 1);
      if (wOf(order) > W - 12) rows = [ups, order.filter((i) => i.side)];
      const rowH = (r) => (r.some((i) => i.isBranch) ? 104 : 86);
      const below = ty + tr + rows.reduce((a, r) => a + rowH(r), 0) <= bot;
      let y = below ? ty + tr : ty - tr;
      for (const r of rows) {
        const h = rowH(r), cy = below ? y + h / 2 + (r.some((i) => i.isBranch) ? 9 : 2) : y - h / 2 + (r.some((i) => i.isBranch) ? 9 : 2);
        const w = wOf(r); let x = Math.max(6, Math.min(W - 6 - w, tx - w / 2));
        for (const it of r) { const c = cw(it); pos[items.indexOf(it)] = { x: x + c / 2, y: cy, e: { w: c / 2, up: 0, down: 0 } }; x += c + gap; }
        y += below ? h : -h;
      }
    }
    items.forEach((it, i) => { const b = make(it, i); b.style.left = pos[i].x + 'px'; b.style.top = pos[i].y + 'px'; box.append(b); });
    const cx = tx, cy = ty;
    // emprise réelle de chaque bouton (nom, prix) ou de la rangée, mesurée une fois affichée, pour placer le panneau
    box.classList.add('measure');
    const rel = (q) => ({ l: q.left - host.left - 3, r: q.right - host.left + 3, t: q.top - host.top - 3, b: q.bottom - host.top + 3 });
    const boxes = Object.values(btns).map((b) => { const qs = [b, ...b.querySelectorAll('.lab, .price')].map((e) => e.getBoundingClientRect()).filter((q) => q.width); return rel({ left: Math.min(...qs.map((q) => q.left)), right: Math.max(...qs.map((q) => q.right)), top: Math.min(...qs.map((q) => q.top)), bottom: Math.max(...qs.map((q) => q.bottom)) }); });
    box.classList.remove('measure');
    const tr0 = RADIAL.towerR * this.view.s + 4; boxes.push({ l: tx - tr0, r: tx + tr0, t: ty - tr0, b: ty + tr0 });   // la tourelle reste visible
    const Rn = Math.max(30, ...pos.map((q) => Math.hypot(q.x - tx, q.y - ty) - 20));
    this._rad = { items, btns, slot, cx, cy, R: Rn, host, boxes, panelKey: null, panel: null, money: null };
    this.radialPanel(); this.radialLive(true);
  },
  // 1er toucher : choisit (aperçu) ; 2e toucher sur le même bouton : valide
  radialTap(it) {
    const g = this.game; if (!g || g.over || !this._rad) return;
    if (it.tap) { it.tap(); return; }
    if (this.armed === it.key) { it.confirm(); return; }
    this.armed = it.key; g.preview = it.preview || null; this.audio.play('tick'); this.haptics.pulse(0);
    this.radialPanel(); this.radialLive(true);
  },
  // panneau (remplacé seulement quand le choix change ; il ne reçoit pas les touchers)
  radialPanel() {
    const R0 = this._rad, g = this.game, t = R0.slot.tower, slot = R0.slot, key = this.armed || '';
    if (R0.panelKey === key && R0.panel) return;
    const armed = R0.items.find((i) => i.key === this.armed);
    let node;
    if (armed && armed.panel) node = this.upgradePanel(t && !armed.isBranch ? { ...armed.panel, hdr: t } : armed.panel);
    else if (armed && armed.info) node = el('div', 'info', armed.info);
    else if (t) node = this.towerPanel(t, R0.items);
    else node = el('div', 'info', slot.kind === 'mine' ? '<b>Zone de mine</b><small class="hint">Choisis une mine</small>' : '<b>Choisis une tourelle</b><small class="hint">Touche-la pour voir ses stats</small>');
    node.classList.add('rpanel');
    if (R0.panel) R0.panel.replaceWith(node); else $('#radial').append(node);
    R0.panel = node; R0.panelKey = key;
    this.placePanel(node, R0.cx, R0.cy, R0.R, slot, R0.host, R0.boxes);
    this.menuDim();
    for (const [k, b] of Object.entries(R0.btns)) b.classList.toggle('armed', k === this.armed);
  },
  // ce qui change en continu (argent) : classes et textes mis à jour sur les mêmes éléments
  radialLive(force) {
    const R0 = this._rad, g = this.game; if (!R0) return;
    if (!force && R0.money === g.money) return;
    R0.money = g.money;
    for (const it of R0.items) {
      const b = R0.btns[it.key]; if (!b || it.cost == null) continue;
      const poor = g.money < (it.free ? 0 : it.cost);
      if (b._poor !== poor) { b._poor = poor; b.classList.toggle('poor', poor); }
      if (it.preview) it.preview.mode = poor ? 'bad' : 'ok';
    }
    if (R0.panel && (R0.panel.dataset.cost || R0.panel.dataset.list)) this.panelMoney(R0.panel);
    const armed = R0.items.find((i) => i.key === this.armed); if (armed && armed.preview) g.preview = armed.preview;
  },
  updateRadial() {
    const g = this.game, slot = g.menuSlot;
    if (!slot || g.over) { if (!$('#radial').hidden) { $('#radial').hidden = true; $('#radial').innerHTML = ''; this._rad = null; g.menuSlot = null; g.fx.dim = null; } return; }
    const t = slot.tower;
    // structure seulement : l'argent et le choix en cours ne reconstruisent jamais le menu
    const opts = t ? t.upgradeOptions().map((o) => (o.locked ? 'L' : o.level + ':' + (o.branch ?? ''))).join(',') : g.buildable(slot).join(',');
    const key = [g.slots.indexOf(slot), t ? t.level + '|' + t.branch + '|' + t.mode : '', opts, g.freeNext].join('/');
    if (this.cache.radial !== key || !this._rad) { this.cache.radial = key; this.renderRadial(); return; }
    this.radialLive(false);
    if (t) { const d = $('#radial .dmg'), k = $('#radial .kills'); if (d) { const v = short(t.dmg); if (d.textContent !== v) d.textContent = v; if (k.textContent !== String(t.kills)) k.textContent = t.kills; } }
  },
};
