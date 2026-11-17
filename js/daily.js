// Raisons de revenir : cadeau du jour (calendrier de 7 jours + série), quêtes du jour et de la semaine,
// roue de la chance, défi du jour, passe de progression. Méthodes ajoutées à la classe UI.
import { DAILY, PASS, passReward, LEVELS, WORLDS, CAMPAIGN, BOOSTS, SEASON, PROFILE, SHOP, seasonTheme, seasonEnd, premiumReward } from './config.js';
import { THEMES, buildField, drawMapPreview } from './maps.js';
import { icon, coin, gem } from './icons.js';
import { chestSvg } from './loot.js';
import { boostArt } from './boosts.js';
import { enemyImg, towerImg } from './sprites.js';

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
// Temps restant avant le prochain tour gratuit de la roue : « 4 h 12 » ou « 12 min »
export function untilMs(ms) {
  const s = Math.max(60, ms / 1000), h = Math.floor(s / 3600), mn = Math.floor((s % 3600) / 60);
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
  if (r.chest) out.push(`<span class="rw chest">${chestSvg(r.chest)}<b>${{ wood: 'Bois', gold: 'Doré', legend: 'Légendaire' }[r.chest]}</b></span>`);
  if (typeof r.boosts === 'object') for (const [id, n] of Object.entries(r.boosts)) out.push(`<span class="rw">${icon(BOOSTS[id].icon)}<b>×${n}</b></span>`);
  else if (r.boosts) out.push(`<span class="rw">${icon('boost')}<b>×${r.boosts}</b></span>`);
  if (r.talent) out.push(`<span class="rw">${icon('talent')}<b>${r.talent}</b></span>`);
  if (r.skin) out.push(`<span class="rw cos">${icon('star')}<b>Skin</b></span>`);
  if (r.frame) out.push(`<span class="rw cos">${icon('medal')}<b>Cadre</b></span>`);
  if (r.title) out.push(`<span class="rw cos">${icon('crown')}<b>Titre</b></span>`);
  if (r.fx) out.push(`<span class="rw cos">${icon('flame')}<b>Effet</b></span>`);
  return out.join('');
}
// Grande illustration d'une récompense
// aperçu d'un cosmétique : cadre (badge de niveau encadré), titre (bandeau), effet de victoire (confettis)
export function frameArt(id, lvl = '') { const f = PROFILE.frames[id] || {}; return `<span class="fr-prev${f.c ? ' on' : ''}" style="--f1:${(f.c || [])[0] || '#6a5a8f'};--f2:${(f.c || [])[1] || '#3d2c4e'}"><b>${lvl}</b></span>`; }
export function fxArt(id) { const c = (PROFILE.fx[id] || PROFILE.fx.classic).cols; return `<span class="fx-prev">${c.slice(0, 4).map((x, i) => `<i style="background:${x};--k:${i}"></i>`).join('')}</span>`; }
export function rewardArt(r) {
  if (r.skin) return towerImg('assault', 60, r.skin, 4, 0).outerHTML;
  if (r.frame) return frameArt(r.frame, '');
  if (r.title) return `<span class="ttl-prev">${icon('crown')}</span>`;
  if (r.fx) return fxArt(r.fx);
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
    crest(right, { art: icon('wheel'), label: 'Roue', color: 'wheel', fn: () => this.openDaily('wheel'), badge: wh ? 1 : 0, info: wh ? 'Gratuit !' : untilMs(sv.wheelLeft()), go: wh, cls: wh ? 'ready spin' : '' });
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
      const today = ready && i === cur, next = !ready && i === cur;
      // case illustrée : boîte-cadeau avec ruban, le jour actuel brille
      const c = el('button', 'cal' + (i === 6 ? ' big' : '') + (got ? ' got' : today ? ' today' : ' later'), `${today ? '<i class="cal-rays"></i>' : ''}<span class="cal-day">Jour ${i + 1}</span>
        <span class="cal-art">${rewardArt(r)}</span><span class="cal-rw">${rewardChips(r)}</span>${got ? `<i class="ok">${icon('check')}</i>` : ''}${next ? `<i class="cal-next">${untilMidnight()}</i>` : ''}`);
      c.onclick = () => {
        if (!today) { this.audio.play(got ? 'tick' : 'error'); if (!got) this.toast('Pas encore', 'Reviens demain pour ce cadeau', icon('gift')); return; }
        const res = sv.claimCalendar(); if (!res) return;
        c.classList.add('claim'); this.afterClaim(res.text, rewardArt(res.r), $('.cal-art', c));
        setTimeout(() => this.openDaily('calendar'), 700);
      };
      grid.append(c);
    });
    m.append(grid, el('p', 'sub', ready ? 'Touche le cadeau qui brille pour le récupérer.' : `Prochain cadeau dans ${untilMidnight()}. Le 7e jour : un coffre doré !`));
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
    const wheel = el('div', 'wheel' + (n > 8 ? ' n9' : ''), `<svg viewBox="0 0 200 200"><defs><linearGradient id="wjack" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#e09600"/></linearGradient></defs>${paths}
      <circle cx="100" cy="100" r="96" fill="none" stroke="#3d2c4e" stroke-width="5"/></svg>`);
    // libellés : icône illustrée + valeur, toujours à l'endroit (ils compensent la rotation)
    const val = (sg) => (sg.coins ? fmt(sg.coins) : sg.gems ? sg.gems : sg.boosts ? '×' + sg.boosts : sg.chest === 'gold' ? 'JACKPOT' : 'Coffre');
    const art = (sg) => (sg.coins ? coin('big') : sg.gems ? gem('big') : sg.boosts ? icon('boost') : chestSvg(sg.chest));
    const labs = W.map((sg, i) => { const l = el('span', 'wl' + (i === jack ? ' jack' : ''), `<span class="wl-art">${art(sg)}</span><b>${val(sg)}</b>`); wheel.append(l); return l; });
    const place = (A) => labs.forEach((l, i) => { l.style.transform = `rotate(${i * seg}deg) translateY(${n > 8 ? -80 : -62}px) rotate(${-i * seg - A}deg)`; });
    place(0);
    const box = el('div', 'wheel-box'); box.append(wheel, el('i', 'pointer'), el('span', 'hub', icon('star')));
    const bulbs = []; for (let k = 0; k < 16; k++) { const b = el('i', 'bulb'); b.style.transform = `rotate(${k * 22.5}deg) translateY(-128px)`; b.style.animationDelay = `${(k % 2) * 0.4}s`; box.append(b); bulbs.push(b); }
    m.append(box);
    const free = sv.wheelReady(), foot = el('div', 'wheel-foot');
    let spinning = false;
    // lancer : accélère, tourne, ralentit longuement (suspense), cliquette à chaque case
    const spin = (free = true) => {
      spinning = true; box.classList.add('spinning');
      const res = sv.spinWheel(free), turns = 7 * 360 + (360 - res.i * seg) + (Math.random() - 0.5) * seg * 0.55, T = 5600;
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
      foot.append(go, el('p', 'sub', `Un tour gratuit toutes les ${DAILY.wheelEvery} heures.`));
    } else {
      const tm = el('div', 'wheel-timer', `${icon('hourglass')}<span>Prochain tour gratuit dans <b>${untilMs(sv.wheelLeft())}</b></span>`); foot.append(tm);
      const tick = setInterval(() => { if (!tm.isConnected) { clearInterval(tick); return; } if (sv.wheelReady()) { clearInterval(tick); if (!spinning) this.openDaily('wheel'); return; } $('b', tm).textContent = untilMs(sv.wheelLeft()); }, 1000);
      const bonus = this.buyButton(DAILY.wheelExtraCost, 'gems', 'Tour bonus', () => { if (spinning) return false; bonus.disabled = true; spin(false); return false; }, 'pink');
      bonus.classList.add('wide'); foot.append(bonus);
      const ad = this.adButton('Tour bonus', '+1 tour', 'un tour de roue', () => { if (spinning) return; ad.disabled = true; spin(false); }); foot.append(ad);
    }
    m.append(foot);
  },

  // ------------------------------------------------------------------ défi du jour
  daily_challenge(m) {
    const sv = this.save, ch = sv.challenge(), L = LEVELS[ch.n - 1], w = WORLDS[L.world], mod = ch.mod;
    m.classList.add('poster');
    m.append(el('div', 'po-top', `<span class="po-kick">DÉFI DU JOUR</span><b class="po-name">${mod.name}</b>`));
    // illustration du modificateur
    const art = el('div', 'po-art po-' + mod.id);
    const foe = (t, s) => { const i = enemyImg(t, s); i.className = 'po-foe'; return i; };
    const gun = (t) => { const i = towerImg(t, 96, sv.data.skin, 3); i.className = 'po-gun'; return i; };
    if (mod.id === 'giant') art.append(foe('tank', 120), foe('basic', 44));
    else if (mod.id === 'double') art.append(foe('basic', 64), foe('basic', 64), el('b', 'po-tag', '×2'));
    else if (mod.id === 'pump') art.append(gun('shotgun'));
    else if (mod.id === 'sniper') art.append(gun('sniper'));
    else if (mod.id === 'rush') art.append(el('i', 'po-speed'), foe('fast', 90));
    else if (mod.id === 'tiny') for (let k = 0; k < 9; k++) art.append(foe(['basic', 'fast', 'healer'][k % 3], 34));
    else art.append(foe('basic', 80));
    m.append(art, el('p', 'po-desc', mod.desc));
    m.append(el('div', 'po-info', `<span>${icon('map')}Niveau <b>${L.id}</b></span><span>${icon('wave')}<b>${L.waves}</b> vagues</span><span class="po-world">${w.name}</span>`));
    m.append(el('div', 'po-rw', `<small>Récompense</small><div>${rewardChips(DAILY.challengeReward)}<span class="rw pass">${icon('ticket')}<b>+${DAILY.challengePass}</b></span></div>`));
    if (ch.done) m.append(el('div', 'po-done', `${icon('check')}<span><b>Défi réussi !</b>Nouveau défi dans ${untilMidnight()}. Tu peux rejouer pour le plaisir.</span>`));
    const go = el('button', 'btn big ' + (ch.done ? 'ghost' : 'primary cta'), icon(ch.done ? 'restart' : 'playgold') + (ch.done ? 'Rejouer' : 'Relever le défi'));
    go.onclick = () => this.startGame(ch.n, false, false, this.loadoutFor(L), mod);
    m.append(go);
  },

  // ------------------------------------------------------------------ pass de saison
  // Saison (thème, fin), aperçu des meilleures récompenses, bouton premium, deux pistes parallèles (gratuite en haut,
  // premium en bas avec cadre doré et cadenas) qui défilent horizontalement, puis les missions de la semaine.
  daily_pass(m) {
    const sv = this.save; sv.seasonTick();
    const P = sv.data.pass, n = P.season, th = seasonTheme(n), tier = sv.passTier(), into = P.pts - tier * PASS.perTier, maxed = tier >= PASS.tiers;
    m.style.setProperty('--sc', th.color);
    const left = Math.max(0, seasonEnd(n) - Date.now()), dd = Math.floor(left / 86400000), hh = Math.floor((left % 86400000) / 3600000);
    m.append(el('div', 'ss-head', `<small>SAISON ${n}</small><h2>${th.name}</h2><span class="timer">${icon('hourglass')}Fin dans <b>${dd ? dd + ' j ' : ''}${hh} h</b></span>`));
    m.append(el('div', 'pass-head', `<span class="pt">${icon('ticket')}</span><div class="ph-bar"><div class="ph-top"><b>Palier ${tier}</b><span>${icon('ticket')}${fmt(P.pts)} pts</span></div>
      <div class="qbar"><i style="width:${maxed ? 100 : (into / PASS.perTier) * 100}%"></i><em>${maxed ? 'Pass terminé !' : `${fmt(into)} / ${PASS.perTier}`}</em></div></div>`));
    if (!P.premium) {
      const buy = el('button', 'btn primary big ss-buy', `${icon('crown')}<span>Débloquer le pass premium – ${this.mon ? this.mon.price('season_pass') : '4,99 €'}</span>`);
      buy.onclick = async () => { if (!this.mon) return; buy.disabled = true; const ok = await this.mon.buy('season_pass'); buy.disabled = false; if (ok) { this.audio.play('legendary'); this.haptics.pulse(2); this.toast('Pass premium débloqué !', tier ? `${tier} palier${tier > 1 ? 's' : ''} premium à récupérer` : 'Bonne saison !', icon('crown')); this.openDaily('pass'); } };
      m.append(buy, el('p', 'sub ss-note', 'Cosmétiques et confort uniquement : rien d\'indispensable pour finir la campagne.'));
    } else m.append(el('div', 'ss-active', `${icon('crown')}Pass premium actif pour cette saison`));
    const ready = sv.passReady() + sv.premiumReady();
    if (ready > 1) {
      const all = el('button', 'btn green cta', icon('gift') + `Tout récupérer (${ready})`);
      all.onclick = () => { const r = {}; let k = 0; for (let i = 1; i <= tier; i++) for (const [ok, rw] of [[sv.claimPass(i), passReward(i)], [sv.claimPremium(i), premiumReward(i, n)]]) if (ok) { k++; for (const key of ['coins', 'gems']) if (rw[key]) r[key] = (r[key] || 0) + rw[key]; if (rw.chest) r.chest = rw.chest; if (rw.boosts) r.boosts = 1; }
        this.audio.play('chest'); this.haptics.pulse(2); this.flyRewards(all, r); this.tabBadges(); this.refreshWallet(); this.toast(`${k} récompenses récupérées`, '', icon('pass')); setTimeout(() => { if (m.isConnected) this.openDaily('pass'); }, 900); };
      m.append(all);
    }
    // deux pistes parallèles, défilement horizontal, une colonne par palier
    const track = el('div', 'ss-track'), labels = el('div', 'ss-col ss-lab', `<span class="ss-n"></span><span class="ss-rl">GRATUIT</span><span class="ss-rl prem">${icon(P.premium ? 'crown' : 'lock')}PREMIUM</span>`);
    track.append(labels);
    let focus = null;
    const cell = (i, rw, prem) => {
      const got = prem ? P.pclaimed.includes(i) : P.claimed.includes(i), open = i <= tier, can = open && !got && (!prem || P.premium);
      const c = el('button', 'ss-cell' + (prem ? ' prem' : '') + (got ? ' got' : can ? ' ready' : ' locked') + (prem && !P.premium ? ' shut' : '') + (i % 5 === 0 ? ' big' : ''), `<span class="ss-art">${rewardArt(rw)}</span><span class="ss-rw">${rewardChips(rw)}</span>${got ? `<i class="ss-ok">${icon('check')}</i>` : prem && !P.premium ? `<i class="ss-lock">${icon('lock')}</i>` : ''}`);
      c.onclick = () => {
        if (!can) { this.audio.play('error'); if (prem && !P.premium) this.toast('Piste premium', 'Débloque le pass premium pour récupérer cette récompense', icon('lock')); return; }
        if (!(prem ? sv.claimPremium(i) : sv.claimPass(i))) return;
        this.audio.play('chest'); this.haptics.pulse(2); c.classList.add('claiming'); this.flyRewards(c, rw); this.refreshWallet(); this.tabBadges();
        setTimeout(() => { if (m.isConnected) { const sl = track.scrollLeft; this.openDaily('pass'); const t2 = $('#overlay .ss-track'); if (t2) t2.scrollLeft = sl; } }, 700);
      };
      return c;
    };
    for (let i = 1; i <= PASS.tiers; i++) {
      const col = el('div', 'ss-col' + (i <= tier ? ' open' : '') + (i === tier + 1 ? ' next' : ''), `<span class="ss-n">${i}</span>`);
      col.append(cell(i, passReward(i), false), cell(i, premiumReward(i, n), true));
      if (!focus && (i > tier || !P.claimed.includes(i) || (P.premium && !P.pclaimed.includes(i)))) focus = col;
      track.append(col);
    }
    m.append(track);
    // aperçu des meilleures récompenses premium de la saison
    const best = el('div', 'ss-best', `<small>Récompenses premium de la saison</small><div class="ss-best-row"></div>`), row = $('.ss-best-row', best);
    const skin = SHOP.skins.find((k) => k.id === th.skin);
    for (const [art, label] of [[towerImg('assault', 58, th.skin, 4, 0).outerHTML, `Skin ${skin ? skin.name : ''}`], [frameArt(th.frame, sv.data.level), `Cadre ${PROFILE.frames[th.frame].name}`], [`<span class="ttl-prev">${icon('crown')}</span>`, `Titre « ${PROFILE.titles[th.title]} »`], [fxArt(th.fx), `Effet ${PROFILE.fx[th.fx].name}`]]) row.append(el('div', 'ss-b', `<span class="ss-b-art">${art}</span><b>${label}</b>`));
    m.append(best);
    requestAnimationFrame(() => { if (focus) track.scrollLeft = Math.max(0, focus.offsetLeft - track.offsetLeft - 80); });
    // missions de saison (hebdomadaires)
    const ms = el('div', 'ss-missions', `<h3>${icon('target')}Missions de la semaine</h3>`);
    for (const q of sv.seasonMissions()) {
      const d = sv.missionDef(q), done = q.prog >= d.n, row = el('div', 'ss-m' + (q.claimed ? ' got' : done ? ' ready' : ''), `<span class="ss-mi">${icon(d.icon)}</span><span class="ss-mt"><b>${d.text.replace('{n}', fmt(d.n))}</b><span class="qbar"><i style="width:${Math.min(100, (q.prog / d.n) * 100)}%"></i><em>${fmt(Math.min(q.prog, d.n))} / ${fmt(d.n)}</em></span></span>`);
      if (q.claimed) row.append(el('span', 'owned', icon('check')));
      else if (done) { const b = el('button', 'btn sm green cta', `+${fmt(d.pts)} pts`); b.onclick = () => { const k = sv.claimMission(q); if (k) { this.audio.play('chest'); this.haptics.pulse(2); this.flyRewards(b, {}, k); this.tabBadges(); setTimeout(() => { if (m.isConnected) this.openDaily('pass'); }, 700); } }; row.append(b); }
      else row.append(el('span', 'ss-pts', `${icon('ticket')}<b>+${fmt(d.pts)}</b>`));
      ms.append(row);
    }
    m.append(ms);
  },
};
