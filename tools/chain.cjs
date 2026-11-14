// Enchaîne N niveaux via « Niveau suivant » avec l'interface réelle (le robot joue dans la vraie boucle, vitesse
// forcée) et vérifie que l'écran de victoire apparaît à chaque fois, sans erreur de console.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/chain.cjs [nombre de niveaux] [dossier de captures]
const { chromium } = require('playwright');
const N = +(process.argv[2] || 3), OUT = process.argv[3], URL = 'http://localhost:8123/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const errs = [];
  p.on('pageerror', (e) => { errs.push(e.message); console.log('PAGEERR', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')); });
  p.on('console', (m) => { if (m.type() === 'error') { errs.push(m.text()); console.log('CONSOLE', m.text()); } });
  await p.goto(URL); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = __ui.save.data; d.settings.tutorialDone = true; d.settings.muted = true; __ui.save.persist(); });
  await p.click('#btn-play', { force: true }); await p.waitForTimeout(600);
  for (let k = 1; k <= N; k++) {
    if (await p.$('#overlay.show .prep .cta')) { await p.click('#overlay.show .prep .cta', { force: true }); await p.waitForTimeout(400); }
    const scr = await p.evaluate(() => document.body.dataset.screen);
    console.log('niveau', k, 'écran', scr, 'jeu', await p.evaluate(() => __ui.game && __ui.game.level.id));
    // robot
    await p.evaluate(() => {
      const g = __ui.game; window.__bot = setInterval(() => {
        if (!__ui.game || __ui.game !== g || g.over) { clearInterval(window.__bot); return; }
        g.speed = 12; g.lives = g.maxLives;
        if (g.paused) { const ok = document.querySelector('#overlay.show .intro .btn'); if (ok) ok.click(); return; }
        const order = ['assault', 'smg', 'shotgun'];
        for (const s of g.slots.filter((s) => s.kind === 'tower' && !s.tower)) { const t = order.filter((x) => g.buildable(s).includes(x)).pop(); if (g.money >= g.costOf(t)) g.placeTower(t, s); }
        for (const t of g.towers) { const o = t.upgradeOptions().filter((u) => !u.locked)[0]; if (o && g.money >= o.cost) g.upgradeTower(t, o); }
        if (g.canStartNext) g.startNextWave(true);
      }, 100);
    });
    let ok = false;
    for (let i = 0; i < 400; i++) {
      await p.waitForTimeout(500);
      const st = await p.evaluate(() => ({ over: __ui.game && __ui.game.over, wave: __ui.game && __ui.game.wave, done: !!document.querySelector('#overlay.show .endseq.done'), rev: !!document.querySelector('#overlay.show .reveal .cta'), ov: document.querySelector('#overlay').className, kid: (document.querySelector('#overlay').firstElementChild || {}).className }));
      if (st.rev) { await p.waitForTimeout(1500); await p.click('#overlay.show .reveal .cta', { force: true }); continue; }
      if (st.over && !st.done) { await p.mouse.click(195, 420); }
      if (st.done) { ok = true; break; }
      if (i % 20 === 19) console.log('  ...', JSON.stringify(st));
    }
    if (OUT) await p.screenshot({ path: `${OUT}/chain-${k}.png` });
    console.log('niveau', k, ok ? 'ÉCRAN DE FIN OK' : 'BLOQUÉ');
    if (!ok) break;
    const nx = await p.$('.es-main .btn');
    console.log('  bouton :', await nx.innerText());
    await nx.click({ force: true }); await p.waitForTimeout(700);
  }
  const logged = await p.evaluate(() => window.__errors || []); for (const e of logged) { errs.push(e); console.log('OUPS', e); }
  console.log(errs.length ? `${errs.length} erreur(s)` : `OK : ${N} niveaux enchaînés, écran de victoire à chaque fois, aucune erreur`);
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
