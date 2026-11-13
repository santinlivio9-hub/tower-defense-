// Audit d'affichage : visite chaque écran en 375, 390 et 430 px de large et signale
// tout débordement horizontal (page ou panneau qui défile en largeur, élément qui sort
// de l'écran, texte coupé). Captures en 390 x 844 dans le dossier donné.
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
  ['game', async () => { __ui.startGame(6, false, false, []); }],
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
      // on fait aussi défiler le contenu des panneaux pour vérifier qu'ils ne bougent pas en largeur
      await p.evaluate(() => document.querySelectorAll('#overlay.show, #overlay.show *, .screen.active .scroll').forEach((e) => { e.scrollLeft = 500; }));
      const moved = await p.evaluate(() => [...document.querySelectorAll('#overlay.show, #overlay.show *, .screen.active, .screen.active *')].filter((e) => e.scrollLeft > 0).map((e) => e.id || e.className).slice(0, 4));
      if (moved.length) issues.push('défilement horizontal possible : ' + moved.join(', '));
      total += issues.length;
      console.log(`[${width}] ${n.padEnd(10)} ${issues.length ? 'PROBLÈMES' : 'ok'}`);
      for (const i of issues.slice(0, 12)) console.log('      - ' + i);
      if (width === 390) await p.screenshot({ path: `${OUT}/${n}.png` });
    }
    await ctx.close();
  }
  await b.close();
  console.log(total ? `\n${total} problème(s)` : '\nAucun débordement.');
  process.exitCode = total ? 1 : 0;
})();
