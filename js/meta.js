// Écrans hors partie : carte du monde, préparation d'un niveau, cartes de présentation, mode infini.
// Ces méthodes sont ajoutées à la classe UI (voir la fin de ui.js).
import { LEVELS, WORLDS, ENEMIES, TOWERS, HEROIC, heroicMod, CAMPAIGN, COINS, SHOP, unlocksOf, WORLD_REWARD, CHESTS } from './config.js';
import { chestSvg } from './loot.js';
import { THEMES, buildField, drawMapPreview } from './maps.js';
import { levelEnemies } from './waves.js';
import { enemyImg, towerImg } from './sprites.js';
import { icon, coin, gem } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const stars = (n, cls = 'stars') => `<span class="${cls}">${[0, 1, 2].map((i) => icon('star', i < n ? 'on' : '')).join('')}</span>`;

// BAND = bande réservée en bas de chaque monde pour son panneau (le chemin y monte tout droit)
const NODE_X = [28, 64, 78, 40, 22, 50], BAND = 128, SEC_H = 680 + BAND;
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
// Décors supplémentaires (rochers, buissons, panneaux) communs, teintés par monde
const EXTRA = {
  rock: (s, c = '#b8b0c8') => `<svg viewBox="0 0 50 34" width="${s}"><path d="M4 32L10 12 24 4 40 10 47 32z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M14 14l9-6" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/></svg>`,
  bush: (s, c = '#3f9a3a') => `<svg viewBox="0 0 60 36" width="${s}"><path d="M6 34a10 10 0 0 1 6-16 13 13 0 0 1 24-6 11 11 0 0 1 18 22z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="22" cy="16" r="3.5" fill="#fff" opacity=".35"/></svg>`,
  sign: (s) => `<svg viewBox="0 0 40 46" width="${s}"><rect x="17" y="18" width="6" height="26" rx="2" fill="#8a5530" stroke="${INK}" stroke-width="3"/><path d="M4 6h26l6 7-6 7H4z" fill="#d9a566" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M9 13h16" stroke="#8a5530" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  fence: (s) => `<svg viewBox="0 0 60 30" width="${s}"><path d="M4 12h52M4 21h52" stroke="${INK}" stroke-width="6"/><path d="M4 12h52M4 21h52" stroke="#d9a566" stroke-width="3"/>${[8, 22, 36, 50].map((x) => `<rect x="${x - 3}" y="4" width="6" height="24" rx="2" fill="#d9a566" stroke="${INK}" stroke-width="2.5"/>`).join('')}</svg>`,
};
const RIVER = { prairie: ['#5cc8ff', '#a6e4ff'], desert: ['#4fc4e8', '#b2f0ff'], volcano: ['#ff7a3c', '#ffd23f'], ice: ['#8fd8f5', '#e6f9ff'], candy: ['#8a4b2e', '#c98a5a'] };
const ROCK = { prairie: '#b8b0c8', desert: '#d9a566', volcano: '#56436a', ice: '#cfe3f5', candy: '#ff9dbb' };
const BUSH = { prairie: '#3f9a3a', desert: '#8aa83c', volcano: '#3f8f7a', ice: '#5f9fbf', candy: '#3fae7a' };
const nodeY = (i) => SEC_H - BAND - 92 - i * 94 - (i === 5 ? 14 : 0);
const RIVER_Y = Math.round((nodeY(2) + nodeY(3)) / 2) + 4;
// petit générateur pseudo-aléatoire stable (même décor à chaque ouverture)
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// courbe de Bézier du chemin échantillonnée (pour éviter d'y poser le décor et placer le pont)
function sampleRoad(pts) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y0 + y1) / 2;
    for (let k = 0; k <= 24; k++) {
      const t = k / 24, u = 1 - t, b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
      out.push([b0 * x0 + b1 * x0 + b2 * x1 + b3 * x1, b0 * y0 + b1 * my + b2 * my + b3 * y1]);
    }
  }
  return out;
}
const roadD = (pts) => { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y0 + y1) / 2; d += ` C${x0} ${my} ${x1} ${my} ${x1} ${y1}`; } return d; };
// largeur d'un texte en Fredoka gras (pour dimensionner les bulles sans les tronquer)
const measure = (() => { let c = null; return (t, px) => { c = c || document.createElement('canvas').getContext('2d'); c.font = `700 ${px}px Fredoka, ui-rounded, system-ui, sans-serif`; return c.measureText(t).width; }; })();
const crestNode = (fill, dark) => `<svg class="nc" viewBox="0 0 60 66" aria-hidden="true"><path d="M5 4h50v28c0 16-11 25-25 31C16 57 5 48 5 32z" fill="${fill}" stroke="#3d2c4e" stroke-width="4" stroke-linejoin="round"/><path d="M7.5 34c2 13 11 20 22.5 25 11.5-5 20.5-12 22.5-25v4c-1.5 12-10 19-22.5 24C17.5 57 9 50 7.5 38z" fill="${dark}"/><path d="M9.5 8.5h41v11c-13 5-28 5-41 0z" fill="#fff" opacity=".3"/></svg>`;

export const Meta = {
  // ------------------------------------------------------------------ carte du monde
  renderWorld() {
    const sv = this.save, box = $('#world-map'), prog = sv.progress(), W = box.clientWidth || $('#app').clientWidth || 390;
    box.innerHTML = '';
    $('#world-stars').textContent = `${sv.campaignStars()}/${LEVELS.length * 3}`;
    let current = null;
    const NW = WORLDS.length;
    { // arrivée : le chemin se termine sur le trophée, au-dessus du dernier monde
      const th = THEMES[WORLDS[NW - 1].theme], fin = el('section', 'wsec final' + (prog >= LEVELS.length ? '' : ' locked'));
      fin.style.cssText = `--c1:${th.g1};--c2:${th.g1};--c3:${th.g3};height:130px`;
      const d = `M${W / 2} 132 C${W / 2} 100 ${W / 2} 100 ${W / 2} 70`;
      fin.innerHTML = `<svg class="road" viewBox="0 0 ${W} 130" width="${W}" height="130"><path d="${d}" class="r1"/><path d="${d}" class="r2" style="stroke:${th.edge}"/><path d="${d}" class="r3" style="stroke:${th.path}"/></svg>`;
      fin.append(Object.assign(el('div', 'wmark end', `${icon('trophy')}<b>Victoire finale</b>`), { style: `left:${W / 2}px;top:52px` }));
      box.append(fin);
    }
    for (let wi = NW - 1; wi >= 0; wi--) {
      const w = WORLDS[wi], th = THEMES[w.theme], open = prog >= wi * 6, X = (pc) => (pc / 100) * W;
      const sec = el('section', 'wsec' + (open ? '' : ' locked'));
      sec.style.cssText = `--c1:${th.g1};--c2:${th.g2};--c3:${th.g3};--road:${th.path};--edge:${th.edge};height:${SEC_H}px`;
      // chemin continu : départ en bas du monde 1, arrivée en haut du dernier monde
      const pts = [[W / 2, wi === 0 ? SEC_H - 30 : SEC_H + 2], [W / 2, SEC_H - BAND + 6], ...NODE_X.map((x, i) => [X(x), nodeY(i)]), [W / 2, -2]];
      const road = sampleRoad(pts), d = roadD(pts);
      // rivière + pont là où le chemin la traverse
      const [rc, rl] = RIVER[w.theme] || RIVER.prairie;
      let rv = `M-10 ${RIVER_Y}`; for (let x = 0; x <= W + 20; x += 20) rv += ` Q${x + 10} ${RIVER_Y + (x / 20) % 2 * 16 - 8} ${x + 20} ${RIVER_Y}`;
      const cross = road.reduce((m, p) => (Math.abs(p[1] - RIVER_Y) < Math.abs(m[1] - RIVER_Y) ? p : m), road[0]);
      const ci = road.indexOf(cross), nb = road[Math.min(road.length - 1, ci + 1)], ang = (Math.atan2(nb[1] - cross[1], nb[0] - cross[0]) * 180) / Math.PI;
      // bord ondulé : transition douce vers le monde du dessus
      const up = wi < NW - 1 ? THEMES[WORLDS[wi + 1].theme] : null;
      let wave = ''; if (up) { wave = `M0 0H${W}V12`; for (let x = W; x >= 0; x -= 26) wave += ` Q${x - 13} ${(x / 26) % 2 ? 26 : 2} ${x - 26} 12`; wave += 'Z'; }
      sec.innerHTML = `<svg class="road" viewBox="0 0 ${W} ${SEC_H}" width="${W}" height="${SEC_H}">
        ${up ? `<path d="${wave}" fill="${up.g2}" stroke="${INK}" stroke-width="3"/>` : ''}
        <path d="${rv}" class="rv0" stroke="${INK}"/><path d="${rv}" class="rv1" stroke="${rc}"/><path d="${rv}" class="rv2" stroke="${rl}"/>
        <path d="${d}" class="r1"/><path d="${d}" class="r2"/><path d="${d}" class="r3"/><path d="${d}" class="r4"/>
        <g transform="translate(${cross[0]} ${cross[1]}) rotate(${ang})"><rect x="-26" y="-19" width="52" height="38" rx="5" fill="#a0642e" stroke="${INK}" stroke-width="3"/>
        ${[-18, -9, 0, 9, 18].map((x) => `<rect x="${x - 3.5}" y="-17" width="7" height="34" rx="2" fill="#d9a566" stroke="#8a5530" stroke-width="1.5"/>`).join('')}
        <path d="M-27 -20H27M-27 20H27" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-27 -20H27M-27 20H27" stroke="#c98a4b" stroke-width="3.5" stroke-linecap="round"/></g></svg>`;
      // panneau du monde, à l'entrée du monde
      const ws = LEVELS.filter((l) => l.world === wi).reduce((s, l) => s + (sv.data.levels[l.n] ? sv.data.levels[l.n].stars : 0), 0);
      // obstacles de la section (rectangles en px) : nœuds (+ étoiles dessous), jauge d'étoiles, avatar, bulles…
      const obst = [];
      const nodeRect = (i) => { const x = X(NODE_X[i]), y = nodeY(i), big = i === 5; return { x: x - (big ? 50 : 34), y: y - (big ? 50 : 36), w: big ? 100 : 68, h: big ? 112 : 92 }; };
      for (let i = 0; i < 6; i++) obst.push(nodeRect(i));
      { const cur = LEVELS.find((l) => l.world === wi && sv.levelUnlocked(l.n) && !sv.levelDone(l.n)); if (cur) obst.push({ x: X(NODE_X[cur.idx]) - 34, y: nodeY(cur.idx) - 128, w: 68, h: 96 }); }   // avatar au-dessus du nœud actuel
      const roadHit = (r, m = 22) => road.some(([rx, ry]) => rx > r.x - m && rx < r.x + r.w + m && ry > r.y - m && ry < r.y + r.h + m);
      const hit = (r) => obst.some((o) => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y);
      const inside = (r) => r.x >= 6 && r.x + r.w <= W - 6 && r.y >= 6 && r.y + r.h <= SEC_H - BAND;
      const bubbles = [];
      // ordre de priorité : niveau actuel, puis le boss, puis les suivants
      const todo = LEVELS.filter((l) => l.world === wi && !sv.levelDone(l.n)).sort((p, q) => (sv.levelUnlocked(q.n) - sv.levelUnlocked(p.n)) || (p.n - q.n));
      // bulle normale (libellé « DÉBLOQUE » + nom) ; s'il n'y a pas la place : bulle compacte (icône + nom)
      const placeBubble = (L) => {
        const info = this.levelBubble(L); if (!info) return;
        const x = X(NODE_X[L.idx]), y = nodeY(L.idx), big = L.boss, gap = big ? 50 : 38;
        const own = nodeRect(L.idx), others = obst.filter((o) => o.x !== own.x || o.y !== own.y);
        for (const compact of [false, true]) {
          const bw = Math.ceil((compact ? 52 : 60) + (compact ? measure(info.name, 14) : Math.max(measure(info.kick, 13) * 1.08, measure(info.name, 15)))), bh = compact ? 40 : 50;
          const cands = [];
          for (const dy of [0, -26, 26, -52, 52, -78, 78]) cands.push({ side: 'right', x: x + gap, y: y - bh / 2 + dy }, { side: 'left', x: x - gap - bw, y: y - bh / 2 + dy });
          for (const dx of [0, -50, 50, -100, 100]) { const bx = Math.max(8, Math.min(W - bw - 8, x - bw / 2 + dx)); cands.push({ side: 'down', x: bx, y: y + (big ? 66 : 60) }, { side: 'up', x: bx, y: y - (big ? 62 : 52) - bh }); }
          const ok = (c) => { const r = { x: c.x, y: c.y, w: bw, h: bh }; return inside(r) && !others.some((o) => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y); };
          const c = cands.find(ok); if (!c) continue;
          obst.push({ x: c.x, y: c.y, w: bw, h: bh });
          const e = el('div', 'nbub ' + c.side + (compact ? ' compact' : ''), `${info.art}<span>${compact ? '' : `<small>${info.kick}</small>`}<b>${info.name}</b></span>`);
          e.style.cssText = `left:${c.x}px;top:${c.y}px;width:${bw}px;height:${bh}px;--ay:${Math.max(10, Math.min(bh - 10, y - c.y))}px;--ax:${Math.max(12, Math.min(bw - 12, x - c.x))}px`;
          bubbles.push(e); return;
        }   // aucune place : pas de bulle plutôt qu'un chevauchement
      };
      // le niveau actuel garde toujours sa bulle (placée avant le panneau)
      if (open || wi === sv.worldsDone()) todo.filter((L) => sv.levelUnlocked(L.n)).forEach(placeBubble);
      // panneau du monde : dans la bande réservée du bas, à droite du chemin (qui y monte tout droit)
      const SW = Math.min(W / 2 - 34, 200), SH = BAND - 14;
      const sr = { x: W / 2 + 26, y: SEC_H - BAND + 6, w: SW, h: SH };
      obst.push(sr);
      const sign = el('div', 'wsign', `<div class="ws-board"><small>Monde ${wi + 1}</small><b>${w.name}</b></div>`);
      sign.style.cssText = `left:${sr.x}px;top:${sr.y}px;--sw:${SW}px`; if (open) sec.append(sign);
      // bulles « DÉBLOQUE … » (niveaux pas encore terminés) : côté libre du nœud, petite flèche vers lui
      const showBubbles = open || wi === sv.worldsDone();
      if (showBubbles) todo.forEach((L) => { if (!sv.levelUnlocked(L.n)) placeBubble(L); });
      // décor dense, généré hors du chemin, des nœuds, du panneau et de la rivière
      const R = rng(1234 + wi * 977), keep = [];
      const free = (x, y, r) => {
        if (x < 18 || x > W - 18 || y < 30 || y > SEC_H - 16) return false;
        if (Math.abs(y - RIVER_Y) < 22 + r * 0.5) return false;
        if (road.some(([rx, ry]) => (rx - x) ** 2 + (ry - y) ** 2 < (30 + r) ** 2)) return false;
        if (NODE_X.some((nx, i) => (X(nx) - x) ** 2 + (nodeY(i) - y) ** 2 < (58 + r) ** 2)) return false;
        if (obst.slice(6).some((o) => x > o.x - r && x < o.x + o.w + r && y > o.y - r && y < o.y + o.h + r)) return false;   // bulles, avatar
        if (open && x > sr.x - r && x < sr.x + sr.w + r && y > sr.y - r && y < sr.y + sr.h + r) return false;
        return !keep.some(([kx, ky, kr]) => (kx - x) ** 2 + (ky - y) ** 2 < (kr + r) ** 2 * 0.72);
      };
      const kinds = DECO[w.theme];
      for (let gy = 20; gy < SEC_H; gy += 48) for (let gx = 10; gx < W; gx += 50) {
        const x = gx + R() * 40, y = gy + R() * 36, pick = R(), sz = 26 + R() * 22;
        if (!free(x, y, sz / 2)) continue;
        let html;
        if (pick < 0.5) html = kinds[pick < 0.32 ? 0 : 1](Math.round(sz + (pick < 0.32 ? 10 : 0)));
        else if (pick < 0.7) html = EXTRA.bush(Math.round(sz), BUSH[w.theme]);
        else if (pick < 0.86) html = EXTRA.rock(Math.round(sz * 0.8), ROCK[w.theme]);
        else if (pick < 0.94) html = EXTRA.fence(Math.round(sz + 6));
        else html = EXTRA.sign(Math.round(sz * 0.8));
        keep.push([x, y, sz / 2]);
        const dd = el('div', 'wprop', html); dd.style.cssText = `left:${x}px;top:${y}px`; sec.append(dd);
      }
      // quelques brainrots du monde qui sautillent
      const foes = levelEnemies(LEVELS[wi * 6 + 4]).slice(-3); let fk = 0;
      for (let tries = 0; tries < 60 && fk < foes.length; tries++) {
        const x = 30 + R() * (W - 60), y = 60 + R() * (SEC_H - 120); if (!free(x, y, 24)) continue;
        keep.push([x, y, 24]); const im = enemyImg(foes[fk++], 44); im.className = 'wdeco'; im.style.cssText = `left:${x - 22}px;top:${y - 22}px`; sec.append(im);
      }
      if (wi === 0) sec.append(Object.assign(el('div', 'wmark start', `${EXTRA.sign(40)}<b>Départ</b>`), { style: `left:${W / 2 - 70}px;top:${SEC_H - 60}px` }));
      // nœuds : blasons (doré = terminé, rose = à jouer, sombre = verrouillé), gros nœud pour le boss
      LEVELS.filter((l) => l.world === wi).forEach((L) => {
        const ld = sv.data.levels[L.n], done = sv.levelDone(L.n), unlocked = sv.levelUnlocked(L.n);
        const b = el('button', 'node' + (L.boss ? ' boss' : ' crestn') + (done ? ' done' : unlocked ? ' open' : ' locked')); b.dataset.n = L.n;
        b.setAttribute('aria-label', `${L.boss ? 'Boss' : 'Niveau'} ${L.id}`);
        b.style.cssText = `left:${NODE_X[L.idx]}%;top:${nodeY(L.idx)}px`;
        if (L.boss) b.append(enemyImg(w.boss, 66));
        else b.insertAdjacentHTML('beforeend', done ? crestNode('#ffd23f', '#e09600') : unlocked ? crestNode('#ff5d8f', '#c93868') : crestNode('#4a3b6e', '#2f2450'));
        b.insertAdjacentHTML('beforeend', unlocked ? `<b>${L.boss ? 'BOSS' : L.id}</b>` : icon('lock'));
        if (done) b.insertAdjacentHTML('beforeend', stars(ld.stars));
        if (ld && ld.heroic) b.insertAdjacentHTML('beforeend', `<i class="crown">${icon('crown')}</i>`);
        b.onclick = () => { if (!unlocked) { this.audio.play('error'); this.toast('Niveau verrouillé', 'Termine le niveau précédent', icon('lock')); return; } this.playLevel(L.n); };
        if (unlocked && !done) current = b;
        sec.append(b);

      });
      for (const e of bubbles) sec.append(e);
      // coffre d'étoiles du monde : jauge et paliers 6 / 12 / 18
      const sc = sv.starChests(wi), wst = sv.worldStars(wi);
      const gauge = el('div', 'wstars', `<span class="ws-n">${icon('star', 'on')}<b>${wst}/18</b></span><span class="ws-bar"><i style="width:${(wst / 18) * 100}%"></i></span>`);
      sc.forEach((c) => {
        const b = el('button', 'ws-chest' + (c.got ? ' got' : c.ready ? ' ready' : ''), `${chestSvg(c.chest)}<small>${c.need}</small>`);
        b.style.left = `${(c.need / 18) * 100}%`; b.setAttribute('aria-label', `Coffre à ${c.need} étoiles`);
        b.onclick = (e) => {
          e.stopPropagation();
          if (c.ready) { const r = sv.claimStarChest(wi, c.k); if (r) { this.afterClaim(r.text, chestSvg(r.chest), b); this.renderWorld(); } return; }
          this.audio.play(c.got ? 'tick' : 'error');
          this.toast(c.got ? 'Coffre déjà récupéré' : `Coffre à ${c.need} étoiles`, c.got ? '' : `Encore ${c.need - wst} étoile${c.need - wst > 1 ? 's' : ''} dans ce monde`, icon('chest'));
        };
        $('.ws-bar', gauge).append(b);
      });
      $('.ws-board', sign).append(gauge);
      // monde verrouillé : visible, mais dans le brouillard, avec son nom et sa condition
      if (!open) sec.append(el('div', 'wfog', `<i></i><i></i><i></i><i></i><div class="wf-lab">${icon('lock')}<small>Monde ${wi + 1}</small><b>${w.name}</b><span>Bats le boss du monde ${wi} pour l'ouvrir</span></div>`));
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
    // mode infini : petit blason (verrouillé avec sa condition)
    const eb = $('#btn-endless'), eo = sv.endlessUnlocked();
    eb.className = 'endless-crest' + (eo ? ' ready' : ' locked');
    eb.innerHTML = `<span class="cs">${crestNode(eo ? "#b05cff" : "#4a3b6e", eo ? "#7a2fd0" : "#2f2450")}${icon(eo ? "infinity" : "lock")}</span>`;
    eb.setAttribute('aria-label', eo ? 'Mode infini' : 'Mode infini (verrouillé)');
    requestAnimationFrame(() => {
      const sc = $('#world-scroll');
      if (this.panToWorld != null && current) { // panoramique : du boss vaincu jusqu'au premier niveau du nouveau monde
        this.panToWorld = null;
        const goal = current.offsetParent.offsetTop + current.offsetTop - sc.clientHeight * 0.5, from = Math.min(sc.scrollHeight, goal + SEC_H * 0.9), t0 = performance.now();
        sc.scrollTop = from;
        const step = (now) => { const u = Math.min(1, (now - t0) / 2200), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; sc.scrollTop = from + (goal - from) * e; if (u < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step); return;
      }
      if (!current) { sc.scrollTop = prog >= LEVELS.length ? 0 : sc.scrollHeight; return; }
      // le nœud actuel, son avatar (au-dessus) et sa bulle restent entièrement visibles : nœud vers 62 % de la hauteur
      const goal = current.offsetParent.offsetTop + current.offsetTop - Math.max(150, sc.clientHeight * 0.62);
      sc.scrollTop = Math.min(sc.scrollHeight, goal + sc.clientHeight * 0.4);   // part d'un peu plus bas…
      requestAnimationFrame(() => sc.scrollTo({ top: goal, behavior: 'smooth' }));   // … et remonte le chemin
    });
  },

  // Bulle d'un nœud de la carte : ce que rapporte la 1re victoire (ou le nouveau brainrot qu'on y rencontre)
  levelBubble(L) {
    const u = unlocksOf(L.n), veil = (img) => `<span class="nb-art">${img.outerHTML}<i>?</i></span>`;
    const SHORT = { assault: 'Fusil', smg: 'Mitraillette', shotgun: 'Pompe', sniper: 'Sniper', rocket: 'Roquettes', minigun: 'Minigun', cryo: 'Cryo', mine: 'Mine' };
    if (u.towers.length) return { art: veil(towerImg(u.towers[0], 34)), kick: 'DÉBLOQUE', name: SHORT[u.towers[0]] || TOWERS[u.towers[0]].name };
    if (L.boss) return { art: `<span class="nb-art">${chestSvg('legend')}</span>`, kick: 'BOSS', name: 'Coffre' };
    if (u.legend.length) return { art: `<span class="nb-art">${icon('crown')}</span>`, kick: 'DÉBLOQUE', name: 'Légendaires' };
    const foe = Object.keys(ENEMIES).find((k) => ENEMIES[k].unlock === L.n && !this.save.data.seen.enemies.includes(k));
    if (foe) return { art: veil(enemyImg(foe, 34)), kick: 'NOUVEAU', name: 'Brainrot' };
    return null;
  },
  // Toucher un niveau ouvre sa fiche ; le gros bouton JOUER de l'accueil lance directement le prochain niveau
  playLevel(n) { this.openPrep(n); },
  playNext() { const n = this.nextLevel().n; if (this.save.levelDone(n)) this.openPrep(n); else this.startGame(n, false, false, this.loadoutFor(LEVELS[n - 1])); },

  // ------------------------------------------------------------------ niveau déjà terminé : rejouer ou défi héroïque
  openPrep(n, heroic = false) {
    const sv = this.save, L = LEVELS[n - 1], w = WORLDS[L.world], ld = sv.levelData(n), done = sv.levelDone(n);
    if (!done) heroic = false;
    const m = el('div', 'panel glass prep');
    const x = el('button', 'icon-btn close', icon('close')); x.onclick = () => this.closeOverlay();
    m.append(x, el('h2', heroic ? 'lose' : 'win', L.boss ? `BOSS ${L.id}` : `NIVEAU ${L.id}`), el('p', 'sub', `Monde ${L.world + 1} · ${w.name}`));
    const top = el('div', 'prep-top');
    const cv = el('canvas', 'thumb'); cv.width = 264; cv.height = 414;
    try { drawMapPreview(cv, THEMES[w.theme], buildField(L.layout, L.mirror, L.slots, CAMPAIGN.mines)); } catch (e) { console.error(e); }   // la miniature est facultative
    const hm = heroicMod(n), money = Math.round(L.money * (heroic && hm.money ? hm.money : 1));
    const info = el('div', 'prep-info', `
      <div>${icon('wave')}<b>${L.waves}</b> vagues${L.boss ? ' · mini-boss' : ''}</div>
      <div>${coin()}<b>${money}</b> pièces au départ</div>
      <div>${icon('target')}<b>${L.slots}</b> emplacements</div>
      <div>${stars(ld.stars)}</div>
      <div>${icon('trophy', 'gold')}Record <b>${fmt(heroic ? ld.heroicBest : ld.best)}</b></div>`);
    top.append(cv, info); m.append(top);
    const foes = el('div', 'foes');
    const seen = sv.data.seen.enemies;
    for (const t of [...levelEnemies(L), ...(L.boss ? [w.boss] : [])]) {
      const f = el('span', 'foe' + (seen.includes(t) ? '' : ' new') + (t === w.boss ? ' boss' : '')); f.append(enemyImg(t, t === w.boss ? 46 : 36));
      if (!seen.includes(t)) f.append(el('em', '', 'NOUVEAU')); foes.append(f);
    }
    m.append(foes);
    // récompenses : 1re victoire (avec déblocages) et 3 étoiles
    if (!heroic) {
      const u = unlocksOf(n), mult = L.boss ? COINS.bossMult : 1, gm = L.boss ? CAMPAIGN.gemsBossMult : 1;
      const first = [`<span class="rw">${coin()}<b>+${fmt(COINS.firstClear + COINS.win * mult)}</b></span>`, `<span class="rw">${gem()}<b>+${fmt(CAMPAIGN.gemsFirstClear + CAMPAIGN.gemsWin * gm)}</b></span>`];
      for (const t of u.towers) first.push(`<span class="rw big">${towerImg(t, 26).outerHTML}<b>${TOWERS[t].name}</b></span>`);
      if (L.boss) { first.push(`<span class="rw">${chestSvg(WORLD_REWARD.chest)}<b>Légendaire</b></span>`); for (const sk of u.skins) first.push(`<span class="rw">${icon('star', 'gold')}<b>Skin ${(SHOP.skins.find((k) => k.id === sk) || {}).name}</b></span>`); }
      if (u.legend.length) first.push(`<span class="rw">${icon('crown')}<b>Légendaires</b></span>`);
      const st = sv.worldStars(L.world);
      m.append(el('div', 'prep-rw', `<div class="pr-row${done ? ' done' : ''}"><small>${done ? icon('check') : ''}1re victoire</small><div>${done ? '<b class="pr-ok">Déjà gagné</b>' : first.join('')}</div></div>
        <div class="pr-row${ld.stars >= 3 ? ' done' : ''}"><small>${ld.stars >= 3 ? icon('check') : ''}3 étoiles</small><div><span class="rw">${gem()}<b>+${CAMPAIGN.gemsPerStar * 3 * gm}</b></span><span class="rw">${icon('star', 'gold')}<b>Coffre d'étoiles ${st}/18</b></span></div></div>`));
    }
    const seg = el('div', 'seg' + (done ? '' : ' hidden-seg'));
    const b1 = el('button', heroic ? '' : 'sel', 'Normal'); b1.onclick = () => this.openPrep(n, false);
    const b2 = el('button', (heroic ? 'sel' : '') + (done ? '' : ' locked'), icon(done ? 'crown' : 'lock') + 'Héroïque' + (ld.heroic ? icon('check') : ''));
    b2.onclick = () => { if (!done) { this.toast('Défi verrouillé', 'Termine d\'abord le niveau', icon('lock')); return; } this.openPrep(n, true); };
    seg.append(b1, b2); m.append(seg);
    if (heroic) m.append(el('div', 'heroic-box', `${icon('crown')}<span><b>${hm.name}</b>${hm.hp ? `PV des ennemis +${Math.round((HEROIC.hp * hm.hp - 1) * 100)} %` : `${hm.desc} · PV ennemis +${Math.round((HEROIC.hp - 1) * 100)} %`}<em>Gemmes et XP x${HEROIC.gemsMult}${ld.heroic ? '' : ' · coffre à la première victoire'}</em></span>`));
    const go = el('button', 'btn primary big cta', icon('playgold') + 'JOUER');
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
