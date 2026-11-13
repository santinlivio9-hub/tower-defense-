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
      const open = el('button', 'btn sm green' + (n ? '' : ' off'), 'Ouvrir'); open.onclick = () => { if (!d.chests[kind]) { this.audio.play('error'); return; } this.openChest(kind); };
      card.append(open, this.buyButton(c.cost, 'gems', 'Acheter', () => d.chests[kind]++, 'ghostgem'));
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
  openChest(kind) {
    const stage = el('div', 'chest-stage'), c = CHESTS[kind];
    stage.innerHTML = `<div class="rays"></div><div class="chest">${chestSvg(kind)}</div><p class="sub tap">Touche le coffre pour l'ouvrir</p><div class="lcards"></div>`;
    const chest = $('.chest', stage), cards = $('.lcards', stage), tap = $('.tap', stage);
    let state = 0;
    const done = el('button', 'btn primary', 'Super !'); done.style.visibility = 'hidden';
    done.onclick = () => { this.closeOverlay(); this.refreshGems(); this.show(this.screen); };
    stage.append(done);
    chest.onclick = () => {
      if (state) return; state = 1; tap.style.visibility = 'hidden';
      chest.classList.add('shake'); this.audio.play('sheet'); this.haptics.pulse(1);
      const rattle = setInterval(() => { this.audio.play('tick'); this.haptics.pulse(0); }, 110);
      setTimeout(() => {
        clearInterval(rattle);
        const loot = this.save.openChest(kind) || [];
        chest.classList.remove('shake'); chest.classList.add('open'); chest.innerHTML = chestSvg(kind, true);
        stage.classList.add('burst'); this.audio.play('chest'); this.haptics.pulse(2);
        loot.forEach((l, i) => {
          const front = l.kind === 'gems' ? `${gem('big')}<b>+${l.n}</b><small>gemmes</small>` : `${boostArt(l.id)}<b>×${l.n}</b><small>${BOOSTS[l.id].name}</small>`;
          const card = el('div', 'lcard' + (l.kind === 'boost' && (l.id === 'shield' || l.id === 'revive') ? ' rare' : ''), `<div class="in"><div class="back">${icon('star')}</div><div class="front">${front}</div></div>`);
          card.style.setProperty('--i', i); cards.append(card);
          setTimeout(() => { card.classList.add('flip'); this.audio.play('card'); this.haptics.pulse(1); }, 900 + i * 420);
        });
        setTimeout(() => { done.style.visibility = ''; }, 1100 + loot.length * 420);
      }, 900);
    };
    this.openOverlay(stage);
  },
};
