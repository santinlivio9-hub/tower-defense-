// Menu radial d'un emplacement (poser / améliorer / branche / ciblage / vendre) et panneau d'aperçu visuel :
// tourelle actuelle → niveau suivant, 3 barres de stats (gain en vert brillant) et badge « +68 % DPS ».
// Le panneau se place automatiquement là où il ne recouvre ni la tourelle, ni les boutons, ni le chemin proche.
// Méthodes ajoutées à la classe UI.
import { TOWERS, RARITY, LEVELS, UNLOCKS, RADIAL } from './config.js';
import { computeStats, dpsOf, TARGET_MODES } from './towers.js';
import { towerImg } from './sprites.js';
import { icon, coin } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const num = (n) => (n >= 100 || Number.isInteger(+n.toFixed(1)) ? String(Math.round(n)) : n.toFixed(1));
const short = (n) => (n >= 1e4 ? (n / 1000).toFixed(n >= 1e5 ? 0 : 1) + 'k' : String(Math.round(n)));
const pct = (a, b) => (a > 0 ? Math.round((b / a - 1) * 100) : 0);

// DPS « réel » affiché sur le badge : critiques comprises
const effDps = (s) => dpsOf(s) * (1 + (s.crit || 0) * ((s.critMult || 1) - 1));

// Les 3 barres d'une tourelle : [{ k (libellé), v (valeur pour la barre), t (texte) }]
export function barStats(type, s) {
  const dmg = s.damage * (s.pellets || 1) * (s.barrels || 1);
  const d = { k: 'Dégâts', v: dmg, t: num(dmg) };
  if (type === 'mine') return [d, { k: 'Recharge', v: s.rate, t: (1 / s.rate).toFixed(1) + ' s' }, { k: 'Zone', v: s.splash, t: num(s.splash) }];
  if (type === 'cryo') return [d, { k: 'Ralenti', v: s.slow, t: Math.round(s.slow * 100) + ' %' }, { k: 'Portée', v: s.range, t: num(s.range) }];
  return [d, { k: 'Cadence', v: s.rate, t: s.rate.toFixed(1) + '/s' }, { k: 'Portée', v: s.range, t: num(s.range) }];
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
    if (type === 'mine') return rows.concat([['Recharge', (1 / s.rate).toFixed(1) + ' s'], ['Zone', num(s.splash)], ['Étourdit', s.stun ? s.stun.toFixed(1) + ' s' : '—']]);
    rows.push(['Cadence', s.rate.toFixed(1) + '/s'], ['Portée', num(s.range)]);
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
        items.push({ key: type, cls: (g.money < cost ? 'poor' : '') + (isNew ? ' isnew' : ''), art: towerImg(type, 42, skin), price: cost, free: cost === 0, label: isNew ? 'NOUVEAU' : '',
          panel: { kind: 'build', type, cur: st, name: cfg.name, desc: cfg.desc, poor: g.money < cost, cost },
          preview: { r: type === 'mine' ? st.splash : st.range, mode: g.money < cost ? 'bad' : 'ok' },
          confirm: () => { if (g.placeTower(type, slot)) { const h = this.save.data.hintTowers || []; if (h.includes(type)) { this.save.data.hintTowers = h.filter((x) => x !== type); this.save.persist(); } this.openMenu(null); } else this.haptics.pulse(1); } });
      }
      return items;
    }
    for (const o of t.upgradeOptions()) {
      if (o.locked) { // amélioration légendaire pas encore débloquée par la campagne
        const n = UNLOCKS.legend[t.type], at = LEVELS[Math.max(0, n - 2)].id;
        items.push({ key: 'lock', cls: 'up branch locked', art: towerImg(t.type, 42, skin, o.level, o.branch), label: 'Légendaire', tap: () => { this.audio.play('error'); this.toast(`${o.name} : verrouillée`, `Bats le niveau ${at} pour débloquer les améliorations légendaires`, icon('lock')); } });
        continue;
      }
      const ns = computeStats(t.type, o.level, o.branch, g.mods);
      items.push({ key: 'up' + (o.branch ?? ''), cls: 'up' + (o.kind === 'level' ? '' : ' branch') + (o.mk2 || (o.branch === 2) ? ' mk2' : '') + (g.money < o.cost ? ' poor' : ''),
        art: o.kind === 'level' ? icon('up') : towerImg(t.type, 42, skin, o.level, o.branch), label: o.kind === 'level' ? 'Niv. ' + o.level : o.name, price: o.cost,
        panel: { kind: 'up', type: t.type, cur: t.stats, next: ns, from: [t.level, t.branch], to: [o.level, o.branch], name: o.kind === 'level' ? 'Niveau ' + o.level : o.name, desc: o.kind === 'level' ? '' : o.desc, poor: g.money < o.cost, cost: o.cost },
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
  },

  // Panneau visuel : avant → après, barres, badge
  upgradePanel(p) {
    const skin = this.save.data.skin, g = this.game, ref = barRef(p.type, g.mods);
    const cur = barStats(p.type, p.cur), next = p.next ? barStats(p.type, p.next) : null;
    const gain = p.next ? mainGain(p.type, p.cur, p.next) : null;
    const box = el('div', 'upp' + (p.kind === 'up' ? ' up' : ' build') + (p.poor ? ' poor' : ''));
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
    box.append(el('em', 'upp-ok', p.poor ? `Il manque ${Math.ceil(p.cost - g.money)} pièces` : `${icon('check')}Touche encore pour valider`));
    return box;
  },

  // Position du panneau : candidats autour du menu, score = recouvrement (boutons, tourelle, chemin proche)
  placePanel(node, cx, cy, R, slot, host) {
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
    ]) {
      const l = Math.max(6, Math.min(W - w - 6, x)), t = Math.max(top, Math.min(bot - h, y));
      // recouvrement avec le disque des boutons
      const nx = Math.max(l, Math.min(cx, l + w)), ny = Math.max(t, Math.min(cy, t + h)), dd = Math.hypot(nx - cx, ny - cy);
      let score = dd < ring ? (ring - dd) * 40 : 0;
      for (const [px, py, k] of pts) if (px > l - pw && px < l + w + pw && py > t - pw && py < t + h + pw) score += k;
      score += Math.hypot(l + w / 2 - cx, t + h / 2 - cy) * 0.02 + (t + h > bot || t < top ? 500 : 0);
      cands.push({ l, t, score });
    }
    cands.sort((a, b) => a.score - b.score);
    node.style.left = cands[0].l + 'px'; node.style.top = cands[0].t + 'px';
    node.dataset.score = Math.round(cands[0].score);
  },

  renderRadial() {
    const g = this.game, box = $('#radial'), slot = g && g.menuSlot;
    if (!slot || g.over) { box.hidden = true; box.innerHTML = ''; return; }
    const items = this.menuItems(slot), t = slot.tower;
    box.hidden = false; box.innerHTML = '';
    const host = box.getBoundingClientRect(), p = this.toScreen(slot.x, slot.y), n = items.length;
    // rayon serré : juste ce qu'il faut pour que les boutons ne se touchent pas
    const ups0 = items.filter((i) => !i.side).length;
    const R = t ? (ups0 > 2 ? RADIAL.rTower2 + 8 : ups0 > 1 ? RADIAL.rTower2 : RADIAL.rTower) : Math.max(RADIAL.rBuild, (n * RADIAL.buildGap) / (2 * Math.PI));
    const top = $('#hud').getBoundingClientRect().bottom - host.top + 34, bot = $('#dock').getBoundingClientRect().top - host.top - 30;
    const cx = Math.max(R + 34, Math.min(host.width - R - 34, p.x - host.left)), cy = Math.max(top + R, Math.min(bot - R, p.y - host.top));
    box.classList.toggle('build', !t);
    const ups = items.filter((i) => !i.side);
    items.forEach((it, i) => {
      let a;
      if (!t) a = n === 1 ? -90 : -90 + (360 / n) * i;
      else if (it.side === 'left') a = 158; else if (it.side === 'bottom') a = 90;
      else a = ups.length === 1 ? -90 : ups.length === 3 ? [-146, -90, -34][ups.indexOf(it)] : ups.indexOf(it) === 0 ? -130 : -50;
      const b = el('button', 'rb ' + (it.cls || '') + (this.armed === it.key ? ' armed' : ''));
      b.style.cssText = `left:${cx + Math.cos((a * Math.PI) / 180) * R}px;top:${cy + Math.sin((a * Math.PI) / 180) * R}px;--i:${i}`;
      if (typeof it.art === 'string') b.innerHTML = it.art; else b.append(it.art);
      // deux branches côte à côte : pas de libellé (le panneau affiche le nom dès le 1er toucher)
      if (it.label && !(t && ups.length > 1 && !it.side)) b.append(el('span', 'lab' + (it.side === 'left' ? ' under' : ''), it.label));
      if (it.price != null) b.append(el('span', 'price', it.free ? 'GRATUIT' : coin() + it.price));
      if (it.gain != null) b.append(el('span', 'price gain', '+' + it.gain + coin()));
      if (this.armed === it.key) b.append(el('span', 'ok', icon('check')));
      b.onclick = () => {
        if (it.tap) { it.tap(); return; }
        if (this.armed === it.key) { it.confirm(); return; }
        this.armed = it.key; g.preview = it.preview || null; this.cache.radial = null; this.audio.play('tick'); this.haptics.pulse(0);
      };
      box.append(b);
    });
    // panneau : aperçu visuel (1er toucher), confirmation de vente, ou fiche courte de la tourelle
    const armed = items.find((i) => i.key === this.armed);
    let node;
    if (armed && armed.panel) node = this.upgradePanel(armed.panel);
    else if (armed && armed.info) node = el('div', 'info', armed.info);
    else if (t) { const rar = RARITY[t.level - 1]; node = el('div', 'info', `<b style="color:${rar.color}">${t.label}</b><span class="lv">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= t.level ? 'on' : ''}" style="--rar:${rar.color}"></i>`).join('')}</span><small>${icon('sword')}<b class="dmg">${short(t.dmg)}</b> dégâts · ${icon('skull')}<b class="kills">${t.kills}</b> kills</small><small class="hint">${t.upgradeOptions().length ? 'Touche UP pour voir l\'amélioration' : 'Niveau maximum'}</small>`); }
    else node = el('div', 'info', slot.kind === 'mine' ? '<b>Zone de mine</b><small class="hint">Choisis une mine</small>' : '<b>Choisis une tourelle</b><small class="hint">Touche-la pour voir ses stats</small>');
    node.classList.add('rpanel'); box.append(node);
    this.placePanel(node, cx, cy, R, slot, host);
  },
  updateRadial() {
    const g = this.game, slot = g.menuSlot;
    if (!slot || g.over) { if (!$('#radial').hidden) { $('#radial').hidden = true; g.menuSlot = null; } return; }
    const t = slot.tower;
    const afford = t ? t.upgradeOptions().map((o) => (o.locked ? 'L' : g.money >= o.cost ? 1 : 0)).join('') : g.buildable(slot).map((k) => (g.money >= g.costOf(k) ? 1 : 0)).join('');
    const key = [g.slots.indexOf(slot), t ? t.level + '|' + t.branch + '|' + t.mode : '', this.armed, afford, g.freeNext, this.armed ? Math.floor(g.money / 5) : ''].join('/');
    if (this.cache.radial !== key) { this.cache.radial = key; this.renderRadial(); }
    else if (t) { const d = $('#radial .dmg'), k = $('#radial .kills'); if (d) { d.textContent = short(t.dmg); k.textContent = t.kills; } }
  },
};
