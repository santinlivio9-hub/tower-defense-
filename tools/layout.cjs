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
    // rangée pleine : 5 capacités (château + Renaissance) et 5 boosts (Sacoche + emplacement de Renaissance) :
    // 3 boutons au plus de chaque côté, la pile garde le reste, rien ne sort de l'écran ni ne se chevauche
    {
      const o = await p.evaluate(() => { const sv = __ui.save, d = sv.data; const keep = JSON.stringify({ castle: d.castle, rebirth: d.rebirth, talents: d.talents, boosts: d.boosts });
        Object.assign(d.castle, { air: 3, blizzard: 3, gold: 3 }); d.rebirth = { rank: 1, shards: 0, owned: ['ab_meteor', 'ab_rewind', 'slot'], history: [] }; d.talents.slot = 1; Object.assign(d.boosts, { coins2: 3, heal: 3, free: 3, over: 3, shield: 3, revive: 3 });
        __ui.startGame(7, false, false, __ui.loadoutFor({ boss: false })); const g = __ui.game; g.collectDrop({ x: 300, y: 400, id: 'heal' });
        Object.assign(d, JSON.parse(keep)); __ui.updateDock();
        const row = [...document.querySelectorAll('.dock-row > div > button, .dock-row .pile')].map((e) => e.getBoundingClientRect()), bad = [];
        row.forEach((a, i) => { if (a.left < -0.5 || a.right > innerWidth + 0.5) bad.push('dépasse'); row.forEach((b, j) => { if (j > i && a.left < b.right - 1 && b.left < a.right - 1) bad.push('chevauche'); }); });
        return { n: row.length, piles: document.querySelectorAll('.dock-row .pile').length, bad }; });
      const good = !o.bad.length && o.n <= 6 && o.piles === 2; if (!good) bad++;
      console.log(`${good ? 'ok ' : 'KO '} ${tag} rangée pleine : ${o.n} boutons visibles, ${o.piles} piles ${o.bad.join(', ')}`);
      if (out) await p.screenshot({ path: `${out}/${tag}-rangee-pleine.png`, clip: { x: 0, y: H - 150, width: W, height: 150 } });
    }
    // rangée du bas : aucun chevauchement, rien ne dépasse, sur une vague chargée et une vague de boss
    for (const lv of [38, 40]) {
      await p.evaluate((lv) => { const sv = __ui.save, d = sv.data; for (let n = 1; n < lv; n++) d.levels[n] = { stars: 2, best: 1, heroic: 0, heroicBest: 0 }; sv.grantUnlocks(); __ui.startGame(lv, false, false, __ui.loadoutFor({ boss: lv % 10 === 0 })); const g = __ui.game; for (let k = 0; k < 40 && !(g.nextWave && (lv % 10 === 0 ? g.nextWave.groups.some((q) => q.type.startsWith('boss')) : new Set(g.nextWave.groups.map((q) => q.type)).size > 3)); k++) { g.wave++; g._nextCache = null; } }, lv);
      await p.waitForTimeout(400);
      const o = await p.evaluate(() => { const els = [...document.querySelectorAll('#wave-preview .lbl, #wave-preview .wp, #wave-preview .wp-more, #btn-speed, #btn-wave')].map((e) => [e.className || e.id, e.getBoundingClientRect()]); const bad = []; for (let i = 0; i < els.length; i++) { const [n, a] = els[i]; if (a.right > innerWidth + 0.5 || a.left < -0.5) bad.push(n + ' dépasse'); for (let j = i + 1; j < els.length; j++) { const [m, b] = els[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1 && !(n.includes('wp') && m.includes('wp'))) bad.push(n + ' / ' + m); } } for (const e of document.querySelectorAll('#btn-wave .l, #btn-wave small, #btn-speed, #wave-preview')) { const q = e.getBoundingClientRect(), host = (e.closest('button') || e).getBoundingClientRect(); if (e.scrollWidth > e.clientWidth + 1 || q.right > host.right + 1 || q.left < host.left - 1) bad.push('texte coupé : ' + (e.className || e.id)); } return { bad, n: els.length }; });
      if (o.bad.length) bad++;
      console.log(`${o.bad.length ? 'KO ' : 'ok '} ${tag} rangée du bas (niveau ${lv}, ${o.n} éléments) ${o.bad.join(', ')}`);
      await p.evaluate(() => { const g = __ui.game; g.wave = Math.max(1, g.wave); g.cleared = g.wave; g.countdown = 5; __ui.cache = {}; __ui.updateHud(); });
      if (out) await p.screenshot({ path: `${out}/${tag}-bas-${lv}.png`, clip: { x: 0, y: H - 140, width: W, height: 140 } });
    }
    const v = await p.evaluate(() => { const f = document.querySelector('#field').getBoundingClientRect(), v = __ui.view, c = document.querySelector('#game'); return { field: [Math.round(f.top), Math.round(f.bottom)], terrain: [Math.round(v.oy), Math.round(v.oy + 940 * v.s)], canvas: [c.clientWidth, c.clientHeight, c.width, c.height] }; });
    const fits = v.terrain[0] >= v.field[0] - 1 && v.terrain[1] <= v.field[1] + 1; if (!fits) bad++;
    console.log(`${fits ? 'ok ' : 'KO '} ${tag} terrain ${v.terrain.join(' → ')} dans la zone ${v.field.join(' → ')} ; canvas ${v.canvas.join(' ')}`);
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Tout tient dans l\'écran'); process.exit(bad ? 1 : 0);
})();
