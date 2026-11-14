// Vérifie la carte de campagne : aucun chevauchement entre nœuds, bulles, panneaux et avatar, en 375 et 390 px,
// pour plusieurs états de progression, et compte les bulles placées. Usage (serveur sur 8123) :
//   NODE_PATH=$(npm root -g) node tools/mapcheck.cjs
// vérifie les chevauchements sur la carte : bulles, nœuds, panneaux, avatar (rectangles à l'écran)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [vw, vh] of [[375, 667], [390, 844]]) for (const prog of [0, 2, 8, 14, 20]) {
    const p = await (await b.newContext({ viewport: { width: vw, height: vh } })).newPage();
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(500); await p.evaluate(async () => { const C = await import('./js/config.js'); window.__LV = () => C.LEVELS; });
    await p.evaluate((prog) => { localStorage.clear(); __ui.save.reset(); const d = __ui.save.data; d.settings.tutorialDone = true; for (let n = 1; n <= prog; n++) d.levels[n] = { stars: 2, best: 1, heroic: 0, heroicBest: 0 }; __ui.save.grantUnlocks(); __ui.show('world'); }, prog);
    await p.waitForTimeout(1800);
    const res = await p.evaluate((prog) => {

      const R = (e) => e.getBoundingClientRect(), items = [];
      document.querySelectorAll('#world-map .wsec').forEach((sec, si) => {
        sec.querySelectorAll('.node, .nbub, .ws-board, .avatar .av-in').forEach((e) => items.push({ k: e.className.split(' ')[0] + (e.dataset.n ? e.dataset.n : ''), r: R(e) }));
      });
      const bad = [];
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i].r, c = items[j].r, ov = Math.min(a.right, c.right) - Math.max(a.left, c.left), oh = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (ov > 3 && oh > 3) bad.push(items[i].k + ' x ' + items[j].k);
      }
      const W = innerWidth; for (const it of items) if (it.r.left < 0 || it.r.right > W) bad.push(it.k + ' sort');
      const want = [...document.querySelectorAll('#world-map .wsec:not(.locked) .node:not(.done)')].length; const sv = __ui.save, wd = sv.worldsDone(); const exp = __LV().filter((L) => L.world === wd && !sv.levelDone(L.n) && __ui.levelBubble(L)).map((L) => L.id); bad.push('bulles ' + document.querySelectorAll('#world-map .nbub').length + ' / attendu ' + exp.join(','));
      return bad;
    }, prog);
    console.log(vw, 'prog', prog, res.join(' | '));
    await p.close();
  }
  await b.close();
})();
