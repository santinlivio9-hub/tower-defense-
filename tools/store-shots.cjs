// Éléments graphiques des fiches Google Play / App Store, dans store/ :
//  - 6 captures portrait habillées (légende + écran du jeu) en 1290×2796 (iPhone 6,7") et 1080×1920 (Google Play) ;
//  - visuel de présentation 1024×500 (Google Play).
// Les écrans viennent du vrai jeu (Playwright), sans aucune sauvegarde réelle (stockage vierge).
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/store-shots.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.resolve(__dirname, '..', 'store'); fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
const URL = 'http://localhost:8123/';
const SHOTS = [
  { id: '1-combat', fr: 'Défends ton château contre les brainrots !', en: 'Defend your castle from the brainrots!' },
  { id: '2-ameliorations', fr: '12 tourelles, des branches à choisir', en: '12 turrets, pick your upgrade path' },
  { id: '3-boss', fr: '8 boss géants à terrasser', en: '8 giant bosses to take down' },
  { id: '4-chateau', fr: 'Fais évoluer ton château', en: 'Grow your castle' },
  { id: '5-carte', fr: '80 niveaux dans 8 mondes', en: '80 levels across 8 worlds' },
  { id: '6-coffres', fr: 'Coffres, talents et skins à débloquer', en: 'Chests, talents and skins to unlock' },
];
const SIZES = [{ w: 1290, h: 2796, vw: 430, vh: 932, tag: '1290x2796' }, { w: 1080, h: 1920, vw: 360, vh: 640, tag: '1080x1920' }];
// prépare une scène dans le jeu
async function scene(p, id) {
  await p.evaluate(async (id) => {
    const sv = __ui.save, d = sv.data, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    d.settings.tutorialDone = true; d.settings.muted = true; d.daily.popped = d.daily.day; d.notice = null; d.gems = 240; d.coins = 3850; d.level = 24;
    for (let k = 1; k <= 34; k++) d.levels[k] = { stars: k % 4 ? 3 : 2, best: 10, heroic: 0, heroicBest: 0 };
    d.seen.enemies = Object.keys((await import('/js/config.js')).ENEMIES); sv.grantUnlocks(); sv.syncTierCap();
    Object.assign(d.castle, { walls: 4, repair: 3, treasury: 3, cannon: 3, air: 2, blizzard: 2, gold: 1 }); d.chests = { wood: 2, gold: 1, legend: 1 };
    d.skin = 'default';
    __ui.closeOverlay(); document.querySelectorAll('#toasts > *').forEach((e) => e.remove());
    if (id === '4-chateau') { __ui.show('castle'); return; }
    if (id === '5-carte') { __ui.show('world'); return; }
    if (id === '6-coffres') { __ui.show('shop'); d.chests.gold = 1; __ui.openChest('gold'); return; }
    const lv = id === '3-boss' ? 30 : 25;
    __ui.startGame(lv, false, false, []); __ui.closeOverlay(); __ui.introOpen = false;
    const g = __ui.game; g.money = 1e6;
    const sl = g.slots.filter((s) => s.kind === 'tower'), ty = ['minigun', 'rocket', 'sniper', 'shotgun', 'smg', 'cryo', 'assault', 'rocket', 'minigun', 'sniper'];
    sl.forEach((s, i) => { if (i >= 9) return; const t = ty[i % ty.length]; if (!g.buildable(s).includes(t)) return; g.placeTower(t, s); const o = () => s.tower.upgradeOptions().filter((u) => !u.locked); for (let k = 0; k < (i % 3) + 1 && o().length; k++) g.upgradeTower(s.tower, o()[i % o().length] || o()[0]); });
    for (const s of g.slots.filter((s) => s.kind === 'mine').slice(0, 2)) if (g.buildable(s).includes('mine')) g.placeTower('mine', s);
    g.money = 1840; g.fx.texts.length = 0; document.querySelectorAll('.tower-tip, #toasts > *, .up-float').forEach((e) => e.remove());
    // vague bien visible : ennemis répartis le long du chemin (et un boss au milieu pour la capture « boss »)
    g.startNextWave(false); for (let i = 0; i < 60 * 2; i++) g.update(1 / 60);
    const P = g.paths[0], kinds = ['basic', 'tank', 'fast', 'flying', 'armored', 'splitter', 'healer'];
    for (let i = 0; i < 22; i++) { const e = g.spawnEnemy(kinds[i % kinds.length], i % g.paths.length, P.total * (0.08 + i * 0.035), 1.4); if (e) e.hp *= 3, e.maxHp *= 3; }
    if (id === '3-boss') { const b = g.spawnEnemy('boss3', 0, P.total * 0.42, 1, 1); if (b) b.hp = b.maxHp * 0.62; }
    for (let i = 0; i < 60 * 0.8; i++) g.update(1 / 60);
    g.banner = null;
    if (id === '2-ameliorations') { const s = sl.find((s) => s.tower && s.tower.level === 3) || sl.find((s) => s.tower); __ui.openMenu(s); __ui.updateRadial(); }
    g.paused = true; g.fx.texts = g.fx.texts.filter((t) => t.num != null || /COMBO|SUPER|CARNAGE/.test(t.text)); document.querySelectorAll('.tower-tip, #toasts > *, .up-float').forEach((e) => e.remove());
  }, id);
  await p.waitForTimeout(id === '6-coffres' ? 900 : 700);
  await p.evaluate(() => document.querySelectorAll('#toasts > *, .up-float').forEach((e) => e.remove()));
  if (id === '6-coffres') { for (let i = 0; i < 3; i++) { await p.click('#overlay .chest-stage .chest', { force: true }); await p.waitForTimeout(250); } await p.waitForTimeout(2300); for (let i = 1; i <= 3; i++) { await p.click(`#overlay .fan .lcard:nth-child(${i})`, { force: true }); await p.waitForTimeout(300); } await p.waitForTimeout(900); }
}
// habillage : fond, légende en haut, écran dans un cadre arrondi
const frame = (img, text, w, h) => `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap" rel="stylesheet"><style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:Fredoka,system-ui,sans-serif}
  body{background:radial-gradient(circle at 50% 0%,#7a3fd8 0%,#3a1f78 38%,#1c1036 75%);display:flex;flex-direction:column;align-items:center}
  h1{margin:${h * 0.045}px ${w * 0.07}px ${h * 0.03}px;font-size:${w * 0.072}px;line-height:1.12;text-align:center;color:#fff;letter-spacing:.01em;text-shadow:0 ${w * 0.006}px 0 #3d2c4e,0 0 ${w * 0.03}px rgba(255,210,63,.45);-webkit-text-stroke:${w * 0.004}px #3d2c4e;paint-order:stroke fill}
  .ph{width:${w * 0.82}px;border-radius:${w * 0.06}px;overflow:hidden;border:${w * 0.012}px solid #3d2c4e;box-shadow:0 ${w * 0.02}px 0 #120a26,0 ${w * 0.04}px ${w * 0.08}px rgba(0,0,0,.55)}
  .ph img{display:block;width:100%}</style></head><body><h1>${text}</h1><div class="ph"><img src="${img}"></div></body></html>`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const S of SIZES) {
    const ctx = await b.newContext({ viewport: { width: S.vw, height: S.vh }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    const fr = await b.newPage({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: 1 });
    for (const sh of SHOTS) {
      await p.goto(URL); await p.waitForTimeout(800);
      await p.addStyleTag({ content: `:root{--safe-t:${S.vh > 800 ? 47 : 20}px !important;--safe-b:${S.vh > 800 ? 34 : 0}px !important}` });
      await scene(p, sh.id);
      const raw = await p.screenshot({ type: 'png' });
      for (const lang of ['fr', 'en']) {
        await fr.setContent(frame('data:image/png;base64,' + raw.toString('base64'), sh[lang], S.w, S.h)); await fr.waitForTimeout(600);
        const f = path.join(OUT, 'screenshots', `${lang}-${S.tag}-${sh.id}.jpg`); await fr.screenshot({ path: f, type: 'jpeg', quality: 90 });
      }
      console.log(S.tag, sh.id);
    }
    await ctx.close(); await fr.close();
  }
  // visuel de présentation Google Play 1024×500
  const fg = await b.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await fg.goto(URL); await fg.waitForTimeout(600);
  await fg.evaluate(async () => {
    const S = await import('/js/sprites.js'); const icon = (await import('/tools/icon-art.js'));
    const ic = await icon.renderIcon(300);
    document.head.insertAdjacentHTML('beforeend', '<style>body>*:not(#fg){display:none!important}</style>');
    const d = document.createElement('div'); d.id = 'fg';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:hidden;font-family:Fredoka,system-ui,sans-serif;background:radial-gradient(circle at 70% 40%,#7a3fd8 0%,#3a1f78 40%,#1c1036 80%)';
    d.innerHTML = `<div style="position:absolute;left:56px;top:92px;width:520px"><div style="font-size:92px;font-weight:700;line-height:.95;color:#ffd23f;-webkit-text-stroke:5px #3d2c4e;paint-order:stroke fill;text-shadow:0 7px 0 #3d2c4e">BRAINROT<br><span style="color:#fff">TD</span></div><div style="margin-top:22px;font-size:30px;font-weight:600;color:#fff;text-shadow:0 3px 0 #3d2c4e">Tower defense déjanté</div></div><img src="${ic}" style="position:absolute;right:70px;top:92px;width:300px;height:300px;border-radius:66px;border:8px solid #3d2c4e;box-shadow:0 10px 0 #120a26"><div id="fgs" style="position:absolute;left:0;right:0;bottom:-6px;height:120px"></div>`;
    document.body.append(d);
    const row = d.querySelector('#fgs'), put = (im, x, s) => { im.style.cssText = `position:absolute;left:${x}px;bottom:0;width:${s}px;height:${s}px`; row.append(im); };
    ['basic', 'tank', 'fast', 'flying'].forEach((t, i) => put(S.enemyImg(t, 96), 40 + i * 100, 96));
    ['minigun', 'rocket', 'cryo'].forEach((t, i) => put(S.towerImg(t, 96, 'default', 4, 0), 470 + i * 100, 96));
  });
  await fg.waitForTimeout(1200); await fg.screenshot({ path: path.join(OUT, 'feature-1024x500.png') });
  await b.close();
  console.log(errs.length ? 'ERREURS ' + errs.join(' | ') : 'store/ : captures et visuel générés, aucune erreur');
})();
