// Séquence de fin de niveau, une étape à la fois (toucher l'écran accélère l'étape en cours) :
// 1. bannière + étoiles  2. score (+ « NOUVEAU RECORD ! »)  3. gemmes / XP qui s'envolent,
// montées de niveau  4. succès  5. écran final compact (MVP, 3 stats, boutons).
import { TOWERS, ENEMIES, LEVELS, XP, END } from './config.js';
import { icon, gem, coin } from './icons.js';
import { towerImg, enemyImg } from './sprites.js';
import { chestSvg } from './loot.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1000).toFixed(n >= 1e5 ? 0 : 1) + 'k' : fmt(n));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const CONF = ['#ff5e7e', '#ffd23f', '#4cd137', '#3d9dfc', '#b05cff', '#ff9f1a', '#ffffff'];

// Confettis et étincelles dessinés sur un canvas propre à la séquence
class Sparkle {
  constructor(cv) {
    this.cv = cv; this.c = cv.getContext('2d'); this.p = [];
    this.resize(); this.last = performance.now();
    const tick = (now) => { if (!cv.isConnected) return; this.step(Math.min(0.05, (now - this.last) / 1000)); this.last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  resize() { const r = this.cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); this.w = r.width; this.h = r.height; this.cv.width = r.width * d; this.cv.height = r.height * d; this.c.setTransform(d, 0, 0, d, 0, 0); }
  rain(n) { for (let i = 0; i < n; i++) this.p.push({ x: Math.random() * this.w, y: -20 - Math.random() * this.h * 0.6, vx: (Math.random() - 0.5) * 60, vy: 90 + Math.random() * 120, g: 40, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, s: 6 + Math.random() * 6, col: pick(CONF), life: 5, k: 'r' }); }
  burst(x, y, n = 26, cols = CONF, speed = 420) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = speed * (0.35 + Math.random() * 0.65); this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 520, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16, s: 5 + Math.random() * 6, col: pick(cols), life: 1.2 + Math.random() * 0.6, k: Math.random() < 0.35 ? 'c' : 'r' }); }
  }
  step(dt) {
    const c = this.c; c.clearRect(0, 0, this.w, this.h);
    for (let i = this.p.length - 1; i >= 0; i--) {
      const o = this.p[i]; o.life -= dt;
      if (o.life <= 0 || o.y > this.h + 30) { this.p[i] = this.p[this.p.length - 1]; this.p.pop(); continue; }
      o.vx *= 1 - 1.2 * dt; o.vy += o.g * dt; if (o.vy > 260) o.vy = 260; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt;
      c.globalAlpha = Math.min(1, o.life * 2); c.fillStyle = o.col;
      c.save(); c.translate(o.x, o.y); c.rotate(o.rot);
      if (o.k === 'c') { c.beginPath(); c.arc(0, 0, o.s * 0.45, 0, 7); c.fill(); } else c.fillRect(-o.s / 2, -o.s * 0.3, o.s, o.s * 0.6 * Math.abs(Math.cos(o.rot * 2)) + 1);
      c.restore();
    }
    c.globalAlpha = 1;
  }
}

