// Barre de choix des tourelles (375×667 et 390×844) : toujours en bas, juste au-dessus des boutons du bas ; cartes de
// taille fixe, icône entière, dernière carte coupée sur le bord droit ; swipe sans sélection, toucher = choix (panneau
// au-dessus de la barre + portée), 2e toucher = pose ; états pas assez d'argent / GRATUIT mis à jour sans reconstruire
// la barre ; molette ; position de défilement gardée ; emplacement sous la barre (repère) ; bulle du tutoriel ; aucun
// débordement. Captures : barre fermée, ouverte, après swipe, carte choisie, pas assez d'argent, emplacement en bas,
// skin Néon, tutoriel.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/buildbar-test.cjs [dossier de captures]
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? 'ok  ' : 'KO  ') + m); };
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: out ? 2 : 1 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const cdp = await ctx.newCDPSession(p);
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(700);
    if (H > 700) await p.addStyleTag({ content: `:root{--safe-t:47px !important;--safe-b:34px !important}` });
    const shot = async (n) => { if (out) await p.screenshot({ path: `${out}/${n}-${W}.png` }); };
    const tag = `${W}×${H}`;
    // partie avec toutes les tourelles
    const start = async (skin = 'default', tut = true) => p.evaluate(([skin, tut]) => {
      const sv = __ui.save, d = sv.data; d.settings.tutorialDone = tut; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null;
      for (let k = 1; k < 60; k++) d.levels[k] = { stars: 3, best: 10, heroic: 0, heroicBest: 0 }; sv.grantUnlocks();
      d.towers = [...new Set([...d.towers, 'assault', 'smg', 'shotgun', 'sniper', 'rocket', 'minigun', 'cryo', 'laser', 'tesla', 'plasma', 'drone', 'mine'])];
      d.skin = skin; if (!d.skins.includes(skin)) d.skins.push(skin);
      __ui.closeOverlay(); __ui.startGame(tut ? 12 : 1, false, false, []); __ui.closeOverlay(); __ui.introOpen = false; __ui.game.money = 5000;
    }, [skin, tut]);
    // emplacement de tourelle vide : 'mid' (milieu de l'écran) ou 'low' (le plus bas)
    const slotPos = (which) => p.evaluate((which) => {
      const g = __ui.game, list = g.slots.filter((s) => s.kind === 'tower' && !s.tower).map((s) => ({ s, q: __ui.toScreen(s.x, s.y) }));
      list.sort((a, b) => (which === 'low' ? b.q.y - a.q.y : Math.abs(a.q.y - innerHeight * 0.4) - Math.abs(b.q.y - innerHeight * 0.4)));
      const hb = document.querySelector('#hud').getBoundingClientRect().bottom, db = document.querySelector('#dock').getBoundingClientRect().top;
      const it = list.find((x) => x.q.y > hb + 30 && x.q.y < db - 10); return { x: it.q.x, y: it.q.y, i: g.slots.indexOf(it.s) };
    }, which);
    const geo = () => p.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e || e.hidden) return null; const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom, w: q.width, h: q.height }; };
      const sc = document.querySelector('#buildbar .bb-scroll'), cards = [...document.querySelectorAll('#buildbar .bb-card')];
      const cr = cards.map((c) => c.getBoundingClientRect()), scr = sc ? sc.getBoundingClientRect() : null;
      const imgs = cards.map((c) => { const a = c.querySelector('img').getBoundingClientRect(), q = c.getBoundingClientRect(); return a.left >= q.left - 0.5 && a.right <= q.right + 0.5 && a.top >= q.top - 0.5 && a.bottom <= q.bottom + 0.5 && a.width >= 50; });
      const names = cards.map((c) => { const n = c.querySelector('.bb-name'); return n.scrollHeight <= n.clientHeight + 1 && n.scrollWidth <= n.clientWidth + 1; });
      const over = Math.max(0, ...[...document.querySelectorAll('#buildbar, #buildbar *')].filter((e) => !e.closest('.bb-scroll') || e.classList.contains('bb-scroll')).map((e) => { const q = e.getBoundingClientRect(); return q.width ? Math.max(q.right - innerWidth, -q.left) : 0; }));
      return { bar: r('#buildbar'), body: r('#buildbar .bb-body'), panel: r('#buildbar .bb-panel'), hud: r('#hud'), dock: r('#dock'), mark: r('#bb-mark'), tut: r('#tutorial'),
        n: cards.length, widths: [...new Set(cr.map((q) => Math.round(q.width)))], cut: scr ? cr.some((q) => q.left < scr.right - 4 && q.right > scr.right + 4) : false,
        imgs: imgs.every(Boolean), names: names.every(Boolean), over, sl: sc ? sc.scrollLeft : 0, max: sc ? sc.scrollWidth - sc.clientWidth : 0,
        armed: document.querySelectorAll('#buildbar .bb-card.armed').length, open: !!(__ui._bb && __ui._bb.open), arrow: !!document.querySelector('.bb-wrap.more-r'), shadeL: !!document.querySelector('.bb-wrap.more-l'),
        prog: r('#buildbar .bb-prog'), hint: r('#buildbar .bb-hint'), towers: __ui.game.towers.length, preview: !!__ui.game.preview };
    });
    // ------------------------------------------------------------------ barre fermée
    await start(); await p.waitForTimeout(400); await shot('barre-fermee');
    let G = await geo(); ok(!G.bar && !G.open, `${tag} : barre fermée au départ`);
    // ------------------------------------------------------------------ ouverture sur un emplacement du milieu
    const mid = await slotPos('mid'); await p.touchscreen.tap(mid.x, mid.y); await p.waitForTimeout(520); await shot('barre-ouverte-astuce');
    G = await geo();
    ok(G.open && G.bar && G.dock.t - G.body.b >= 0 && G.dock.t - G.body.b <= 10 && G.body.t > G.hud.b, `${tag} : barre en bas, juste au-dessus des boutons du bas (bas ${Math.round(G.body.b)} / boutons ${Math.round(G.dock.t)})`);
    ok(G.hint && G.hint.t > G.hud.b, `${tag} : première ouverture : « Glisse pour voir toutes les tourelles »`);
    await p.waitForTimeout(2600); G = await geo(); await shot('barre-ouverte');
    ok(G.n === 11 && G.widths.length === 1 && G.cut && G.arrow && !G.shadeL && G.prog, `${tag} : ${G.n} cartes de ${G.widths} px, dernière coupée, flèche et indicateur (retour au début : ${Math.round(G.sl)})`);
    ok(G.imgs && G.names, `${tag} : icônes entières dans les cartes, noms complets sans coupure`);
    ok(G.over <= 0.5 && G.sl < 2, `${tag} : aucun débordement (${G.over})`);
    const seen = await p.evaluate(() => __ui.save.data.settings.barHint); ok(seen === true, `${tag} : astuce mémorisée`);
    // ------------------------------------------------------------------ swipe : défile sans choisir
    const sb = G.body;
    // vrai swipe au doigt (le doigt se pose sur une carte puis glisse vers la gauche)
    for (const [type, x] of [['touchStart', W * 0.7], ['touchMove', W * 0.7 - 60], ['touchMove', W * 0.7 - 130], ['touchMove', W * 0.7 - 200], ['touchEnd', null]]) { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: x == null ? [] : [{ x, y: sb.t + 70 }] }); await p.waitForTimeout(30); }
    await p.waitForTimeout(800); G = await geo(); await shot('apres-swipe');
    ok(G.sl > 50 && G.armed === 0 && !G.preview && G.shadeL, `${tag} : swipe : défilement ${Math.round(G.sl)} px, aucune carte choisie, ombre à gauche`);
    // aimantation : le bord gauche d'une carte est aligné sur le début de la rangée
    const snap = await p.evaluate(() => { const sc = document.querySelector('.bb-scroll'), s = sc.getBoundingClientRect().left + 8; return Math.min(...[...sc.children].map((c) => Math.abs(c.getBoundingClientRect().left - s))); });
    ok(snap < 2, `${tag} : aimantation sur une carte (écart ${snap.toFixed(1)} px)`);
    // ------------------------------------------------------------------ toucher : choisit (panneau + portée), 2e toucher : pose
    const card = await p.evaluate(() => { const sc = document.querySelector('.bb-scroll').getBoundingClientRect(); const c = [...document.querySelectorAll('.bb-card')].find((c) => { const q = c.getBoundingClientRect(); return q.left >= sc.left && q.right <= sc.right; }); c.dataset.mark = 'x'; const q = c.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, type: c.dataset.type }; });
    await p.touchscreen.tap(card.x, card.y); await p.waitForTimeout(350); G = await geo(); await shot('carte-choisie');
    ok(G.armed === 1 && G.preview && G.panel && G.panel.b <= G.body.t + 1 && G.panel.t > G.hud.b, `${tag} : 1er toucher : carte choisie, panneau juste au-dessus de la barre, portée affichée`);
    const ptxt = await p.evaluate(() => document.querySelector('.bb-panel').textContent);
    ok(/Dégâts/.test(ptxt) && /(Portée|Zone)/.test(ptxt) && /(Cadence|Ralenti|Recharge)/.test(ptxt) && /Poser/.test(ptxt), `${tag} : stats et bouton « Poser » (${ptxt.replace(/\s+/g, ' ').slice(0, 60)})`);
    // ------------------------------------------------------------------ argent qui change : pas de reconstruction
    await p.evaluate(() => { __ui.game.money = 40; }); await p.waitForTimeout(250);
    const st = await p.evaluate(() => { const c = document.querySelector('.bb-card[data-mark]'); return { same: !!c, poor: document.querySelectorAll('.bb-card.poor').length, red: getComputedStyle(c.querySelector('.bb-price')).color, go: document.querySelector('.bb-go').textContent }; });
    await shot('pas-assez');
    ok(st.same && st.poor >= 10 && /Il manque/.test(st.go), `${tag} : pas assez d'argent : ${st.poor} cartes grisées, prix ${st.red}, « ${st.go.trim()} », barre non reconstruite`);
    await p.touchscreen.tap(card.x, card.y); await p.waitForTimeout(250);
    G = await geo(); ok(G.open && G.towers === 0, `${tag} : 2e toucher sans assez d'argent : rien n'est posé, la barre reste ouverte`);
    await p.evaluate(() => { __ui.game.freeNext = true; }); await p.waitForTimeout(250);
    const fr = await p.evaluate(() => ({ same: !!document.querySelector('.bb-card[data-mark]'), free: document.querySelectorAll('.bb-card.free').length, vis: getComputedStyle(document.querySelector('.bb-card.free .bb-free')).display }));
    await shot('gratuit');
    ok(fr.same && fr.free === 11 && fr.vis === 'block', `${tag} : boost : badge GRATUIT sur ${fr.free} cartes, sans reconstruction`);
    await p.evaluate(() => { __ui.game.freeNext = false; __ui.game.money = 5000; }); await p.waitForTimeout(200);
    // ------------------------------------------------------------------ fermeture et réouverture : position gardée
    await p.evaluate(() => { document.querySelector('.bb-scroll').scrollLeft = 2 * document.querySelector('.bb-card').offsetWidth + 16; }); await p.waitForTimeout(300);
    const sl0 = (await geo()).sl;
    await p.touchscreen.tap(W / 2, (G.hud.b + 40)); await p.waitForTimeout(300); G = await geo();
    ok(!G.open && !G.bar, `${tag} : toucher le terrain ailleurs ferme la barre`);
    await p.touchscreen.tap(mid.x, mid.y); await p.waitForTimeout(400); G = await geo();
    ok(G.open && sl0 > 50 && Math.abs(G.sl - sl0) < 2 && G.armed === 0, `${tag} : réouverture : même position de défilement (${Math.round(sl0)} -> ${Math.round(G.sl)})`);
    // molette (ordinateur)
    await p.evaluate(() => { const sc = document.querySelector('.bb-scroll'); sc.scrollLeft = 0; }); await p.waitForTimeout(150);
    await p.evaluate(() => document.querySelector('.bb-scroll').dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })));
    await p.waitForTimeout(600); G = await geo(); ok(G.sl > 40 && G.armed === 0, `${tag} : molette : défilement d'une carte (${Math.round(G.sl)} px)`);
    // pose par le bouton « Poser »
    const c2 = await p.evaluate(() => { const sc = document.querySelector('.bb-scroll').getBoundingClientRect(); const c = [...document.querySelectorAll('.bb-card')].find((c) => { const q = c.getBoundingClientRect(); return q.left >= sc.left && q.right <= sc.right; }); const q = c.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await p.touchscreen.tap(c2.x, c2.y); await p.waitForTimeout(250);
    const go = await p.evaluate(() => { const q = document.querySelector('.bb-go').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await p.touchscreen.tap(go.x, go.y); await p.waitForTimeout(350); G = await geo();
    ok(G.towers === 1 && !G.open, `${tag} : « Poser » pose la tourelle et ferme la barre`);
    // 2 touchers sur la même carte
    const mid2 = await slotPos('mid'); await p.touchscreen.tap(mid2.x, mid2.y); await p.waitForTimeout(350);
    const c3 = await p.evaluate(() => { const sc = document.querySelector('.bb-scroll').getBoundingClientRect(); const c = [...document.querySelectorAll('.bb-card')].find((c) => { const q = c.getBoundingClientRect(); return q.left >= sc.left && q.right <= sc.right; }); const q = c.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await p.touchscreen.tap(c3.x, c3.y); await p.waitForTimeout(200); await p.touchscreen.tap(c3.x, c3.y); await p.waitForTimeout(350); G = await geo();
    ok(G.towers === 2 && !G.open, `${tag} : 2 touchers sur la même carte : tourelle posée, barre fermée`);
    // ------------------------------------------------------------------ emplacement tout en bas
    const low = await slotPos('low'); await p.touchscreen.tap(low.x, low.y); await p.waitForTimeout(450);
    G = await geo(); const covered = low.y + 26 > G.bar.t;
    await p.evaluate(() => { const sc = document.querySelector('.bb-scroll').getBoundingClientRect(); const c = [...document.querySelectorAll('.bb-card')].find((c) => { const q = c.getBoundingClientRect(); return q.left >= sc.left && q.right <= sc.right; }); c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 1, clientY: 1 })); c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 1, clientY: 1 })); });
    await p.waitForTimeout(350); G = await geo(); await shot('emplacement-bas');
    const mask = await p.evaluate(() => document.querySelector('#buildbar').style.maskImage || document.querySelector('#buildbar').style.webkitMaskImage || '');
    const cov2 = low.y + 26 > G.bar.t;
    ok(!cov2 || (G.mark && Math.abs((G.mark.l + G.mark.r) / 2 - low.x) < 3 && /radial-gradient/.test(mask)), `${tag} : emplacement en bas (y ${Math.round(low.y)}, barre ${Math.round(G.bar.t)}) : ${cov2 ? 'repère + barre transparente à son niveau' : 'visible au-dessus de la barre'}${covered ? '' : ''}`);
    ok(errs.length === 0, `${tag} : aucune erreur ${errs.join(' | ')}`);
    // ------------------------------------------------------------------ skin Néon
    await start('neon'); await p.waitForTimeout(300); const m3 = await slotPos('mid'); await p.touchscreen.tap(m3.x, m3.y); await p.waitForTimeout(450);
    G = await geo(); await shot('skin-neon'); ok(G.imgs && G.n === 11, `${tag} : skin Néon : icônes entières`);
    // ------------------------------------------------------------------ tutoriel
    await p.evaluate(() => { __ui.save.data.towers = ['assault', 'smg']; });
    await start('default', false); await p.waitForTimeout(500);
    const tp = await p.evaluate(() => { const g = __ui.game, s = g._tutSlot || g.slots.find((x) => x.kind === 'tower'); const q = __ui.toScreen(s.x, s.y); return { x: q.x, y: q.y }; });
    await p.touchscreen.tap(tp.x, tp.y); await p.waitForTimeout(700); G = await geo(); await shot('tutoriel');
    const tutText = await p.evaluate(() => document.querySelector('#tutorial').textContent);
    ok(G.open && G.tut && /Choisis une tourelle/.test(tutText) && G.tut.b <= G.bar.t && G.tut.t >= G.hud.b, `${tag} : bulle du tutoriel au-dessus de la barre (bulle ${Math.round(G.tut.t)}-${Math.round(G.tut.b)}, barre ${Math.round(G.bar.t)}, HUD ${Math.round(G.hud.b)})`);
    ok(errs.length === 0, `${tag} : aucune erreur ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Barre de pose : tout est bon'); process.exit(bad ? 1 : 0);
})();
