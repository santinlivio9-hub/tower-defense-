// Niveau de joueur (XP), talents, inventaire de boosts et coffres. Méthodes ajoutées à la classe UI (voir la fin de ui.js).
import { XP, TALENTS, BOOSTS, BOOST_ORDER, CHESTS, RARITY } from './config.js';
import { icon, gem } from './icons.js';
import { boostArt } from './boosts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const pips = (n, max) => `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
const boostIco = (id, cls = '') => `<i class="bico ${cls}" style="--bc:${BOOSTS[id].color}">${icon(BOOSTS[id].icon)}</i>`;

// Coffre dessiné en SVG (fermé ou ouvert)
export function chestSvg(kind, open = false) {
  const c = kind === 'gold' ? ['#ffe27a', '#f0a81d', '#b8721a', '#fff6c8'] : ['#d9a566', '#b27a40', '#7a4a22', '#f3d9a8'];
  const lid = `<g transform="${open ? 'rotate(-32 14 52) translate(0 -6)' : ''}"><path d="M12 52 Q12 18 60 18 Q108 18 108 52 Z" fill="${c[0]}" stroke="#3d2c4e" stroke-width="5" stroke-linejoin="round"/><path d="M34 22 V52 M86 22 V52" stroke="${c[2]}" stroke-width="7"/><path d="M24 40 Q30 26 46 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/></g>`;
  return `<svg viewBox="0 0 120 112" class="chest-svg">${open ? `<ellipse cx="60" cy="52" rx="44" ry="12" fill="#fff6c8"/><path d="M22 52 L38 6 L50 52 Z M52 52 L60 0 L70 52 Z M72 52 L86 8 L98 52 Z" fill="#fff6c8" opacity=".85"/>` : ''}
    <ellipse cx="60" cy="104" rx="48" ry="7" fill="rgba(0,0,0,.3)"/>
    <rect x="12" y="50" width="96" height="52" rx="9" fill="${c[1]}" stroke="#3d2c4e" stroke-width="5"/><path d="M34 52 V100 M86 52 V100" stroke="${c[2]}" stroke-width="7"/>
    <path d="M18 62 H102" stroke="${c[3]}" stroke-width="3" opacity=".5"/>${lid}
    <rect x="50" y="46" width="20" height="24" rx="6" fill="#ffd23f" stroke="#3d2c4e" stroke-width="4"/><circle cx="60" cy="57" r="3.5" fill="#3d2c4e"/></svg>`;
}

