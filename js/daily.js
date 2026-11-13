// Raisons de revenir : cadeau du jour (calendrier de 7 jours + série), quêtes du jour et de la semaine,
// roue de la chance, défi du jour, passe de progression. Méthodes ajoutées à la classe UI.
import { DAILY, PASS, passReward, LEVELS, WORLDS, CAMPAIGN, BOOSTS } from './config.js';
import { THEMES, buildField, drawMapPreview } from './maps.js';
import { icon, coin, gem } from './icons.js';
import { chestSvg } from './loot.js';
import { boostArt } from './boosts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const WHEEL_COLORS = ['#ff5d8f', '#ffd23f', '#3d9dfc', '#3fd873', '#b05cff', '#ff9f1a', '#5fd8ff', '#f0485a'];

// Petites puces de récompense (icône + valeur)
export function rewardChips(r) {
  const out = [];
  if (r.coins) out.push(`<span class="rw">${coin()}<b>${fmt(r.coins)}</b></span>`);
  if (r.gems) out.push(`<span class="rw">${gem()}<b>${r.gems}</b></span>`);
  if (r.chest) out.push(`<span class="rw chest">${chestSvg(r.chest)}<b>${r.chest === 'gold' ? 'Doré' : 'Bois'}</b></span>`);
  if (typeof r.boosts === 'object') for (const [id, n] of Object.entries(r.boosts)) out.push(`<span class="rw">${icon(BOOSTS[id].icon)}<b>×${n}</b></span>`);
  else if (r.boosts) out.push(`<span class="rw">${icon('bag')}<b>×${r.boosts}</b></span>`);
  if (r.talent) out.push(`<span class="rw">${icon('talent')}<b>${r.talent}</b></span>`);
  return out.join('');
}
// Grande illustration d'une récompense
function rewardArt(r) {
  if (r.chest) return chestSvg(r.chest);
  if (typeof r.boosts === 'object') return boostArt(Object.keys(r.boosts)[0]);
  if (r.boosts) return `<span class="ra-ico">${icon('bag')}</span>`;
  if (r.gems) return gem('big');
  return `<i class="coin-ico big"></i>`;
}

