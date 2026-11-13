// Écrans hors partie : carte du monde, préparation d'un niveau, cartes de présentation, mode infini.
// Ces méthodes sont ajoutées à la classe UI (voir la fin de ui.js).
import { LEVELS, WORLDS, ENEMIES, TOWERS, HEROIC, heroicMod, CAMPAIGN } from './config.js';
import { THEMES, buildField, drawMapPreview } from './maps.js';
import { levelEnemies } from './waves.js';
import { enemyImg, towerImg } from './sprites.js';
import { icon, coin, gem } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const stars = (n, cls = 'stars') => `<span class="${cls}">${[0, 1, 2].map((i) => icon('star', i < n ? 'on' : '')).join('')}</span>`;

const NODE_X = [28, 64, 78, 40, 22, 50], SEC_H = 660;
const INK = '#3d2c4e';
// Décor propre à chaque monde (SVG inline), posé loin du chemin
const DECO = {
  prairie: [
    (s) => `<svg viewBox="0 0 60 70" width="${s}"><rect x="26" y="40" width="8" height="24" rx="3" fill="#8a5530" stroke="${INK}" stroke-width="3"/><circle cx="30" cy="28" r="22" fill="#4caf50" stroke="${INK}" stroke-width="3"/><circle cx="22" cy="20" r="6" fill="#8be07a"/></svg>`,
    (s) => `<svg viewBox="0 0 60 40" width="${s}"><circle cx="12" cy="26" r="7" fill="#ff7eb6" stroke="${INK}" stroke-width="2.5"/><circle cx="30" cy="20" r="7" fill="#ffe45c" stroke="${INK}" stroke-width="2.5"/><circle cx="48" cy="27" r="7" fill="#fff" stroke="${INK}" stroke-width="2.5"/></svg>`,
  ],
  desert: [
    (s) => `<svg viewBox="0 0 50 70" width="${s}"><path d="M20 66V18a5 5 0 0 1 10 0v48z M20 40h-8a4 4 0 0 1-4-4V26a4 4 0 0 1 8 0v6h4 M30 34h8V20a4 4 0 0 1 8 0v14a6 6 0 0 1-6 6h-10" fill="#5fb53c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></svg>`,
    (s) => `<svg viewBox="0 0 80 36" width="${s}"><path d="M2 34Q22 4 44 22Q60 10 78 34z" fill="#e2b25c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></svg>`,
  ],
  volcano: [
    (s) => `<svg viewBox="0 0 80 64" width="${s}"><path d="M4 62L30 14h20l26 48z" fill="#56436a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M30 14h20l-4 10-6-4-6 8z" fill="#ff7a3c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="36" cy="6" r="4" fill="#ffb224"/><circle cx="46" cy="3" r="3" fill="#ff7a3c"/></svg>`,
    (s) => `<svg viewBox="0 0 50 40" width="${s}"><path d="M4 36L14 12 26 20 34 6 46 36z" fill="#8ff0e0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></svg>`,
  ],
  ice: [
    (s) => `<svg viewBox="0 0 50 70" width="${s}"><rect x="21" y="54" width="8" height="12" rx="2" fill="#8a5530" stroke="${INK}" stroke-width="3"/><path d="M25 4L44 54H6z" fill="#3f8f7a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M25 4l8 20-8-4-8 4z" fill="#fff"/></svg>`,
    (s) => `<svg viewBox="0 0 60 40" width="${s}"><circle cx="30" cy="26" r="12" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="30" cy="11" r="8" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M30 12l6 2-6 1z" fill="#ff9f1a"/></svg>`,
  ],
  candy: [
    (s) => `<svg viewBox="0 0 40 70" width="${s}"><rect x="17" y="30" width="6" height="38" rx="3" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="20" cy="20" r="17" fill="#ff5d8f" stroke="${INK}" stroke-width="3"/><path d="M20 20m-10 0a10 10 0 0 1 10-10a6 6 0 0 1 6 6a3 3 0 0 1-3 3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,
    (s) => `<svg viewBox="0 0 60 40" width="${s}"><path d="M8 36a22 22 0 0 1 44 0z" fill="#8fe3ff" stroke="${INK}" stroke-width="3"/><circle cx="20" cy="26" r="2.5" fill="#fff"/><circle cx="34" cy="22" r="2.5" fill="#ffd23f"/><circle cx="42" cy="30" r="2.5" fill="#ff5d8f"/></svg>`,
  ],
};
// positions des décors : [x %, y px, taille, variante]
const DECO_POS = [[8, 560, 46, 0], [90, 470, 52, 0], [86, 640, 40, 1], [6, 300, 48, 0], [92, 230, 44, 1], [60, 410, 36, 1], [12, 120, 50, 0], [88, 80, 46, 0], [36, 610, 34, 1]];
const nodeY = (i) => SEC_H - 86 - i * 96 - (i === 5 ? 14 : 0);

export const Meta = {
  // ------------------------------------------------------------------ carte du monde
  renderWorld() {
    const sv = this.save, box = $('#world-map'), prog = sv.progress();
    box.innerHTML = '';
    $('#world-stars').textContent = `${sv.campaignStars()}/${LEVELS.length * 3}`;
    let current = null;
    for (let wi = WORLDS.length - 1; wi >= 0; wi--) {
      const w = WORLDS[wi], th = THEMES[w.theme], open = prog >= wi * 6;
      const sec = el('section', 'wsec' + (open ? '' : ' locked'));
      sec.style.cssText = `--c1:${th.g1};--c2:${th.g2};--c3:${th.g3};--road:${th.path};--edge:${th.edge};height:${SEC_H}px`;
      const pts = [[50, SEC_H], ...NODE_X.map((x, i) => [x, nodeY(i)]), [50, 0]];
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y0 + y1) / 2; d += ` C${x0} ${my} ${x1} ${my} ${x1} ${y1}`; }
      sec.innerHTML = `<svg class="road" viewBox="0 0 100 ${SEC_H}" preserveAspectRatio="none"><path d="${d}" class="r1"/><path d="${d}" class="r2"/><path d="${d}" class="r3"/></svg>`;
      const ws = LEVELS.filter((l) => l.world === wi).reduce((s, l) => s + (sv.data.levels[l.n] ? sv.data.levels[l.n].stars : 0), 0);
      const head = el('div', 'whead', `<small>Monde ${wi + 1}</small><b>${w.name}</b><span>${open ? icon('star', 'on') + ws + '/18' : icon('lock') + 'Termine le monde ' + wi}</span>`);
      sec.append(head);
      // décor : quelques brainrots du monde
      const deco = levelEnemies(LEVELS[wi * 6 + 4]).slice(-3);
      for (const [x, y, sz, v] of DECO_POS) { const dd = el('div', 'wprop', DECO[w.theme][v](sz)); dd.style.cssText = `left:${x}%;top:${y}px`; sec.append(dd); }
      deco.forEach((t, k) => { const im = enemyImg(t, 46); im.className = 'wdeco'; im.style.cssText = `left:${[80, 8, 70][k]}%;top:${[SEC_H - 190, SEC_H - 330, 230][k]}px`; sec.append(im); });
      LEVELS.filter((l) => l.world === wi).forEach((L) => {
        const ld = sv.data.levels[L.n], done = sv.levelDone(L.n), unlocked = sv.levelUnlocked(L.n);
        const b = el('button', 'node' + (L.boss ? ' boss' : '') + (done ? ' done' : unlocked ? ' open' : ' locked')); b.dataset.n = L.n;
        b.style.cssText = `left:${NODE_X[L.idx]}%;top:${nodeY(L.idx)}px`;
        if (L.boss) b.append(enemyImg(w.boss, 66));
        b.insertAdjacentHTML('beforeend', unlocked ? `<b>${L.boss ? 'BOSS' : L.id}</b>` : icon('lock'));
        if (done) b.insertAdjacentHTML('beforeend', stars(ld.stars));
        if (ld && ld.heroic) b.insertAdjacentHTML('beforeend', `<i class="crown">${icon('crown')}</i>`);
        b.onclick = () => { if (!unlocked) { this.audio.play('error'); this.toast('Niveau verrouillé', 'Termine le niveau précédent', icon('lock')); return; } this.playLevel(L.n); };
        if (unlocked && !done) current = b;
        sec.append(b);
      });
      box.append(sec);
    }
    const target = current || [...box.querySelectorAll('.node')].find((n) => n.dataset.n == LEVELS.length);
    if (target) {
      const tn = +target.dataset.n, from = box.querySelector(`.node[data-n="${sv.data.avatar}"]`);
      const av = el('div', 'avatar', `<span class="av-in"></span><i></i>`);
      $('.av-in', av).append(towerImg('assault', 40, sv.data.skin, 3));
      const place = (node) => { av.style.left = node.style.left; av.style.top = node.style.top; };
      const walk = from && from !== target && from.parentElement === target.parentElement && sv.data.avatar < tn;
      place(walk ? from : target); target.parentElement.append(av);
      if (walk) { av.classList.add('walk'); setTimeout(() => { place(target); this.audio.play('sheet'); }, 450); setTimeout(() => av.classList.remove('walk'), 1300); }
      if (sv.data.avatar !== tn) { sv.data.avatar = tn; sv.persist(); }
    }
    const eb = $('#btn-endless'); eb.classList.toggle('off', !sv.endlessUnlocked());
    eb.innerHTML = icon(sv.endlessUnlocked() ? 'infinity' : 'lock') + 'Mode infini';
    requestAnimationFrame(() => {
      const sc = $('#world-scroll');
      if (!current) { sc.scrollTop = prog >= LEVELS.length ? 0 : sc.scrollHeight; return; }
      const goal = current.offsetParent.offsetTop + current.offsetTop - sc.clientHeight * 0.55;
      sc.scrollTop = Math.min(sc.scrollHeight, goal + sc.clientHeight * 0.5);   // part d'un peu plus bas…
      requestAnimationFrame(() => sc.scrollTo({ top: goal, behavior: 'smooth' }));   // … et remonte le chemin
    });
  },

  // Lancer un niveau : directement s'il n'est pas terminé, sinon petit choix Normal / Héroïque
  playLevel(n) { if (this.save.levelDone(n)) this.openPrep(n); else this.startGame(n, false, false, this.loadoutFor(LEVELS[n - 1])); },
  playNext() { this.playLevel(this.nextLevel().n); },

  // ------------------------------------------------------------------ niveau déjà terminé : rejouer ou défi héroïque
  openPrep(n, heroic = false) {
    const sv = this.save, L = LEVELS[n - 1], w = WORLDS[L.world], ld = sv.levelData(n), done = sv.levelDone(n);
    if (!done) heroic = false;
    const m = el('div', 'panel glass prep');
    const x = el('button', 'icon-btn close', icon('close')); x.onclick = () => this.closeOverlay();
    m.append(x, el('h2', heroic ? 'lose' : 'win', L.boss ? `BOSS ${L.id}` : `NIVEAU ${L.id}`), el('p', 'sub', `Monde ${L.world + 1} · ${w.name}`));
    const top = el('div', 'prep-top');
    const cv = el('canvas', 'thumb'); cv.width = 264; cv.height = 414; drawMapPreview(cv, THEMES[w.theme], buildField(L.layout, L.mirror, L.slots, CAMPAIGN.mines));
    const hm = heroicMod(n), money = Math.round(L.money * (heroic && hm.money ? hm.money : 1));
    const info = el('div', 'prep-info', `
      <div>${icon('wave')}<b>${L.waves}</b> vagues${L.boss ? ' · mini-boss' : ''}</div>
      <div>${coin()}<b>${money}</b> pièces au départ</div>
      <div>${icon('target')}<b>${L.slots}</b> emplacements</div>
      <div>${stars(ld.stars)}</div>
      <div>${icon('trophy', 'gold')}Record <b>${fmt(heroic ? ld.heroicBest : ld.best)}</b></div>`);
    top.append(cv, info); m.append(top);
    const foes = el('div', 'foes');
    for (const t of levelEnemies(L)) foes.append(enemyImg(t, 34));
    if (L.boss) { const b = enemyImg(w.boss, 46); b.className = 'bossimg'; foes.append(b); }
    m.append(foes);
    const seg = el('div', 'seg');
    const b1 = el('button', heroic ? '' : 'sel', 'Normal'); b1.onclick = () => this.openPrep(n, false);
    const b2 = el('button', (heroic ? 'sel' : '') + (done ? '' : ' locked'), icon(done ? 'crown' : 'lock') + 'Héroïque' + (ld.heroic ? icon('check') : ''));
    b2.onclick = () => { if (!done) { this.toast('Défi verrouillé', 'Termine d\'abord le niveau', icon('lock')); return; } this.openPrep(n, true); };
    seg.append(b1, b2); m.append(seg);
    if (heroic) m.append(el('div', 'heroic-box', `${icon('crown')}<span><b>${hm.name}</b>${hm.hp ? `PV des ennemis +${Math.round((HEROIC.hp * hm.hp - 1) * 100)} %` : `${hm.desc} · PV ennemis +${Math.round((HEROIC.hp - 1) * 100)} %`}<em>Gemmes et XP x${HEROIC.gemsMult}${ld.heroic ? '' : ' · coffre à la première victoire'}</em></span>`));
    const go = el('button', 'btn primary big', icon('play') + 'Jouer');
    go.onclick = () => this.startGame(n, heroic, false, this.loadoutFor ? this.loadoutFor(L) : []);
    m.append(go);
    this.openOverlay(m);
  },

  // ------------------------------------------------------------------ cartes de présentation (nouvel ennemi / nouvelle tourelle)
  // cards = [{ kind: 'enemy' | 'tower', id }] ; met la partie en pause le temps de les lire
  showIntro(cards, onDone) {
    const g = this.game, was = g ? g.paused : false;
    if (g && !g.over) g.paused = true;
    this.introOpen = true;
    const next = (i) => {
      if (i >= cards.length) { this.introOpen = false; this.closeOverlay(); if (g && !g.over) g.paused = was; if (onDone) onDone(); return; }
      const c = cards[i], m = el('div', 'panel glass intro ' + c.kind);
      if (c.kind === 'enemy') {
        const cfg = ENEMIES[c.id];
        m.append(el('small', 'kicker', cfg.boss ? 'BOSS EN APPROCHE' : 'NOUVEAU BRAINROT'));
        const art = el('div', 'intro-art'); art.append(enemyImg(c.id, cfg.boss ? 170 : 130)); m.append(art);
        m.append(el('h2', cfg.boss ? 'lose' : 'win', cfg.name), el('span', 'tagchip', cfg.tag), el('p', 'sub', cfg.hint || cfg.title || ''));
      } else {
        const cfg = TOWERS[c.id];
        m.append(el('small', 'kicker', 'NOUVELLE TOURELLE'));
        const art = el('div', 'intro-art'); art.append(towerImg(c.id, 130, this.save.data.skin, 3)); m.append(art);
        m.append(el('h2', 'win', cfg.name), el('span', 'tagchip', `${coin()}${cfg.cost}`), el('p', 'sub', cfg.desc), el('p', 'sub', `Spécialisations : ${cfg.branches.map((b) => b.name).join(' ou ')}`));
      }
      const ok = el('button', 'btn primary', 'Compris !'); ok.onclick = () => next(i + 1);
      m.append(ok);
      this.openOverlay(m); this.audio.play('card'); this.haptics.pulse(1);
    };
    next(0);
  },

  // ------------------------------------------------------------------ mode infini + classement local
  openEndless(world = null) {
    const sv = this.save;
    if (!sv.endlessUnlocked()) { this.audio.play('error'); this.toast('Mode infini verrouillé', `Termine le monde ${CAMPAIGN.endlessAfter / 6} pour le débloquer`, icon('lock')); return; }
    const worlds = Math.min(WORLDS.length, Math.floor(sv.progress() / 6));
    if (world == null) world = this.endlessWorld != null ? Math.min(this.endlessWorld, worlds - 1) : worlds - 1;
    this.endlessWorld = world;
    const L = LEVELS[world * 6 + 5], m = el('div', 'panel glass prep');
    const x = el('button', 'icon-btn close', icon('close')); x.onclick = () => this.closeOverlay();
    m.append(x, el('h2', 'win', 'MODE INFINI'), el('p', 'sub', 'Tiens le plus longtemps possible. Un boss toutes les 10 vagues.'));
    const seg = el('div', 'seg');
    for (let i = 0; i < worlds; i++) { const b = el('button', i === world ? 'sel' : '', WORLDS[i].name.split(' ')[0]); b.onclick = () => this.openEndless(i); seg.append(b); }
    m.append(seg);
    const board = el('div', 'board');
    const list = sv.data.endless;
    if (!list.length) board.append(el('p', 'sub', 'Aucun score pour l\'instant. À toi de jouer !'));
    list.forEach((e, i) => board.append(el('div', 'rank' + (i < 3 ? ' top' + (i + 1) : ''), `<i>${i + 1}</i><b>${fmt(e.score)}</b><span>vague ${e.wave} · ${WORLDS[e.world].name.split(' ')[0]}</span>`)));
    m.append(el('small', 'kicker', 'CLASSEMENT LOCAL'), board);
    const go = el('button', 'btn pink big', icon('infinity') + 'Jouer');
    go.onclick = () => this.startGame(L.n, false, true, this.loadoutFor ? this.loadoutFor(L) : []);
    m.append(go);
    this.openOverlay(m);
  },

  // Message unique après la conversion d'une ancienne sauvegarde
  showNotice() {
    const n = this.save.data.notice; if (!n) return;
    this.save.data.notice = null; this.save.persist();
    const m = el('div', 'panel glass');
    m.append(el('h2', 'win', 'NOUVELLE CAMPAGNE'), el('p', 'sub', 'Le jeu passe en mode campagne. Ta progression a été convertie :'));
    const rows = [];
    if (n.stars) rows.push(`${icon('star')}<span><b>${n.stars} étoiles</b>converties en gemmes et en XP</span>`);
    if (n.gems) rows.push(`${gem()}<span><b>+${n.gems} gemmes</b>étoiles et anciens bonus remboursés</span>`);
    if (n.xp) rows.push(`${icon('up')}<span><b>+${n.xp} XP</b>${n.levels ? n.levels + ' niveau(x) de joueur gagné(s)' : ''}</span>`);
    if (n.chests) rows.push(`${icon('gift')}<span><b>${n.chests} coffre(s)</b>à ouvrir dans l'inventaire</span>`);
    rows.push(`${icon('check')}<span><b>Tourelles, skins et succès</b>conservés</span>`);
    m.append(el('div', 'unlocks', rows.map((r) => `<div>${r}</div>`).join('')));
    const ok = el('button', 'btn primary', 'C\'est parti !'); ok.onclick = () => this.closeOverlay();
    m.append(ok);
    this.openOverlay(m);
  },
};
