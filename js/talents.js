// Arbre de talents visuel : un tronc (niveau du joueur) et 3 branches de nœuds ronds reliés par
// des lignes qui s'illuminent (un « courant » les parcourt) quand le nœud suivant est accessible.
import { TALENTS } from './config.js';
import { icon } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const COLS = [17, 50, 83];                    // x (%) des 3 branches
const ROWS = [78, 61, 44, 27];                // y (%) des 4 nœuds de chaque branche
const ROOT = [50, 95];

export const Talents = {
  renderTalents() {
    const sv = this.save, d = sv.data, box = $('#talents-content');
    $('#talent-pts').textContent = d.talentPts;
    $('#screen-talents .chip.pts').classList.toggle('glow', d.talentPts > 0);
    box.innerHTML = '';
    const tree = el('div', 'ttree');
    const branches = Object.entries(TALENTS);
    // lignes (SVG en pourcentages)
    let paths = '';
    branches.forEach(([bid, br], bi) => {
      const x = COLS[bi];
      const seg = (x0, y0, x1, y1, lit, cls = '') => {
        const my = (y0 + y1) / 2, dd = `M${x0} ${y0} C${x0} ${my} ${x1} ${my} ${x1} ${y1}`;
        paths += `<path d="${dd}" class="tl-base"/>` + (lit ? `<path d="${dd}" class="tl-lit ${cls}" style="stroke:${br.color}"/><path d="${dd}" class="tl-flow"/>` : '');
      };
      seg(ROOT[0], ROOT[1], x, ROWS[0], true);
      br.nodes.forEach((n, i) => { if (i) seg(x, ROWS[i - 1], x, ROWS[i], sv.talentOpen(bid, n), this.talentCharge === n.id ? 'charge' : ''); });
    });
    tree.innerHTML = `<svg class="tlines" viewBox="0 0 100 100" preserveAspectRatio="none">${paths}</svg>`;
    // tronc
    tree.append(Object.assign(el('div', 'troot', `<span class="lvl">${d.level}</span><small>Niveau</small>`), { style: `left:${ROOT[0]}%;top:${ROOT[1]}%` }));
    // nœuds
    branches.forEach(([bid, br], bi) => {
      tree.append(Object.assign(el('div', 'tbranch', `${icon(br.icon)}<b>${br.name}</b><small>${sv.branchPoints(bid)} pts</small>`), { style: `left:${COLS[bi]}%;--bc:${br.color}` }));
      br.nodes.forEach((n, i) => {
        const rank = sv.talent(n.id), open = sv.talentOpen(bid, n), can = sv.canTalent(bid, n);
        const b = el('button', 'tn' + (rank ? ' has' : '') + (rank >= n.max ? ' max' : '') + (open ? '' : ' locked') + (can ? ' can' : '') + (this.talentSel === n.id ? ' sel' : '') + (this.talentCharge === n.id ? ' pop' : ''),
          `<span class="tn-in">${icon(open ? n.icon : 'lock')}</span><em>${rank}/${n.max}</em>`);
        b.style.cssText = `left:${COLS[bi]}%;top:${ROWS[i]}%;--bc:${br.color}`;
        b.onclick = () => { this.talentSel = n.id; this.audio.play('click'); this.renderTalents(); };
        tree.append(b);
      });
    });
    box.append(tree);
    // fiche du nœud choisi
    const sel = this.talentSel && branches.flatMap(([bid, br]) => br.nodes.map((n) => [bid, br, n])).find(([, , n]) => n.id === this.talentSel);
    const card = el('div', 'tcard glass');
    if (sel) {
      const [bid, br, n] = sel, rank = sv.talent(n.id), open = sv.talentOpen(bid, n), ns = br.nodes, i = ns.indexOf(n);
      card.style.setProperty('--bc', br.color);
      card.innerHTML = `<span class="tc-ico">${icon(n.icon)}</span><div class="tc-txt"><b>${n.name}</b><small>${n.desc}${n.max > 1 ? ' par rang' : ''}</small>
        <div class="pips">${Array.from({ length: n.max }, (_, k) => `<i class="${k < rank ? 'on' : ''}"></i>`).join('')}</div>
        ${open ? '' : `<small class="need">${icon('lock')}${i > 0 && !sv.talent(ns[i - 1].id) ? `Débloque d'abord « ${ns[i - 1].name} »` : `${n.need} points dans la branche`}</small>`}</div>`;
      const can = sv.canTalent(bid, n);
      // états : max = coche, possible = vif, pas de point = « Il manque », verrouillé = sombre + condition
      const btn = rank >= n.max ? el('button', 'owned wide', icon('check') + 'Rang max atteint')
        : can ? el('button', 'btn green can', icon('up') + 'Améliorer')
        : open ? el('button', 'btn green poor', `<span class="price">${icon('up')}Améliorer</span><small class="miss">Il manque 1 point de talent</small>`)
        : el('button', 'btn locked', icon('lock') + 'Verrouillé');
      btn.onclick = () => {
        if (!sv.canTalent(bid, n)) { this.audio.play('error'); this.haptics.pulse(1); if (!d.talentPts && rank < n.max) this.toast('Pas de point de talent', 'Monte de niveau de joueur pour en gagner', icon('talent')); return; }
        d.talents[n.id] = rank + 1; d.talentPts--; sv.persist();
        this.audio.play(rank + 1 >= n.max ? 'legendary' : 'upgrade'); this.haptics.pulse(2);
        // le courant part vers le nœud suivant quand il devient accessible
        const nx = ns[i + 1]; this.talentCharge = rank === 0 && nx ? nx.id : n.id;
        this.renderTalents(); setTimeout(() => { this.talentCharge = null; }, 900);
        this.tabBadges();
      };
      card.append(btn);
    } else card.innerHTML = `<span class="tc-ico">${icon('talent')}</span><div class="tc-txt"><b>${d.talentPts ? `${d.talentPts} point${d.talentPts > 1 ? 's' : ''} à placer` : 'Arbre de talents'}</b><small>Touche un nœud pour le voir. Gagne des points en montant de niveau.</small></div>`;
    box.append(card);
    const spent = Object.values(d.talents).reduce((a, b) => a + b, 0);
    if (spent) {
      const rs = el('button', 'btn ghost sm reset', icon('restart') + 'Récupérer mes points');
      rs.onclick = () => { d.talentPts += spent; d.talents = {}; sv.persist(); this.talentSel = null; this.audio.play('sell'); this.renderTalents(); this.tabBadges(); };
      box.append(rs);
    }
  },
};
