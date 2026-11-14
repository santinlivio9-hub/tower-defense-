// Vérifie que rien ne sort de l'écran : barre du bas du jeu, bouton de vague, vitesse, barre d'onglets.
// 375×667, 390×844, 430×932, en mode navigateur et installé, safe-areas simulées (47 px en haut, 34 px en bas).
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/layout.cjs [dossier de captures]
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [W, H] of [[375, 667], [390, 844], [430, 932]]) for (const standalone of [false, true]) {
    const notch = H > 700;   // les petits iPhone n'ont pas d'encoche
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    if (standalone) await ctx.addInitScript(() => { window.__standalone = true; });
    const p = await ctx.newPage(); p.on('pageerror', (e) => { bad++; console.log('ERREUR', e.message); });
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(700);
    if (notch) await p.addStyleTag({ content: `:root{--safe-t:47px !important;--safe-b:${standalone ? 34 : 0}px !important}` });
    await p.evaluate(() => { const d = __ui.save.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null; Object.assign(d.castle, { air: 1, blizzard: 1, gold: 1 }); for (let n = 1; n <= 7; n++) d.levels[n] = { stars: 2, best: 10, heroic: 0, heroicBest: 0 }; __ui.save.grantUnlocks(); __ui.show('menu'); });
    await p.waitForTimeout(500);
    const tag = `${W}x${H}-${standalone ? 'installe' : 'navigateur'}`;
    const check = async (label, ids) => {
      const r = await p.evaluate((ids) => ids.map((id) => { const e = document.querySelector(id), q = e.getBoundingClientRect(); return { id, top: Math.round(q.top), bottom: Math.round(q.bottom), left: Math.round(q.left), right: Math.round(q.right), h: Math.round(q.height) }; }), ids);
      for (const q of r) { const ok = q.h > 0 && q.top >= 0 && q.bottom <= H && q.left >= 0 && q.right <= W; if (!ok) bad++; console.log(`${ok ? 'ok ' : 'KO '} ${tag} ${label} ${q.id} : ${q.top} → ${q.bottom} / ${H}`); }
      if (out) await p.screenshot({ path: `${out}/${tag}-${label}.png` });
    };
    await check('accueil', ['#tabbar', '#btn-play']);
    await p.evaluate(() => __ui.startGame(7, false, false, __ui.loadoutFor(window.__lv || { boss: false })));
    await p.waitForTimeout(700);
    await check('jeu', ['#dock', '#btn-wave', '#btn-speed', '#hud', '#abilities']);
    const v = await p.evaluate(() => { const f = document.querySelector('#field').getBoundingClientRect(), v = __ui.view, c = document.querySelector('#game'); return { field: [Math.round(f.top), Math.round(f.bottom)], terrain: [Math.round(v.oy), Math.round(v.oy + 940 * v.s)], canvas: [c.clientWidth, c.clientHeight, c.width, c.height] }; });
    const fits = v.terrain[0] >= v.field[0] - 1 && v.terrain[1] <= v.field[1] + 1; if (!fits) bad++;
    console.log(`${fits ? 'ok ' : 'KO '} ${tag} terrain ${v.terrain.join(' → ')} dans la zone ${v.field.join(' → ')} ; canvas ${v.canvas.join(' ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Tout tient dans l\'écran'); process.exit(bad ? 1 : 0);
})();
