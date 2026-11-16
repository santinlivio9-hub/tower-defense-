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
        items.push({ key: type, cls: isNew ? 'isnew' : '', cost, art: towerImg(type, 42, skin), price: cost, free: cost === 0, label: isNew ? 'NOUVEAU' : '',
          panel: { kind: 'build', type, cur: st, name: cfg.name, desc: cfg.desc, poor: g.money < cost, cost },
          preview: { r: type === 'mine' ? st.splash : st.range, mode: g.money < cost ? 'bad' : 'ok' },
          confirm: () => { if (g.money < g.costOf(type)) { this.audio.play('error'); this.haptics.pulse(1); this.radialLive(true); return; } if (g.placeTower(type, slot)) { const h = this.save.data.hintTowers || []; if (h.includes(type)) { this.save.data.hintTowers = h.filter((x) => x !== type); this.save.persist(); } this.openMenu(null); } else this.haptics.pulse(1); } });
      }
      return items;
    }
    for (const o of t.upgradeOptions()) {
      if (o.locked) { // amélioration légendaire pas encore débloquée par la campagne
        const n = UNLOCKS.legend[t.type], at = LEVELS[Math.max(0, n - 2)].id;
        items.push({ key: 'lock', cls: 'up br locked', isBranch: true, art: towerImg(t.type, 42, skin, o.level, o.branch), label: 'Légendaire', tap: () => { this.audio.play('error'); this.toast(`${o.name} : verrouillée`, `Bats le niveau ${at} pour débloquer les améliorations légendaires`, icon('lock')); } });
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
    const foot = el('div', 'upp-foot', `<em class="upp-ok"></em><b class="upp-cost">${coin()}<span>${p.cost}</span></b>`);
    box.append(foot); box.dataset.cost = p.cost; this.panelMoney(box);
    return box;
  },
  // pied du panneau selon l'argent du moment : prix rouge et « Il manque X », ou « Touche encore pour valider »
  panelMoney(box) {
    const g = this.game, cost = +box.dataset.cost, poor = g.money < cost, ok = $('.upp-ok', box);
    box.classList.toggle('poor', poor);
    const html = poor ? `Il manque ${Math.ceil(cost - g.money)} pièces` : `${icon('check')}Touche encore pour valider`;
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
  renderRadial() {
    const g = this.game, box = $('#radial'), slot = g && g.menuSlot;
    this._rad = null;
    if (!slot || g.over) { box.hidden = true; box.innerHTML = ''; return; }
    const items = this.menuItems(slot), t = slot.tower;
    box.hidden = false; box.innerHTML = '';
    const host = box.getBoundingClientRect(), p = this.toScreen(slot.x, slot.y), n = items.length;
    const ups = items.filter((i) => !i.side);
    // rayon : juste ce qu'il faut pour que les boutons (et les noms des branches) ne se touchent pas
    const R = t ? (ups.length > 2 ? RADIAL.rTower3 : ups.length > 1 ? RADIAL.rTower2 : RADIAL.rTower) : Math.max(RADIAL.rBuild, (n * RADIAL.buildGap) / (2 * Math.PI));
    const gl = $('#goals'), top = Math.max($('#hud').getBoundingClientRect().bottom, gl && !gl.hidden ? gl.getBoundingClientRect().bottom : 0) - host.top + 6, bot = $('#dock').getBoundingClientRect().top - host.top - 6;
    box.classList.toggle('build', !t);
    // angles : UP en haut, ciblage à gauche, vente en bas ; « spread » écarte les branches sur les côtés
    const ang = (it, i, spread) => {
      if (!t) return n === 1 ? -90 : -90 + (360 / n) * i;
      if (it.side === 'left') return spread ? 135 : 158; if (it.side === 'bottom') return 90;
      const k = ups.indexOf(it);
      if (ups.length === 1) return -90;
      if (ups.length === 3) return spread ? [-170, -90, -10][k] : [-150, -90, -30][k];
      return spread ? [-168, -12][k] : [-140, -40][k];
    };
    // encombrement de chaque bouton autour de son centre (nom au-dessus, prix ou libellé au-dessous)
    const ext = (it) => (it.isBranch ? { w: 56, up: 54, down: 40 } : { w: 40, up: it.label && !it.side ? 44 : 36, down: 44 });
    const tx = p.x - host.left, ty = p.y - host.top;
    const fits = (x, y, e) => x - e.w >= 6 && x + e.w <= host.width - 6 && y - e.up >= top && y + e.down <= bot;
    let pos;
    if (!t) {
      // choix d'une tourelle sur un emplacement vide : cercle complet, décalé pour tenir dans l'écran
      pos = items.map((it, i) => { const a = (ang(it, i) * Math.PI) / 180; return { x: tx + Math.cos(a) * R, y: ty + Math.sin(a) * R, e: ext(it) }; });
      const o = pos.reduce((o, q) => ({ l: Math.max(o.l, 6 - (q.x - q.e.w)), r: Math.max(o.r, q.x + q.e.w - (host.width - 6)), t: Math.max(o.t, top - (q.y - q.e.up)), b: Math.max(o.b, q.y + q.e.down - bot) }), { l: 0, r: 0, t: 0, b: 0 });
      for (const q of pos) { q.x += o.l - o.r; q.y += o.t - o.b; }
    } else {
      // Tourelle posée : le cercle reste centré sur elle, aucun bouton ne la recouvre.
      // 1) disposition habituelle (UP en haut, ciblage à gauche, vente en bas) si elle tient dans l'écran ;
      pos = items.map((it, i) => { const a = (ang(it, i) * Math.PI) / 180; return { x: tx + Math.cos(a) * R, y: ty + Math.sin(a) * R, e: ext(it) }; });
      if (!pos.every((q) => fits(q.x, q.y, q.e))) {
        // 2) sinon (bord de l'écran) : les boutons, dans le même ordre (ciblage, améliorations, vente), se répartissent
        //    sur l'arc de cercle libre le plus grand ; le rayon grandit si l'arc est trop court.
        const order = [...items.filter((i) => i.side === 'left'), ...ups, ...items.filter((i) => i.side === 'bottom')];
        const big = { w: 56, up: 54, down: 44 };
        const gap = (a, b) => (a.isBranch && b.isBranch ? 142 : a.isBranch || b.isBranch ? 114 : 100);   // distance mini entre deux voisins, nom et prix compris (px)
        let done = false;
        for (let RR = R; RR <= R + 130 && !done; RR += 10) {
          const ok = []; for (let d = 0; d < 360; d += 4) { const a = (d * Math.PI) / 180; ok.push(fits(tx + Math.cos(a) * RR, ty + Math.sin(a) * RR, big)); }
          // plus grand arc libre (en degrés), en tenant compte du passage 359 → 0
          let bestS = -1, bestL = 0;
          for (let st = 0; st < 90; st++) { if (!ok[st] || ok[(st + 89) % 90]) continue; let L = 0; while (L < 90 && ok[(st + L) % 90]) L++; if (L > bestL) { bestL = L; bestS = st; } }
          if (ok.every(Boolean)) { bestS = 0; bestL = 90; }
          const need = order.slice(1).reduce((acc, it, k) => acc + (2 * Math.asin(Math.min(1, gap(order[k], it) / (2 * RR))) * 180) / Math.PI, 0);
          if (bestS < 0 || bestL * 4 < need) continue;
          let a = bestS * 4 + (bestL * 4 - need) / 2;
          pos = new Array(items.length);
          order.forEach((it, k) => {
            if (k) a += (2 * Math.asin(Math.min(1, gap(order[k - 1], it) / (2 * RR))) * 180) / Math.PI;
            const r = (a * Math.PI) / 180; pos[items.indexOf(it)] = { x: tx + Math.cos(r) * RR, y: ty + Math.sin(r) * RR, e: ext(it) };
          });
          done = true;
        }
        // 3) aucun arc ne suffit (coin de l'écran, petit téléphone) : deux rangées sous la tourelle (ou au-dessus si
        //    elle est en bas) — améliorations d'abord, puis ciblage et vente
        if (!done) {
          const down = ty < (top + bot) / 2, dir = down ? 1 : -1, row1 = ty + dir * (down ? 26 + 54 + 8 : 26 + 44 + 8), row2 = row1 + dir * 112;
          const clampX = (x, e) => Math.max(6 + e.w, Math.min(host.width - 6 - e.w, x));
          ups.forEach((it, k) => { const e = ext(it); pos[items.indexOf(it)] = { x: clampX(tx + (k - (ups.length - 1) / 2) * 118, e), y: row1, e }; });
          const side = items.filter((i) => i.side);
          side.forEach((it, k) => { const e = ext(it); pos[items.indexOf(it)] = { x: clampX(tx + (side.length === 1 ? 0 : k ? 52 : -52), e), y: row2, e }; });
          // si la 1re rangée a été poussée contre un bord, la 2e se cale dessous sans la chevaucher
        }
      }
    }
    const cx = tx, cy = ty, Rn = Math.max(R, ...pos.map((q) => Math.hypot(q.x - tx, q.y - ty)));
    const btns = {};
    items.forEach((it, i) => {
      const b = el('button', 'rb ' + (it.cls || ''));
      b.style.cssText = `left:${pos[i].x}px;top:${pos[i].y}px;--i:${i}`;
      if (typeof it.art === 'string') b.innerHTML = it.art; else b.append(it.art);
      if (it.isBranch) b.append(el('span', 'lab name', it.label));   // nom de la branche, toujours visible
      else if (it.label) b.append(el('span', 'lab' + (it.side === 'left' ? ' under' : ''), it.label));
      if (it.price != null) b.append(el('span', 'price', it.free ? 'GRATUIT' : coin() + it.price));
      if (it.gain != null) b.append(el('span', 'price gain', '+' + it.gain + coin()));
      b.append(el('span', 'ok', icon('check')));
      // pointerdown puis pointerup sur le même bouton (éléments stables) ; clic clavier en secours
      b.addEventListener('pointerdown', (e) => { this._rbDown = it.key; b.classList.add('press'); e.stopPropagation(); });
      b.addEventListener('pointerup', (e) => { b.classList.remove('press'); if (this._rbDown !== it.key) return; this._rbDown = null; e.preventDefault(); this.radialTap(it); });
      b.addEventListener('pointercancel', () => { b.classList.remove('press'); this._rbDown = null; });
      b.addEventListener('pointerleave', () => b.classList.remove('press'));
      b.addEventListener('click', (e) => { if (e.detail === 0) this.radialTap(it); });   // clavier (touches 1 à 9)
      box.append(b); btns[it.key] = b;
    });
    // emprise réelle de chaque bouton (nom sur 2 lignes, prix), mesurée une fois affiché, pour placer le panneau
    box.classList.add('measure');   // mesure sans l'animation d'apparition (taille finale)
    const boxes = Object.values(btns).map((b) => { const qs = [b, ...b.querySelectorAll('.lab, .price')].map((e) => e.getBoundingClientRect()).filter((q) => q.width); return { l: Math.min(...qs.map((q) => q.left)) - host.left - 3, r: Math.max(...qs.map((q) => q.right)) - host.left + 3, t: Math.min(...qs.map((q) => q.top)) - host.top - 3, b: Math.max(...qs.map((q) => q.bottom)) - host.top + 3 }; });
    box.classList.remove('measure');
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
    if (armed && armed.panel) node = this.upgradePanel(armed.panel);
    else if (armed && armed.info) node = el('div', 'info', armed.info);
    else if (t) { const rar = RARITY[t.level - 1]; node = el('div', 'info', `<b style="color:${rar.color}">${t.label}</b><span class="lv">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= t.level ? 'on' : ''}" style="--rar:${rar.color}"></i>`).join('')}</span><small>${icon('sword')}<b class="dmg">${short(t.dmg)}</b> dégâts · ${icon('skull')}<b class="kills">${t.kills}</b> kills</small><small class="hint">${t.upgradeOptions().length ? 'Touche UP pour voir l\'amélioration' : 'Niveau maximum'}</small>`); }
    else node = el('div', 'info', slot.kind === 'mine' ? '<b>Zone de mine</b><small class="hint">Choisis une mine</small>' : '<b>Choisis une tourelle</b><small class="hint">Touche-la pour voir ses stats</small>');
    node.classList.add('rpanel');
    if (R0.panel) R0.panel.replaceWith(node); else $('#radial').append(node);
    R0.panel = node; R0.panelKey = key;
    this.placePanel(node, R0.cx, R0.cy, R0.R, slot, R0.host, R0.boxes);
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
    if (R0.panel && R0.panel.dataset.cost) this.panelMoney(R0.panel);
    const armed = R0.items.find((i) => i.key === this.armed); if (armed && armed.preview) g.preview = armed.preview;
  },
  updateRadial() {
    const g = this.game, slot = g.menuSlot;
    if (!slot || g.over) { if (!$('#radial').hidden) { $('#radial').hidden = true; $('#radial').innerHTML = ''; this._rad = null; g.menuSlot = null; } return; }
    const t = slot.tower;
    // structure seulement : l'argent et le choix en cours ne reconstruisent jamais le menu
    const opts = t ? t.upgradeOptions().map((o) => (o.locked ? 'L' : o.level + ':' + (o.branch ?? ''))).join(',') : g.buildable(slot).join(',');
    const key = [g.slots.indexOf(slot), t ? t.level + '|' + t.branch + '|' + t.mode : '', opts, g.freeNext].join('/');
    if (this.cache.radial !== key || !this._rad) { this.cache.radial = key; this.renderRadial(); return; }
    this.radialLive(false);
    if (t) { const d = $('#radial .dmg'), k = $('#radial .kills'); if (d) { const v = short(t.dmg); if (d.textContent !== v) d.textContent = v; if (k.textContent !== String(t.kills)) k.textContent = t.kills; } }
  },
};
