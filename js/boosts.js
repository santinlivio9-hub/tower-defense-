// Boosts : illustrations de cartes à collectionner, 3 emplacements rapides en partie (choix
// modifiable avant la 1re vague), boutons qui pulsent au bon moment, activation spectaculaire.
import { BOOSTS, BOOST_ORDER, RARITY } from './config.js';
import { icon } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const INK = '#3d2c4e';

// Illustration plein cadre (SVG 100 x 100) : fond rayonnant + objet dessiné
const GLYPH = {
  coins2: `<ellipse cx="50" cy="76" rx="26" ry="9" fill="#e09600" stroke="${INK}" stroke-width="3"/><rect x="24" y="62" width="52" height="14" fill="#e09600"/><ellipse cx="50" cy="62" rx="26" ry="9" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="44" cy="52" rx="24" ry="8.5" fill="#e09600" stroke="${INK}" stroke-width="3"/><rect x="20" y="40" width="48" height="12" fill="#e09600"/><ellipse cx="44" cy="40" rx="24" ry="8.5" fill="#ffe27a" stroke="${INK}" stroke-width="3"/>
    <circle cx="70" cy="30" r="17" fill="#fff" stroke="${INK}" stroke-width="3"/><text x="70" y="37" text-anchor="middle" font-family="Fredoka,system-ui,sans-serif" font-weight="700" font-size="19" fill="#e8443c">x2</text>`,
  heal: `<path d="M50 84S18 64 18 40a16 16 0 0 1 32-6 16 16 0 0 1 32 6c0 24-32 44-32 44z" fill="#ff5d6c" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M30 36a8 8 0 0 1 8-8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/><rect x="44" y="40" width="12" height="30" rx="3" fill="#fff" stroke="${INK}" stroke-width="2.5"/><rect x="35" y="49" width="30" height="12" rx="3" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`,
  free: `<rect x="20" y="46" width="60" height="38" rx="5" fill="#3fd873" stroke="${INK}" stroke-width="3.5"/><rect x="15" y="34" width="70" height="16" rx="5" fill="#9dffb4" stroke="${INK}" stroke-width="3.5"/>
    <rect x="44" y="34" width="12" height="50" fill="#ff5d8f" stroke="${INK}" stroke-width="3"/><path d="M50 34c-8-14-26-12-20-2 3 5 14 3 20 2zM50 34c8-14 26-12 20-2-3 5-14 3-20 2z" fill="#ff5d8f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  over: `<path d="M58 8L22 56h22l-8 36 40-52H52z" fill="#ffd23f" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M52 18L32 50" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>`,
  shield: `<path d="M50 10l32 12v22c0 22-14 36-32 46C32 80 18 66 18 44V22z" fill="#5c9df2" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M50 20l22 8v16c0 16-10 26-22 33z" fill="#8fd2ff"/><path d="M50 30l5 10 11 1.5-8 7.5 2 11-10-5.5-10 5.5 2-11-8-7.5 11-1.5z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  revive: `<path d="M50 88c-16 0-26-11-26-25 0-16 14-22 12-38 10 6 14 14 14 22 4-6 4-12 2-18 14 8 24 20 24 34 0 14-10 25-26 25z" fill="#b05cff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M50 82c-8 0-13-6-13-13 0-8 7-11 8-18 6 5 8 10 8 14 3-3 3-6 3-9 6 4 8 9 8 13 0 7-6 13-14 13z" fill="#ffd23f"/><path d="M28 30a26 26 0 0 1 40-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M62 12l7 6-9 3z" fill="#fff"/>`,
};
export function boostArt(id) {
  const b = BOOSTS[id], R = RARITY[b.rarity || 0];
  const rays = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2, a2 = a + 0.22; return `<path d="M50 50L${50 + Math.cos(a) * 80} ${50 + Math.sin(a) * 80}L${50 + Math.cos(a2) * 80} ${50 + Math.sin(a2) * 80}z"/>`; }).join('');
  return `<svg class="bart" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bg-${id}" cx="50%" cy="45%" r="65%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${b.color}"/><stop offset="1" stop-color="${R.color}" stop-opacity=".9"/></radialGradient></defs>
    <rect width="100" height="100" rx="14" fill="url(#bg-${id})"/><g fill="#fff" opacity=".22">${rays}</g>${GLYPH[id]}</svg>`;
}

export const BoostUI = {
  // emplacements rapides au lancement : derniers choix, complétés par les boosts les plus nombreux
  loadoutFor(L) {
    const inv = this.save.data.boosts, n = this.save.boostSlots(L);
    const lo = [...new Set(this.save.data.loadout || [])].filter((id) => inv[id] > 0);
    for (const id of [...BOOST_ORDER].sort((a, b) => (inv[b] || 0) - (inv[a] || 0))) if (lo.length < n && inv[id] > 0 && !lo.includes(id)) lo.push(id);
    return lo.slice(0, n);
  },
  buildBoosts(bo) {
    const g = this.game; this._boostSig = g.boosts.map((b) => b.id + (b.free ? '*' : '')).join() + '|' + (g.wave > 0);
    const n = this.save.boostSlots(g.level), canEdit = g.wave === 0 && !g.endlessLocked;
    bo.innerHTML = '';
    const slots = [...g.boosts];
    if (canEdit) while (slots.length < n) slots.push(null);
    slots.forEach((b, i) => {
      if (!b) { const e = el('button', 'bo empty', icon('plus')); e.onclick = () => this.openBoostPicker(i); bo.append(e); return; }
      const C = BOOSTS[b.id], btn = el('button', 'bo' + (b.free ? ' free' : ''), `<span class="shine"></span>${icon(C.icon)}<span class="n"></span>${canEdit && !b.free ? '<i class="edit">' + icon('restart') + '</i>' : ''}`);
      btn.style.setProperty('--bc', C.color); btn.dataset.i = i; btn.setAttribute('aria-label', C.name);
      btn.onclick = () => {
        if (g.paused || g.over) return;
        if (g.wave === 0 && !b.free && !b.used) { this.openBoostPicker(i); return; }
        if (b.id === 'revive') { this.toast(C.name, b.used ? 'Déjà utilisée' : 'Se déclenche toute seule à la défaite', icon(C.icon)); return; }
        if (b.used) { this.audio.play('error'); return; }
        this.fireBoost(i, btn);
      };
      bo.append(btn);
    });
    $('#dock').classList.toggle('tight', bo.children.length >= 5);
  },
  fireBoost(i, btn) {
    const g = this.game; if (!g.useBoost(i)) return;
    this.closeBoostPicker();
    if (btn) { btn.classList.remove('fire'); void btn.offsetWidth; btn.classList.add('fire'); }
  },
  // Grosse carte au centre de l'écran à l'activation
  boostPop(id) {
    if (this.simulating) return;
    const C = BOOSTS[id], R = RARITY[C.rarity || 0], st = $('#screen-game');
    $$('.boost-pop', st).forEach((e) => e.remove());
    const p = el('div', 'boost-pop ' + id, `<div class="bp-rays"></div><div class="bp-card" style="--cc:${R.color}">${boostArt(id)}<b>${C.name}</b></div>`);
    st.append(p); setTimeout(() => p.remove(), 1500);
  },
  // Choix du boost d'un emplacement (avant la 1re vague)
  openBoostPicker(i) {
    const g = this.game, inv = this.save.data.boosts, cur = g.boosts[i];
    this.closeBoostPicker();
    const pk = el('div', 'boost-picker glass');
    pk.innerHTML = `<div class="bk-head"><b>Emplacement ${i + 1}</b><small>Choisis un boost de ton stock</small></div>`;
    const grid = el('div', 'bk-grid');
    for (const id of BOOST_ORDER) {
      const n = inv[id] || 0, taken = g.boosts.some((b, k) => k !== i && b && b.id === id && !b.free);
      const c = el('button', 'bk' + (cur && cur.id === id ? ' sel' : '') + (!n || taken ? ' off' : ''), `${boostArt(id)}<b>${BOOSTS[id].name}</b><em>×${n}</em>`);
      c.onclick = () => {
        if (!n || taken) { this.audio.play('error'); return; }
        g.boosts[i] = { id, used: false }; this.saveLoadout(); this.audio.play('card'); this.haptics.pulse(1);
        this.closeBoostPicker(); this.cache.dock = null;
      };
      grid.append(c);
    }
    pk.append(grid);
    const row = el('div', 'btn-row');
    if (cur) {
      const use = el('button', 'btn sm green', icon('bolt') + 'Utiliser maintenant');
      use.onclick = () => { if (cur.id === 'revive') { this.toast(BOOSTS.revive.name, 'Se déclenche toute seule à la défaite', icon('revive')); return; } this.fireBoost(i); };
      const rm = el('button', 'btn sm ghost', icon('close') + 'Retirer');
      rm.onclick = () => { g.boosts.splice(i, 1); this.saveLoadout(); this.closeBoostPicker(); this.cache.dock = null; };
      row.append(use, rm);
    }
    const ok = el('button', 'btn sm', 'OK'); ok.onclick = () => this.closeBoostPicker(); row.append(ok);
    pk.append(row);
    $('#screen-game').append(pk);
    this.audio.play('sheet');
  },
  closeBoostPicker() { $$('.boost-picker').forEach((e) => e.remove()); },
  saveLoadout() { this.save.data.loadout = this.game.boosts.filter((b) => b && !b.free).map((b) => b.id); this.save.persist(); },
  updateBoosts() {
    const g = this.game, inv = this.save.data.boosts;
    // reconstruit la barre quand les emplacements changent (choix, bulle ramassée, 1re vague lancée)
    const sig = g.boosts.map((b) => b.id + (b.free ? '*' : '')).join() + '|' + (g.wave > 0);
    if (sig !== this._boostSig) { if (g.wave > 0) this.closeBoostPicker(); this.buildBoosts($('#boosts')); }
    for (const btn of $$('#boosts .bo[data-i]')) {
      const b = g.boosts[+btn.dataset.i]; if (!b) continue;
      const on = b.used && ((b.id === 'coins2' && g.coins2) || (b.id === 'shield' && g.shielded) || (b.id === 'over' && g.overT > 0) || (b.id === 'free' && g.freeNext));
      const txt = b.free ? 'gratuit' : b.id === 'revive' && !b.used ? 'auto' : b.id === 'over' && on ? Math.ceil(g.overT) + 's' : b.used ? '' : '×' + (inv[b.id] || 0);
      const good = !b.used && g.wave > 0 && g.goodMoment(b.id);
      const key = (b.used ? 'u' : '') + (on ? 'o' : '') + (good ? 'g' : '') + txt;
      if (btn._k !== key) { btn._k = key; btn.classList.toggle('used', b.used && !on); btn.classList.toggle('on', !!on); btn.classList.toggle('good', good); $('.n', btn).textContent = txt; }
    }
  },
};
