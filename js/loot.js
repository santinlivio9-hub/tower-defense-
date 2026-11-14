// Niveau de joueur (XP), talents, inventaire de boosts et coffres. Méthodes ajoutées à la classe UI (voir la fin de ui.js).
import { XP, TALENTS, BOOSTS, BOOST_ORDER, CHESTS, CHEST_ORDER, RARITY, OFFER, SHOP } from './config.js';
import { untilMidnight } from './daily.js';
import { towerImg } from './sprites.js';
import { icon, gem, coin } from './icons.js';
import { boostArt } from './boosts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const pips = (n, max) => `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
const boostIco = (id, cls = '') => `<i class="bico ${cls}" style="--bc:${BOOSTS[id].color}">${icon(BOOSTS[id].icon)}</i>`;

// Coffres dessinés en SVG, style vinyle (contour épais, volume, reflets), un dessin par rareté :
// bois (planches, ferrures, serrure), doré (métal doré, gemmes serties, reflet animé),
// légendaire (violet et or, runes lumineuses). Le couvercle est un groupe à part (.lid) qui peut
// s'ouvrir ou s'envoler : le SVG n'est jamais rogné (overflow visible, marge au-dessus).
const K = '#3d2c4e';
let chestUid = 0;
export function chestSvg(kind, open = false) {
  const id = 'ch' + (chestUid++), O = `stroke="${K}" stroke-width="5" stroke-linejoin="round"`;
  let body = '', lid = '', lock = '', extra = '';
  if (kind === 'gold') {
    body = `<rect x="12" y="52" width="96" height="50" rx="9" fill="url(#${id}b)" ${O}/>
      <path d="M16 90 H104" stroke="#b8721a" stroke-width="5" opacity=".45"/><path d="M18 62 H102" stroke="#fff6c8" stroke-width="3" opacity=".6"/>
      <rect x="27" y="52" width="13" height="50" fill="#e09600" ${O} stroke-width="3.5"/><rect x="80" y="52" width="13" height="50" fill="#e09600" ${O} stroke-width="3.5"/>
      <path d="M33.5 70l5 6-5 6-5-6z" fill="#f0485a" stroke="${K}" stroke-width="2.5"/><path d="M86.5 70l5 6-5 6-5-6z" fill="#3d9dfc" stroke="${K}" stroke-width="2.5"/>`;
    lid = `<path d="M12 54 Q12 18 60 18 Q108 18 108 54 Z" fill="url(#${id}l)" ${O}/>
      <path d="M27 24 V54 M40 20 V54" stroke="#e09600" stroke-width="0"/><path d="M27 25 Q33 22 40 20 V54 H27 Z M80 20 Q87 22 93 25 V54 H80 Z" fill="#e09600" ${O} stroke-width="3.5"/>
      <path d="M22 38 Q34 24 54 23" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>
      <path d="M60 22l6 7-6 7-6-7z" fill="#5fd8ff" stroke="${K}" stroke-width="2.5"/>`;
    lock = `<rect x="49" y="46" width="22" height="26" rx="6" fill="#fff1b0" ${O} stroke-width="4"/><path d="M60 54v8" stroke="${K}" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="54" r="3.5" fill="${K}"/>`;
    extra = `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset=".55" stop-color="#f5b324"/><stop offset="1" stop-color="#d98a12"/></linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset="1" stop-color="#ffc83a"/></linearGradient>`;
  } else if (kind === 'legend') {
    body = `<rect x="12" y="52" width="96" height="50" rx="9" fill="url(#${id}b)" ${O}/>
      <path d="M12 60 H108 M12 94 H108" stroke="#ffd23f" stroke-width="5"/><path d="M12 60 H108 M12 94 H108" stroke="${K}" stroke-width="1.5" opacity=".5"/>
      <g class="runes" fill="none" stroke="#7ff6ff" stroke-width="3" stroke-linecap="round"><path d="M24 70 l5 12 l5 -12 M30 76 h-2"/><path d="M86 70 v12 M86 76 l7 -6 M86 76 l7 6"/></g>
      <path d="M18 66 H102" stroke="#f0dcff" stroke-width="3" opacity=".45"/>`;
    lid = `<path d="M12 54 Q12 16 60 16 Q108 16 108 54 Z" fill="url(#${id}l)" ${O}/>
      <path d="M14 46 Q60 34 106 46" stroke="#ffd23f" stroke-width="5" fill="none"/><path d="M14 46 Q60 34 106 46" stroke="${K}" stroke-width="1.5" fill="none" opacity=".5"/>
      <path d="M22 36 Q34 22 54 21" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55"/>
      <g class="runes" fill="none" stroke="#7ff6ff" stroke-width="2.6" stroke-linecap="round"><path d="M40 28 l4 6 l4 -6 M72 26 v8 M76 30 h-8"/></g>
      <path d="M60 4 l4 7 l8 1 l-6 5 l2 8 l-8 -4 l-8 4 l2 -8 l-6 -5 l8 -1 z" fill="#ffd23f" stroke="${K}" stroke-width="3" stroke-linejoin="round"/>`;
    lock = `<path d="M60 42l12 13-12 18-12-18z" fill="#5fd8ff" ${O} stroke-width="4"/><path d="M53 53l7-7 3 3" stroke="#fff" stroke-width="2.5" fill="none" opacity=".85"/>`;
    extra = `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b47cff"/><stop offset=".6" stop-color="#7a3fd8"/><stop offset="1" stop-color="#4f2296"/></linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b0ff"/><stop offset="1" stop-color="#9a5ce0"/></linearGradient>`;
  } else { // bois
    body = `<rect x="12" y="52" width="96" height="50" rx="9" fill="#b97a40" ${O}/>
      <path d="M14 69 H106 M14 86 H106" stroke="#7a4a22" stroke-width="3"/><path d="M16 58 H104" stroke="#e8b878" stroke-width="3" opacity=".7"/>
      <path d="M30 63 l6 2 M70 79 l8 -1 M44 95 l7 1" stroke="#7a4a22" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <rect x="26" y="52" width="12" height="50" fill="#8e9aab" ${O} stroke-width="3.5"/><rect x="82" y="52" width="12" height="50" fill="#8e9aab" ${O} stroke-width="3.5"/>
      <circle cx="32" cy="64" r="2.4" fill="${K}"/><circle cx="32" cy="90" r="2.4" fill="${K}"/><circle cx="88" cy="64" r="2.4" fill="${K}"/><circle cx="88" cy="90" r="2.4" fill="${K}"/>`;
    lid = `<path d="M12 54 Q12 20 60 20 Q108 20 108 54 Z" fill="#cf9050" ${O}/>
      <path d="M14 42 Q60 30 106 42" stroke="#7a4a22" stroke-width="3" fill="none"/><path d="M22 38 Q34 26 52 25" stroke="#f3d9a8" stroke-width="4.5" stroke-linecap="round" fill="none" opacity=".7"/>
      <path d="M26 27 Q32 23 38 22 V54 H26 Z M82 22 Q88 23 94 27 V54 H82 Z" fill="#8e9aab" ${O} stroke-width="3.5"/>`;
    lock = `<rect x="50" y="47" width="20" height="24" rx="5" fill="#ffd23f" ${O} stroke-width="4"/><circle cx="60" cy="56" r="3.2" fill="${K}"/><path d="M60 57v6" stroke="${K}" stroke-width="3" stroke-linecap="round"/>`;
  }
  const shine = !open && kind !== 'wood' ? `<clipPath id="${id}c"><path d="M12 54 Q12 18 60 18 Q108 18 108 54 Z"/><rect x="12" y="52" width="96" height="50" rx="9"/></clipPath>
    <g clip-path="url(#${id}c)" class="sweep"><rect x="-70" y="0" width="22" height="112" fill="#fff" opacity=".55" transform="skewX(-22)"><animate attributeName="x" values="-70;190;190" keyTimes="0;.55;1" dur="2.6s" repeatCount="indefinite"/></rect></g>` : '';
  const glow = open ? `<ellipse cx="60" cy="54" rx="44" ry="12" fill="${kind === 'legend' ? '#f0dcff' : '#fff6c8'}"/><path d="M22 54 L36 -10 L50 54 Z M52 54 L60 -20 L70 54 Z M72 54 L86 -8 L98 54 Z" fill="${kind === 'legend' ? '#f0dcff' : '#fff6c8'}" opacity=".8"/>` : '';
  return `<svg viewBox="0 -24 120 136" class="chest-svg ${kind}" overflow="visible"><defs>${extra}</defs>
    <ellipse cx="60" cy="104" rx="50" ry="7" fill="rgba(0,0,0,.3)"/>${glow}${body}
    <g class="lid"${open ? ' transform="rotate(-38 14 54) translate(-4 -10)"' : ''}>${lid}</g>${open ? '' : lock}${shine}
    <g class="cracks" fill="none" stroke="#fff6c8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path class="c1" d="M40 60 l6 8 l-4 8 l7 9"/><path class="c2" d="M78 58 l-5 9 l6 7 l-3 10"/><path class="c3" d="M24 54 l12 2 l8 -4 l12 3 l10 -3 l14 3 l16 -1"/></g></svg>`;
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
  // Ouverture : le coffre tombe et rebondit ; on le tape 3 fois (il tremble de plus en plus et se fissure de
  // lumière) ; il explose et le couvercle s'envole ; les cartes jaillissent en éventail, faces cachées (le dos
  // indique la rareté), et se retournent une à une au toucher ; récapitulatif à la fin.
  openChest(kind) {
    const stage = el('div', 'chest-stage ' + kind), TAPS = 3;
    stage.innerHTML = `<div class="rays"></div><div class="chest drop">${chestSvg(kind)}</div><p class="sub tap">Touche le coffre !</p><div class="taps">${'<i></i>'.repeat(TAPS)}</div><div class="fan"></div><div class="recap"></div>`;
    const chest = $('.chest', stage), fan = $('.fan', stage), tap = $('.tap', stage), recap = $('.recap', stage);
    let taps = 0, opened = false, cards = [], turned = 0;
    this.audio.play('sheet'); setTimeout(() => { this.audio.play('place'); this.haptics.pulse(1); }, 520);
    const done = el('button', 'btn primary big', 'Super !'); done.style.display = 'none';
    done.onclick = () => { this.closeOverlay(); this.refreshGems(); this.show(this.screen, true); };
    stage.append(done);
    // rareté affichée : 0-1 commun, 2 rare (bleu), 3 épique (violet), 4 légendaire (doré)
    const rar = (l) => (l.kind === 'coins' ? 0 : l.kind === 'gems' ? (l.n >= 40 ? 3 : l.n >= 20 ? 2 : 1) : Math.min(4, 1 + (BOOSTS[l.id].rarity || 0)));
    const turn = (c) => {
      if (c.done) return; c.done = true; turned++;
      const r = c.r, node = c.node; node.classList.add('flip');
      if (r >= 4) { stage.classList.add('slowmo'); setTimeout(() => stage.classList.remove('slowmo'), 1300); this.audio.play('legendary'); this.haptics.pulse(2); stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash'); }
      else if (r === 3) { this.audio.play('legendary'); this.haptics.pulse(2); stage.classList.remove('quake'); void stage.offsetWidth; stage.classList.add('quake'); }
      else if (r === 2) { this.audio.play('tier'); this.haptics.pulse(1); }
      else { this.audio.play('card'); this.haptics.pulse(0); }
      if (turned === cards.length) setTimeout(showRecap, 700);
    };
    const showRecap = () => {
      const tot = { coins: 0, gems: 0 }, boosts = {};
      for (const c of cards) { const l = c.l; if (l.kind === 'coins') tot.coins += l.n; else if (l.kind === 'gems') tot.gems += l.n; else boosts[l.id] = (boosts[l.id] || 0) + l.n; }
      recap.innerHTML = `<small>Tu as gagné</small><div>${tot.coins ? `<span class="rw">${coin()}<b>+${tot.coins}</b></span>` : ''}${tot.gems ? `<span class="rw">${gem()}<b>+${tot.gems}</b></span>` : ''}${Object.entries(boosts).map(([id, n]) => `<span class="rw">${icon(BOOSTS[id].icon)}<b>${BOOSTS[id].name} ×${n}</b></span>`).join('')}</div>`;
      recap.classList.add('show'); stage.classList.add('end'); tap.textContent = ''; done.style.display = '';
    };
    chest.onclick = () => {
      if (opened || chest.classList.contains('drop')) return;
      taps++; $$('.taps i', stage).forEach((d, i) => d.classList.toggle('on', i < taps));
      stage.style.setProperty('--crack', taps / TAPS); stage.dataset.taps = taps;
      chest.classList.remove('hit1', 'hit2', 'hit3'); void chest.offsetWidth; chest.classList.add('hit' + taps);
      this.audio.play(taps < TAPS ? 'hit' : 'sheet'); this.audio.play('tick'); this.haptics.pulse(taps < TAPS ? 1 : 2);
      tap.textContent = taps < TAPS ? `Encore ${TAPS - taps} !` : '';
      if (taps < TAPS) return;
      opened = true; chest.classList.add('shake');
      const rattle = setInterval(() => { this.audio.play('tick'); this.haptics.pulse(0); }, 90);
      setTimeout(() => {
        clearInterval(rattle);
        const loot = (this.save.openChest(kind) || []).sort((x, y) => rar(x) - rar(y));
        chest.classList.remove('shake'); chest.classList.add('open');
        stage.classList.add('burst'); this.audio.play('chest'); this.audio.play('explosion'); this.haptics.pulse(2);
        // éventail sur 1 rangée (jusqu'à 4 cartes) ou 2 rangées, sans que les cartes se recouvrent
        const n = loot.length, rows = n > 4 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
        fan.classList.toggle('two', rows.length > 1);
        cards = loot.map((l, i) => {
          const r = rar(l), front = l.kind === 'coins' ? `<i class="coin-ico big"></i><b>+${l.n}</b><small>pièces</small>` : l.kind === 'gems' ? `${gem('big')}<b>+${l.n}</b><small>gemmes</small>` : `${boostArt(l.id)}<b>×${l.n}</b><small>${BOOSTS[l.id].name}</small>`;
          const node = el('button', 'lcard r' + r, `<div class="in"><div class="back"><i class="bk-pat"></i><span class="bk-gem">${icon(r >= 4 ? 'crown' : r >= 3 ? 'star' : r >= 2 ? 'gem' : 'chest')}</span></div><div class="front">${front}</div></div>`);
          const row = i < rows[0] ? 0 : 1, k = row ? i - rows[0] : i, m = rows[row], off = k - (m - 1) / 2;
          node.style.cssText = `--x:${off * 84}px;--y:${Math.abs(off) * 6 + row * 128}px;--rot:${off * 5}deg;--i:${i}`;
          const c = { l, r, node, done: false };
          node.onclick = (e) => { e.stopPropagation(); turn(c); };
          fan.append(node); return c;
        });
        tap.textContent = 'Touche les cartes pour les retourner';
        // toucher ailleurs retourne la carte suivante
        stage.onclick = (e) => { if (e.target.closest('.btn')) return; const next = cards.find((c) => !c.done); if (next && opened && !chest.contains(e.target)) turn(next); };
      }, 700);
    };
    setTimeout(() => chest.classList.remove('drop'), 760);
    this.openOverlay(stage);
  },
};
