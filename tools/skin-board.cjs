// Planche des skins : chaque tourelle (lignes) avec chaque skin (colonnes), niveau 1 et niveau 4.
// Sert à vérifier que la silhouette et la couleur signature restent reconnaissables avec tous les skins.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/skin-board.cjs <fichier.png> [niveau]
const { chromium } = require('playwright');
const out = process.argv[2] || 'skins.png', level = +(process.argv[3] || 1);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:8123/'); await p.waitForTimeout(500);
  await p.evaluate(async (level) => {
    const S = await import('/js/sprites.js'), C = await import('/js/config.js');
    document.body.innerHTML = ''; document.body.style.cssText = 'margin:0;background:#2a2140;font:600 12px Fredoka,system-ui;color:#fff';
    const t = document.createElement('table'); t.style.cssText = 'border-collapse:collapse;margin:8px';
    const skins = C.SHOP.skins; let h = '<tr><td></td>' + skins.map((s) => `<td style="text-align:center;padding:2px 4px">${s.name}</td>`).join('') + '</tr>';
    t.innerHTML = h;
    for (const ty of C.TOWER_ORDER) {
      const tr = document.createElement('tr'); tr.innerHTML = `<td style="padding:0 6px;color:${S.TOWER_COLOR[ty]}">${C.TOWERS[ty].name}</td>`;
      for (const s of skins) { const td = document.createElement('td'); td.style.cssText = 'text-align:center;padding:1px'; td.append(S.towerImg(ty, 58, s.id, level)); tr.append(td); }
      t.append(tr);
    }
    document.body.append(t);
  }, level);
  await p.waitForTimeout(1500);
  const box = await p.evaluate(() => { const r = document.querySelector('table').getBoundingClientRect(); return { w: Math.ceil(r.right + 8), h: Math.ceil(r.bottom + 8) }; });
  await p.setViewportSize({ width: box.w, height: box.h }); await p.screenshot({ path: out, fullPage: true });
  await b.close(); console.log('Planche :', out);
})();
