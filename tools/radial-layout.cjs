// Menu radial d'une tourelle niveau 3 (choix de 2 branches) puis niveau 1 (UP), sur TOUS les emplacements de
// plusieurs cartes, en 375×667 et 390×844 : chaque bouton (avec son nom et son prix) est entièrement dans la zone
// de jeu (ni sous le HUD ni sous la barre du bas), aucun bouton ne chevauche un autre, aucun ne recouvre la tourelle,
// le panneau ne recouvre aucun bouton, et le prix est affiché sur chaque amélioration et dans le panneau.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/radial-layout.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let bad = 0, n = 0;
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(700);
    if (H > 700) await p.addStyleTag({ content: `:root{--safe-t:47px !important;--safe-b:34px !important}` });
    for (const lv of [4, 13, 25, 47, 66]) {
      const res = await p.evaluate(async (lv) => {
        const sv = __ui.save, d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null;
        for (let k = 1; k < lv; k++) d.levels[k] = { stars: 3, best: 10, heroic: 0, heroicBest: 0 }; d.seen.enemies = []; sv.grantUnlocks();
        __ui.startGame(lv, false, false, []); __ui.closeOverlay(); __ui.introOpen = false;
        const g = __ui.game, out = [], wait = () => new Promise((r) => setTimeout(r, 60));
        g.money = 1e6;
        const slots = g.slots.filter((s) => s.kind === 'tower');
        const hud = document.querySelector('#hud').getBoundingClientRect().bottom, dock = document.querySelector('#dock').getBoundingClientRect().top;
        // 2) tourelles posées (une sur deux améliorée jusqu'au choix de branche)
        g.money = 1e6;
        for (const [i, s] of slots.entries()) { g.placeTower('assault', s); if (i % 2 === 0) { g.upgradeTower(s.tower, s.tower.upgradeOptions()[0]); g.upgradeTower(s.tower, s.tower.upgradeOptions()[0]); } }
        document.querySelectorAll('.tower-tip, #toasts > *').forEach((e) => e.remove());
        g.money = 200;   // pas assez pour tout : prix en rouge
        // le panneau s'affiche tout de suite (avant tout toucher) : prix et infos
        for (const s of slots.slice(0, 2)) { __ui.openMenu(s); __ui.updateRadial(); await wait(); if (!document.querySelector('#radial .rpanel .upp-cost, #radial .rpanel .upp-max')) out.push({ lvl: s.tower.level, issues: ['panneau sans prix ni infos avant le 1er toucher'], si: g.slots.indexOf(s) }); if (/Touche UP pour voir/.test(document.querySelector('#radial').textContent)) out.push({ lvl: s.tower.level, issues: ['ancien texte « Touche UP pour voir » encore présent'], si: g.slots.indexOf(s) }); }
        for (const s of slots) {
          __ui.openMenu(s); __ui.updateRadial(); await wait();
          const up = document.querySelector('#radial .rb.up:not(.locked)'); if (up) { up.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0 })); up.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 0 })); await wait(); }
          const tw = __ui.toScreen(s.x, s.y), rects = [], issues = [];
          for (const btn of document.querySelectorAll('#radial .rb')) {
            const parts = [btn, ...btn.querySelectorAll('.lab, .price')].map((e) => e.getBoundingClientRect()).filter((q) => q.width);
            const r = { l: Math.min(...parts.map((q) => q.left)), r: Math.max(...parts.map((q) => q.right)), t: Math.min(...parts.map((q) => q.top)), b: Math.max(...parts.map((q) => q.bottom)), k: btn.className };
            if (r.l < 0 || r.r > innerWidth || r.t < hud - 1 || r.b > dock + 1) issues.push('hors zone : ' + r.k);
            const c = btn.getBoundingClientRect(); if (Math.hypot(c.left + c.width / 2 - tw.x, c.top + c.height / 2 - tw.y) < c.width / 2 + 18) issues.push('sur la tourelle : ' + r.k);
            if (btn.classList.contains('up') && !btn.classList.contains('locked') && !btn.querySelector('.price')) issues.push('prix absent : ' + r.k);
            rects.push(r);
          }
          for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i], q = rects[j]; if (a.l < q.r - 2 && q.l < a.r - 2 && a.t < q.b - 2 && q.t < a.b - 2) issues.push('chevauchement : ' + a.k + ' / ' + q.k + ' (' + Math.round(Math.min(a.r, q.r) - Math.max(a.l, q.l)) + 'x' + Math.round(Math.min(a.b, q.b) - Math.max(a.t, q.t)) + ')'); }
          if (up && !document.querySelector('#radial .upp-cost')) issues.push('prix absent du panneau');
          { const pn = document.querySelector('#radial .rpanel'); if (pn) { const q = pn.getBoundingClientRect(); for (const r of rects) if (q.left < r.r - 2 && r.l < q.right - 2 && q.top < r.b - 2 && r.t < q.bottom - 2) issues.push('panneau sur ' + r.k); if (q.top < hud - 1 || q.bottom > dock + 1 || q.left < 0 || q.right > innerWidth) issues.push('panneau hors zone'); } }
          out.push({ lvl: s.tower.level, issues, si: g.slots.indexOf(s) });
        }
        __ui.openMenu(null);
        return out;
      }, lv);
      console.log(`${W}×${H} niveau ${lv} : ${res.length} menus de tourelle posée`);
      for (const r of res) { n++; if (r.issues.length) { bad++; console.log(`KO  ${W}×${H} niveau ${lv}, ${r.lvl ? 'tourelle niv. ' + r.lvl : 'menu de pose'} (emplacement ${r.si}) : ${r.issues.join(' ; ')}`); if (process.env.SHOT) { await p.evaluate(async (si) => { const g = __ui.game; __ui.openMenu(g.slots[si]); __ui.updateRadial(); await new Promise((r) => setTimeout(r, 60)); const up = document.querySelector('#radial .rb.up:not(.locked)'); up.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); up.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }, r.si); await p.waitForTimeout(150); await p.screenshot({ path: `${process.env.SHOT}/ko-${W}-${lv}-${r.si}.png` }); } } }
    }
    if (errs.length) { bad++; console.log('ERREURS', errs.join(' | ')); }
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} menu(s) en défaut sur ${n}` : `Menu radial : ${n} menus vérifiés, tout est lisible`); process.exit(bad ? 1 : 0);
})();
