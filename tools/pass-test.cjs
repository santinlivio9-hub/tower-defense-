// Pass de saison (375×667 et 390×844) : piste gratuite et premium en parallèle, achat simulé du premium (paliers déjà
// atteints débloqués), missions de la semaine, profil (cadre, titre, effet), changement de saison avec récompenses
// non récupérées données automatiquement, aucun débordement.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/pass-test.cjs [dossier de captures]
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
    const over = () => p.evaluate(() => Math.max(0, ...[...document.querySelectorAll('#overlay .panel > *:not(.ss-track)')].map((e) => e.getBoundingClientRect().right - innerWidth)));
    await p.evaluate(async () => { const C = await import('/js/config.js'); const sv = __ui.save, d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null; d.level = 18;
      d.pass = { pts: C.PASS.perTier * 12 + 400, claimed: [1, 2, 3], season: C.seasonOf(), premium: false, pclaimed: [], mweek: '', missions: [] }; d.iap = { owned: [], orders: [] }; __ui.closeOverlay(); __ui.show('menu'); __ui.openDaily('pass'); });
    await p.waitForTimeout(700); await shot('pass');
    const st = await p.evaluate(() => ({ cols: document.querySelectorAll('#overlay .ss-col:not(.ss-lab)').length, prem: document.querySelectorAll('#overlay .ss-cell.prem').length, shut: document.querySelectorAll('#overlay .ss-cell.prem.shut').length, buy: !!document.querySelector('#overlay .ss-buy'), best: document.querySelectorAll('#overlay .ss-b').length, miss: document.querySelectorAll('#overlay .ss-m').length }));
    ok(st.cols === 30 && st.prem === 30 && st.shut === 30 && st.buy && st.best === 4 && st.miss === 3, `${W}×${H} : 30 paliers × 2 pistes, premium verrouillée, bouton d'achat, 4 récompenses phares, 3 missions`);
    ok((await over()) <= 0.5, `${W}×${H} : aucun débordement`);
    await p.evaluate(() => document.querySelector('#overlay .ss-cell.prem').click()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => __ui.save.data.pass.pclaimed.length === 0), `${W}×${H} : palier premium refusé sans le pass`);
    await p.click('#overlay .ss-buy'); await p.waitForTimeout(300); await shot('pass-achat'); await p.click('.fakead .fa-yes'); await p.waitForTimeout(900);
    const pr = await p.evaluate(() => ({ premium: __ui.save.data.pass.premium, ready: __ui.save.premiumReady(), shut: document.querySelectorAll('#overlay .ss-cell.prem.shut').length }));
    ok(pr.premium && pr.ready === 12 && pr.shut === 0, `${W}×${H} : achat simulé, 12 paliers premium déjà atteints débloqués`);
    await shot('pass-premium');
    const g0 = await p.evaluate(() => __ui.save.data.gems);
    await p.evaluate(() => [...document.querySelectorAll('#overlay .btn.cta')].find((e) => /Tout récupérer/.test(e.textContent)).click()); await p.waitForTimeout(1200);
    const after = await p.evaluate(() => ({ gems: __ui.save.data.gems, frames: __ui.save.data.profile.frames, pc: __ui.save.data.pass.pclaimed.length, c: __ui.save.data.pass.claimed.length }));
    ok(after.pc === 12 && after.c === 12 && after.gems > g0 && after.frames.length === 2, `${W}×${H} : tout récupéré (gratuit 12, premium 12, cadre de saison gagné au palier 10)`);
    // missions
    await p.evaluate(() => { const sv = __ui.save; sv.seasonMissions()[0].prog = 1e6; __ui.openDaily('pass'); }); await p.waitForTimeout(500);
    const pts0 = await p.evaluate(() => __ui.save.data.pass.pts);
    await p.evaluate(() => document.querySelector('#overlay .ss-m.ready .btn').click()); await p.waitForTimeout(400);
    ok(await p.evaluate((x) => __ui.save.data.pass.pts > x, pts0), `${W}×${H} : mission de la semaine terminée, points de pass gagnés`);
    // profil
    await p.evaluate(() => { __ui.closeOverlay(); document.querySelector('#resbar .res-xp').click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => [...document.querySelectorAll('#overlay .pf-item')].find((e) => !e.classList.contains('locked') && !e.classList.contains('on')).click()); await p.waitForTimeout(400);
    await shot('profil');
    ok(await p.evaluate(() => __ui.save.data.profile.frame !== 'none' && document.querySelector('#resbar .lvl').classList.contains('framed')), `${W}×${H} : profil, cadre équipé autour du badge de niveau`);
    ok((await over()) <= 0.5, `${W}×${H} : profil sans débordement`);
    // changement de saison : récompenses non récupérées données automatiquement
    const r = await p.evaluate(async () => { const C = await import('/js/config.js'); const sv = __ui.save, d = sv.data; d.pass.pts = C.PASS.perTier * 20; const g = d.gems; const res = sv.seasonTick(C.seasonEnd(d.pass.season) + 1000); return { res, gems: d.gems - g, pts: d.pass.pts, prem: d.pass.premium, season: d.pass.season, notice: !!d.seasonNotice }; });
    ok(r.res && r.res.count > 0 && r.gems > 0 && r.pts === 0 && !r.prem && r.notice, `${W}×${H} : fin de saison, ${r.res && r.res.count} récompenses données automatiquement, nouvelle saison remise à zéro`);
    ok(!errs.length, `${W}×${H} : aucune erreur ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Pass de saison : tout est bon'); process.exit(bad ? 1 : 0);
})();
