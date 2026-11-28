// Performance et stabilité (Chromium, rendu réel) :
//   1. pire moment : boss + vague chargée + toutes les tourelles au niveau 5 + vitesse x3 : temps de calcul par image
//      (logique + dessin), images au-dessus de 16,7 ms, particules et textes à l'écran, cran de qualité automatique ;
//   2. mémoire : 10 niveaux enchaînés (victoire, écran de fin, niveau suivant) : tas JavaScript après ramasse-miettes ;
//   3. erreurs de console pendant tout le test.
// Captures (375 et 390 px) du pire moment si un dossier est donné.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/perf.cjs [dossier]
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? 'ok  ' : 'KO  ') + m); };
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: out ? 2 : 3, serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(700);
    // ---- pire moment : niveau 8-10, toutes les tourelles au niveau 5, boss + 60 brainrots, x3
    await p.evaluate(async () => {
      const C = await import('./js/config.js'), ui = __ui, sv = ui.save, d = sv.data;
      d.settings.tutorialDone = true; d.settings.muted = true; d.towers = [...C.TOWER_ORDER]; d.adminOpen = true; d.daily.popped = d.daily.day; d.notice = null; d.seen.enemies = Object.keys(C.ENEMIES);
      ui.startGame(80, false, false, []); ui.closeOverlay(); ui.introOpen = false;
      const g = __game; g.money = 1e7;
      const types = ['laser', 'tesla', 'plasma', 'drone', 'minigun', 'rocket', 'sniper', 'assault', 'smg', 'shotgun', 'cryo'];
      g.slots.filter((s) => s.kind === 'tower').forEach((s, i) => { const t = g.placeTower(types[i % types.length], s); if (!t) return; t.legendLocked = false; for (let k = 0; k < 4; k++) { const o = t.upgradeOptions().filter((u) => !u.locked)[k === 2 ? i % 2 : 0]; if (o) g.upgradeTower(t, o); } });
      g.slots.filter((s) => s.kind === 'mine').forEach((s) => g.placeTower('mine', s));
      g.god = true; g.wave = 26; g.cleared = 26; g._nextCache = null; g.startNextWave(false);   // dernière vague : boss + escorte
      // 120 brainrots très résistants (ils restent à l'écran pendant toute la mesure) + le boss
      for (let i = 0; i < 120; i++) g.delayed.push({ t: i * 0.06, fn: () => g.spawnEnemy(['basic', 'fast', 'splitter', 'glitch', 'astro', 'tank'][i % 6], i % g.paths.length, 0, 400) });
      g.delayed.push({ t: 0.5, fn: () => { for (const e of g.enemies) if (e.boss) { e.maxHp *= 20; e.hp = e.maxHp; } } });
      g.speed = 3; ui.syncSpeed();
      window.__perf = { work: [], gaps: [], last: performance.now() };
      const f0 = g.frame.bind(g);
      g.frame = (dt) => { const t0 = performance.now(); f0(dt); const P = window.__perf; P.work.push(performance.now() - t0); const now = performance.now(); P.gaps.push(now - P.last); P.last = now; };
    });
    await p.waitForTimeout(3000);
    await p.evaluate(() => { const P = window.__perf; P.work.length = 0; P.gaps.length = 0; });   // mesure une fois la foule à l'écran
    await p.waitForTimeout(8000);
    if (out) await p.screenshot({ path: `${out}/perf-pire-moment-${W}.png` });
    const r = await p.evaluate(() => {
      const P = window.__perf, g = __game, s = [...P.work].sort((a, c) => a - c), q = (k) => s[Math.floor(s.length * k)] || 0;
      const fx = g.fx, parts = ['p', 'tracers', 'rings', 'texts', 'coins'].reduce((a, k) => a + ((fx[k] && fx[k].length) || 0), 0);
      return { n: s.length, med: q(0.5), p95: q(0.95), max: s[s.length - 1], over16: s.filter((x) => x > 16.7).length / s.length, enemies: g.enemies.length, towers: g.towers.length, parts, texts: fx.texts.length, quality: __ui.quality || 0, boss: g.enemies.some((e) => e.boss) };
    });
    console.log(`${W}×${H} pire moment : ${r.towers} tourelles, ${r.enemies} ennemis${r.boss ? ' dont le boss' : ''}, ${r.parts} effets (${r.texts} textes) · calcul par image médian ${r.med.toFixed(1)} ms, 95 % ${r.p95.toFixed(1)} ms, max ${r.max.toFixed(1)} ms · ${(r.over16 * 100).toFixed(0)} % d'images > 16,7 ms · cran de qualité ${r.quality}`);
    ok(r.p95 < 16.7, `${W}×${H} : 95 % des images calculées en moins de 16,7 ms (machine de test, sans GPU)`);
    // ---- mémoire sur 10 niveaux enchaînés
    const cdp = await ctx.newCDPSession(p);
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const h = await cdp.send('Runtime.getHeapUsage'); return h.usedSize / 1e6; };
    const hs = [];
    for (let k = 0; k < 10; k++) {
      await p.evaluate((n) => { const ui = __ui; ui.closeOverlay(); ui.startGame(n, false, false, []); ui.closeOverlay(); ui.introOpen = false; const g = __game; g.money = 5000; for (const s of g.slots.filter((x) => x.kind === 'tower').slice(0, 6)) g.placeTower('assault', s); g.startNextWave(false); }, 1 + k * 7);
      await p.waitForTimeout(1500);
      await p.evaluate(() => __game.end(true)); await p.waitForTimeout(2600);
      await p.evaluate(() => { const b = document.querySelector('.es-skip'); if (b) b.click(); }); await p.waitForTimeout(400);
      hs.push(await heap());
    }
    console.log(`${W}×${H} mémoire après chaque niveau (Mo) : ${hs.map((h) => h.toFixed(1)).join(' · ')}`);
    ok(hs[9] - hs[1] < 8, `${W}×${H} : pas de fuite mémoire sur 10 niveaux (+${(hs[9] - hs[1]).toFixed(1)} Mo entre le 2e et le 10e)`);
    ok(errs.length === 0, `${W}×${H} : aucune erreur de console ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Performance et stabilité : tout est bon'); process.exit(bad ? 1 : 0);
})();
