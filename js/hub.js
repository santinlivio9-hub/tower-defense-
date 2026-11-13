// Château (écran dédié + capacités en partie). Méthodes ajoutées à la classe UI (voir la fin de ui.js).
import { CASTLE } from './config.js';
import { drawCastle, CASTLE_LOOKS } from './castle.js';
import { icon, coin, gem } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const pips = (n, max) => `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;

export const Hub = {
  renderMeta(name) {
    if (name === 'castle') this.renderCastle();
    if (name === 'talents' && this.renderTalents) this.renderTalents();
    if (name === 'inventory' && this.renderInventory) this.renderInventory();
  },
  // Bouton d'achat en gemmes
  gemButton(cost, label, fn, cls = '') {
    const d = this.save.data;
    const b = el('button', 'btn sm ' + cls + (d.gems < cost ? ' off' : ''), `${label} ${gem()}${cost}`);
    b.onclick = () => {
      if (!this.save.spend(cost)) { this.audio.play('error'); this.toast('Pas assez de gemmes', 'Joue des niveaux pour en gagner', gem()); return; }
      fn(); this.save.persist(); this.audio.play('buy'); this.haptics.pulse(1); this.announce(this.save.checkAchievements()); this.show(this.screen);
    };
    return b;
  },

  // ------------------------------------------------------------------ écran Château
  renderCastle() {
    const sv = this.save, cs = sv.data.castle, box = $('#castle-content'), tier = sv.castleTier(), sum = sv.castleSum();
    const keep = $('#castle-scroll').scrollTop;
    box.innerHTML = '';
    const next = CASTLE.tiers[tier + 1];
    const hero = el('div', 'castle-hero', `<canvas width="640" height="420"></canvas><div class="ch-name"><small>Apparence ${tier + 1}/4</small><b>${CASTLE_LOOKS[tier].name}</b>
      ${next ? `<div class="progress"><i style="width:${((sum - CASTLE.tiers[tier]) / (next - CASTLE.tiers[tier])) * 100}%"></i></div><span>${sum}/${next} améliorations pour « ${CASTLE_LOOKS[tier + 1].name} »</span>` : '<span>Apparence maximale atteinte</span>'}</div>`);
    box.append(hero);
    this.castleCv = $('canvas', hero);
    box.append(el('h3', 'sect', 'Améliorations'));
    const U = CASTLE.upgrades;
    const now = {
      walls: (l) => `PV du château : <b>${20 + l * U.walls.per}</b>`,
      repair: (l) => (l ? `+1 PV toutes les <b>${U.repair.every[l]}</b> vague${U.repair.every[l] > 1 ? 's' : ''}` : 'Aucune réparation'),
      treasury: (l) => `Départ <b>+${l * U.treasury.start}</b> · par vague <b>+${l * U.treasury.perWave}</b>`,
      cannon: (l) => (l ? `Dégâts <b>${U.cannon.damage[l]}</b> · ${U.cannon.rate[l]}/s · portée <b>${U.cannon.range[l]}</b>` : 'Pas encore construit'),
    };
    for (const [id, u] of Object.entries(U)) {
      const lvl = cs[id], max = u.costs.length, done = lvl >= max;
      const card = el('div', 'card' + (done ? ' done' : ''));
      const art = el('div', 'art', id === 'treasury' ? coin() : icon(u.icon)); art.firstChild.style.cssText = 'width:38px;height:38px';
      const body = el('div', 'body', `<h3>${u.name}</h3><p>${u.desc}</p><p class="now">${now[id](lvl)}</p>${pips(lvl, max)}`);
      const row = el('div', 'row', `<span class="meta">Niveau <b>${lvl}/${max}</b></span>`);
      row.append(done ? el('span', 'owned', icon('check') + 'Max') : this.gemButton(u.costs[lvl], lvl ? 'Améliorer' : id === 'cannon' ? 'Construire' : 'Améliorer', () => cs[id]++));
      body.append(row); card.append(art, body); box.append(card);
    }
    box.append(el('h3', 'sect', 'Capacités actives'));
    const A = CASTLE.abilities;
    const stat = {
      air: (l) => `Dégâts <b>${A.air.damage[l]}</b> + ${Math.round(A.air.pct * 100)} % des PV · rayon <b>${A.air.radius[l]}</b>`,
      blizzard: (l) => `Ralentit de <b>${Math.round(A.blizzard.slow[l] * 100)} %</b> pendant <b>${A.blizzard.dur[l]} s</b>`,
      gold: (l) => `<b>+${A.gold.coins[l]}</b> pièces, +${A.gold.perWave[l]} par vague passée`,
    };
    for (const [id, a] of Object.entries(A)) {
      const lvl = cs[id], max = a.costs.length, done = lvl >= max;
      const card = el('div', 'card' + (done ? ' done' : ''));
      const art = el('div', 'art ability', icon(a.icon)); art.style.setProperty('--ac', a.color); art.firstChild.style.cssText = 'width:36px;height:36px';
      const body = el('div', 'body', `<h3>${a.name}</h3><p>${a.desc}</p><p class="now">${lvl ? stat[id](lvl) + ` · recharge <b>${a.cd[lvl]} s</b>` : 'Verrouillée'}</p>${pips(lvl, max)}`);
      const row = el('div', 'row', `<span class="meta">${lvl ? `Niveau <b>${lvl}/${max}</b>` : icon('lock') + 'À débloquer'}</span>`);
      row.append(done ? el('span', 'owned', icon('check') + 'Max') : this.gemButton(a.costs[lvl], lvl ? 'Améliorer' : 'Débloquer', () => cs[id]++, lvl ? '' : 'pink'));
      body.append(row); card.append(art, body); box.append(card);
    }
    $('#castle-scroll').scrollTop = keep;
  },
  // Château animé de l'écran dédié (appelé à chaque image)
  tickCastle(ts) {
    const cv = this.castleCv; if (!cv || !cv.isConnected) return;
    const c = cv.getContext('2d'), tier = this.save.castleTier(), t = ts / 1000;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    c.translate(cv.width / 2, cv.height * 0.62); c.scale(2.5, 2.5);
    drawCastle(c, tier, { time: t, cannon: this.save.data.castle.cannon > 0, aim: -Math.PI / 2 + Math.sin(t) * 0.9 });
  },

  // ------------------------------------------------------------------ en partie : capacités (et boosts) en bas de l'écran
  buildDock() {
    const g = this.game, ab = $('#abilities'), bo = $('#boosts');
    ab.innerHTML = ''; bo.innerHTML = '';
    g.abilities.forEach((a) => {
      const C = CASTLE.abilities[a.id];
      const b = el('button', 'ab', `<i class="gauge"></i>${icon(C.icon)}<span class="cd"></span>`);
      b.style.setProperty('--ac', C.color); b.dataset.id = a.id; b.setAttribute('aria-label', C.name);
      b.onclick = () => {
        if (g.paused || g.over) return;
        if (a.cd > 0) { this.audio.play('error'); this.toast(C.name, `Disponible dans ${Math.ceil(a.cd)} s`, icon(C.icon)); return; }
        if (a.id === 'air') { this.aiming = this.aiming === 'air' ? null : 'air'; this.closeMenu(); this.audio.play('tick'); }
        else if (g.useAbility(a.id)) this.haptics.pulse(2);
      };
      ab.append(b);
    });
    if (this.buildBoosts) this.buildBoosts(bo);
    this.cache.dock = null; this.resize();
  },
  updateDock() {
    const g = this.game;
    for (const b of $$('#abilities .ab')) {
      const a = g.abilities.find((k) => k.id === b.dataset.id), p = Math.round((1 - a.cd / a.max) * 100), s = Math.ceil(a.cd);
      if (b._p !== p) { b._p = p; b.style.setProperty('--p', p + '%'); b.classList.toggle('ready', p >= 100); }
      if (b._s !== s) { b._s = s; $('.cd', b).textContent = s > 0 ? s : ''; }
      b.classList.toggle('aim', this.aiming === a.id);
    }
    const hint = $('#aim-hint'); const on = !!this.aiming && !g.over;
    if (hint.hidden === on) hint.hidden = !on;
    if (this.updateBoosts) this.updateBoosts();
  },
};
