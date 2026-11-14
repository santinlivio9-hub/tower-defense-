// Audit d'affichage : visite chaque écran en 375, 390 et 430 px de large et signale
// tout débordement horizontal (page ou panneau qui défile en largeur, élément qui sort
// de l'écran, texte coupé). Captures en 390 x 844 dans le dossier donné.
// Vérifie aussi la lisibilité : texte >= 14 px (13 px en gras pour les labels d'icônes),
// zones tactiles >= 44 px, contraste WCAG AA (4,5:1) sur fond uni, contour ou ombre foncée
// pour un texte posé sur un décor (canvas, image).
// Usage (serveur sur le port 8123) :
//   NODE_PATH=$(npm root -g) node tools/audit.cjs [dossier-captures] [filtre]
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
const ONLY = process.argv[3] || '';
const URL = 'http://localhost:8123/';

// Chaque scène : nom + fonction exécutée dans la page (accès à __ui / __game)
const SCENES = [
  ['menu', () => __ui.show('menu')],
  ['world', () => __ui.show('world')],
  ['shop', () => __ui.show('shop')],
  ['castle', () => __ui.show('castle')],
  ['talents', () => __ui.show('talents')],
  ['collection', () => __ui.show(document.getElementById('screen-collection') ? 'collection' : 'inventory')],
  ['settings', () => __ui.show('settings')],
  ['quests', () => __ui.openDaily && __ui.openDaily('quests')],
  ['calendar', () => __ui.openDaily && __ui.openDaily('calendar')],
  ['pass', () => __ui.openDaily && __ui.openDaily('pass')],
  ['wheel', () => __ui.openDaily && __ui.openDaily('wheel')],
  ['challenge', () => __ui.openDaily && __ui.openDaily('challenge')],
  // états « pas assez » : on vide le porte-monnaie puis on le rend
  ['poor-castle', () => { const d = __ui.save.data; __ui.__w = [d.coins, d.gems, { ...d.chests }]; d.coins = 60; d.gems = 3; d.chests = { wood: 0, gold: 0 }; __ui.show('castle'); }],
  ['poor-shop', () => { __ui.shopTab = 'chests'; __ui.show('shop'); }],
  ['poor-boosts', () => { __ui.shopTab = 'boosts'; __ui.show('shop'); }],
  ['poor-skins', () => { __ui.shopTab = 'skins'; __ui.show('shop'); }],
  ['poor-talents', () => { const d = __ui.save.data; d.talentPts = 0; __ui.talentSel = 'dmg'; __ui.show('talents'); }],
  ['poor-wheel', () => { __ui.save.data.daily.wheel = __ui.save.data.daily.day; __ui.openDaily('wheel'); }],
  ['rich', () => { __ui.closeOverlay(); const d = __ui.save.data, w = __ui.__w; d.coins = w[0]; d.gems = w[1]; d.chests = w[2]; d.talentPts = 4; d.daily.wheel = ''; __ui.shopTab = 'chests'; __ui.show('menu'); }],
  ['castle-sheet', () => { __ui.show('castle'); __ui.castleSheet('cannon'); }],
  ['castle-max', () => { __ui.closeOverlay(); const d = __ui.save.data; __ui.__c = { ...d.castle }; d.castle = { walls: 5, repair: 5, treasury: 5, cannon: 5, air: 3, blizzard: 3, gold: 3 }; __ui.show('castle'); }],
  ['game', async () => { __ui.startGame(6, false, false, []); }],
  ['game-max', async () => { __ui.startGame(2, false, false, []); }],
  ['castle-back', () => { __ui.save.data.castle = __ui.__c; __ui.closeOverlay(); __ui.show('menu'); }],
  ['pause', () => { __ui.togglePause(); }],
  ['intro', () => { __ui.closeOverlay(); __ui.showIntro([{ kind: 'enemy', id: 'tank' }, { kind: 'tower', id: 'sniper' }], () => {}); }],
  ['chest', () => { __ui.closeOverlay(); __ui.openChest('gold'); }],
  ['win', () => window.__finish(true)],
  ['lose', () => window.__finish(false)],
];

