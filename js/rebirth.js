// Renaissance (prestige) : écran « Ce que tu perds / Ce que tu gardes et gagnes », double confirmation (bouton à
// maintenir), cinématique (le château se dissout en lumière puis renaît, le badge de rang apparaît) et boutique d'éclats.
// Méthodes ajoutées à la classe UI.
import { REBIRTH, ROMAN, TOWERS, LEVELS, CASTLE, SHOP, COINS } from './config.js';
import { drawCastle, castleBounds, CASTLE_LOOKS, castleTierOf } from './castle.js';
import { towerImg } from './sprites.js';
import { boostArt } from './boosts.js';
import { icon, gem, coin } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const pct = (x) => Math.round(x * 100) + ' %';

// Badge de rang : écusson violet et or, chiffre romain
export function rankBadge(rank, cls = '') {
  return `<span class="rk-badge ${cls}"><svg viewBox="0 0 60 66" aria-hidden="true"><path d="M30 3l24 9v20c0 16-11 26-24 31C17 58 6 48 6 32V12z" fill="#7a2fd0" stroke="#3d2c4e" stroke-width="4" stroke-linejoin="round"/>
    <path d="M30 9l18 7v16c0 12-8 20-18 24-10-4-18-12-18-24V16z" fill="#b05cff"/><path d="M12 17l18-7 18 7" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>
    <path d="M8 40c4 8 10 13 22 18M52 40c-4 8-10 13-22 18" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/></svg><b>${ROMAN(rank)}</b></span>`;
}

