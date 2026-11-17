// Arbre de talents, lu de haut en bas : le niveau du joueur en haut, puis 3 branches de 6 talents (le dernier : ULTIME).
// Chaque nœud : icône illustrée, anneau qui se remplit selon les rangs, pastille « 2/5 » et nom dessous.
// Toucher un nœud ouvre une bulle (effet actuel → effet suivant, bouton Améliorer).
import { TALENTS, TALENT_ROWS, TALENT_RESPEC, XP } from './config.js';
import { icon, gem } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const COLS = [17, 50, 83];                     // x (%) des 3 branches
const ROOT_Y = 40, HEAD_Y = 112, ROWS = [210, 362, 514, 666, 818, 978], TREE_H = 1090;   // y (px)

// Valeur d'un talent à un rang donné, d'après son texte « fx » (config) : {v} = per × rang (× 100 si pct)
export function talentEffect(n, r) {
  const v = n.pct ? Math.round(n.per * r * 100) : n.per * r;
  return n.fx.replace('{v}', v);
}
// Effet court sous un nœud : « +4 → +6 % » (actuel → suivant), ou la valeur atteinte au rang maximum
export function talentShort(n, r) {
  if (n.ult) return r ? 'Actif' : 'Ultime';
  const m = /^(.*?)\{v\}(\s?%?)/.exec(n.fx), val = (k) => (m[1] || '') + (n.pct ? Math.round(n.per * k * 100) : n.per * k), u = (m[2] || '').trim();
  if (r >= n.max) return val(r) + (u ? ' ' + u : '');
  return `${r ? val(r) : '0'} → ${val(r + 1)}${u ? ' ' + u : ''}`;
}

