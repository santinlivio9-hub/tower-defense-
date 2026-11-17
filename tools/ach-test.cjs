// Succès (375×667 et 390×844) : onglet Collection > Succès par catégories, compteur global, paliers bronze / argent /
// or, bouton « Récupérer » (récompense donnée une fois), notification discrète en partie, aucun débordement.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/ach-test.cjs [dossier de captures]
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? 'ok  ' : 'KO  ') + m); };
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: out ? 2 : 1 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(700);
    if (H > 700) await p.addStyleTag({ content: `:root{--safe-t:47px !important;--safe-b:34px !important}` });
    const shot = async (n) => { if (out) await p.screenshot({ path: `${out}/${n}-${W}.png` }); };
    await p.evaluate(() => { const sv = __ui.save, d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null;
      for (let k = 1; k < 25; k++) d.levels[k] = { stars: 3, best: 10, heroic: 0, heroicBest: 0 }; sv.grantUnlocks();
      Object.assign(d.stats, { kills: 12500, bossKills: 2, legendaries: 3, bestCombo: 30, chests: 7, perfectWins: 4 }); d.stats.maxed = ['assault', 'sniper']; d.ach = { claimed: ['kills:0'], seen: [] };
      __ui.closeOverlay(); __ui.colTab = 'achievements'; __ui.show('collection'); });
    await p.waitForTimeout(600); await shot('succes');
    const st = await p.evaluate(() => ({ cats: document.querySelectorAll('.ach-cat').length, rows: document.querySelectorAll('.ach').length, ready: document.querySelectorAll('.ach.ready').length, count: document.querySelector('#col-count').textContent.trim(), sum: document.querySelector('.ach-sum b').textContent }));
    ok(st.cats === 8 && st.rows >= 25 && st.ready >= 5 && /\/5\d$/.test(st.count), `${W}×${H} : ${st.cats} catégories, ${st.rows} succès, ${st.ready} à récupérer, compteur ${st.count}`);
    const over = await p.evaluate(() => Math.max(0, ...[...document.querySelectorAll('#col-content *')].map((e) => e.getBoundingClientRect().right - innerWidth)));
    ok(over <= 0.5, `${W}×${H} : aucun débordement (${over})`);
    const g0 = await p.evaluate(() => ({ gems: __ui.save.data.gems, coins: __ui.save.data.coins, n: __ui.save.data.ach.claimed.length }));
    await p.evaluate(() => document.querySelector('.ach.ready .btn').click()); await p.waitForTimeout(250); await shot('succes-recuperer'); await p.waitForTimeout(700);
    const g1 = await p.evaluate(() => ({ gems: __ui.save.data.gems, coins: __ui.save.data.coins, n: __ui.save.data.ach.claimed.length }));
    ok(g1.n === g0.n + 1 && (g1.gems > g0.gems || g1.coins > g0.coins), `${W}×${H} : « Récupérer » donne la récompense une fois (${g0.coins} -> ${g1.coins} pièces, ${g0.gems} -> ${g1.gems} gemmes)`);
    // notification discrète en partie : un succès atteint pendant la partie
    await p.evaluate(() => { const d = __ui.save.data; d.stats.kills = 9995; d.ach.seen = __ui.save.achievementSteps().map((x) => x.key); __ui.startGame(5, false, false, []); __ui.closeOverlay(); __ui.introOpen = false; __ui.game.stats.kills = 10; document.querySelectorAll('#toasts > *').forEach((e) => e.remove()); });
    let t = '';
    for (let k = 0; k < 30 && !/Succès/.test(t); k++) { await p.waitForTimeout(100); t = await p.evaluate(() => [...document.querySelectorAll('#toasts > *')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' | ')); }
    await shot('succes-en-jeu');
    ok(/Succès : Exterminateur · Argent/.test(t), `${W}×${H} : notification en partie (« ${t.slice(0, 60)} »)`);
    ok(!errs.length, `${W}×${H} : aucune erreur ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Succès : tout est bon'); process.exit(bad ? 1 : 0);
})();
