// Mode admin (390×844) : accès caché (7 tapes sur le logo + PIN), console à onglets, actions principales, et surtout :
// la VRAIE sauvegarde (et ses copies de secours) est identique, octet pour octet, avant et après une session admin
// complète (tout débloquer, monnaies, horloge, partie avec ennemis lâchés, victoire, achat simulé, réinitialisation).
// Vérifie aussi que le mode admin est absent du build de production (www/) et quand ADMIN_ENABLED = false.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/admin-test.cjs [dossier de captures]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const out = process.argv[2], root = path.resolve(__dirname, '..');
const REAL = ['brainrot-bastion-save-v1', 'brainrot-bastion-save-v1-bak1', 'brainrot-bastion-save-v1-bak2', 'brainrot-bastion-save-v1-undo', 'brainrot-bastion-save-v1-broken'];
(async () => {
  const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? 'ok  ' : 'KO  ') + m); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: out ? 2 : 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  const shot = async (n) => { if (out) await p.screenshot({ path: `${out}/admin-${n}-390.png` }); };
  const safe = () => p.addStyleTag({ content: `:root{--safe-t:47px !important;--safe-b:34px !important}` });
  await p.goto('http://localhost:8123/'); await p.waitForTimeout(700);
  // une « vraie » partie en cours : quelques niveaux, des pièces, des succès, un record infini
  await p.evaluate(() => { const sv = __ui.save, d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null;
    d.coins = 4321; d.gems = 77; for (let k = 1; k <= 7; k++) d.levels[k] = { stars: 2, best: 900 + k, heroic: 0, heroicBest: 0 }; d.endless = [{ score: 12345, wave: 22, world: 0, t: 1 }]; d.ach.claimed = ['kills:0']; sv.grantUnlocks(); sv.persist(); });
  await p.reload(); await p.waitForTimeout(800); await safe();
  const snap = () => p.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])), REAL);
  const S0 = await snap();
  ok(!!S0[REAL[0]] && JSON.parse(S0[REAL[0]]).coins === 4321, 'vraie sauvegarde de départ en place');
  // ---------------------------------------------------------------- accès caché
  const tapLogo = async (n) => { const q = await p.evaluate(() => { const r = document.querySelector('#screen-menu.active .logo').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); for (let i = 0; i < n; i++) { await p.touchscreen.tap(q.x, q.y); await p.waitForTimeout(90); } };
  await tapLogo(5); await p.waitForTimeout(300);
  ok(!(await p.$('#adm-pin')), '5 tapes sur le logo : rien ne s\'ouvre');
  await tapLogo(2); await p.waitForTimeout(400);
  ok(!!(await p.$('#adm-pin')), '7 tapes sur le logo : demande du code PIN');
  const pin = async (code) => { for (const c of code) { await p.evaluate((c) => [...document.querySelectorAll('#adm-pin .pk')].find((b) => b.textContent === c).click(), c); await p.waitForTimeout(40); } };
  await pin('123456'); await p.waitForTimeout(250); await shot('pin');
  ok(!(await p.$('.adm-pin.enter')), 'mauvais code : refusé');
  await p.waitForTimeout(400); await pin('210707'); await p.waitForTimeout(400); await shot('entree');
  ok(!!(await p.$('.adm-pin.enter')), 'bon code : confirmation « Entrer en mode admin »');
  await Promise.all([p.waitForNavigation(), p.evaluate(() => document.querySelector('.adm-pin.enter .btn.primary').click())]);
  await p.waitForTimeout(1300); await safe(); await p.waitForTimeout(200);
  let st = await p.evaluate(() => ({ badge: !!document.querySelector('#adm-badge'), deck: !!document.querySelector('#adm-deck:not([hidden])'), coins: __ui.save.data.coins, flag: localStorage.getItem('brainrot-admin-on') }));
  ok(st.badge && st.deck && st.coins === 4321 && st.flag === '1', `mode admin : badge ADMIN, console ouverte, copie de la vraie partie (${st.coins} pièces)`);
  // ---------------------------------------------------------------- onglets
  const tab = async (id) => { await p.evaluate((id) => document.querySelector(`.adm-tab[data-tab="${id}"]`).click(), id); await p.waitForTimeout(250); };
  const over = () => p.evaluate(() => Math.max(0, ...[...document.querySelectorAll('#adm-deck *')].map((e) => { const q = e.getBoundingClientRect(); return q.width ? q.right - innerWidth : 0; })));
  const click = (txt, scope = '#adm-deck') => p.evaluate(([txt, scope]) => { const bt = [...document.querySelectorAll(scope + ' button')].find((b) => b.textContent.replace(/\s+/g, ' ').trim().startsWith(txt)); if (!bt) throw new Error('bouton absent : ' + txt); bt.scrollIntoView({ block: 'center' }); bt.click(); }, [txt, scope]);
  await tab('prog'); await shot('progression'); ok((await over()) <= 0.5, 'Progression : aucun débordement');
  await click('Débloquer tous les niveaux'); await click('Tout maxer'); await p.waitForTimeout(150);
  await p.evaluate(() => { [...document.querySelectorAll('#adm-deck .adm-row')].find((r) => r.textContent.startsWith('Pièces')).querySelector('button').click(); });
  await click('+100 000'); await click('Toutes les tourelles'); await click('Tous les skins'); await click('Tout le quotidien'); await click('+7 jours'); await click('Pass : tous les paliers');   // l'horloge avancée peut changer de saison : le pass est débloqué après
  st = await p.evaluate(() => { const sv = __ui.save, d = sv.data; return { prog: sv.progress(), lv80: sv.levelUnlocked(80), t: Object.values(d.talents).reduce((a, b) => a + b, 0), coins: d.coins, towers: d.towers.length, clock: Date.now() - performance.timeOrigin - performance.now(), pass: sv.passTier(), premium: d.pass.premium }; });
  ok(st.prog === 80 && st.lv80 && st.t > 30 && st.coins >= 100000 && st.towers >= 12 && st.pass === 30 && st.premium && st.clock > 6.9 * 86400000, `actions : 80 niveaux, talents ${st.t} points, ${st.coins} pièces, pass palier ${st.pass} premium, horloge +${Math.round(st.clock / 3600000)} h`);
  await p.evaluate(() => { document.querySelector('.adm-body').scrollTop = 0; }); await shot('progression-actions');
  await tab('best'); await shot('bestiaire'); ok((await over()) <= 0.5, 'Bestiaire : aucun débordement');
  const be = await p.evaluate(() => ({ n: document.querySelectorAll('.ae-cell').length, st: document.querySelector('.ae-stats').textContent }));
  ok(be.n === 26 && /PV/.test(be.st) && /Blindage/.test(be.st), `Bestiaire : ${be.n} fiches avec PV, vitesse, blindage, récompense`);
  await p.evaluate(() => { [...document.querySelectorAll('.ae-cell')].find((c) => c.textContent.includes('Tricheco')).click(); }); await p.waitForTimeout(200);
  await p.evaluate(() => { const s = document.querySelector('#adm-deck .adm-sel'); s.value = '3'; s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(200);
  await click('Mort'); await p.waitForTimeout(250); await shot('bestiaire-boss');
  const mut = await p.evaluate(() => document.querySelector('.ae-id small').textContent + ' | ' + document.querySelector('.ae-sp').textContent);
  ok(/muté III/.test(mut) && /Invoque/.test(mut) && /boss du monde 1/.test(mut), `fiche du boss muté : ${mut.slice(0, 90)}`);
  await tab('game'); await shot('partie-hors-jeu'); ok((await over()) <= 0.5, 'Partie : aucun débordement');
  await tab('tools'); await shot('outils'); ok((await over()) <= 0.5, 'Outils : aucun débordement');
  const ex = await p.evaluate(() => document.querySelector('.adm-ta').value); ok(ex.startsWith('BRAINROT1:') && ex.length > 200, 'export de la sauvegarde (texte copiable)');
  // ---------------------------------------------------------------- en partie
  await tab('prog');
  await p.evaluate(() => { const s = [...document.querySelectorAll('#adm-deck .adm-row')].find((r) => r.textContent.startsWith('Monde')).querySelector('select'); s.value = '2'; s.dispatchEvent(new Event('change')); });
  await click('Normal'); await p.waitForTimeout(1200);
  await p.evaluate(() => { __ui.closeOverlay(); __ui.introOpen = false; });
  st = await p.evaluate(() => ({ scr: __ui.screen, w: __ui.game && __ui.game.level.world }));
  ok(st.scr === 'game' && st.w === 2, 'Jouer un niveau : partie lancée dans le monde 3');
  await p.evaluate(() => document.querySelector('#adm-badge').click()); await p.waitForTimeout(400); await tab('game');
  for (const t of ['Argent infini', 'Château invincible', 'Hitbox, portées', 'FPS et nombre']) await p.evaluate((t) => [...document.querySelectorAll('#adm-deck .adm-row')].find((r) => r.textContent.startsWith(t)).querySelector('.switch').click(), t);
  await click('x5'); await p.waitForTimeout(200); await shot('partie');
  await tab('best'); await p.evaluate(() => { [...document.querySelectorAll('.ae-cell')].find((c) => c.textContent.includes('Lumaca')).click(); }); await p.waitForTimeout(200);
  await click('Lâcher'); await p.waitForTimeout(2500);
  st = await p.evaluate(() => { const g = __ui.game; return { n: g.enemies.length, money: g.money, god: g.god, sp: g.adminSpeed, fps: document.querySelector('#adm-fps') && document.querySelector('#adm-fps').textContent }; });
  await shot('partie-debug');
  ok(st.n >= 3 && st.money >= 99999 && st.god && st.sp === 5 && /FPS/.test(st.fps || ''), `en jeu : ${st.n} ennemis lâchés, argent infini, God Mode, x5, compteur « ${(st.fps || '').slice(0, 40)} »`);
  await p.evaluate(() => { const g = __ui.game; for (const e of g.enemies) g.leak(e); }); st = await p.evaluate(() => __ui.game.lives === __ui.game.maxLives);
  ok(st, 'God Mode : le château ne perd aucun PV');
  await p.evaluate(() => document.querySelector('#adm-badge').click()); await p.waitForTimeout(300); await tab('game');
  await click('Gagner le niveau'); await p.waitForTimeout(2500);
  st = await p.evaluate(() => ({ over: __ui.game && __ui.game.over, win: __ui.game && __ui.game.result && __ui.game.result.victory }));
  ok(st.over && st.win, 'Gagner le niveau : victoire instantanée');
  // achat simulé : jamais de vrai paiement, crédité dans la copie seulement
  await p.evaluate(() => { __ui.quitGame('menu'); }); await p.waitForTimeout(500);
  await p.evaluate(() => { __ui.save.data.pass.premium = false; document.querySelector('#adm-badge').click(); }); await p.waitForTimeout(300); await tab('tools');
  await click('Pass premium'); await p.waitForTimeout(700);
  st = await p.evaluate(() => document.querySelector('.fakead small').textContent); ok(/mode admin/.test(st), `boîte d'achat fictif : « ${st} »`);
  await p.evaluate(() => document.querySelector('.fakead .fa-yes').click()); await p.waitForTimeout(600);
  st = await p.evaluate(() => __ui.save.data.pass.premium); ok(st === true, 'pass premium : achat simulé, crédité dans la copie');
  // réinitialisation de la copie (double confirmation)
  await p.evaluate(() => document.querySelector('#adm-badge').click()); await p.waitForTimeout(300); await tab('tools');
  await click('Réinitialiser la copie'); st = await p.evaluate(() => __ui.save.data.coins); ok(st > 1000, '1re confirmation : rien n\'est effacé');
  await click('Sûr ?'); await click('Dernière confirmation'); st = await p.evaluate(() => __ui.save.progress()); ok(st === 0, 'réinitialisation de la copie après double confirmation');
  // ---------------------------------------------------------------- retour à la vraie partie
  await Promise.all([p.waitForNavigation(), click('Revenir à ma vraie partie')]);
  await p.waitForTimeout(1200);
  const S1 = await snap();
  st = await p.evaluate(() => ({ badge: !!document.querySelector('#adm-badge'), coins: __ui.save.data.coins, keys: Object.keys(localStorage).filter((k) => /admin/.test(k)), now: Math.abs(Date.now() - (performance.timeOrigin + performance.now())) }));
  ok(!st.badge && st.coins === 4321 && !st.keys.length && st.now < 5000, `retour : vraie partie rechargée (${st.coins} pièces), aucune clé admin restante, horloge normale`);
  const diff = REAL.filter((k) => S0[k] !== S1[k]);
  ok(diff.length === 0, `vraie sauvegarde IDENTIQUE avant et après la session admin (${REAL.length} clés comparées${diff.length ? ', différences : ' + diff.join(', ') : ''})`);
  ok(errs.length === 0, `aucune erreur ${errs.join(' | ')}`);
  // ---------------------------------------------------------------- mode admin désactivé (stores)
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' }), p2 = await ctx2.newPage();   // sans service worker : config.js modifié à la volée
  await p2.route('**/js/config.js', async (route) => { const r = await route.fetch(); const body = (await r.text()).replace('export const ADMIN_ENABLED = true;', 'export const ADMIN_ENABLED = false;'); route.fulfill({ response: r, body }); });
  await p2.goto('http://localhost:8123/'); await p2.waitForTimeout(800);
  await p2.evaluate(() => localStorage.setItem('brainrot-admin-on', '1')); await p2.reload(); await p2.waitForTimeout(800);
  const q = await p2.evaluate(() => { const r = document.querySelector('#screen-menu.active .logo').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  for (let i = 0; i < 8; i++) { await p2.touchscreen.tap(q.x, q.y); await p2.waitForTimeout(90); }
  await p2.waitForTimeout(400);
  st = await p2.evaluate(() => ({ pin: !!document.querySelector('#adm-pin'), badge: !!document.querySelector('#adm-badge'), real: !!localStorage.getItem('brainrot-bastion-save-v1') }));
  ok(!st.pin && !st.badge, 'ADMIN_ENABLED = false : aucun accès (ni PIN, ni badge, même avec le drapeau admin forcé)');
  await p2.evaluate(() => localStorage.removeItem('brainrot-admin-on'));
  await b.close();
  // ---------------------------------------------------------------- build Capacitor
  execFileSync('node', [path.join(root, 'tools/build-www.cjs')], { stdio: 'pipe' });
  const prod = fs.readFileSync(path.join(root, 'www/js/config.js'), 'utf8');
  execFileSync('node', [path.join(root, 'tools/build-www.cjs'), '--test'], { stdio: 'pipe' });
  const test = fs.readFileSync(path.join(root, 'www/js/config.js'), 'utf8');
  execFileSync('node', [path.join(root, 'tools/build-www.cjs')], { stdio: 'pipe' });   // www/ laissé en version de production
  ok(/ADMIN_ENABLED = false;/.test(prod) && /ADMIN_ENABLED = true;/.test(test), 'build Capacitor : admin coupé en production, disponible en build de test');
  console.log(bad ? `${bad} problème(s)` : 'Mode admin : tout est bon'); process.exit(bad ? 1 : 0);
})();