export const Talents = {
  renderTalents() {
    const sv = this.save, d = sv.data, box = $('#talents-content');
    $('#talent-pts').textContent = d.talentPts;
    $('#screen-talents .chip.pts').classList.toggle('glow', d.talentPts > 0);
    box.innerHTML = '';
    box.append(el('p', 'thint', d.talentPts ? `<b>${d.talentPts} point${d.talentPts > 1 ? 's' : ''}</b> à placer : touche un talent qui brille` : 'Un point tous les 2 niveaux de joueur, et 1 par victoire Héroïque'));
    // barre vers le prochain point de talent (niveaux pairs)
    const nextLvl = d.level + (d.level % 2 ? 1 : 2), need = (() => { let n = XP.need(d.level) - d.xp; for (let l = d.level + 1; l < nextLvl; l++) n += XP.need(l); return n; })();
    const span = XP.need(d.level) + (nextLvl - d.level > 1 ? XP.need(d.level + 1) : 0), done = span - need;
    box.append(el('div', 'tnext', `${icon('talent')}<span><small>Prochain point au niveau ${nextLvl}</small><span class="qbar"><i style="width:${(done / span) * 100}%"></i><em>encore ${need} XP</em></span></span>`));
    const tree = el('div', 'ttree'); tree.style.height = TREE_H + 'px';
    const branches = Object.entries(TALENTS);
    // lignes (x en %, y en px : le SVG garde l'échelle verticale)
    let paths = '';
    branches.forEach(([bid, br], bi) => {
      const x = COLS[bi];
      const seg = (x0, y0, x1, y1, lit, cls = '') => {
        const my = (y0 + y1) / 2, dd = `M${x0} ${y0} C${x0} ${my} ${x1} ${my} ${x1} ${y1}`;
        paths += `<path d="${dd}" class="tl-base"/>` + (lit ? `<path d="${dd}" class="tl-lit ${cls}" style="stroke:${br.color}"/><path d="${dd}" class="tl-flow"/>` : '');
      };
      seg(50, ROOT_Y, x, ROWS[0], true);
      br.nodes.forEach((n, i) => { if (i) seg(x, ROWS[i - 1], x, ROWS[i], sv.talentOpen(bid, n), this.talentCharge === n.id ? 'charge' : ''); });
    });
    tree.innerHTML = `<svg class="tlines" viewBox="0 0 100 ${TREE_H}" preserveAspectRatio="none">${paths}</svg>`;
    tree.append(Object.assign(el('div', 'troot', `<span class="lvl">${d.level}</span><small>Niveau</small>`), { style: `left:50%;top:${ROOT_Y}px` }));
    let selNode = null;
    branches.forEach(([bid, br], bi) => {
      tree.append(Object.assign(el('div', 'tbranch', `${icon(br.icon)}<b>${br.name}</b><small>${sv.branchPoints(bid)} pts</small>`), { style: `left:${COLS[bi]}%;top:${HEAD_Y}px;--bc:${br.color}` }));
      br.nodes.forEach((n, i) => {
        const rank = sv.talent(n.id), open = sv.talentOpen(bid, n), can = sv.canTalent(bid, n), max = rank >= n.max;
        const st = max ? 'max' : !open ? 'locked' : can ? 'can' : rank ? 'has' : 'open', rowLock = !sv.talentRowOk(bid, n);
        const b = el('button', `tn ${st}` + (n.ult ? ' ult' : '') + (this.talentSel === n.id ? ' sel' : '') + (this.talentCharge === n.id ? ' pop' : ''),
          `<span class="tn-ring"></span><span class="tn-in">${icon(n.icon)}</span>${rowLock ? `<i class="tn-badge lvl">Niv.${TALENT_ROWS[i]}</i>` : !open ? `<i class="tn-badge lock">${icon('lock')}</i>` : max ? `<i class="tn-badge star">${icon('star')}</i>` : ''}
           <em class="tn-rk">${rank}/${n.max}</em><small class="tn-name">${n.name}<span class="tn-fx">${talentShort(n, rank)}</span></small>`);
        b.style.cssText = `left:${COLS[bi]}%;top:${ROWS[i]}px;--bc:${br.color};--p:${rank / n.max}`;
        b.setAttribute('aria-label', `${n.name}, rang ${rank} sur ${n.max}`);
        b.onclick = () => { this.talentSel = this.talentSel === n.id ? null : n.id; this.audio.play('click'); this.haptics.pulse(0); this.renderTalents(); };
        tree.append(b);
        if (this.talentSel === n.id) selNode = { bid, br, n, i, bi };
      });
    });
    box.append(tree);
    if (selNode) this.talentBubble(tree, selNode);
    // Respécialisation contre des gemmes : 1er toucher = demande de confirmation, 2e toucher = tous les points rendus
    const spent = sv.talentsSpent();
    if (spent) {
      const C = TALENT_RESPEC.gems, rs = el('button', 'btn ghost sm reset' + (d.gems < C ? ' poor' : ''), `${icon('restart')}Respécialiser · ${gem()}${C}`);
      let armed = false;
      rs.onclick = () => {
        if (d.gems < C) { this.audio.play('error'); this.toast('Pas assez de gemmes', `Il en faut ${C} pour récupérer tes ${spent} points`, gem()); return; }
        if (!armed) { armed = true; rs.classList.add('armed'); rs.innerHTML = `${icon('check')}Récupérer ${spent} points pour ${gem()}${C} ?`; this.audio.play('tick'); return; }
        if (sv.respec()) { this.talentSel = null; this.audio.play('sell'); this.haptics.pulse(1); this.refreshGems && this.refreshGems(); this.toast('Points récupérés', `${spent} points de talent à replacer`, icon('talent')); this.renderTalents(); this.tabBadges(); }
      };
      box.append(rs, el('p', 'thint small', `Respécialiser rend tous tes points (${C} gemmes).`));
    }
  },
  // Bulle d'un talent : nom, effet actuel → suivant, condition ou bouton Améliorer
  talentBubble(tree, { bid, br, n, i, bi }) {
    const sv = this.save, d = sv.data, rank = sv.talent(n.id), open = sv.talentOpen(bid, n), ns = br.nodes, max = rank >= n.max;
    const W = tree.clientWidth || 360, x = (COLS[bi] / 100) * W, below = i < ROWS.length - 1;
    const bw = Math.min(270, W - 16), left = Math.max(8, Math.min(W - bw - 8, x - bw / 2));
    const need = !sv.talentRowOk(bid, n) ? `Se débloque au niveau de joueur ${TALENT_ROWS[i]} (tu es niveau ${d.level})` : !open ? (i > 0 && !sv.talent(ns[i - 1].id) ? `Débloque d'abord « ${ns[i - 1].name} »` : `Nécessite ${n.need} pts dans la branche ${br.name}`) : '';
    const bub = el('div', 'tbubble' + (below ? '' : ' up'), `<i class="tb-arrow" style="left:${x - left}px"></i>
      <div class="tb-head"><span class="tb-ico" style="--bc:${br.color}">${icon(n.icon)}</span><span><b>${n.name}</b><small>Rang ${rank}/${n.max} · ${n.desc}${n.max > 1 ? ' par rang' : ''}</small></span></div>
      ${n.ult ? '<em class="tb-ult">TALENT ULTIME</em>' : ''}
      <div class="fx-big">${max ? `<b>${talentEffect(n, rank)}</b>` : `<span>${rank ? talentEffect(n, rank) : 'Aucun'}</span><i>${icon('arrowup')}</i><b>${talentEffect(n, rank + 1)}</b>`}</div>
      ${need ? `<p class="tb-need">${icon('lock')}${need}</p>` : ''}`);
    bub.style.cssText = `left:${left}px;width:${bw}px;top:${below ? ROWS[i] + 76 : ROWS[i] - 52}px`;
    const can = sv.canTalent(bid, n);
    const btn = max ? el('span', 'owned wide', icon('check') + 'Rang maximum')
      : can ? el('button', 'btn green can', icon('arrowup') + 'Améliorer')
      : open ? el('button', 'btn green poor', `<span class="price">${icon('arrowup')}Améliorer</span><small class="miss">Il manque 1 point de talent</small>`)
      : el('button', 'btn locked', icon('lock') + 'Verrouillé');
    btn.onclick = () => {
      if (!sv.canTalent(bid, n)) { this.audio.play('error'); this.haptics.pulse(1); if (!d.talentPts && rank < n.max) this.toast('Pas de point de talent', 'Monte de niveau de joueur pour en gagner', icon('talent')); return; }
      d.talents[n.id] = rank + 1; d.talentPts--; sv.persist();
      this.audio.play(rank + 1 >= n.max ? 'legendary' : 'upgrade'); this.haptics.pulse(1);
      const nx = ns[i + 1]; this.talentCharge = rank === 0 && nx ? nx.id : n.id;
      this.renderTalents(); setTimeout(() => { this.talentCharge = null; }, 900);
      this.tabBadges();
    };
    bub.append(btn);
    tree.append(bub);
    if (!below) bub.style.top = ROWS[i] - 52 - bub.offsetHeight + 'px';
    requestAnimationFrame(() => { const sc = $('#talents-scroll'), r = bub.getBoundingClientRect(), s = sc.getBoundingClientRect(); if (r.bottom > s.bottom - 8) sc.scrollBy({ top: r.bottom - s.bottom + 16, behavior: 'smooth' }); else if (r.top < s.top) sc.scrollBy({ top: r.top - s.top - 16, behavior: 'smooth' }); });
  },
};
