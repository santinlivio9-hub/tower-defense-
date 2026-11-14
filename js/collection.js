// Collection : fiches illustrées des tourelles, des brainrots rencontrés (silhouette noire tant
// qu'ils ne sont pas découverts), des boosts et des succès. Méthodes ajoutées à la classe UI.
import { TOWERS, TOWER_ORDER, ENEMIES, BOOSTS, BOOST_ORDER, RARITY, ACHIEVEMENTS, CAMPAIGN, LEVELS } from './config.js';
import { computeStats } from './towers.js';
import { towerImg, enemyImg, TOWER_COLOR } from './sprites.js';
import { icon, coin, gem } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const short = (n) => (n >= 1e4 ? (n / 1000).toFixed(n >= 1e5 ? 0 : 1) + 'k' : fmt(n));
import { boostArt as boostCardArt } from './boosts.js';
const ENEMY_LIST = () => Object.keys(ENEMIES).filter((k) => k !== 'mini');
const unlockLabel = (t) => { const n = CAMPAIGN.towerUnlocks[t]; return n ? `Termine le niveau ${LEVELS[n - 1].id}` : ''; };

export const Collection = {
  renderCollection() {
    const d = this.save.data, tab = this.colTab || 'towers', box = $('#col-content');
    $$('#col-tabs [data-tab]').forEach((b) => { b.classList.toggle('sel', b.dataset.tab === tab); b.onclick = () => { this.colTab = b.dataset.tab; this.audio.play('click'); this.renderCollection(); $('#col-scroll').scrollTop = 0; }; });
    box.innerHTML = '';
    const grid = el('div', 'cgrid' + (tab === 'achievements' ? ' list' : ''));
    let got = 0, total = 0;
    if (tab === 'towers') {
      const fresh = d.towers.slice(d.viewed.towers || 0);
      for (const t of TOWER_ORDER) {
        const has = d.towers.includes(t); total++; if (has) got++;
        const c = el('button', 'ccard' + (has ? '' : ' unknown') + (fresh.includes(t) ? ' new' : ''));
        c.style.setProperty('--cc', TOWER_COLOR[t]);
        c.append(el('span', 'cc-art'));
        $('.cc-art', c).append(towerImg(t, 84, d.skin, has ? 3 : 1));
        c.insertAdjacentHTML('beforeend', has ? `<b>${TOWERS[t].name}</b><small>${coin()}${TOWERS[t].cost}</small>` : `<b>???</b><small>${icon('lock')}${unlockLabel(t)}</small>`);
        c.onclick = () => (has ? this.towerSheet(t) : (this.audio.play('error'), this.toast('Pas encore découverte', unlockLabel(t), icon('lock'))));
        grid.append(c);
      }
      d.viewed.towers = d.towers.length;
    } else if (tab === 'enemies') {
      const seen = d.seen.enemies, fresh = seen.slice(d.viewed.enemies || 0);
      for (const t of ENEMY_LIST()) {
        const has = seen.includes(t), cfg = ENEMIES[t]; total++; if (has) got++;
        const c = el('button', 'ccard enemy' + (cfg.boss ? ' boss' : '') + (has ? '' : ' unknown') + (fresh.includes(t) ? ' new' : ''));
        c.style.setProperty('--cc', cfg.boss ? '#f0485a' : '#8e7fb0');
        c.append(el('span', 'cc-art')); $('.cc-art', c).append(enemyImg(t, cfg.boss ? 92 : 76));
        c.insertAdjacentHTML('beforeend', has ? `<b>${cfg.name}</b><small>${cfg.tag}</small>` : `<b>???</b><small>${cfg.boss ? 'Boss' : 'Pas encore rencontré'}</small>`);
        c.onclick = () => (has ? this.enemySheet(t) : (this.audio.play('error'), this.toast('Brainrot inconnu', 'Continue la campagne pour le rencontrer', icon('lock'))));
        grid.append(c);
      }
      d.viewed.enemies = seen.length;
    } else if (tab === 'boosts') {
      for (const id of BOOST_ORDER) {
        const b = BOOSTS[id], n = d.boosts[id] || 0, R = RARITY[b.rarity || 0]; total++; if (n) got++;
        const c = el('button', 'ccard boost' + (n ? '' : ' empty'), `<span class="cc-art">${boostCardArt(id)}</span><b>${b.name}</b><small class="rar">${R.name}</small><i class="qty">×${n}</i>`);
        c.style.setProperty('--cc', R.color);
        c.onclick = () => this.boostSheet(id);
        grid.append(c);
      }
    } else {
      for (const a of ACHIEVEMENTS) {
        const done = d.achievements.includes(a.id), prog = Math.min(a.goal, this.save.achievementProgress(a)); total++; if (done) got++;
        const ACH_ICO = { kills: 'skull', bossKills: 'crown', towersBuilt: 'cannon', legendaries: 'star', wins: 'trophy', perfectWins: 'heart', heroicWins: 'crown', bestEndless: 'infinity', earlyStarts: 'bolt', games: 'playgold', bestScore: 'trophy', chests: 'chest' };
        grid.append(el('div', 'ach' + (done ? ' done' : ''), `<span class="ach-ico">${icon(ACH_ICO[a.stat] || 'medal', a.stat === 'legendaries' ? 'gold' : '')}${done ? `<i>${icon('check')}</i>` : ''}</span><span class="ach-t"><b>${a.name}</b><small>${a.desc}</small><span class="qbar"><i style="width:${(prog / a.goal) * 100}%"></i></span></span><span class="val">${done ? icon('check') : `${short(prog)}/${short(a.goal)}`}<em>+${a.gems}${gem()}</em></span>`));
      }
    }
    $('#col-count').innerHTML = `${icon('book')}<b>${got}/${total}</b>`;
    box.append(grid);
    this.save.persist(); this.tabBadges();
  },
  sheet(node) {
    const m = el('div', 'panel glass csheet');
    const x = el('button', 'icon-btn close', icon('close')); x.onclick = () => this.closeOverlay();
    m.append(x, ...node); this.openOverlay(m); this.audio.play('card');
  },
  towerSheet(t) {
    const T = TOWERS[t], d = this.save.data, s = computeStats(t, 1, null), s5 = computeStats(t, 5, 0);
    const art = el('div', 'cs-art'); art.style.setProperty('--cc', TOWER_COLOR[t]);
    const big = towerImg(t, 150, d.skin, 3); art.append(big);
    const lv = el('div', 'cs-levels');
    [1, 2, 3, 5].forEach((L) => { const b = el('button', L === 3 ? 'sel' : '', ''); b.append(towerImg(t, 46, d.skin, L)); b.onclick = () => { big.src = towerImg(t, 150, d.skin, L).src; $$('button', lv).forEach((k) => k.classList.toggle('sel', k === b)); this.audio.play('tick'); }; lv.append(b); });
    const br = el('div', 'cs-branches', T.branches.map((b, i) => `<div><span class="bimg" data-i="${i}"></span><b>${b.name}</b><small>${b.desc || ''}</small></div>`).join(''));
    T.branches.forEach((b, i) => $(`[data-i="${i}"]`, br).append(towerImg(t, 52, d.skin, 4, i)));
    const st = el('div', 'cs-stats', [['Dégâts', `${Math.round(s.damage)} → ${Math.round(s5.damage)}`], ['Cadence', `${s.rate.toFixed(1)} → ${s5.rate.toFixed(1)}/s`], ['Portée', `${Math.round(s.range)} → ${Math.round(s5.range)}`]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join(''));
    this.sheet([art, el('h2', 'win', T.name), el('p', 'sub', T.desc), lv, st, el('small', 'kicker', 'SPÉCIALISATIONS (NIVEAU 4)'), br]);
  },
  enemySheet(t) {
    const E = ENEMIES[t], art = el('div', 'cs-art enemy'); art.append(enemyImg(t, 160));
    const st = el('div', 'cs-stats', [['PV', fmt(E.hp)], ['Vitesse', E.speed], ['Dégâts au château', E.leak >= 99 ? 'Tout' : E.leak]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join(''));
    this.sheet([art, el('h2', E.boss ? 'lose' : 'win', E.name), el('span', 'tagchip', E.tag), el('p', 'sub', E.hint || E.title || 'Le boss de ce monde. Garde tes capacités pour lui !'), st]);
  },
  boostSheet(id) {
    const b = BOOSTS[id], d = this.save.data, R = RARITY[b.rarity || 0];
    const art = el('div', 'cs-art boost', boostCardArt(id)); art.style.setProperty('--cc', R.color);
    const buy = this.buyButton(b.cost, b.cur || 'gems', 'Acheter', () => { d.boosts[id] = (d.boosts[id] || 0) + 1; this.boostSheet(id); return false; }, 'big');
    buy.classList.remove('sm');
    this.sheet([art, el('h2', 'win', b.name), el('span', 'tagchip', `<span style="color:${R.color}">${R.name}</span> · en stock ×${d.boosts[id] || 0}`), el('p', 'sub', b.desc), buy]);
  },
};