export const Rebirth = {
  // ruban sous le logo de l'accueil : rang actuel, ou « Renaissance disponible ! »
  rebirthPill() {
    const sv = this.save, rk = sv.rank(), ready = sv.rebirthReady();
    let p = $('#rebirth-pill');
    if (!rk && !ready) { if (p) p.remove(); return; }
    if (!p) { p = el('button', '', ''); p.id = 'rebirth-pill'; $('#screen-menu .logo').after(p); p.onclick = () => this.openRebirth(); }
    p.className = ready ? 'ready' : '';
    p.innerHTML = `${rank0(rk)}<span><small>${ready ? 'Disponible !' : 'Renaissance'}</small><b>${ready ? 'Renaissance' : 'Rang ' + ROMAN(rk)}</b></span>${rk ? `<i>x${sv.rewardMult()} gains</i>` : ''}`;
  },
  // badge de rang à côté du niveau de joueur (barre de ressources)
  rankInBar() {
    const rk = this.save.rank(), box = $('#resbar .res-xp'); if (!box) return;
    let b = $('.rk-mini', box);
    if (!rk) { if (b) b.remove(); return; }
    if (!b) { b = el('span', 'rk-mini'); box.prepend(b); b.onclick = () => this.openRebirth(); }
    b.innerHTML = rankBadge(rk, 'sm');
  },

  openRebirth(tab = 'rebirth') {
    const sv = this.save, R = sv.data.rebirth;
    const root = el('div', 'rbscreen', `<div class="rb-head"><button class="icon-btn close" aria-label="Fermer">${icon('close')}</button><h2>RENAISSANCE</h2>
      <span class="chip shards">${icon('shard')}<b>${fmt(R.shards)}</b></span></div>
      <nav class="seg rb-tabs"><button data-t="rebirth">Renaître</button><button data-t="shop">Boutique d'éclats</button></nav><div class="rb-body"></div>`);
    $('.close', root).onclick = () => { this.closeOverlay(); this.show(this.screen, true); };
    root.querySelectorAll('.rb-tabs button').forEach((b) => { b.classList.toggle('sel', b.dataset.t === tab); b.onclick = () => this.openRebirth(b.dataset.t); });
    const body = $('.rb-body', root);
    if (tab === 'shop') this.rebirthShop(body); else this.rebirthPanel(body);
    this.openOverlay(root, 'full');
  },

  // ------------------------------------------------------------------ onglet « Renaître »
  rebirthPanel(body) {
    const sv = this.save, d = sv.data, rk = sv.rank(), ready = sv.rebirthReady(), g = sv.rebirthGain(), nx = rk + 1;
    const talents = Object.values(d.talents || {}).reduce((a, b) => a + (b || 0), 0), tier = castleTierOf(d.castle);
    body.append(el('div', 'rb-ranks', `${rank0(rk, 'big')}<i class="rb-arrow">${icon('up')}</i>${rankBadge(nx, 'big next')}`));
    const lose = [
      [icon('map'), 'Campagne', `${sv.campaignStars()} étoiles, ${sv.progress()}/${LEVELS.length} niveaux`],
      [icon('castle'), 'Château', `${CASTLE_LOOKS[tier].name}, améliorations`],
      [icon('talent'), 'Talents', `${talents} point${talents > 1 ? 's' : ''} placés (rendus)`],
      [coin(), 'Pièces', `${fmt(d.coins || 0)} → ${fmt(COINS.start)}`],
    ];
    const keep = [
      [icon('book'), 'Collection, skins, succès', ''],
      [icon('xp'), `Niveau ${d.level}`, 'et tes points de talent'],
      [gem(), `${fmt(d.gems)} gemmes`, ''],
      [icon('bag'), 'Tes boosts et coffres', ''],
      [icon('cannon'), 'Toutes tes tourelles', 'déjà débloquées'],
    ];
    const gain = [
      [rankBadge(nx, 'xs'), `Rang ${ROMAN(nx)}`, 'badge à côté de ton niveau'],
      [icon('shard'), `+${fmt(g.shards)} éclats`, `${REBIRTH.shardsBase} + ${g.stars} étoiles + ${g.hero} héroïques x${REBIRTH.shardsPerHeroic}`],
      [icon('coins'), `+${pct(REBIRTH.coinsPerRank * nx)} de pièces`, `et +${pct(REBIRTH.damagePerRank * nx)} de dégâts, pour toujours`],
      [icon('trophy'), `Gains x${1 + REBIRTH.rewardPerRank * nx}`, 'en fin de niveau'],
    ];
    const list = (rows) => rows.map(([art, b, sm]) => `<div><span class="ra">${art}</span><span><b>${b}</b>${sm ? `<small>${sm}</small>` : ''}</span></div>`).join('');
    body.append(el('div', 'rb-cols', `<section class="lose"><h3>${icon('close')}Ce que tu perds</h3>${list(lose)}</section>
      <section class="keep"><h3>${icon('check')}Ce que tu gardes</h3>${list(keep)}<h3 class="gain">${icon('star')}Ce que tu gagnes</h3>${list(gain)}</section>`));
    body.append(el('p', 'rb-mut', `${icon('skull')}<span><b>Brainrots mutés</b> au rang ${ROMAN(nx)} : PV +${pct(REBIRTH.hpPerRank * nx)}, vitesse +${pct(REBIRTH.speedPerRank * nx)}, ils se régénèrent. Plus dur, mais plus rentable.</span>`));
    if (ready) {
      const b = el('button', 'btn primary big cta rb-go', `${icon('rebirth')}RENAÎTRE`);
      b.onclick = () => this.ask('Renaître maintenant ?', `Ta campagne, ton château, tes talents et tes pièces repartent de zéro. Tu passes au rang ${ROMAN(nx)} et gagnes ${fmt(g.shards)} éclats.`, 'Continuer', () => this.rebirthHold(), 'primary');
      body.append(b);
    } else {
      body.append(el('div', 'rb-locked', `${icon('lock')}<span><b>Bats le boss du monde 8</b>pour pouvoir renaître · ${sv.progress()}/${LEVELS.length} niveaux</span>`));
    }
    body.append(el('p', 'hint', 'La Renaissance est facultative : tu peux continuer en mode infini et en défis Héroïques.'));
  },
  // 2e confirmation : bouton à maintenir enfoncé
  rebirthHold() {
    const m = el('div', 'panel glass ask rb-hold', `<h2 class="lose">Dernière confirmation</h2><p class="sub">Maintiens le bouton enfoncé pour renaître.</p>
      <button class="hold"><i></i><span>${icon('rebirth')}Maintenir</span></button>`);
    const no = el('button', 'btn ghost', 'Annuler'); no.onclick = () => this.openRebirth(); m.append(no);
    const hb = $('.hold', m), bar = $('i', hb); let t0 = 0, raf = 0;
    const stop = () => { cancelAnimationFrame(raf); t0 = 0; bar.style.width = '0%'; hb.classList.remove('on'); };
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1400); bar.style.width = k * 100 + '%';
      if (k >= 1) { this.haptics.pulse(2); this.runRebirth(); return; }
      if ((now - t0) % 300 < 20) this.haptics.pulse(0);
      raf = requestAnimationFrame(step);
    };
    hb.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); hb.classList.add('on'); this.audio.play('tick'); raf = requestAnimationFrame(step); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) hb.addEventListener(ev, stop);
    this.openOverlay(m);
  },
  runRebirth() {
    const before = { ...this.save.data.castle, __preview: true }, res = this.save.doRebirth();
    if (!res) { this.closeOverlay(); return; }
    this.rebirthCinematic(before, res);
  },

  // ------------------------------------------------------------------ cinématique
  rebirthCinematic(before, res) {
    const root = el('div', 'rbcine', `<canvas></canvas><div class="rbc-end"><div class="rays"></div>${rankBadge(res.rank, 'huge')}<small>RENAISSANCE</small><h2>Rang ${ROMAN(res.rank)} !</h2>
      <div class="rbc-gains"><span>${icon('shard')}+${fmt(res.shards)} éclats</span><span>${icon('coins')}+${pct(REBIRTH.coinsPerRank * res.rank)} pièces</span><span>${icon('sword')}+${pct(REBIRTH.damagePerRank * res.rank)} dégâts</span><span>${icon('trophy')}Gains x${1 + REBIRTH.rewardPerRank * res.rank}</span>${res.talentsBack ? `<span>${icon('talent')}${res.talentsBack} points de talent rendus</span>` : ''}</div></div>`);
    const ok = el('button', 'btn primary big cta', `${icon('shard')}Boutique d'éclats`); ok.style.visibility = 'hidden'; $('.rbc-end', root).append(ok);
    ok.onclick = () => { this.refreshGems(); this.openRebirth('shop'); };
    this.openOverlay(root, 'full');
    const cv = $('canvas', root), c = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const W = cv.clientWidth || innerWidth, H = cv.clientHeight || innerHeight; cv.width = W * dpr; cv.height = H * dpr; c.scale(dpr, dpr);
    // château d'avant, dessiné une fois dans un canvas à part pour être découpé en éclats de lumière
    const render = (cs) => { const B = castleBounds(cs), k = Math.min(1.5, (W * 0.8) / (B.half * 2), (H * 0.36) / (B.bottom - B.top)), o = document.createElement('canvas'); o.width = W; o.height = H * 0.6; const x = o.getContext('2d'); x.translate(W / 2, H * 0.6 - 30 - B.bottom * k); x.scale(k, k); drawCastle(x, cs, { time: 1, cannon: false }); return o; };
    const old = render(before), neu = render({ walls: 0, repair: 0, treasury: 0, cannon: 0, air: 0, blizzard: 0, gold: 0, __preview: true });
    const gy = H * 0.62, top = gy - old.height;
    // éclats : blocs de 8 px non transparents du château d'avant
    const parts = [], img = old.getContext('2d').getImageData(0, 0, old.width, old.height).data;
    for (let y = 0; y < old.height; y += 8) for (let x = 0; x < old.width; x += 8) { const i = ((y + 4) * old.width + x + 4) * 4; if (img[i + 3] > 120) parts.push({ x, y: y + top, sx: x, sy: y, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 120, d: Math.random() * 0.8, c: `rgb(${img[i]},${img[i + 1]},${img[i + 2]})` }); }
    const t0 = performance.now(); let phase = 0;
    this.audio.play('boss'); this.haptics.pulse(2);
    const frame = (now) => {
      if (!root.isConnected) return;
      const t = (now - t0) / 1000;
      c.clearRect(0, 0, W, H);
      const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1a0f3a'); sky.addColorStop(1, '#4a2a7a'); c.fillStyle = sky; c.fillRect(0, 0, W, H);
      c.fillStyle = '#3a2a66'; c.fillRect(0, gy, W, H - gy);
      if (t < 1) { const sh = Math.sin(t * 60) * 3 * t; c.drawImage(old, sh, top); c.fillStyle = `rgba(255,255,255,${t * 0.35})`; c.globalCompositeOperation = 'source-atop'; c.globalCompositeOperation = 'source-over'; }
      else if (t < 2.4) { // le château se dissout en lumière
        if (phase < 1) { phase = 1; this.audio.play('explosion'); this.haptics.pulse(2); }
        const k = t - 1;
        for (const p of parts) {
          const u = Math.max(0, k - p.d * 0.6); if (u <= 0) { c.fillStyle = p.c; c.fillRect(p.x, p.y, 8, 8); continue; }
          const x = p.x + p.vx * u, y = p.y + p.vy * u - 80 * u * u, a = Math.max(0, 1 - u / 1.2);
          c.fillStyle = u < 0.25 ? p.c : `rgba(255,${230 - Math.min(120, u * 140)},255,${a})`; c.fillRect(x, y, 6 * a + 2, 6 * a + 2);
        }
      } else if (t < 2.7) { if (phase < 2) { phase = 2; this.audio.play('legendary'); } c.fillStyle = `rgba(255,255,255,${1 - (t - 2.4) / 0.3})`; c.fillRect(0, 0, W, H); }
      else { // le château renaît : il sort de terre dans un pilier de lumière
        const k = Math.min(1, (t - 2.7) / 1.1), e = 1 - Math.pow(1 - k, 3);
        const pg = c.createLinearGradient(W / 2 - 90, 0, W / 2 + 90, 0); pg.addColorStop(0, 'rgba(255,240,180,0)'); pg.addColorStop(0.5, `rgba(255,240,180,${0.55 * (1 - k * 0.5)})`); pg.addColorStop(1, 'rgba(255,240,180,0)');
        c.fillStyle = pg; c.fillRect(W / 2 - 90, 0, 180, gy);
        c.save(); c.translate(0, gy); c.scale(1, e); c.drawImage(neu, 0, -neu.height); c.restore();
        if (k >= 1 && phase < 3) { phase = 3; root.classList.add('end'); this.audio.play('levelup'); this.haptics.pulse(2); setTimeout(() => { ok.style.visibility = ''; }, 700); }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },

  // ------------------------------------------------------------------ boutique d'éclats
  rebirthShop(body) {
    const sv = this.save, R = sv.data.rebirth, skin = sv.data.skin;
    if (!R.rank) body.append(el('p', 'hint', 'Les éclats se gagnent en faisant une Renaissance.'));
    const groups = [['mk2', 'Tourelles Mk II', 'Une 3e branche d\'amélioration au niveau 4'], ['ability', 'Pouvoirs', 'À côté des capacités du château, dans chaque niveau'], ['skin', 'Skins à aura', 'Une finition et une aura autour de tes tourelles'], ['slot', 'Emplacement', '']];
    for (const [kind, title, sub] of groups) {
      body.append(el('h3', 'rb-h', `${title}${sub ? `<small>${sub}</small>` : ''}`));
      const grid = el('div', 'rb-grid');
      for (const it of REBIRTH.shop.filter((x) => x.kind === kind)) {
        let art, name, desc;
        if (kind === 'mk2') { const M = REBIRTH.mk2[it.tower]; art = towerImg(it.tower, 64, skin, 4, 2).outerHTML; name = `${TOWERS[it.tower].name} Mk II`; desc = `${M.name} : ${M.desc}`; }
        else if (kind === 'ability') { const A = REBIRTH.abilities[it.ability]; art = `<span class="rb-ab" style="--ac:${A.color}">${icon(A.icon)}</span>`; name = A.name; desc = A.desc; }
        else if (kind === 'skin') { const S = SHOP.skins.find((k) => k.id === it.skin); art = towerImg('assault', 64, it.skin, 4, 0).outerHTML; name = `Skin ${S.name}`; desc = 'Finition et aura de Renaissance'; }
        else { art = `<span class="rb-ab" style="--ac:#5fd8ff">${icon('bag')}</span>`; name = it.name; desc = it.desc; }
        const own = R.owned.includes(it.id), poor = R.shards < it.cost;
        const card = el('div', 'rb-card' + (own ? ' own' : ''), `<span class="rb-art">${art}</span><b>${name}</b><small>${desc}</small>`);
        if (own) card.append(el('span', 'owned', icon('check') + 'Acquis'));
        else {
          const b = el('button', 'btn sm' + (poor ? ' poor' : ' green'), `${icon('shard')}${it.cost}`);
          if (poor) card.append(el('em', 'miss', `Il manque ${it.cost - R.shards}`));
          b.onclick = () => { if (!sv.buyRebirth(it.id)) { this.audio.play('error'); this.toast('Pas assez d\'éclats', 'Fais une Renaissance pour en gagner', icon('shard')); return; } this.audio.play('buy'); this.haptics.pulse(2); this.toast(name, 'Acquis !', icon('shard')); this.openRebirth('shop'); };
          card.append(b);
        }
        grid.append(card);
      }
      body.append(grid);
    }
  },
};
// rang 0 : écusson gris « Renaissance » (pas encore de rang)
function rank0(rk, cls = '') { return rk ? rankBadge(rk, cls) : `<span class="rk-badge ${cls} none">${icon('rebirth')}</span>`; }