export const Daily = {
  dailyBadge(tab) { return tab === 'menu' ? this.save.dailyCount() : 0; },
  // Boutons autour du château (accueil)
  homeDaily(left, right, side) {
    const sv = this.save; sv.dailyTick();
    const qn = sv.questsReady(), pn = sv.passReady(), ch = sv.challenge();
    side(left, `<span class="ra-ico">${icon('calendar')}</span>`, 'Cadeau', () => this.openDaily('calendar'), sv.calendarReady() ? true : 0, sv.calendarReady() ? 'glow' : '');
    side(left, `<span class="ra-ico">${icon('scroll')}</span>`, 'Quêtes', () => this.openDaily('quests'), qn, qn ? 'glow' : '');
    side(right, `<span class="ra-ico">${icon('wheel')}</span>`, 'Roue', () => this.openDaily('wheel'), sv.wheelReady() ? true : 0, sv.wheelReady() ? 'glow spin' : '');
    side(right, `<span class="ra-ico">${icon('ticket')}</span>`, 'Passe', () => this.openDaily('pass'), pn, pn ? 'glow' : '');
    side(right, `<span class="ra-ico">${icon('target')}</span>`, 'Défi', () => this.openDaily('challenge'), ch.done ? 0 : true, ch.done ? 'done' : '');
    // le cadeau du jour s'ouvre tout seul à la première visite de la journée
    const D = sv.data.daily;
    if (sv.calendarReady() && D.popped !== D.day && !sv.data.notice && sv.data.settings.tutorialDone !== false) { D.popped = D.day; sv.persist(); setTimeout(() => { if (this.screen === 'menu' && !$('#overlay.show')) this.openDaily('calendar'); }, 600); }
  },
  openDaily(kind) {
    this.audio.play('sheet');
    const m = el('div', 'panel glass daily d-' + kind);
    const x = el('button', 'icon-btn close', icon('close')); x.onclick = () => { this.closeOverlay(); this.show(this.screen, true); };
    m.append(x);
    this['daily_' + kind](m);
    this.openOverlay(m);
  },
  afterClaim(text, art) {
    this.audio.play('chest'); this.haptics.pulse(2); this.refreshWallet(); this.tabBadges();
    this.rewardPop(art, text);
  },
  // Carte récompense en grand, avec rayons (touche pour fermer)
  rewardPop(art, text) {
    const p = el('div', 'reward-pop', `<div class="rays"></div><div class="rp-card"><span class="rp-art">${art}</span><b>${text}</b></div><small>Touche pour continuer</small>`);
    const close = () => { p.classList.add('out'); setTimeout(() => p.remove(), 250); };
    p.onclick = close; setTimeout(close, 2600);
    $('#app').append(p);
  },

  // ------------------------------------------------------------------ cadeau du jour
  daily_calendar(m) {
    const sv = this.save, D = sv.data.daily, ready = sv.calendarReady(), cur = D.cal % 7;
    m.append(el('h2', 'win', 'CADEAU DU JOUR'), el('p', 'streak', `${icon('flame')}Série : <b>${D.streak} jour${D.streak > 1 ? 's' : ''}</b> d'affilée`));
    const grid = el('div', 'cal-grid');
    DAILY.calendar.forEach((r, i) => {
      const got = i < cur || (!ready && i === cur - 1) || (!ready && cur === 0 && D.cal > 0 && i === 6);
      const today = ready && i === cur;
      const c = el('button', 'cal' + (i === 6 ? ' big' : '') + (got ? ' got' : '') + (today ? ' today' : ''), `<small>Jour ${i + 1}</small><span class="cal-art">${rewardArt(r)}</span><span class="cal-rw">${rewardChips(r)}</span>${got ? `<i class="ok">${icon('check')}</i>` : ''}`);
      c.onclick = () => {
        if (!today) { this.audio.play(got ? 'tick' : 'error'); if (!got) this.toast('Pas encore', 'Reviens demain pour ce cadeau', icon('calendar')); return; }
        const res = sv.claimCalendar(); if (!res) return;
        c.classList.add('claim'); this.afterClaim(res.text, rewardArt(res.r));
        setTimeout(() => this.openDaily('calendar'), 700);
      };
      grid.append(c);
    });
    m.append(grid, el('p', 'sub', ready ? 'Touche le cadeau qui brille pour le récupérer.' : 'Reviens demain pour le cadeau suivant. Le 7e jour : un coffre doré !'));
  },

  // ------------------------------------------------------------------ quêtes
  daily_quests(m) {
    const sv = this.save, D = sv.data.daily;
    m.append(el('h2', 'win', 'QUÊTES'));
    const row = (q, weekly) => {
      const def = sv.questDef(q, weekly), done = q.prog >= def.n, p = Math.min(1, q.prog / def.n);
      const r = el('div', 'quest' + (weekly ? ' weekly' : '') + (q.claimed ? ' claimed' : done ? ' done' : ''), `<span class="q-ico">${icon(def.icon)}</span>
        <span class="q-txt"><b>${def.text.replace('{n}', fmt(def.n))}</b><span class="progress"><i style="width:${p * 100}%"></i></span><small>${fmt(Math.min(q.prog, def.n))} / ${fmt(def.n)}</small></span>
        <span class="q-rw">${rewardChips(def.reward)}<span class="rw pass">${icon('ticket')}<b>+${def.pass}</b></span></span>`);
      if (q.claimed) r.append(el('span', 'owned', icon('check')));
      else { const b = el('button', 'btn sm ' + (done ? 'green' : 'off'), done ? 'Récupérer' : icon('lock')); b.onclick = () => { const t = sv.claimQuest(q); if (!t) { this.audio.play('error'); return; } this.afterClaim(t, rewardArt(def.reward)); this.openDaily('quests'); }; r.append(b); }
      return r;
    };
    m.append(el('small', 'kicker', 'AUJOURD\'HUI'));
    for (const q of D.quests) m.append(row(q, false));
    if (D.weekly) { m.append(el('small', 'kicker', 'CETTE SEMAINE')); m.append(row(D.weekly, true)); }
    m.append(el('p', 'sub', 'De nouvelles quêtes chaque jour à minuit, une grosse quête chaque lundi.'));
  },

  // ------------------------------------------------------------------ roue de la chance
  daily_wheel(m) {
    const sv = this.save, W = DAILY.wheel, n = W.length, seg = 360 / n;
    m.append(el('h2', 'win', 'ROUE DE LA CHANCE'));
    let paths = '';
    W.forEach((s, i) => {
      const a0 = ((i * seg - 90 - seg / 2) * Math.PI) / 180, a1 = (((i + 1) * seg - 90 - seg / 2) * Math.PI) / 180;
      paths += `<path d="M100 100L${100 + 96 * Math.cos(a0)} ${100 + 96 * Math.sin(a0)}A96 96 0 0 1 ${100 + 96 * Math.cos(a1)} ${100 + 96 * Math.sin(a1)}z" fill="${WHEEL_COLORS[i % WHEEL_COLORS.length]}" stroke="#3d2c4e" stroke-width="3"/>`;
    });
    const wheel = el('div', 'wheel', `<svg viewBox="0 0 200 200">${paths}<circle cx="100" cy="100" r="96" fill="none" stroke="#3d2c4e" stroke-width="5"/></svg>`);
    W.forEach((s, i) => {
      const lab = el('span', 'wl', rewardChips(s)); lab.style.transform = `rotate(${i * seg}deg) translateY(-78px)`; wheel.append(lab);
    });
    const box = el('div', 'wheel-box'); box.append(wheel, el('i', 'pointer'), el('span', 'hub', icon('star')));
    for (let k = 0; k < 16; k++) { const b = el('i', 'bulb'); b.style.transform = `rotate(${k * 22.5}deg) translateY(-128px)`; b.style.animationDelay = `${(k % 2) * 0.4}s`; box.append(b); }
    m.append(box);
    const free = sv.wheelReady();
    const go = el('button', 'btn big ' + (free ? 'primary' : 'pink'), free ? icon('play') + 'Tourner (gratuit)' : `Tour bonus ${gem()}${DAILY.wheelExtraCost}`);
    let spinning = false;
    go.onclick = () => {
      if (spinning) return;
      if (!sv.wheelReady()) { if (!sv.spend(DAILY.wheelExtraCost, 'gems')) { this.audio.play('error'); this.toast('Pas assez de gemmes', 'Le tour gratuit revient demain', gem()); return; } sv.data.daily.wheel = ''; }
      spinning = true; go.classList.add('off');
      const res = sv.spinWheel();
      const turns = 6 * 360 + (360 - res.i * seg) + (Math.random() - 0.5) * seg * 0.6;
      const svg = $('svg', wheel); const labs = $$('.wl', wheel);
      wheel.style.transition = 'transform 4.2s cubic-bezier(.12,.75,.18,1)'; wheel.style.transform = `rotate(${turns}deg)`;
      // tic-tac synchronisé avec les segments qui passent
      let last = 0; const t0 = performance.now();
      const tick = () => {
        const st = getComputedStyle(wheel).transform; let ang = 0;
        if (st && st !== 'none') { const v = st.split('(')[1].split(')')[0].split(','); ang = Math.atan2(+v[1], +v[0]) * 180 / Math.PI; }
        const s = Math.floor((ang + 720) / seg); if (s !== last) { last = s; this.audio.play('tick'); this.haptics.pulse(0); }
        if (performance.now() - t0 < 4300) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setTimeout(() => { this.afterClaim(res.text, rewardArt(res.r)); this.audio.play('victory'); spinning = false; this.openDaily('wheel'); }, 4400);
      void svg; void labs;
    };
    m.append(go, el('p', 'sub', free ? 'Un tour gratuit chaque jour.' : 'Ton tour gratuit revient demain.'));
  },

  // ------------------------------------------------------------------ défi du jour
  daily_challenge(m) {
    const sv = this.save, ch = sv.challenge(), L = LEVELS[ch.n - 1], w = WORLDS[L.world];
    m.append(el('h2', 'win', 'DÉFI DU JOUR'), el('div', 'ch-mod', `${icon('target')}<span><b>${ch.mod.name}</b>${ch.mod.desc}</span>`));
    const top = el('div', 'prep-top');
    const cv = el('canvas', 'thumb'); cv.width = 264; cv.height = 414; drawMapPreview(cv, THEMES[w.theme], buildField(L.layout, L.mirror, L.slots, CAMPAIGN.mines));
    top.append(cv, el('div', 'prep-info', `<div>${icon('map')}Niveau <b>${L.id}</b></div><div>${icon('wave')}<b>${L.waves}</b> vagues</div><div class="ch-rw"><small>Récompense</small>${rewardChips(DAILY.challengeReward)}<span class="rw pass">${icon('ticket')}<b>+${DAILY.challengePass}</b></span></div>`));
    m.append(top);
    if (ch.done) m.append(el('div', 'heroic-box', `${icon('check')}<span><b>Défi réussi !</b>Un nouveau défi t'attend demain. Tu peux rejouer pour le plaisir.</span>`));
    const go = el('button', 'btn big ' + (ch.done ? 'ghost' : 'primary'), icon('play') + (ch.done ? 'Rejouer' : 'Relever le défi'));
    go.onclick = () => this.startGame(ch.n, false, false, this.loadoutFor(L), ch.mod);
    m.append(go);
  },

  // ------------------------------------------------------------------ passe de progression
  daily_pass(m) {
    const sv = this.save, P = sv.data.pass, tier = sv.passTier(), into = P.pts - tier * PASS.perTier;
    m.append(el('h2', 'win', 'PASSE DE PROGRESSION'));
    m.append(el('div', 'pass-head', `<span class="pt">${tier}</span><div class="ph-bar"><div class="progress"><i style="width:${tier >= PASS.tiers ? 100 : (into / PASS.perTier) * 100}%"></i></div><small>${tier >= PASS.tiers ? 'Passe terminé !' : `${fmt(into)} / ${PASS.perTier} points jusqu'au palier ${tier + 1}`}</small></div>`));
    m.append(el('p', 'sub', `Gagne des points avec l'XP, les étoiles (+${PASS.perStar} chacune), les quêtes et le défi du jour.`));
    if (sv.passReady() > 1) { const all = el('button', 'btn green', icon('gift') + `Tout récupérer (${sv.passReady()})`); all.onclick = () => { const out = []; for (let i = 1; i <= tier; i++) { const t = sv.claimPass(i); if (t) out.push(t); } this.afterClaim(`${out.length} paliers récupérés`, `<span class="ra-ico">${icon('ticket')}</span>`); this.openDaily('pass'); }; m.append(all); }
    const track = el('div', 'pass-track');
    let focus = null;
    for (let i = 1; i <= PASS.tiers; i++) {
      const r = passReward(i), got = P.claimed.includes(i), open = i <= tier;
      const row = el('div', 'ptier' + (got ? ' got' : open ? ' ready' : '') + (i % 5 === 0 ? ' big' : ''), `<span class="pn">${i}</span><span class="pr">${rewardChips(r)}</span>`);
      if (got) row.append(el('span', 'owned', icon('check')));
      else if (open) { const b = el('button', 'btn sm green', 'Récupérer'); b.onclick = () => { const t = sv.claimPass(i); if (t) { this.afterClaim(t, rewardArt(r)); this.openDaily('pass'); } }; row.append(b); if (!focus) focus = row; }
      else row.append(el('span', 'lockpts', `${icon('lock')}${fmt(i * PASS.perTier)}`));
      if (!focus && !open) focus = row;
      track.append(row);
    }
    m.append(track);
    requestAnimationFrame(() => { if (focus) track.scrollTop = focus.offsetTop - track.offsetTop - 60; });
  },
};
