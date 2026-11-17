// Rangée défilante du choix de tourelle (plus de 6 tourelles), avec de vrais touchers (CDP) en 375 et 390 px :
// glisser fait défiler la rangée sans rien choisir ; 2 touchers sur une tuile posent la tourelle.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/sheet-test.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? 'ok  ' : 'KO  ') + m); };
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const cdp = await ctx.newCDPSession(p);
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(700);
    await p.evaluate(() => {
      const sv = __ui.save, d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null;
      for (let k = 1; k < 66; k++) d.levels[k] = { stars: 3, best: 10, heroic: 0, heroicBest: 0 }; d.seen.enemies = []; sv.grantUnlocks();
      __ui.startGame(66, false, false, []); __ui.closeOverlay(); __ui.introOpen = false;
      const g = __ui.game; g.money = 5000; __ui.openMenu(g.slots.find((s) => s.kind === 'tower')); __ui.updateRadial();
    });
    await p.waitForTimeout(400);
    const touch = async (pts) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] }); for (const q of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [q] }); await p.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(250); };
    const r = await p.evaluate(() => { const q = document.querySelector('#radial .rsheet').getBoundingClientRect(); return { y: q.top + q.height / 2, n: document.querySelectorAll('#radial .rb.tile').length }; });
    await touch(Array.from({ length: 12 }, (_, i) => ({ x: W - 40 - i * 20, y: r.y })));
    const s1 = await p.evaluate(() => ({ sl: document.querySelector('#radial .rs-scroll').scrollLeft, armed: __ui.armed }));
    ok(s1.sl > 30 && !s1.armed, `${W}×${H} : ${r.n} tuiles, glisser fait défiler (${Math.round(s1.sl)} px) sans rien choisir`);
    const t = await p.evaluate(() => { const q = [...document.querySelectorAll('#radial .rb.tile')].find((e) => { const z = e.getBoundingClientRect(); return z.left > 0 && z.right < innerWidth; }).getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await touch([t]); await touch([t]);
    const s2 = await p.evaluate(() => ({ placed: !!__ui.game.slots.find((s) => s.kind === 'tower').tower, open: !document.querySelector('#radial').hidden }));
    ok(s2.placed && !s2.open, `${W}×${H} : 2 touchers sur une tuile posent la tourelle et ferment le menu`);
    ok(!errs.length, `${W}×${H} : aucune erreur ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Rangée défilante : tout est bon'); process.exit(bad ? 1 : 0);
})();