export const Loot = {
  // ------------------------------------------------------------------ menu : barre d'XP et pastilles
  // ------------------------------------------------------------------ boutique : coffres et boosts
  renderShopChests(grid) {
    const d = this.save.data;
    const row = el('div', 'chest-row');
    for (const [kind, c] of Object.entries(CHESTS)) {
      const n = d.chests[kind], card = el('div', 'chest-card' + (n ? ' has' : ''), `${chestSvg(kind)}<b>${c.name}</b><small>${c.cards} cartes · gemmes et boosts</small>${n ? `<em>×${n}</em>` : ''}`);
      if (n) { const open = el('button', 'btn sm green cta', 'Ouvrir'); open.onclick = () => { if (!d.chests[kind]) { this.audio.play('error'); return; } this.openChest(kind); }; card.append(open); }
      card.append(this.buyButton(c.cost, 'gems', 'Acheter', () => d.chests[kind]++, 'ghostgem'));
      row.append(card);
    }
    grid.append(row, el('p', 'hint', 'Tu gagnes aussi des coffres en montant de niveau, en battant les boss et en terminant les défis.'));
  },
  renderShopBoosts(grid) {
    const d = this.save.data, g = el('div', 'cgrid');
    for (const id of BOOST_ORDER) {
      const b = BOOSTS[id], R = RARITY[b.rarity || 0];
      const c = el('div', 'ccard boost shop', `<span class="cc-art">${boostArt(id)}</span><b>${b.name}</b><small class="rar">${R.name}</small><i class="qty">×${d.boosts[id] || 0}</i>`);
      c.style.setProperty('--cc', R.color);
      c.append(this.buyButton(b.cost, b.cur || 'gems', '', () => (d.boosts[id] = (d.boosts[id] || 0) + 1)));
      c.querySelector('.cc-art').onclick = () => this.boostSheet && this.boostSheet(id);
      g.append(c);
    }
    grid.append(g, el('p', 'hint', 'Les boosts sont utilisables directement en partie. Ceux que tu n\'utilises pas restent dans ton stock.'));
  },
  // Ouverture animée : secousse, explosion de lumière, cartes qui se retournent
  // Ouverture : on tape 3 fois (le coffre tremble de plus en plus, la lumière filtre), il explose de lumière,
  // puis les cartes sortent et se retournent une à une, de la plus commune à la plus rare.
  openChest(kind) {
    const stage = el('div', 'chest-stage'), c = CHESTS[kind], TAPS = 3;
    stage.innerHTML = `<div class="rays"></div><div class="chest">${chestSvg(kind)}<i class="crack"></i></div><p class="sub tap">Touche le coffre !</p><div class="taps">${'<i></i>'.repeat(TAPS)}</div><div class="lcards"></div>`;
    const chest = $('.chest', stage), cards = $('.lcards', stage), tap = $('.tap', stage);
    let taps = 0, opened = false;
    const done = el('button', 'btn primary', 'Super !'); done.style.visibility = 'hidden';
    done.onclick = () => { this.closeOverlay(); this.refreshGems(); this.show(this.screen, true); };
    stage.append(done);
    const rar = (l) => (l.kind === 'coins' ? 0 : l.kind === 'gems' ? 1 + (l.n >= 25 ? 1 : 0) : 1 + (BOOSTS[l.id].rarity || 0));
    chest.onclick = () => {
      if (opened) return;
      taps++; $$('.taps i', stage).forEach((d, i) => d.classList.toggle('on', i < taps));
      stage.style.setProperty('--crack', taps / TAPS);
      chest.classList.remove('hit1', 'hit2', 'hit3'); void chest.offsetWidth; chest.classList.add('hit' + taps);
      this.audio.play(taps < TAPS ? 'hit' : 'sheet'); this.audio.play('tick'); this.haptics.pulse(taps < TAPS ? 1 : 2);
      tap.textContent = taps < TAPS ? `Encore ${TAPS - taps} !` : '';
      if (taps < TAPS) return;
      opened = true;
      chest.classList.add('shake');
      const rattle = setInterval(() => { this.audio.play('tick'); this.haptics.pulse(0); }, 90);
      setTimeout(() => {
        clearInterval(rattle);
        const loot = (this.save.openChest(kind) || []).sort((x, y) => rar(x) - rar(y));
        chest.classList.remove('shake'); chest.classList.add('open'); chest.innerHTML = chestSvg(kind, true);
        stage.classList.add('burst'); this.audio.play('chest'); this.audio.play('explosion'); this.haptics.pulse(2);
        let t = 700;
        loot.forEach((l, i) => {
          const r = rar(l), front = l.kind === 'coins' ? `<i class="coin-ico big"></i><b>+${l.n}</b><small>pièces</small>` : l.kind === 'gems' ? `${gem('big')}<b>+${l.n}</b><small>gemmes</small>` : `${boostArt(l.id)}<b>×${l.n}</b><small>${BOOSTS[l.id].name}</small>`;
          const card = el('div', 'lcard r' + Math.min(4, r) + (r >= 3 ? ' rare' : ''), `<div class="in"><div class="back">${icon('star')}</div><div class="front">${front}</div></div>`);
          card.style.setProperty('--i', i); cards.append(card);
          t += r >= 3 ? 900 : 420;   // les cartes rares se font attendre
          setTimeout(() => {
            card.classList.add('flip'); this.audio.play(r >= 3 ? 'legendary' : 'card'); this.haptics.pulse(r >= 3 ? 2 : 1);
            if (r >= 3) { stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash'); }
          }, t);
        });
        setTimeout(() => { done.style.visibility = ''; }, t + 500);
      }, 700);
    };
    this.openOverlay(stage);
  },
};