async function prime(p) {
  await p.evaluate(() => {
    const d = __ui.save.data;
    d.gems = 480; d.coins = 12500; d.talentPts = 4; d.talents = { dmg: 2 }; d.chests = { wood: 2, gold: 1 };
    Object.assign(d.boosts, { coins2: 2, heal: 1, free: 1, over: 2, shield: 1, revive: 1 });
    Object.assign(d.castle, { walls: 2, air: 1, blizzard: 1, gold: 1 });
    d.seen.enemies = ['basic', 'fast', 'tank', 'flying', 'armored']; d.settings.tutorialDone = true;
    for (let n = 1; n <= 11; n++) d.levels[n] = { stars: 1 + (n % 3), best: 1000 * n, heroic: 0, heroicBest: 0 };
    d.notice = null; __ui.save.persist && __ui.save.persist();
    // Termine la partie en cours instantanément (victoire ou défaite) pour afficher la fin
    window.__finish = (win) => {
      __ui.closeOverlay();
      __ui.startGame(4, false, false, []);
      const g = __game; __ui.simulating = true;
      if (!win) { g.lives = 1; g.money = 0; }
      let i = 0;
      while (!g.over && i++ < 60000) {
        if (win) { g.lives = g.maxLives; for (const e of g.enemies) e.hp = 0; }
        if (!g.waveActive && g.startNextWave) g.startNextWave();
        g.update(1 / 30);
      }
      __ui.simulating = false;
    };
  });
}

async function audit(p) {
  return p.evaluate(() => {
    const W = innerWidth, issues = [];
    const doc = document.scrollingElement;
    if (doc.scrollWidth > W + 1) issues.push(`page plus large que l'écran (${doc.scrollWidth}px)`);
    const roots = [...document.querySelectorAll('.screen.active, #overlay.show, #toasts')];
    const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''));
    const clipped = (e) => { // un ancêtre coupe volontairement ce qui dépasse (overflow hidden)
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') { const r = a.getBoundingClientRect(); if (r.left >= -1 && r.right <= W + 1) return true; }
      }
      return false;
    };
    for (const root of roots) {
      for (const e of [root, ...root.querySelectorAll('*')]) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('svg') && e.tagName !== 'svg') continue;
        const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
        // conteneur qui peut défiler horizontalement
        if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1) issues.push(`${name(e)} défile en largeur (${e.scrollWidth} > ${e.clientWidth})`);
        // élément qui sort de l'écran
        if ((r.right > W + 1 || r.left < -1) && !clipped(e) && cs.position !== 'fixed' && !e.matches('canvas, .rays, .ring, #bg *')) issues.push(`${name(e)} sort de l'écran (${Math.round(r.left)} → ${Math.round(r.right)})`);
        // texte coupé sans points de suspension voulus
        if (e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 2 && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis') issues.push(`${name(e)} texte coupé « ${e.textContent.trim().slice(0, 40)} »`);
      }
    }
    return [...new Set(issues)];
  });
}

