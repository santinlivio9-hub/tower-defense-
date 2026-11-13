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
      deco.forEach((t, k) => { const im = enemyImg(t, 46); im.className = 'wdeco'; im.style.cssText = `left:${[80, 8, 70][k]}%;top:${[SEC_H - 190, SEC_H - 330, 230][k]}px`; sec.append(im); });
      LEVELS.filter((l) => l.world === wi).forEach((L) => {
        const ld = sv.data.levels[L.n], done = sv.levelDone(L.n), unlocked = sv.levelUnlocked(L.n);
        const b = el('button', 'node' + (L.boss ? ' boss' : '') + (done ? ' done' : unlocked ? ' open' : ' locked'));
        b.style.cssText = `left:${NODE_X[L.idx]}%;top:${nodeY(L.idx)}px`;
        if (L.boss) b.append(enemyImg(w.boss, 66));
        b.insertAdjacentHTML('beforeend', unlocked ? `<b>${L.boss ? 'BOSS' : L.id}</b>` : icon('lock'));
        if (done) b.insertAdjacentHTML('beforeend', stars(ld.stars));
        if (ld && ld.heroic) b.insertAdjacentHTML('beforeend', `<i class="crown">${icon('crown')}</i>`);
        b.onclick = () => { if (!unlocked) { this.audio.play('error'); this.toast('Niveau verrouillé', 'Termine le niveau précédent', icon('lock')); return; } this.openPrep(L.n); };
        if (unlocked && !done) current = b;
        sec.append(b);
      });
      box.append(sec);
    }
    const eb = $('#btn-endless'); eb.classList.toggle('off', !sv.endlessUnlocked());
    eb.innerHTML = icon(sv.endlessUnlocked() ? 'infinity' : 'lock') + 'Mode infini';
    requestAnimationFrame(() => { const t = current || box.querySelector('.node.done:last-of-type') || box.lastChild; const sc = $('#world-scroll'); if (current) sc.scrollTop = current.offsetParent.offsetTop + current.offsetTop - sc.clientHeight * 0.6; else sc.scrollTop = prog >= LEVELS.length ? 0 : sc.scrollHeight; });
  },

  // ------------------------------------------------------------------ préparation d'un niveau
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
    if (this.prepBoosts) m.append(this.prepBoosts(L));
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
    if (this.prepBoosts) m.append(this.prepBoosts(L));
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
