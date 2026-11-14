// Niveau de joueur (XP), talents, inventaire de boosts et coffres. Méthodes ajoutées à la classe UI (voir la fin de ui.js).
import { XP, TALENTS, BOOSTS, BOOST_ORDER, CHESTS, CHEST_ORDER, RARITY, OFFER, SHOP } from './config.js';
import { untilMidnight } from './daily.js';
import { towerImg } from './sprites.js';
import { icon, gem } from './icons.js';
import { boostArt } from './boosts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const pips = (n, max) => `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
const boostIco = (id, cls = '') => `<i class="bico ${cls}" style="--bc:${BOOSTS[id].color}">${icon(BOOSTS[id].icon)}</i>`;

// Coffre dessiné en SVG (fermé ou ouvert) : bois, doré (reflet qui passe), légendaire violet (gemme)
const CHEST_COL = { wood: ['#d9a566', '#b27a40', '#7a4a22', '#f3d9a8'], gold: ['#ffe27a', '#f5b324', '#b8721a', '#fff6c8'], legend: ['#d9a6ff', '#9a5ce0', '#5a2a9a', '#f0dcff'] };
export function chestSvg(kind, open = false) {
  const c = CHEST_COL[kind] || CHEST_COL.wood, shine = !open && kind !== 'wood';
  const lid = `<g transform="${open ? 'rotate(-32 14 52) translate(0 -6)' : ''}"><path d="M12 52 Q12 18 60 18 Q108 18 108 52 Z" fill="${c[0]}" stroke="#3d2c4e" stroke-width="5" stroke-linejoin="round"/><path d="M34 22 V52 M86 22 V52" stroke="${c[2]}" stroke-width="7"/><path d="M24 34 Q40 24 58 24" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55"/></g>`;
  const lock = kind === 'legend'
    ? `<path d="M60 42l11 12-11 16-11-16z" fill="#5fd8ff" stroke="#3d2c4e" stroke-width="4" stroke-linejoin="round"/><path d="M53 52l7-7 3 3" stroke="#fff" stroke-width="2.5" fill="none" opacity=".8"/>`
    : `<rect x="50" y="46" width="20" height="24" rx="6" fill="#ffd23f" stroke="#3d2c4e" stroke-width="4"/><circle cx="60" cy="57" r="3.5" fill="#3d2c4e"/>`;
  const sweep = shine ? `<clipPath id="chc"><path d="M12 52 Q12 18 60 18 Q108 18 108 52 Z"/><rect x="12" y="50" width="96" height="52" rx="9"/></clipPath>
    <g clip-path="url(#chc)"><rect x="-70" y="0" width="22" height="112" fill="#fff" opacity=".6" transform="skewX(-22)"><animate attributeName="x" values="-70;190;190" keyTimes="0;.55;1" dur="2.6s" repeatCount="indefinite"/></rect></g>` : '';
  return `<svg viewBox="0 0 120 112" class="chest-svg ${kind}">${open ? `<ellipse cx="60" cy="52" rx="44" ry="12" fill="${kind === 'legend' ? '#f0dcff' : '#fff6c8'}"/><path d="M22 52 L38 6 L50 52 Z M52 52 L60 0 L70 52 Z M72 52 L86 8 L98 52 Z" fill="${kind === 'legend' ? '#f0dcff' : '#fff6c8'}" opacity=".85"/>` : ''}
    <ellipse cx="60" cy="104" rx="48" ry="7" fill="rgba(0,0,0,.3)"/>
    <rect x="12" y="50" width="96" height="52" rx="9" fill="${c[1]}" stroke="#3d2c4e" stroke-width="5"/><path d="M34 52 V100 M86 52 V100" stroke="${c[2]}" stroke-width="7"/>
    <path d="M18 62 H102" stroke="${c[3]}" stroke-width="3" opacity=".5"/><path d="M14 92 H106" stroke="#000" stroke-width="7" opacity=".12"/>${lid}${lock}${sweep}</svg>`;
}
// Article de l'offre du jour (tiré selon la date)
function dayHash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export const Loot = {
  // ------------------------------------------------------------------ menu : barre d'XP et pastilles
  // ------------------------------------------------------------------ boutique : coffres et boosts
  renderShopChests(grid) {
    const d = this.save.data, row = el('div', 'chest-row');
    for (const kind of CHEST_ORDER) {
      const c = CHESTS[kind], n = d.chests[kind] || 0;
      const card = el('div', `chest-card ${kind}` + (n ? ' has' : ''), `<span class="cc-chest">${chestSvg(kind)}${kind === 'legend' ? '<i></i><i></i><i></i><i></i><i></i>' : ''}</span>
        <span class="cc-txt"><b>${c.name}</b><small>${c.cards} cartes · ${kind === 'legend' ? 'beaucoup de gemmes, boosts rares' : 'pièces, gemmes et boosts'}</small></span>${n ? `<em>×${n}</em>` : ''}`);
      const btns = el('div', 'cc-btns');
      if (n) { const open = el('button', 'btn sm green cta', 'Ouvrir'); open.onclick = () => { if (!d.chests[kind]) { this.audio.play('error'); return; } this.openChest(kind); }; btns.append(open); }
      btns.append(this.buyButton(c.cost, 'gems', 'Acheter', () => d.chests[kind]++, kind === 'legend' ? 'pink' : 'ghostgem'));
      card.append(btns); row.append(card);
    }
    grid.append(row, el('p', 'hint', 'Tu gagnes aussi des coffres en montant de niveau, en battant les boss, avec le cadeau du jour et le passe.'));
  },
  // Offre du jour : un article remisé, une fois par jour, avec minuteur
  offerItem() {
    const d = this.save.data, day = d.daily.day || new Date().toDateString(), pool = OFFER.pool.filter((o) => !(o.skin && d.skins.includes(o.skin)));
    const o = pool[dayHash(day) % pool.length];
    let base, name, art, cur = 'gems';
    if (o.chest) { base = CHESTS[o.chest].cost; name = CHESTS[o.chest].name; art = chestSvg(o.chest); }
    else if (o.boost) { const B = BOOSTS[o.boost]; base = B.cost * o.n; cur = B.cur || 'gems'; name = `${o.n} × ${B.name}`; art = boostArt(o.boost); }
    else { const S = SHOP.skins.find((k) => k.id === o.skin); base = S.cost; name = `Finition ${S.name}`; art = ''; }
    return { o, base, name, art, cur, price: Math.max(1, Math.round(base * (1 - OFFER.discount))), day };
  },
  shopDaily(grid) {
    const d = this.save.data, it = this.offerItem(), bought = d.daily.offer === it.day;
    const card = el('div', 'offer' + (bought ? ' bought' : ''), `<div class="of-head"><b>OFFRE DU JOUR</b><span class="timer">${icon('calendar')}Nouvelle offre dans <b>${untilMidnight()}</b></span></div>
      <div class="of-body"><span class="of-art"></span><span class="of-txt"><b>${it.name}</b><span class="of-price"><s>${it.cur === 'coins' ? '' : gem()}${it.base}</s><em>-${Math.round(OFFER.discount * 100)} %</em></span></span></div>`);
    const artBox = $('.of-art', card);
    if (it.art) artBox.innerHTML = it.art; else artBox.append(towerImg('assault', 76, it.o.skin, 3));
    if (bought) card.append(el('span', 'owned wide', icon('check') + 'Déjà acheté aujourd\'hui'));
    else card.append(this.buyButton(it.price, it.cur, 'Acheter', () => {
      const o = it.o; d.daily.offer = it.day;
      if (o.chest) d.chests[o.chest]++; else if (o.boost) d.boosts[o.boost] = (d.boosts[o.boost] || 0) + o.n; else { if (!d.skins.includes(o.skin)) d.skins.push(o.skin); d.skin = o.skin; }
      this.toast('Offre du jour achetée !', it.name, icon('shop'));
    }, 'big'));
    grid.append(card);
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
    const stage = el('div', 'chest-stage ' + kind), c = CHESTS[kind], TAPS = 3;
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
