// Simulation d'équilibrage (robot joueur, sans affichage).
// Lancer un serveur local sur le port 8123 (python3 -m http.server 8123), puis :
//   NODE_PATH=$(npm root -g) node tools/simulate.cjs <niveaux> <jeu> [investissement] [réglage]
//   niveaux : liste, ex. "1,3,6" ; jeu : good (joue bien), bad (joue mal), boost (joue bien + utilise ses boosts)
//   investissement : niveau moyen du château et des talents (0 à 5, par défaut = numéro du monde - 1), ou "-"
//   réglage : code JS appliqué à la config avant la partie, ex. 'C.GAME.rewardMult = 1'
const { chromium } = require('playwright');
const levels = (process.argv[2] || '1').split(',').map(Number), skill = process.argv[3] || 'good', prog = process.argv[4] === '-' ? undefined : process.argv[4], tweak = process.argv[5] || '';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message, e.stack.split('\n')[1]));
  await p.goto('http://localhost:8123/'); await p.waitForTimeout(500);
  await p.evaluate(async (tweak) => { const C = await import('./js/config.js'); window.C = C; if (tweak) eval(tweak); }, tweak);
  for (const n of levels) {
    const r = await p.evaluate(({ n, skill, prog }) => {
      const ui = __ui, sv = ui.save; sv.reset(); ui.simulating = true;
      const d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true;
      // progression « normale » : niveaux précédents terminés, tourelles débloquées, château/talents selon le monde
      for (let k = 1; k < n; k++) d.levels[k] = { stars: 2, best: 0, heroic: 0, heroicBest: 0 };
      sv.grantTowers();
      const w = Math.floor((n - 1) / 6), inv = prog != null ? +prog : w;      // inv = niveau moyen d'investissement (0..5)
      Object.assign(d.castle, { walls: Math.min(5, inv), repair: Math.min(5, inv), treasury: Math.min(5, inv), cannon: Math.min(5, inv), air: Math.min(3, inv), blizzard: Math.min(3, Math.max(0, inv - 1)), gold: Math.min(3, Math.max(0, inv - 1)) });
      const tl = ['dmg', 'rate', 'start', 'kill', 'lives', 'cd']; for (let i = 0; i < inv * 4; i++) d.talents[tl[i % tl.length]] = Math.min(5, (d.talents[tl[i % tl.length]] || 0) + 1);
      Object.assign(d.boosts, { coins2: 3, heal: 3, free: 3, over: 3, shield: 3, revive: 3 });
      const L = ui.save.boostSlots({ boss: n % 6 === 0 });
      const carry = skill === 'boost' ? ['shield', 'over', 'revive', 'heal', 'coins2'].slice(0, L) : [];
      ui.startGame(n, false, false, carry);
      const g = __game; d.seen.enemies = Object.keys({ basic: 1, fast: 1, tank: 1, flying: 1, armored: 1, splitter: 1, healer: 1, stealth: 1, boss1: 1, boss2: 1, boss3: 1, boss4: 1, boss5: 1 });
      const order = ['assault', 'shotgun', 'assault', 'sniper', 'cryo', 'rocket', 'assault', 'minigun', 'sniper', 'rocket', 'shotgun', 'minigun', 'cryo', 'sniper', 'rocket', 'minigun'].filter((t) => sv.towerUnlocked(t));
      let built = 0, steps = 0, lowAt = null;
      const slots = g.slots.filter((s) => s.kind === 'tower').sort((a, b) => a.rank - b.rank);
      const act = () => {
        if (skill === 'bad') { // joue mal : 3 tourelles au hasard, peu d'améliorations
          if (g.towers.length < 3 + Math.floor(g.wave / 6) && g.money >= 130) { const s = slots[slots.length - 1 - g.towers.length]; if (s && !s.tower) g.placeTower(['smg', 'assault', 'shotgun'][g.towers.length % 3], s); }
          else if (g.wave % 4 === 0) { const t = g.towers[g.wave % Math.max(1, g.towers.length)]; if (t) { const o = t.upgradeOptions()[0]; if (o && g.money >= o.cost * 2) g.upgradeTower(t, o); } }
          return;
        }
        for (let guard = 0; guard < 6; guard++) {
          const want = Math.min(slots.length, 2 + Math.floor(g.wave * 0.55));
          // amélioration la moins chère
          let bt = null, bo = null;
          for (const t of g.towers) for (const o of t.upgradeOptions().slice(0, 1)) if (!bo || o.cost < bo.cost) { bo = o; bt = t; }
          const type = order[built % order.length], cost = g.costOf(type), free = slots.find((s) => !s.tower);
          if (free && g.towers.length < want && (!bo || cost <= bo.cost * 1.6)) { if (g.money >= cost) { g.placeTower(type, free); built++; continue; } return; }
          if (bo) { if (g.money >= bo.cost) { g.upgradeTower(bt, bo); continue; } return; }
          if (free && g.money >= cost) { g.placeTower(type, free); built++; continue; }
          return;
        }
      };
      const useB = (id) => { const i = g.boosts.findIndex((x) => x.id === id && !x.used); if (i >= 0) g.useBoost(i); };
      while (!g.over && steps++ < 110000) {
        if (steps % 15 === 0) {
          act();
          if (skill !== 'bad') { // capacités dès qu'elles sont prêtes et utiles
            for (const a of g.abilities) if (a.cd <= 0) { if (a.id === 'gold') g.useAbility('gold'); else if (g.enemies.length >= 6) { const e = g.enemies.reduce((m, x) => (x.d / x.path.total > m.d / m.path.total ? x : m)); if (a.id === 'air') g.useAbility('air', e.x, e.y); else g.useAbility('blizzard'); } }
          }
          if (skill === 'boost') {
            if (g.wave === 3) useB('coins2');
            if (g.lives <= g.maxLives - 6) useB('heal');
            const boss = g.enemies.find((e) => e.boss);
            if (boss && boss.d > boss.path.total * 0.45) { useB('over'); if (boss.d > boss.path.total * 0.7 || g.lives < 8) useB('shield'); }
            if (g.lives < 6 && g.enemies.length > 8) useB('shield');
          }
        }
        if (g.wave === 0 && steps > 60) g.startNextWave(false);
        if (g.lives < g.maxLives && lowAt == null) lowAt = g.wave;
        g.update(1 / 30);
      }
      ui.simulating = false;
      const t = g.towers.map((x) => x.type[0] + x.level).join(' ');
      return `L${n} ${skill}: ${g.result ? (g.result.victory ? 'WIN ' + g.result.stars + '*' : 'LOSE') : 'TIMEOUT'} vague ${g.wave}/${g.totalWaves} PV ${g.lives}/${g.maxLives} premier dégât v${lowAt} ${(g.time / 60).toFixed(1)} min | ${g.towers.length} tours [${t}] or ${Math.round(g.money)} gagné ${Math.round(g.stats.earned)}`;
    }, { n, skill, prog });
    console.log(r);
  }
  await b.close();
})();
