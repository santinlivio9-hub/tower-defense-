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

// Temps restant avant minuit (nouveau jour) : « 4 h 12 » ou « 12 min »
export function untilMidnight() {
  const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0);
  const s = Math.max(60, (m - n) / 1000), h = Math.floor(s / 3600), mn = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(mn).padStart(2, '0')}` : `${mn} min`;
}
// Jusqu'au lundi suivant (quête de la semaine) : « 3 j 4 h »
export function untilMonday() {
  const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); while (m.getDay() !== 1) m.setDate(m.getDate() + 1);
  const h = Math.max(1, Math.floor((m - n) / 3600000)); return h >= 24 ? `${Math.floor(h / 24)} j ${h % 24} h` : `${h} h`;
}
// Petites puces de récompense (icône + valeur)
export function rewardChips(r) {
  const out = [];
  if (r.coins) out.push(`<span class="rw">${coin()}<b>${fmt(r.coins)}</b></span>`);
  if (r.gems) out.push(`<span class="rw">${gem()}<b>${r.gems}</b></span>`);
  if (r.chest) out.push(`<span class="rw chest">${chestSvg(r.chest)}<b>${r.chest === 'gold' ? 'Doré' : 'Bois'}</b></span>`);
  if (typeof r.boosts === 'object') for (const [id, n] of Object.entries(r.boosts)) out.push(`<span class="rw">${icon(BOOSTS[id].icon)}<b>×${n}</b></span>`);
  else if (r.boosts) out.push(`<span class="rw">${icon('boost')}<b>×${r.boosts}</b></span>`);
  if (r.talent) out.push(`<span class="rw">${icon('talent')}<b>${r.talent}</b></span>`);
  return out.join('');
}
// Grande illustration d'une récompense
function rewardArt(r) {
  if (r.chest) return chestSvg(r.chest);
  if (typeof r.boosts === 'object') return boostArt(Object.keys(r.boosts)[0]);
  if (r.boosts) return `<span class="ra-ico">${icon('boost')}</span>`;
  if (r.gems) return gem('big');
  return `<i class="coin-ico big"></i>`;
}

export const Daily = {
  dailyBadge(tab) { return tab === 'menu' ? this.save.dailyCount() : 0; },
  // Boutons autour du château (accueil)
  homeDaily(left, right, crest) {
    const sv = this.save; sv.dailyTick();
    const D = sv.data.daily, qn = sv.questsReady(), pn = sv.passReady(), ch = sv.challenge(), cal = sv.calendarReady(), wh = sv.wheelReady();
    const qdone = D.quests.filter((q) => q.claimed || q.prog >= sv.questDef(q).n).length;
    crest(left, { art: icon('gift'), label: 'Cadeau', color: 'gift', fn: () => this.openDaily('calendar'), badge: cal ? 1 : 0, info: cal ? 'Prêt !' : untilMidnight(), go: cal, cls: cal ? 'ready' : '' });
    crest(left, { art: icon('scroll'), label: 'Quêtes', color: 'quests', fn: () => this.openDaily('quests'), badge: qn, info: qn ? 'Prêt !' : `${qdone}/${D.quests.length}`, go: !!qn, cls: qn ? 'ready' : '' });
    crest(right, { art: icon('wheel'), label: 'Roue', color: 'wheel', fn: () => this.openDaily('wheel'), badge: wh ? 1 : 0, info: wh ? 'Gratuit !' : untilMidnight(), go: wh, cls: wh ? 'ready spin' : '' });
    crest(right, { art: icon('pass'), label: 'Passe', color: 'pass', fn: () => this.openDaily('pass'), badge: pn, info: pn ? 'Prêt !' : `Palier ${sv.passTier()}`, go: !!pn, cls: pn ? 'ready' : '' });
    crest(right, { art: icon('challenge'), label: 'Défi', color: 'challenge', fn: () => this.openDaily('challenge'), info: ch.done ? untilMidnight() : 'À relever' });
    // le cadeau du jour s'ouvre tout seul à la première visite de la journée
    if (cal && D.popped !== D.day && !sv.data.notice && sv.data.settings.tutorialDone !== false) { D.popped = D.day; sv.persist(); setTimeout(() => { if (this.screen === 'menu' && !$('#overlay.show')) this.openDaily('calendar'); }, 600); }
  },
  openDaily(kind) {
    this.audio.play('sheet');
    const m = el('div', 'panel glass daily d-' + kind);
    const x = el('button', 'icon-btn close', icon('close')); x.onclick = () => { this.closeOverlay(); this.show(this.screen, true); };
    m.append(x);
    this['daily_' + kind](m);
    this.openOverlay(m);
  },
  afterClaim(text, art, from) {
    this.audio.play('chest'); this.haptics.pulse(2); this.refreshWallet(); this.tabBadges();
    this.rewardPop(art, text, from);
  },
  // Récompenses qui volent vers les compteurs (pièces, gemmes ; le reste vers la boutique / le passe)
  flyRewards(fromEl, r, pass = 0) {
    const app = $('#app'), A = app.getBoundingClientRect(), F = fromEl.getBoundingClientRect();
    const fx = F.left + F.width / 2 - A.left, fy = F.top + F.height / 2 - A.top;
    const items = [];
    if (r.coins) items.push([coin('big'), '#resbar .coins']);
    if (r.gems) items.push([gem('big'), '#resbar .gems']);
    if (r.chest) items.push([icon('chest'), '#tabbar .tab-shop']);
    if (r.boosts) items.push([icon('boost'), '#tabbar .tab-shop']);
    if (pass) items.push([icon('ticket'), '#tabbar .tab-menu']);
    $('#resbar').classList.add('lift'); clearTimeout(this._liftT); this._liftT = setTimeout(() => $('#resbar').classList.remove('lift'), 1500);
    items.forEach(([html, sel], k) => {
      const tgt = $(sel); if (!tgt) return;
      const T = tgt.getBoundingClientRect(), tx = T.left + T.width / 2 - A.left, ty = T.top + T.height / 2 - A.top;
      for (let n = 0; n < 4; n++) {
        const e = el('div', 'fly-rw', html); e.style.left = fx + 'px'; e.style.top = fy + 'px'; app.append(e);
        const dx = tx - fx, dy = ty - fy, mx = dx * 0.3 + (n - 1.5) * 28, my = dy * 0.3 - 60 - n * 10;
        e.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px)) scale(1.25)`, opacity: 1, offset: 0.35 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.55)`, opacity: 0.9 }],
          { duration: 760, delay: k * 140 + n * 70, easing: 'cubic-bezier(.5,0,.5,1)', fill: 'both' }).onfinish = () => {
          e.remove(); tgt.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 220 });
          if (n === 0) { this.audio.play('tick'); this.haptics.pulse(0); }
        };
      }
    });
    setTimeout(() => this.refreshWallet(), 700);
  },
  // Carte récompense en grand, avec rayons (touche pour fermer). from = élément d'où elle sort
  rewardPop(art, text, from) {
    const p = el('div', 'reward-pop', `<div class="rays"></div><div class="rp-card"><span class="rp-art">${art}</span><b>${text}</b></div><small>Touche pour continuer</small>`);
    if (from) {
      const A = $('#app').getBoundingClientRect(), F = from.getBoundingClientRect();
      requestAnimationFrame(() => { const C = $('.rp-card', p).getBoundingClientRect(); $('.rp-card', p).animate([{ transform: `translate(${F.left + F.width / 2 - (C.left + C.width / 2)}px, ${F.top + F.height / 2 - (C.top + C.height / 2)}px) scale(.2)` }, { transform: 'translate(0,0) scale(1.15)', offset: 0.7 }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.3,1.3,.5,1)' }); void A; });
    }
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
    const card = (q, weekly) => {
      const def = sv.questDef(q, weekly), done = q.prog >= def.n, p = Math.min(1, q.prog / def.n), cur = Math.min(q.prog, def.n);
      const r = el('div', 'quest' + (weekly ? ' weekly' : '') + (q.claimed ? ' claimed' : done ? ' done' : ''), `<span class="q-ico">${icon(def.icon)}</span>
        <span class="q-txt"><b>${def.text.replace('{n}', fmt(def.n))}</b><span class="qbar"><i style="width:${p * 100}%"></i><em>${fmt(cur)} / ${fmt(def.n)}</em></span></span>
        <span class="q-rw">${rewardChips(def.reward)}<span class="rw pass">${icon('ticket')}<b>+${def.pass}</b></span></span>`);
      if (q.claimed) r.append(el('span', 'owned', icon('check')));
      else if (!done) r.append(el('span', 'state-wip', `En cours<b>${fmt(cur)}/${fmt(def.n)}</b>`));
      else {
        const b = el('button', 'btn sm green cta', 'RÉCUPÉRER');
        b.onclick = () => {
          const t = sv.claimQuest(q); if (!t) { this.audio.play('error'); return; }
          b.disabled = true; this.audio.play('chest'); this.haptics.pulse(2);
          r.append(el('span', 'stamp', 'TERMINÉ !'));
          this.flyRewards($('.q-rw', r), def.reward, def.pass);
          this.tabBadges(); setTimeout(() => { if (m.isConnected) this.openDaily('quests'); }, 1100);
        };
        r.append(b);
      }
      return r;
    };
    m.append(el('div', 'qhead', `<small class="kicker">AUJOURD'HUI</small><span class="timer">${icon('calendar')}Nouvelles quêtes dans <b>${untilMidnight()}</b></span>`));
    for (const q of D.quests) m.append(card(q, false));
    if (D.weekly) {
      const wk = el('div', 'weekly-frame', `<div class="qhead"><small class="kicker">QUÊTE DE LA SEMAINE</small><span class="timer">${icon('trophy')}Fin dans <b>${untilMonday()}</b></span></div>`);
      wk.append(card(D.weekly, true)); m.append(wk);
    }
  },

  // ------------------------------------------------------------------ roue de la chance
  daily_wheel(m) {
    const sv = this.save, W = DAILY.wheel, n = W.length, seg = 360 / n, jack = W.reduce((b, x, i) => (x.w < W[b].w ? i : b), 0);
    m.append(el('h2', 'win', 'ROUE DE LA CHANCE'));
    let paths = '';
    W.forEach((sg, i) => {
      const a0 = ((i * seg - 90 - seg / 2) * Math.PI) / 180, a1 = (((i + 1) * seg - 90 - seg / 2) * Math.PI) / 180;
      const d = `M100 100L${100 + 96 * Math.cos(a0)} ${100 + 96 * Math.sin(a0)}A96 96 0 0 1 ${100 + 96 * Math.cos(a1)} ${100 + 96 * Math.sin(a1)}z`;
      paths += `<path d="${d}" fill="${i === jack ? 'url(#wjack)' : WHEEL_COLORS[i % WHEEL_COLORS.length]}" stroke="#3d2c4e" stroke-width="3"/>`;
      if (i === jack) paths += `<path class="jshine" d="${d}" fill="#fff"/>`;
    });
    const wheel = el('div', 'wheel', `<svg viewBox="0 0 200 200"><defs><linearGradient id="wjack" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#e09600"/></linearGradient></defs>${paths}
      <circle cx="100" cy="100" r="96" fill="none" stroke="#3d2c4e" stroke-width="5"/></svg>`);
    // libellés : icône illustrée + valeur, toujours à l'endroit (ils compensent la rotation)
    const val = (sg) => (sg.coins ? fmt(sg.coins) : sg.gems ? sg.gems : sg.boosts ? '×' + sg.boosts : sg.chest === 'gold' ? 'JACKPOT' : 'Coffre');
    const art = (sg) => (sg.coins ? coin('big') : sg.gems ? gem('big') : sg.boosts ? icon('boost') : chestSvg(sg.chest));
    const labs = W.map((sg, i) => { const l = el('span', 'wl' + (i === jack ? ' jack' : ''), `<span class="wl-art">${art(sg)}</span><b>${val(sg)}</b>`); wheel.append(l); return l; });
    const place = (A) => labs.forEach((l, i) => { l.style.transform = `rotate(${i * seg}deg) translateY(-62px) rotate(${-i * seg - A}deg)`; });
    place(0);
    const box = el('div', 'wheel-box'); box.append(wheel, el('i', 'pointer'), el('span', 'hub', icon('star')));
    const bulbs = []; for (let k = 0; k < 16; k++) { const b = el('i', 'bulb'); b.style.transform = `rotate(${k * 22.5}deg) translateY(-128px)`; b.style.animationDelay = `${(k % 2) * 0.4}s`; box.append(b); bulbs.push(b); }
    m.append(box);
    const free = sv.wheelReady(), foot = el('div', 'wheel-foot');
    let spinning = false;
    // lancer : accélère, tourne, ralentit longuement (suspense), cliquette à chaque case
    const spin = () => {
      spinning = true; box.classList.add('spinning');
      const res = sv.spinWheel(), turns = 7 * 360 + (360 - res.i * seg) + (Math.random() - 0.5) * seg * 0.55, T = 5600;
      const N = 240, cum = [0]; for (let k = 1; k <= N; k++) { const u = k / N, v = u < 0.1 ? u / 0.1 : Math.pow(1 - (u - 0.1) / 0.9, 2.4); cum.push(cum[k - 1] + v); }
      const ease = (u) => { const x = Math.min(N, u * N), i = Math.floor(x); return (cum[i] + (cum[Math.min(N, i + 1)] - cum[i]) * (x - i)) / cum[N]; };
      const t0 = performance.now(); let last = 0, lit = 0;
      const frame = (now) => {
        const u = Math.min(1, (now - t0) / T), A = turns * ease(u);
        wheel.style.transform = `rotate(${A}deg)`; place(A);
        const s = Math.floor((A + seg / 2) / seg);
        if (s !== last) { last = s; this.audio.play('tick'); this.haptics.pulse(0); box.classList.remove('flick'); void box.offsetWidth; box.classList.add('flick'); bulbs[lit % 16].classList.remove('on'); lit++; bulbs[lit % 16].classList.add('on'); }
        if (u < 1) { requestAnimationFrame(frame); return; }
        box.classList.remove('spinning'); box.classList.add('win'); this.audio.play('victory'); this.haptics.pulse(2);
        setTimeout(() => { this.afterClaim(res.text, rewardArt(res.r), labs[res.i]); spinning = false; setTimeout(() => { if (m.isConnected) this.openDaily('wheel'); }, 900); }, 700);
      };
      requestAnimationFrame(frame);
    };
    if (free) {
      const go = el('button', 'btn big green cta', icon('playgold') + 'TOURNER');
      go.onclick = () => { if (spinning) return; go.classList.remove('cta'); go.classList.add('locked'); go.innerHTML = 'La roue tourne…'; spin(); };
      foot.append(go, el('p', 'sub', 'Un tour gratuit chaque jour.'));
    } else {
      foot.append(el('div', 'wheel-timer', `${icon('calendar')}<span>Prochain tour gratuit dans <b>${untilMidnight()}</b></span>`));
      const bonus = this.buyButton(DAILY.wheelExtraCost, 'gems', 'Tour bonus', () => { if (spinning) return false; sv.data.daily.wheel = ''; bonus.disabled = true; spin(); return false; }, 'pink');
      bonus.classList.add('wide'); foot.append(bonus);
    }
    m.append(foot);
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
    const sv = this.save, P = sv.data.pass, tier = sv.passTier(), into = P.pts - tier * PASS.perTier, maxed = tier >= PASS.tiers;
    m.append(el('h2', 'win', 'PASSE DE PROGRESSION'));
    m.append(el('div', 'pass-head', `<span class="pt">${icon('ticket')}</span><div class="ph-bar"><div class="ph-top"><b>Palier ${tier}</b><span>${icon('ticket')}${fmt(P.pts)} pts</span></div>
      <div class="qbar"><i style="width:${maxed ? 100 : (into / PASS.perTier) * 100}%"></i><em>${maxed ? 'Passe terminé !' : `${fmt(into)} / ${PASS.perTier}`}</em></div></div>`));
    m.append(el('p', 'sub', 'Des points avec l\'XP, les étoiles, les quêtes et le défi du jour.'));
    const ready = sv.passReady();
    if (ready > 1) {
      const all = el('button', 'btn green cta', icon('gift') + `Tout récupérer (${ready})`);
      all.onclick = () => { const r = {}; let k = 0; for (let i = 1; i <= tier; i++) { const pr = passReward(i); if (sv.claimPass(i)) { k++; for (const key of ['coins', 'gems']) if (pr[key]) r[key] = (r[key] || 0) + pr[key]; if (pr.chest) r.chest = pr.chest; if (pr.boosts) r.boosts = 1; } }
        this.audio.play('chest'); this.haptics.pulse(2); this.flyRewards(all, r); this.tabBadges(); this.toast(`${k} paliers récupérés`, '', icon('pass')); setTimeout(() => { if (m.isConnected) this.openDaily('pass'); }, 900); };
      m.append(all);
    }
    // piste verticale : rail qui se remplit jusqu'au palier actuel, cartes illustrées, paliers spéciaux plus gros
    const track = el('div', 'pass-track');
    let focus = null;
    for (let i = 1; i <= PASS.tiers; i++) {
      const r = passReward(i), got = P.claimed.includes(i), open = i <= tier, big = i % 5 === 0;
      const fill = open ? 1 : i === tier + 1 ? into / PASS.perTier : 0;
      const row = el('div', 'ptier' + (got ? ' got' : open ? ' ready' : ' locked') + (big ? ' big' : '') + (i === PASS.tiers ? ' final' : ''), `<span class="rail" style="--f:${fill}"></span><span class="pn">${i}</span>
        <div class="pcard"><span class="pc-art">${rewardArt(r)}</span><span class="pc-rw">${rewardChips(r)}</span></div>`);
      if (got) row.append(el('span', 'owned', icon('check')));
      else if (open) {
        const b = el('button', 'btn sm green cta', 'Récupérer');
        b.onclick = () => { if (!sv.claimPass(i)) return; b.disabled = true; b.classList.remove('cta'); this.audio.play('chest'); this.haptics.pulse(2); row.classList.add('claiming'); this.flyRewards($('.pcard', row), r); this.tabBadges(); setTimeout(() => { if (m.isConnected) this.openDaily('pass'); }, 900); };
        row.append(b); if (!focus) focus = row;
      } else row.append(el('span', 'lockpts', `${icon('lock')}<b>${fmt(i * PASS.perTier)}</b><small>pts</small>`));
      if (!focus && !open) focus = row;
      track.append(row);
    }
    m.append(track);
    requestAnimationFrame(() => { if (focus) track.scrollTop = focus.offsetTop - track.offsetTop - 70; });
  },
};
