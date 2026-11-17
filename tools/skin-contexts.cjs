// Planche de vérification des skins sur chaque tourelle, dans tous les contextes :
//  - miniatures sur le fond des boutons du menu de pose (12 tourelles × 16 skins), avec contrôle automatique
//    qu'aucun pixel du dessin ne touche le bord de l'image (rien de coupé) ;
//  - collection et boutique (375 et 390 px) ;
//  - en jeu : les 12 tourelles posées, une capture par skin.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/skin-contexts.cjs <dossier>
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); let bad = 0;
  // 1) miniatures sur fond de bouton + contrôle des bords
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto('http://localhost:8123/'); await p.waitForTimeout(500);
  const cut = await p.evaluate(async () => {
    const S = await import('/js/sprites.js'), C = await import('/js/config.js');
    const skins = C.SHOP.skins, cutList = [];
    // contrôle : dessin rastérisé, la bordure de 1 px doit rester transparente
    for (const ty of C.TOWER_ORDER) for (const s of skins) for (const lv of [1, 3, 5]) {
      const img = S.towerImg(ty, 64, s.id, lv, lv >= 3 ? 0 : null); await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = 192; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 192, 192);
      const d = x.getImageData(0, 0, 192, 192).data; let edge = 0;
      for (let i = 0; i < 192; i++) for (const [px, py] of [[i, 0], [i, 191], [0, i], [191, i]]) if (d[(py * 192 + px) * 4 + 3] > 40) edge++;
      if (edge > 0) cutList.push(`${ty} ${s.id} niv.${lv} (${edge} px au bord)`);
    }
    document.body.innerHTML = ''; document.body.style.cssText = 'margin:0;background:#3a2a68;font:600 12px Fredoka,system-ui;color:#fff';
    const t = document.createElement('table'); t.style.cssText = 'border-collapse:collapse;margin:8px';
    t.innerHTML = '<tr><td></td>' + skins.map((s) => `<td style="text-align:center;padding:2px 3px">${s.name}</td>`).join('') + '</tr>';
    for (const ty of C.TOWER_ORDER) {
      const tr = document.createElement('tr'); tr.innerHTML = `<td style="padding:0 6px">${C.TOWERS[ty].name}</td>`;
      for (const s of skins) { const td = document.createElement('td'); td.style.cssText = 'padding:3px'; const w = document.createElement('div'); w.style.cssText = 'width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#fff,#ddd3ee);border:3px solid #3d2c4e;box-sizing:border-box'; w.append(S.towerImg(ty, 50, s.id, 1)); td.append(w); tr.append(td); }
      t.append(tr);
    }
    document.body.append(t);
    return cutList;
  });
  await p.waitForTimeout(1200);
  const bb = await p.evaluate(() => { const r = document.querySelector('table').getBoundingClientRect(); return { w: Math.ceil(r.right + 8), h: Math.ceil(r.bottom + 8) }; });
  await p.setViewportSize({ width: bb.w, height: bb.h }); await p.screenshot({ path: `${out}/miniatures-menu.png` });
  console.log(cut.length ? 'KO  miniatures coupées : ' + cut.slice(0, 8).join(' ; ') : 'ok  aucune miniature coupée (12 tourelles × 16 skins × 3 niveaux)'); if (cut.length) bad++;
  // 2) collection, boutique et menu de pose en 375 et 390 ; 3) en jeu, un skin par capture
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const q = await ctx.newPage(); const errs = []; q.on('pageerror', (e) => errs.push(e.message));
    await q.goto('http://localhost:8123/'); await q.waitForTimeout(700);
    if (H > 700) await q.addStyleTag({ content: `:root{--safe-t:47px !important;--safe-b:34px !important}` });
    const prep = (skin) => q.evaluate(async (skin) => { const sv = __ui.save, d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null;
      for (let k = 1; k < 75; k++) d.levels[k] = { stars: 3, best: 10, heroic: 0, heroicBest: 0 }; d.seen.enemies = []; sv.grantUnlocks(); d.seen.towers = [...d.towers];
      d.skins = (await import('/js/config.js')).SHOP.skins.map((s) => s.id); d.skin = skin; __ui.closeOverlay(); }, skin);
    await prep('neon');
    await q.evaluate(() => { __ui.colTab = 'towers'; __ui.show('collection'); }); await q.waitForTimeout(600); await q.screenshot({ path: `${out}/collection-neon-${W}.png` });
    await prep('lava');
    await q.evaluate(() => { __ui.colTab = 'towers'; __ui.show('collection'); }); await q.waitForTimeout(600); await q.screenshot({ path: `${out}/collection-lave-${W}.png` });
    await q.evaluate(() => { __ui.shopTab = 'skins'; __ui.show('shop'); }); await q.waitForTimeout(600); await q.screenshot({ path: `${out}/boutique-skins-${W}.png` });
    for (const skin of ['neon', 'galaxy']) {
      await prep(skin);
      await q.evaluate(async () => { __ui.startGame(75, false, false, []); __ui.closeOverlay(); __ui.introOpen = false; const g = __ui.game; g.money = 300; __ui.openMenu(g.slots.find((s) => s.kind === 'tower')); __ui.updateRadial(); });
      await q.waitForTimeout(700); await q.screenshot({ path: `${out}/pose-${skin}-${W}.png` });
    }
    if (W === 390) for (const s of ['default', 'camo', 'neon', 'lava', 'candy', 'gold', 'emerald', 'royal', 'obsidian', 'frost', 'galaxy', 'chrome', 'nebula', 'glitchy', 'phoenix', 'prism']) {
      await prep(s);
      await q.evaluate(async () => {
        __ui.startGame(75, false, false, []); __ui.closeOverlay(); __ui.introOpen = false; const g = __ui.game; g.money = 1e6;
        const ty = ['assault', 'smg', 'shotgun', 'sniper', 'rocket', 'minigun', 'cryo', 'laser', 'tesla', 'plasma', 'drone'];
        g.slots.filter((s) => s.kind === 'tower').forEach((s, i) => { const t = ty[i % ty.length]; if (g.buildable(s).includes(t)) g.placeTower(t, s); });
        const m = g.slots.find((s) => s.kind === 'mine'); if (m && g.buildable(m).includes('mine')) g.placeTower('mine', m);
        g.fx.texts.length = 0; document.querySelectorAll('.tower-tip, #toasts > *').forEach((e) => e.remove()); g.paused = true;
      });
      await q.waitForTimeout(700); await q.evaluate(() => document.querySelectorAll('#toasts > *, .tower-tip').forEach((e) => e.remove())); await q.waitForTimeout(100); await q.screenshot({ path: `${out}/jeu-${s}.png` });
    }
    console.log(`${errs.length ? 'KO' : 'ok'}  ${W}×${H} : collection, boutique, menu de pose, en jeu ${errs.join(' | ')}`); if (errs.length) bad++;
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Skins : tout est bon'); process.exit(bad ? 1 : 0);
})();
