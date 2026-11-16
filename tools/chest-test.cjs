// Ouverture des coffres (bois, doré, légendaire) en 375×667 et 390×844 : après l'explosion, toutes les cartes sont
// visibles dans l'écran, au-dessus des rayons (rien ne les recouvre), et la consigne « Touche les cartes… »
// n'apparaît qu'une fois les cartes posées. Toutes les cartes se retournent, puis le récapitulatif s'affiche.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/chest-test.cjs [dossier de captures]
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); let bad = 0;
  const ok = (c, m) => { if (!c) bad++; console.log((c ? 'ok  ' : 'KO  ') + m); };
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: out ? 2 : 1 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(700);
    if (H > 700) await p.addStyleTag({ content: `:root{--safe-t:47px !important;--safe-b:34px !important}` });
    await p.evaluate(() => { const d = __ui.save.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null; __ui.show('shop'); });
    for (const kind of ['wood', 'gold', 'legend']) {
      await p.evaluate((k) => { __ui.save.data.chests[k] = 1; __ui.openChest(k); }, kind);
      await p.waitForTimeout(900);
      for (let i = 0; i < 3; i++) { await p.click('#overlay .chest-stage .chest', { force: true }); await p.waitForTimeout(250); }
      await p.waitForTimeout(800);   // explosion (700 ms) puis début du jaillissement
      const early = await p.evaluate(() => document.querySelector('#overlay .chest-stage .tap').textContent);
      await p.waitForTimeout(1300);  // cartes posées
      const st = await p.evaluate(() => {
        const cards = [...document.querySelectorAll('#overlay .fan .lcard')], rays = document.querySelector('#overlay .chest-stage .rays');
        const zr = +getComputedStyle(rays).zIndex || 0;
        return { n: cards.length, tap: document.querySelector('#overlay .chest-stage .tap').textContent, cards: cards.map((c) => { const q = c.getBoundingClientRect(), cs = getComputedStyle(c), fan = getComputedStyle(c.parentElement); const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { in: q.left >= 0 && q.right <= innerWidth && q.top >= 0 && q.bottom <= innerHeight && q.width > 40, vis: cs.visibility === 'visible' && fan.visibility === 'visible' && +fan.opacity > 0.9 && +cs.opacity > 0.9, onTop: !!top && !!top.closest('.lcard') && top.closest('.lcard') === c }; }) };
      });
      if (out) await p.screenshot({ path: `${out}/coffre-${kind}-${W}.png` });
      const allOk = st.n > 0 && st.cards.every((c) => c.in && c.vis && c.onTop);
      ok(allOk, `${W}×${H} coffre ${kind} : ${st.n} cartes, toutes visibles, dans l'écran et au premier plan ${allOk ? '' : JSON.stringify(st.cards)}`);
      ok(!early && /Touche les cartes/.test(st.tap), `${W}×${H} coffre ${kind} : consigne absente pendant le jaillissement, affichée une fois les cartes posées`);
      for (let i = 0; i < st.n; i++) { await p.click(`#overlay .fan .lcard:nth-child(${i + 1})`, { force: true }); await p.waitForTimeout(260); }
      await p.waitForTimeout(1200);
      const end = await p.evaluate(() => ({ flipped: document.querySelectorAll('#overlay .fan .lcard.flip').length, recap: !!document.querySelector('#overlay .recap.show') }));
      if (out) await p.screenshot({ path: `${out}/coffre-${kind}-${W}-fin.png` });
      ok(end.flipped === st.n && end.recap, `${W}×${H} coffre ${kind} : ${end.flipped}/${st.n} cartes retournées, récapitulatif affiché`);
      await p.evaluate(() => __ui.closeOverlay()); await p.waitForTimeout(300);
    }
    ok(!errs.length, `${W}×${H} : aucune erreur ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Coffres : tout est bon'); process.exit(bad ? 1 : 0);
})();
