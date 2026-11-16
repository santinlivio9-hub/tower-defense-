// Menu radial pendant une vague chargée (kills en continu, vitesse x3) : 2 touchers sur une amélioration doivent la
// valider du premier coup, 10 fois de suite. Le doigt reste posé ~150 ms comme sur un vrai téléphone (le jeu tourne
// entre l'appui et le relâchement). Vérifie aussi que les boutons ne sont jamais recréés pendant que le menu est ouvert,
// et qu'un 2e toucher sans assez d'argent laisse le menu ouvert avec « Il manque X ».
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/radial-tap.cjs [port=8123]
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8123;
(async () => {
  const b = await chromium.launch(); let bad = 0;
  const ok = (c, m) => { if (!c) bad++; console.log((c ? 'ok  ' : 'KO  ') + m); };
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const cdp = await ctx.newCDPSession(p);
    // vrai toucher : doigt posé, attente, doigt levé
    const touch = async (x, y, hold = 150, beforeEnd = null) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await p.waitForTimeout(hold);
      if (beforeEnd) await beforeEnd();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(60);
    };
    const center = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, sel);
    await p.goto(`http://localhost:${PORT}/`); await p.waitForTimeout(700);
    await p.evaluate(() => { const sv = __ui.save, d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null; for (let n = 1; n <= 20; n++) d.levels[n] = { stars: 3, best: 10, heroic: 0, heroicBest: 0 }; d.seen.enemies = ['basic', 'fast', 'tank', 'flying', 'armored', 'splitter']; sv.grantUnlocks(); __ui.startGame(21, false, false, []); __ui.closeOverlay(); __ui.introOpen = false; });
    await p.waitForTimeout(300);
    // 10 tourelles niveau 1 ; vague chargée en continu ; kills et gains de pièces à chaque image
    const slots = await p.evaluate(() => {
      const g = __ui.game; g.money = 1e5; g.speed = 3; const out = [];
      for (const s of g.slots.filter((s) => s.kind === 'tower')) { if (out.length >= 10) break; if (g.placeTower('smg', s)) out.push(g.slots.indexOf(s)); }
      document.querySelectorAll('.tower-tip, #toasts > *').forEach((e) => e.remove());
      g.startNextWave(true);
      window.__feed = setInterval(() => { const g2 = __ui.game; if (!g2 || g2.over) return; if (g2.paused) { __ui.closeOverlay(); __ui.introOpen = false; g2.paused = false; } g2.lives = g2.maxLives; if (g2.enemies.length < 50) for (let k = 0; k < 6; k++) g2.spawnEnemy(['basic', 'fast'][k % 2], k % g2.paths.length, 20 + k * 30, 0.3); g2.money += 3; }, 100);
      return out;
    });
    let firstTry = 0, rebuilt = 0;
    for (const si of slots) {
      const lv0 = await p.evaluate((si) => { const g = __ui.game; __ui.openMenu(g.slots[si]); return g.slots[si].tower.level; }, si);
      await p.waitForTimeout(250);
      // compte les boutons recréés pendant que le menu est ouvert
      await p.evaluate(() => { window.__rbAdds = 0; window.__mo = new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('rb')) window.__rbAdds++; }); window.__mo.observe(document.querySelector('#radial'), { childList: true }); });
      const q = await center('#radial .rb.up');
      if (!q) { ok(false, `${W} : pas de bouton UP`); continue; }
      await touch(q.x, q.y);                 // 1er toucher : aperçu
      await p.waitForTimeout(400);           // l'argent change plusieurs fois entre les deux touchers
      // 2e toucher : validation (on compte les boutons recréés juste avant de lever le doigt)
      await touch(q.x, q.y, 150, async () => { rebuilt += await p.evaluate(() => { window.__mo.disconnect(); return window.__rbAdds; }); });
      const lv1 = await p.evaluate((si) => __ui.game.slots[si].tower.level, si);
      if (lv1 === lv0 + 1) firstTry++;
      await p.evaluate(() => __ui.openMenu(null));
    }
    ok(firstTry === slots.length && slots.length === 10, `${W}×${H} : ${firstTry}/${slots.length} améliorations validées du premier coup (2 touchers), vague chargée en x3`);
    ok(rebuilt === 0, `${W}×${H} : aucun bouton recréé entre le 1er et le 2e toucher (${rebuilt})`);
    // pas assez d'argent au 2e toucher : le menu reste ouvert, « Il manque X »
    const r = await p.evaluate(async () => {
      const g = __ui.game, sl = g.slots.find((s) => s.tower && s.tower.level === 2); __ui.openMenu(sl); await new Promise((res) => setTimeout(res, 200));
      const up = document.querySelector('#radial .rb.up'); const ev = (t) => up.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: 'touch' }));
      ev('pointerdown'); ev('pointerup'); await new Promise((res) => setTimeout(res, 100));
      g.money = 0; clearInterval(window.__feed); await new Promise((res) => setTimeout(res, 100));
      ev('pointerdown'); ev('pointerup'); await new Promise((res) => setTimeout(res, 100));
      return { open: !document.querySelector('#radial').hidden, same: document.querySelector('#radial .rb.up') === up, lv: sl.tower.level, txt: (document.querySelector('#radial .upp-ok') || {}).textContent || '', poor: up.classList.contains('poor') };
    });
    ok(r.open && r.same && r.lv === 2 && /Il manque/.test(r.txt) && r.poor, `${W}×${H} : sans argent au 2e toucher, menu ouvert et « ${r.txt} »`);
    ok(!errs.length, `${W}×${H} : aucune erreur ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Menu radial : tout est bon'); process.exit(bad ? 1 : 0);
})();