async function legibility(p) {
  return p.evaluate(() => {
    const H = innerHeight, issues = [];
    const rgba = (s) => [...s.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => { const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] == null ? 1 : v[3]]; });
    const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const over = (top, under) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1); };
    const BASE = [42, 29, 82, 1];
    // couleurs de fond sous un élément : premier ancêtre opaque (les fonds translucides se superposent)
    const backdrop = (e) => {
      const layers = [];
      for (let a = e; a && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        let img = cs.backgroundImage !== 'none' ? rgba(cs.backgroundImage) : [];
        // reflets translucides superposés à un dégradé opaque : on garde le dégradé
        if (img.some((c) => c[3] >= 0.95)) img = img.filter((c) => c[3] >= 0.95);
        if (cs.backgroundImage !== 'none' && /url\(/.test(cs.backgroundImage)) return null;
        const bc = rgba(cs.backgroundColor)[0];
        if (img.length) { layers.push(img); if (img.every((c) => c[3] >= 0.95)) break; }
        if (bc && bc[3] > 0) { layers.push([bc]); if (bc[3] >= 0.95) break; }
        if (a.matches('.screen, #overlay, #app')) { if (!layers.length) return null; break; }
        // un canvas ou une image frère placé dessous = décor
        if (a.parentElement && [...a.parentElement.children].some((s) => s !== a && s.matches('canvas') && s.compareDocumentPosition(a) & 4)) { if (!layers.length) return null; }
      }
      let cols = [BASE];
      for (const L of layers.reverse()) cols = L.flatMap((c) => cols.map((u) => over(c, u)));
      return cols;
    };
    const seen = new Set();
    const add = (k, msg) => { if (!seen.has(k)) { seen.add(k); issues.push(msg); } };
    const name = (e) => (e.id ? '#' + e.id : (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()));
    const roots = [...document.querySelectorAll(document.querySelector('#overlay.show') ? '#overlay.show' : '.screen.active, #resbar, #tabbar')].filter((r) => r.getClientRects().length);
    for (const root of roots) for (const e of [root, ...root.querySelectorAll('*')]) {
      if (e.closest('svg') || e.closest('[aria-hidden="true"]')) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > H * 3) continue;
      let op = 1; for (let a = e; a; a = a.parentElement) op *= +getComputedStyle(a).opacity; if (op < 0.3) continue;
      // zones tactiles
      if (e.matches('button, a, [role=button]') && !e.closest('.no-hit') && (r.width < 43.5 || r.height < 43.5)) {
        const ps = getComputedStyle(e, '::after'); const ext = ps.content !== 'none' && ps.position === 'absolute' && e.matches('.hit, .switch');
        if (!ext) add('t' + name(e), `zone tactile ${Math.round(r.width)}×${Math.round(r.height)} ${name(e)} « ${e.textContent.trim().slice(0, 24)} »`);
      }
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight, txt = e.textContent.trim().slice(0, 28);
      if (fs < 12.95 || (fs < 13.95 && fw < 700)) add('s' + name(e) + fs, `texte ${fs}px/${fw} ${name(e)} « ${txt} »`);
      const tc = rgba(cs.color)[0]; if (!tc) continue;
      const shadow = cs.textShadow !== 'none' && rgba(cs.textShadow).some((c) => lum(c) < 0.08 && c[3] > 0.5) || parseFloat(cs.webkitTextStrokeWidth) >= 1;
      const bg = backdrop(e);
      if (!bg) { if (!shadow || lum(tc) < 0.3) add('d' + name(e), `texte sur décor sans contour ${name(e)} « ${txt} »`); continue; }
      const t = over([tc[0], tc[1], tc[2], tc[3] * op], bg[0]);
      const worst = Math.min(...bg.map((b) => ratio(over([tc[0], tc[1], tc[2], tc[3] * op], b), b)));
      const need = fs >= 24 || (fs >= 18.66 && fw >= 700) ? 3 : 4.5;
      if (worst < need && !(shadow && lum(t) > 0.5)) add('c' + name(e), `contraste ${worst.toFixed(1)}:1 ${name(e)} « ${txt} »`);
    }
    return issues;
  });
}

(async () => {
  const b = await chromium.launch();
  let total = 0;
  for (const width of [375, 390, 430]) {
    const ctx = await b.newContext({ viewport: { width, height: width === 390 ? 844 : width === 375 ? 667 : 932 }, hasTouch: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log(`[${width}] ERREUR JS`, e.message));
    await p.goto(URL); await p.waitForTimeout(700); await prime(p);
    for (const [n, fn] of SCENES) {
      if (ONLY && !n.includes(ONLY)) continue;
      const ok = await p.evaluate(fn).then(() => true, (e) => { console.log(`[${width}] ${n} : ${e.message.split('\n')[0]}`); return false; });
      if (!ok) continue;
      await p.waitForTimeout(n === 'win' || n === 'lose' ? 2500 : 450);
      if (n === 'win' || n === 'lose') { // passe les cartes de présentation et laisse la séquence de fin se jouer
        for (let k = 0; k < 6; k++) { await p.evaluate(() => { const b = document.querySelector('#overlay.show .panel.intro .btn'); if (b) b.click(); }); await p.waitForTimeout(400); }
        await p.waitForTimeout(6000);
      }
      const issues = await audit(p);
      if (width === 390) for (const i of await legibility(p)) issues.push('lisibilité : ' + i);
      // on fait aussi défiler le contenu des panneaux pour vérifier qu'ils ne bougent pas en largeur
      await p.evaluate(() => document.querySelectorAll('#overlay.show, #overlay.show *, .screen.active .scroll').forEach((e) => { e.scrollLeft = 500; }));
      const moved = await p.evaluate(() => [...document.querySelectorAll('#overlay.show, #overlay.show *, .screen.active, .screen.active *')].filter((e) => e.scrollLeft > 0).map((e) => e.id || e.className).slice(0, 4));
      if (moved.length) issues.push('défilement horizontal possible : ' + moved.join(', '));
      total += issues.length;
      console.log(`[${width}] ${n.padEnd(10)} ${issues.length ? 'PROBLÈMES' : 'ok'}`);
      for (const i of issues.slice(0, +process.env.MAXI || 12)) console.log('      - ' + i);
      if (width === 390) await p.screenshot({ path: `${OUT}/${n}.png` });
    }
    await ctx.close();
  }
  await b.close();
  console.log(total ? `\n${total} problème(s)` : '\nAucun débordement.');
  process.exitCode = total ? 1 : 0;
})();