export const End = {
  showEnd(r) {
    const g = this.game; if (!g || g.result !== r) return;
    this.closeMenu(); this.aiming = null;
    if (r.towers && r.towers.length && !r._introDone) { r._introDone = true; this.weaponReveal(r.towers, () => this.showEnd(r)); return; }
    const d = this.save.data, win = r.victory;
    const root = el('div', 'endseq ' + (win ? 'win' : 'lose'));
    root.innerHTML = `<canvas class="es-fx"></canvas>
      <div class="es-top"><div class="es-xp"><span class="lvl"></span><div class="xpbar"><i></i><b></b></div></div><span class="chip es-coins">${coin()}<b></b></span><span class="chip es-gems">${gem()}<b></b></span></div>
      <div class="es-stage"></div><div class="es-badges"></div>
      <div class="es-hint">Touche pour accélérer</div>`;
    this.openOverlay(root, 'full');
    this.prepareShare(r);
    const fx = new Sparkle($('.es-fx', root));
    const seq = { fast: false, wake: null };
    root.addEventListener('pointerdown', () => { seq.fast = true; if (seq.wake) seq.wake(); });
    const alive = () => root.isConnected && this.game === g;
    const wait = (ms) => new Promise((res) => {
      if (!alive()) return;   // la séquence a été quittée : on s'arrête là
      const done = () => { clearTimeout(t); seq.wake = null; res(); };
      const t = setTimeout(done, seq.fast ? Math.min(ms, 70) : ms); seq.wake = done;
    });
    const shake = (k = 1) => { root.classList.remove('shake', 'shake2'); void root.offsetWidth; root.classList.add(k > 1 ? 'shake2' : 'shake'); };
    const center = (e) => { const a = e.getBoundingClientRect(), b = root.getBoundingClientRect(); return [a.left + a.width / 2 - b.left, a.top + a.height / 2 - b.top]; };
    // compteurs du haut : valeurs d'avant la partie
    const gemsB = $('.es-gems b', root); let gemsShown = d.gems - r.gems; gemsB.textContent = fmt(gemsShown);
    const coinsB = $('.es-coins b', root), rc = r.coins || 0; let coinsShown = (d.coins || 0) - rc; coinsB.textContent = fmt(coinsShown);
    const xpUI = { lvl: $('.es-xp .lvl', root), bar: $('.es-xp i', root), lab: $('.es-xp b', root), level: r.xpBefore.level, xp: r.xpBefore.xp };
    const showXp = () => { xpUI.lvl.textContent = xpUI.level; xpUI.lab.textContent = `${Math.round(xpUI.xp)} / ${XP.need(xpUI.level)} XP`; xpUI.bar.style.width = (xpUI.xp / XP.need(xpUI.level)) * 100 + '%'; };
    showXp();
    const stage = $('.es-stage', root);

    const run = async () => {
      // ---------------------------------------------------------------- 1. bannière
      seq.fast = false;
      const title = win ? (g.level.boss ? 'BOSS VAINCU !' : 'VICTOIRE !') : r.endless ? 'FIN DE SÉRIE' : 'DÉFAITE';
      const sub = `${this.levelLabel(g)} · vague ${r.wavesDone}${g.endless ? '' : '/' + g.totalWaves}`;
      stage.innerHTML = `<div class="es-banner"><b>${title}</b></div><p class="es-sub">${sub}</p>`;
      this.haptics.pulse(win ? 2 : 1);
      if (win) { fx.rain(90); await wait(650); shake(); }
      else await wait(800);
      if (win) {
        const row = el('div', 'es-stars', [0, 1, 2].map(() => `<span>${icon('star')}</span>`).join('')); stage.append(row);
        await wait(250);
        for (let i = 0; i < 3; i++) {
          if (i < r.stars) {
            const s = row.children[i]; s.classList.add('on');
            await wait(160);
            const [x, y] = center(s); fx.burst(x, y, 22, ['#ffd23f', '#fff6c8', '#ffb224'], 340);
            this.audio.play('star'); this.haptics.pulse(i === 2 ? 2 : 1); shake(i === 2 ? 2 : 1);
          }
          await wait(END.starGap * 1000);
        }
      } else if (!r.endless) {
        stage.append(el('p', 'es-cheer', pick(END.cheers)));
        await wait(500);
        const tip = this.endTip(g), card = el('div', 'es-tip', `<span class="es-tip-art"></span><div><b>${icon('bulb')}Astuce</b>${tip.text}</div>`);
        $('.es-tip-art', card).append(tip.type ? enemyImg(tip.type, 52) : el('span', 'es-tip-ico', icon('bulb')));
        stage.append(card); await wait(1100);
      }
      // ---------------------------------------------------------------- 2. score
      seq.fast = false;
      const sc = el('div', 'es-score', '<span>Score</span><b>0</b>'); stage.append(sc);
      await this.esCount($('b', sc), r.score, 1300, seq);
      if (r.record) {
        const st = el('div', 'es-stamp', `${icon('trophy')}NOUVEAU RECORD !`); stage.append(st);
        await wait(220); this.audio.play('record'); this.haptics.pulse(2); shake(2);
        const [x, y] = center(st); fx.burst(x, y, 30, ['#ffd23f', '#ffffff', '#ff5d8f'], 380);
        await wait(900);
      } else if (r.previous) { stage.append(el('p', 'es-sub', `Record : ${fmt(r.previous)}`)); await wait(350); }
      if (r.endless && r.rank != null && r.rank >= 0) { stage.append(el('p', 'es-sub', `Classement local : <b>n° ${r.rank + 1}</b>`)); await wait(400); }
      // ---------------------------------------------------------------- 3. récompenses
      seq.fast = false;
      const pills = el('div', 'es-pills'); stage.append(pills);
      const cp = el('div', 'es-pill coin', `${coin()}<b>+${fmt(rc)}</b>`), gp = el('div', 'es-pill gem', `${gem()}<b>+${fmt(r.gems)}</b>`), xp = el('div', 'es-pill xp', `${icon('xp')}<b>+${fmt(r.xp)} XP</b>`);
      if (rc > 0) pills.append(cp);
      pills.append(gp, xp);
      for (const t of r.rewards || []) { const kind = /dor/i.test(t) ? 'gold' : 'wood'; pills.append(el('div', 'es-pill chest', `${chestSvg(kind)}<b>${t}</b>`)); }
      await wait(450);
      if (rc > 0) {
        const n = 10, per = rc / n;
        await this.esFly(root, cp, $('.es-coins', root), coin(), n, seq, () => { coinsShown += per; coinsB.textContent = fmt(Math.min(d.coins, coinsShown)); this.audio.play('coin'); this.esBump($('.es-coins', root)); });
        coinsB.textContent = fmt(d.coins);
      }
      if (r.gems > 0) {
        const n = Math.min(10, Math.max(3, Math.round(r.gems / 3))), per = r.gems / n;
        await this.esFly(root, gp, $('.es-gems', root), gem(), n, seq, () => { gemsShown += per; gemsB.textContent = fmt(Math.min(d.gems, gemsShown)); this.audio.play('coin'); this.esBump($('.es-gems', root)); });
        gemsB.textContent = fmt(d.gems);
      }
      if (r.xp > 0) {
        await this.esFly(root, xp, $('.es-xp', root), '<i class="es-orb"></i>', 8, seq, () => { this.audio.play('tick'); this.esBump($('.es-xp .lvl', root)); });
        // la barre se remplit ; chaque montée de niveau a son écran
        let left = r.xp, ups = 0;
        while (left > 0 && alive()) {
          const need = XP.need(xpUI.level), gain = Math.min(left, need - xpUI.xp);
          xpUI.xp += gain; left -= gain;
          xpUI.bar.style.transition = `width ${seq.fast ? 0.15 : 0.7}s cubic-bezier(.3,.8,.3,1)`; showXp();
          await wait(750);
          if (xpUI.xp >= need) {
            const u = (r.levelUps || [])[ups++];
            xpUI.level++; xpUI.xp = 0; xpUI.bar.style.transition = 'none'; showXp();
            if (u) await this.esLevelUp(root, u, fx, seq, wait, ups > 1);
          }
        }
      }
      // ---------------------------------------------------------------- 4. succès et déblocages
      seq.fast = false;
      const badges = [...(r.achievements || []).map((a) => ({ ico: 'medal', name: a.name, sub: a.desc, val: a.gems ? `+${a.gems}${gem()}` : '' }))];
      if (r.firstClear && !g.heroic && win) badges.push({ ico: 'crown', name: 'Défi Héroïque débloqué', sub: 'Plus dur, récompenses doublées' });
      if (r.challengeWin) badges.unshift({ ico: 'target', name: 'Défi du jour réussi !', sub: 'Coffre doré et gemmes' });
      if (win && !g.heroic && g.level.n === 12 && r.firstClear) badges.push({ ico: 'infinity', name: 'Mode infini débloqué', sub: 'Avec classement local' });
      for (const t of r.towers || []) badges.push({ ico: 'cannon', name: TOWERS[t].name, sub: 'Nouvelle arme' });
      if (r.legend && r.legend.length) badges.push({ ico: 'crown', name: 'Améliorations légendaires', sub: r.legend.map((t) => TOWERS[t].name).join(', ') });
      if (badges.length) {
        const box = $('.es-badges', root);
        for (const [i, b] of badges.slice(0, END.maxBadges).entries()) {
          box.append(el('div', 'es-badge', `<span class="es-medal">${icon(b.ico)}</span><span><b>${b.name}</b>${b.sub}</span>${b.val ? `<span class="val">${b.val}</span>` : ''}`));
          this.audio.play('card'); this.haptics.pulse(1); await wait(i ? 330 : 400);
        }
        if (badges.length > END.maxBadges) { box.append(el('div', 'es-more', `+${badges.length - END.maxBadges} autre${badges.length - END.maxBadges > 1 ? 's' : ''}`)); await wait(250); }
        await wait(1500);
        box.classList.add('out');
      }
      // ---------------------------------------------------------------- 5. écran final
      root.classList.add('done');
      this.esFinal(root, stage, r, g, badges);
      if (win) fx.rain(40);
    };
    run();
    this.refreshGems();
    if (this.afterEnd) this.afterEnd(r);
  },

  // Compteur qui défile (accéléré au toucher)
  esCount(node, to, dur, seq) {
    return new Promise((res) => {
      const t0 = performance.now(); let lastTick = 0;
      const f = (now) => {
        const k = seq.fast ? 1 : Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        node.textContent = fmt(to * e);
        if (now - lastTick > 55 && k < 1) { lastTick = now; this.audio.play('tick'); }
        if (k < 1 && node.isConnected) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
  },
  esBump(e) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); },
  // Icônes qui s'envolent d'un élément vers un compteur, en arc
  esFly(root, from, to, html, n, seq, onEach) {
    const R = root.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const x0 = a.left + a.width / 2 - R.left, y0 = a.top + a.height / 2 - R.top, dx = b.left + b.width / 2 - R.left - x0, dy = b.top + b.height / 2 - R.top - y0;
    const jobs = [];
    for (let i = 0; i < n; i++) {
      const e = el('div', 'es-fly', html); e.style.left = x0 + 'px'; e.style.top = y0 + 'px'; root.append(e);
      const sx = (Math.random() - 0.5) * 140, sy = -30 - Math.random() * 70;
      const anim = e.animate([
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
        { transform: `translate(calc(-50% + ${sx}px), calc(-50% + ${sy}px)) scale(1.25)`, opacity: 1, offset: 0.35 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6)`, opacity: 1 },
      ], { duration: seq.fast ? 280 : 760, delay: i * (seq.fast ? 15 : 55), easing: 'cubic-bezier(.45,0,.75,1)', fill: 'both' });
      jobs.push(anim.finished.then(() => { e.remove(); onEach(i); }, () => e.remove()));
    }
    return Promise.all(jobs);
  },
  // Gros écran « NIVEAU N ! » avec une carte récompense qui se retourne
  async esLevelUp(root, u, fx, seq, wait, quick) {
    const r = u.reward || {};
    const art = r.chest ? chestSvg(r.chest) : r.gems ? gem('big') : icon(r.talent ? 'talent' : r.boosts ? 'bag' : 'gift');
    const lay = el('div', 'es-lvup', `<div class="rays"></div><div class="es-lvtitle"><small>NIVEAU</small><b>${u.level}</b><em>Niveau supérieur !</em></div>
      <div class="es-rcard"><div class="in"><div class="back">${icon('star')}</div><div class="front"><span class="art">${art}</span><b>${u.text}</b></div></div></div>`);
    root.append(lay);
    this.audio.play('levelup'); this.haptics.pulse(2);
    const [x, y] = [root.clientWidth / 2, root.clientHeight * 0.32]; fx.burst(x, y, 40, CONF, 480);
    await wait(quick ? 420 : 750);
    $('.es-rcard', lay).classList.add('flip'); this.audio.play('card');
    await wait(quick ? 750 : 1500);
    lay.classList.add('out'); await wait(260); lay.remove();
  },
  // Conseil de défaite : selon l'ennemi qui a fait le plus de dégâts au château
  endTip(g) {
    const lb = g.stats.leakBy || {}; let top = null;
    for (const k in lb) if (!top || lb[k] > lb[top]) top = k;
    if (top && END.tips[top]) return { type: top === 'boss' ? g.world.boss : top, text: END.tips[top] };
    if (g.towers.length && g.towers.every((t) => t.level < 3)) return { text: END.tips.upgrade };
    return { text: pick(END.generic) };
  },

  // Écran final compact : étoiles, score, MVP, 3 stats, boutons
  esFinal(root, stage, r, g, badges) {
    const win = r.victory, s = g.stats, skin = this.save.data.skin;
    const nextN = g.level.n + 1, canNext = win && !g.endless && !g.heroic && !g.challenge && nextN <= LEVELS.length;
    const f = el('div', 'es-final');
    f.innerHTML = `<div class="es-banner sm"><b>${win ? (g.level.boss ? 'BOSS VAINCU !' : 'VICTOIRE !') : r.endless ? 'FIN DE SÉRIE' : 'DÉFAITE'}</b></div>
      <p class="es-sub">${this.levelLabel(g)}</p>
      ${win ? `<div class="es-stars sm">${[0, 1, 2].map((i) => `<span class="${i < r.stars ? 'on' : ''}">${icon('star')}</span>`).join('')}</div>` : ''}
      <div class="es-score sm"><span>Score</span><b>${fmt(r.score)}</b>${r.record ? `<em>${icon('trophy')}Record !</em>` : ''}</div>
      <div class="es-mid"></div>
      <div class="es-kpis">${[['Kills', fmt(s.kills)], ['Dégâts', short(s.damage)], ['PV', `${Math.max(0, g.lives)}/${g.maxLives}`]].map(([k, v]) => `<div><b>${v}</b>${k}</div>`).join('')}</div>
      <div class="es-main"></div><div class="es-round"></div>`;
    const mid = $('.es-mid', f);
    if (win && r.best && r.best.dmg > 0) {
      const b = r.best, mvp = el('div', 'es-mvp', `<span class="es-mvp-art"><i class="rays"></i></span><div><em>MVP</em><b>${b.label}</b><small>${short(b.dmg)} dégâts · ${fmt(b.kills)} kills</small></div>`);
      $('.es-mvp-art', mvp).append(towerImg(b.type, 96, skin, b.level, b.branch)); mid.append(mvp);
    } else if (!win && !r.endless) {
      const tip = this.endTip(g), card = el('div', 'es-tip sm', `<span class="es-tip-art"></span><div><b>${icon('bulb')}Astuce</b>${tip.text}</div>`);
      $('.es-tip-art', card).append(tip.type ? enemyImg(tip.type, 44) : el('span', 'es-tip-ico', icon('bulb'))); mid.append(card);
    } else if (r.best && r.best.dmg > 0) {
      const b = r.best, mvp = el('div', 'es-mvp', `<span class="es-mvp-art"><i class="rays"></i></span><div><em>MVP</em><b>${b.label}</b><small>${short(b.dmg)} dégâts · ${fmt(b.kills)} kills</small></div>`);
      $('.es-mvp-art', mvp).append(towerImg(b.type, 96, skin, b.level, b.branch)); mid.append(mvp);
    }
    const leave = (fn) => () => { this.game = null; fn(); };
    const main = $('.es-main', f);
    if (r.worldDone != null) { const wr = el('button', 'btn primary big cta', icon('chest') + 'Récompense du monde !'); wr.onclick = () => { this.game = null; this.worldReward(r.worldDone); }; main.append(wr); }
    else if (canNext) { const nx = el('button', 'btn primary big', icon('play') + 'Niveau suivant'); nx.onclick = () => { this.game = null; this.playLevel(nextN); }; main.append(nx); }
    else if (!win && !r.endless) { const rt = el('button', 'btn green big', icon('restart') + 'Réessayer'); rt.onclick = () => this.replay(); main.append(rt); }
    else { const rp = el('button', 'btn primary big', icon('restart') + 'Rejouer'); rp.onclick = () => this.replay(); main.append(rp); }
    const round = $('.es-round', f);
    const rb = (ico, label, fn, cls = '') => { const b = el('button', 'rbtn ' + cls, `<span>${icon(ico)}</span><small>${label}</small>`); b.onclick = fn; round.append(b); };
    if (canNext) rb('restart', 'Rejouer', () => this.replay());
    rb('share', 'Partager', () => this.shareScore(r), 'pink');
    rb('chart', 'Statistiques', () => this.esStats(root, r, g, badges), 'blue');
    rb('map', 'Carte', leave(() => this.show('world')));
    rb('home', 'Menu', leave(() => this.show('menu')));
    stage.replaceChildren(f);
  },
  // Détail complet (optionnel) : toutes les stats, dégâts par tourelle, déblocages
  esStats(root, r, g, badges) {
    const s = g.stats, sh = el('div', 'es-sheet');
    const by = Object.entries(s.dmgByType).sort((a, b) => b[1] - a[1]);
    sh.innerHTML = `<div class="es-sheet-in glass"><button class="icon-btn close" aria-label="Fermer">${icon('close')}</button><h3>Statistiques</h3>
      <div class="end-stats">${[['Kills', fmt(s.kills)], ['Dégâts', short(s.damage)], ['Pièces gagnées', short(s.earned)], ['PV restants', `${Math.max(0, g.lives)}/${g.maxLives}`], ['Tourelles', s.built], ['Boss vaincus', s.bossKills], ['Vagues', `${r.wavesDone}${g.endless ? '' : '/' + g.totalWaves}`], ['Fuites', s.leaks], ['Légendaires', s.legendaries]].map(([k, v]) => `<div><b>${v}</b>${k}</div>`).join('')}</div>
      ${by.length ? '<h4>Dégâts par tourelle</h4><div class="bars"></div>' : ''}
      ${badges.length ? '<h4>Débloqué</h4><div class="unlocks"></div>' : ''}</div>`;
    const bars = $('.bars', sh);
    if (bars) for (const [type, v] of by) { const row = el('div', 'bar', `<div><i style="width:${(v / by[0][1]) * 100}%"></i></div><span>${short(v)}</span>`); row.prepend(towerImg(type, 26, this.save.data.skin)); bars.append(row); }
    const un = $('.unlocks', sh);
    if (un) un.innerHTML = badges.map((b) => `<div>${icon(b.ico)}<span><b>${b.name}</b>${b.sub}</span>${b.val ? `<span class="val">${b.val}</span>` : ''}</div>`).join('');
    const close = () => { sh.classList.add('out'); setTimeout(() => sh.remove(), 250); };
    $('.close', sh).onclick = close; sh.addEventListener('click', (e) => { if (e.target === sh) close(); });
    root.append(sh); this.audio.play('click');
  },
};
