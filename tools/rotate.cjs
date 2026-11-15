// Téléphone tourné en paysage pendant une partie : écran « Tourne ton téléphone », partie en pause, son coupé,
// mise en page de portrait inchangée ; au retour en portrait, la partie reprend sans perte.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/rotate.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let bad = 0;
  const ok = (c, m) => { if (!c) bad++; console.log((c ? 'ok  ' : 'KO  ') + m); };
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(700);
    await p.evaluate(() => { const sv = __ui.save, d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null; for (let n = 1; n <= 9; n++) d.levels[n] = { stars: 3, best: 10, heroic: 0, heroicBest: 0 }; d.seen.enemies = ['basic', 'fast', 'tank', 'flying']; sv.grantUnlocks(); __ui.startGame(9, false, false, []); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { __ui.closeOverlay(); __ui.introOpen = false; const g = __ui.game; g.paused = false; g.startNextWave(true); });
    await p.waitForTimeout(1500);
    const before = await p.evaluate(() => ({ view: JSON.stringify(__ui.view), money: __ui.game.money, wave: __ui.game.wave }));
    await p.setViewportSize({ width: H, height: W }); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ paused: __ui.game.paused, shown: getComputedStyle(document.querySelector('#rotate')).display, app: document.querySelector('#app').offsetWidth, t: __ui.game.time, hold: __ui.audio.hold }));
    await p.waitForTimeout(500);
    const t2 = await p.evaluate(() => __ui.game.time);
    ok(r.shown === 'grid' && r.paused && r.hold && r.app === W && r.t === t2, `${W}×${H} paysage : écran de rotation, partie en pause, son retenu, mise en page de portrait gardée`);
    await p.setViewportSize({ width: W, height: H }); await p.waitForTimeout(500);
    const a = await p.evaluate(() => ({ paused: __ui.game.paused, shown: getComputedStyle(document.querySelector('#rotate')).display, view: JSON.stringify(__ui.view), wave: __ui.game.wave, hold: __ui.audio.hold }));
    ok(a.shown === 'none' && !a.paused && !a.hold && a.view === before.view && a.wave === before.wave, `${W}×${H} retour en portrait : la partie reprend, tout est intact`);
    // pause manuelle pendant le paysage : elle reste en pause au retour
    await p.setViewportSize({ width: H, height: W }); await p.waitForTimeout(300);
    await p.evaluate(() => { __ui.game.paused = false; __ui.togglePause(); });
    await p.setViewportSize({ width: W, height: H }); await p.waitForTimeout(300);
    ok(await p.evaluate(() => __ui.game.paused && !!document.querySelector('#overlay.show .pause')), `${W}×${H} menu Pause ouvert entre-temps : la partie reste en pause`);
    ok(!errs.length, `${W}×${H} aucune erreur ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Rotation : tout est bon'); process.exit(bad ? 1 : 0);
})();
