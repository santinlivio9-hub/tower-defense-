// Monétisation (version web simulée) en 375×667 et 390×844 :
//  - Boutique → Gemmes : packs affichés, achat fictif crédité, « Sans pubs » marqué acheté ;
//  - pub récompensée factice (3 s) : récompense seulement si on la regarde jusqu'au bout ; plafond de 10 par jour ;
//  - fin de niveau : « Doubler les pièces » ; défaite : réanimation proposée une fois par partie ;
//  - Paramètres : « Restaurer mes achats » et lien vers la politique de confidentialité.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/monetization-test.cjs [dossier de captures]
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
    await p.evaluate(() => { const d = __ui.save.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null; d.gems = 10; d.iap = { owned: [], orders: [] }; d.ads = { day: '', n: 0 }; __ui.closeOverlay(); __ui.shopTab = 'gems'; __ui.show('shop'); });
    await p.waitForTimeout(500); await shot('boutique-gemmes');
    const n = await p.evaluate(() => document.querySelectorAll('.iap').length);
    ok(n === 5, `${W}×${H} : boutique Gemmes, ${n} offres (démarrage, 3 packs, Sans pubs)`);
    await p.click('.iap:nth-child(2) .btn'); await p.waitForTimeout(300); await shot('achat-fictif');
    await p.click('.fakead .fa-yes'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => __ui.save.data.gems === 90), `${W}×${H} : achat fictif de 80 gemmes crédité`);
    // pub factice : fermée avant la fin = pas de récompense ; regardée = récompense
    let r = p.evaluate(() => __ui.mon.showRewardedAd('test')); await p.waitForTimeout(800); await shot('pub-factice'); await p.click('.fakead .fa-close'); r = await r;
    ok(r === false && await p.evaluate(() => __ui.mon.adsLeft() === 10), `${W}×${H} : pub fermée avant la fin, pas de récompense ni de pub comptée`);
    r = await p.evaluate(() => __ui.mon.showRewardedAd('test'));
    ok(r === true && await p.evaluate(() => __ui.mon.adsLeft() === 9), `${W}×${H} : pub regardée 3 s, récompense et 9 pubs restantes`);
    await p.evaluate(() => { __ui.save.data.ads.n = 10; }); ok(await p.evaluate(async () => (await __ui.mon.showRewardedAd('x')) === false), `${W}×${H} : plafond de 10 pubs par jour respecté`);
    // fin de niveau : doubler les pièces (avec « Sans pubs » : gratuit, sans pub)
    await p.evaluate(() => { const d = __ui.save.data; d.ads.n = 0; d.iap.owned.push('remove_ads'); });
    await p.evaluate(() => { const sv = __ui.save, d = sv.data; for (let k = 1; k < 3; k++) d.levels[k] = { stars: 3, best: 10, heroic: 0, heroicBest: 0 }; __ui.startGame(3, false, false, []); __ui.closeOverlay(); __ui.introOpen = false; __ui.game.end(true); });
    // séquence de fin : « Passer » jusqu'à l'écran final
    for (let k = 0; k < 20 && !(await p.evaluate(() => !!document.querySelector('.es-main'))); k++) { await p.waitForTimeout(600); if (await p.$('#overlay.show .es-skip')) await p.click('#overlay.show .es-skip', { force: true }).catch(() => {}); }
    await p.waitForTimeout(600);
    await shot('fin-doubler');
    const c0 = await p.evaluate(() => __ui.save.data.coins);
    const dbl = await p.evaluate(async () => { const b = document.querySelector('.es-main .adbtn'); if (!b) return null; b.click(); await new Promise((r) => setTimeout(r, 300)); return { txt: document.querySelector('.es-main .owned') && document.querySelector('.es-main .owned').textContent }; });
    const c1 = await p.evaluate(() => __ui.save.data.coins);
    ok(dbl && c1 > c0 && /doublées/.test(dbl.txt || ''), `${W}×${H} : fin de niveau, pièces doublées (${c0} -> ${c1}) sans pub grâce à « Sans pubs »`);
    // défaite : offre de réanimation (une fois)
    await p.evaluate(() => { const d = __ui.save.data; d.iap.owned = []; d.boosts.revive = 0; __ui.clearGame && __ui.clearGame(); __ui.startGame(3, false, false, []); __ui.closeOverlay(); __ui.introOpen = false; const g = __ui.game; g.loadout = []; g.boosts = []; g.lives = 1; g.leak({ leakDmg: 5, type: 'basic', boss: false, x: 0, y: 0, cfg: {} }); });
    await p.waitForTimeout(700); await shot('reanimation');
    const offer = await p.evaluate(() => ({ shown: !!document.querySelector('.revive-ask'), wait: __ui.game.awaitRevive }));
    ok(offer.shown && offer.wait, `${W}×${H} : défaite, réanimation proposée (partie en attente)`);
    await p.evaluate(() => document.querySelector('.revive-ask .adbtn').click()); await p.waitForTimeout(3600);
    const rv = await p.evaluate(() => ({ lives: __ui.game.lives, over: __ui.game.over, used: __ui.game.adRevived }));
    ok(rv.lives > 0 && !rv.over && rv.used, `${W}×${H} : pub regardée, château réanimé (${rv.lives} PV)`);
    // paramètres
    await p.evaluate(() => { __ui.quitGame ? __ui.quitGame('menu') : null; __ui.closeOverlay(); __ui.show('settings'); }); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#settings-content').lastElementChild.scrollIntoView()); await p.waitForTimeout(200); await shot('parametres');
    const st = await p.evaluate(() => ({ restore: /Restaurer mes achats/.test(document.querySelector('#settings-content').textContent), link: !!document.querySelector('#settings-content a[href="privacy.html"]') }));
    ok(st.restore && st.link, `${W}×${H} : Paramètres, « Restaurer mes achats » et lien Confidentialité`);
    const over = await p.evaluate(() => Math.max(0, ...[...document.querySelectorAll('#settings-content *')].map((e) => e.getBoundingClientRect().right - innerWidth)));
    ok(over <= 0.5, `${W}×${H} : aucun débordement (${over})`);
    ok(!errs.length, `${W}×${H} : aucune erreur ${errs.join(' | ')}`);
    await ctx.close();
  }
  const pp = await b.newPage({ viewport: { width: 390, height: 844 } }); await pp.goto('http://localhost:8123/privacy.html');
  ok(/Politique de confidentialité/.test(await pp.textContent('h1')), 'privacy.html : page lisible');
  if (out) await pp.screenshot({ path: `${out}/privacy-390.png`, fullPage: false });
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Monétisation : tout est bon'); process.exit(bad ? 1 : 0);
})();
