// Simulation de progression d'un joueur régulier, jour par jour, avec la VRAIE logique de sauvegarde
// (js/save.js) et la même formule de gains que le jeu (js/economy.js). Rapide : aucune partie n'est jouée,
// l'issue d'un niveau dépend de la « puissance » du joueur (château, talents, niveau) face à la difficulté.
// Usage : node tools/progression.cjs [jours=45] [parties par jour=3] [graine=1]
//   Joueur régulier : 4 sessions par jour, 3 parties, cadeau + roue gratuite + quêtes + passe + coffres d'étoiles,
//   achète un coffre en bois quand il a 80 gemmes, n'accélère pas les constructions.
const path = require('path');
const DAYS = +(process.argv[2] || 45), GAMES = +(process.argv[3] || 3), SEED = +(process.argv[4] || 1);
const root = 'file://' + path.resolve(__dirname, '..') + '/js/';

// horloge simulée (les quêtes, le calendrier et les constructions utilisent la date)
let NOW = new Date(2026, 0, 5, 8, 0, 0).getTime();
const RealDate = Date;
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
const store = {}; global.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };

(async () => {
  const C = await import(root + 'config.js'), { Save } = await import(root + 'save.js');
  const { levelRewards } = await import(root + 'economy.js'), { buildWave } = await import(root + 'waves.js');
  let s = SEED; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const sv = new Save(), d = sv.data; d.settings.tutorialDone = true;
  const L = C.LEVELS, N = L.length;
  // coût total des ennemis d'un niveau (base de l'XP) : calculé depuis les vraies vagues
  const killCost = L.map((lv) => { let c = 0; for (let w = 1; w <= lv.waves; w++) for (const g of buildWave(w, lv, 1).groups) c += C.ENEMIES[g.type].boss ? 60 : C.ENEMIES[g.type].cost * g.count; return c; });
  const talentSpent = () => Object.values(d.talents).reduce((a, b) => a + b, 0);
  // puissance du joueur et difficulté d'un niveau (calées sur le robot : un joueur moyen avance d'environ
  // 1 à 2 niveaux de campagne par jour, et bloque un peu sur les boss)
  const power = () => 1 + 0.02 * sv.castleSum() + 0.012 * talentSpent() + 0.008 * d.level;
  const diff = (n, hero) => 1 + 0.032 * (n - 1) + (L[n - 1].boss ? 0.08 : 0) + (hero ? 0.1 + 0.004 * n : 0);
  const winP = (n, hero) => Math.max(0.08, Math.min(0.95, 0.7 + (power() - diff(n, hero)) * 2.4));
  const play = (n, hero) => {
    const lv = L[n - 1], ld = sv.levelData(n), p = winP(n, hero), win = rnd() < p;
    const stars = win ? (p > 0.8 ? 3 : p > 0.55 ? 2 : 1) : 0, waves = win ? lv.waves : Math.floor(lv.waves * (0.4 + rnd() * 0.5));
    const E = levelRewards({ victory: win, stars, prevStars: ld.stars, wavesDone: waves, boss: lv.boss, hero, heroDone: !!ld.heroic, killCost: killCost[n - 1] * (win ? 1 : waves / lv.waves), gemMult: sv.mods().gemMult });
    d.coins += E.coins; d.gems += E.gems; sv.addXp(E.xp); sv.addPass(E.pass);
    if (win) {
      if (hero) { if (E.firstClear) sv.grant({ chest: 'wood', talent: E.talent }); ld.heroic = 1; }
      else { ld.stars = Math.max(ld.stars, stars); if (E.firstClear && lv.boss) { const W = C.WORLD_REWARD; sv.grant({ chest: W.chest, gems: W.gems, boosts: W.boosts }); d.castleFree += W.castleFree; } }
      sv.grantUnlocks(); sv.syncTierCap();
    }
    { const st = d.stats; st.kills += Math.round(killCost[n - 1] / 6); st.games++; st.towersBuilt += 9; if (win) { st.wins++; if (lv.boss) st.bossKills++; if (hero) st.heroicWins++; if (rnd() < 0.3) st.perfectWins++; } st.earlyStarts += 2; if (d.level > 6 && rnd() < 0.2) st.legendaries++; sv.checkAchievements(); }
    sv.trackDaily({ kills: Math.round(killCost[n - 1] / 6), wins: win ? 1 : 0, boosts: 1, stars: win ? stars : 0, built: 9, upgrades: 11, combo: 18 + Math.floor(rnd() * 20), bosses: lv.boss && win ? 1 : 0, drops: rnd() < 0.6 ? 1 : 0, waves });
    return win;
  };
  const pickLevel = () => {
    const p = sv.progress();
    if (p < N) return [p + 1, false];
    const no3 = L.find((l) => sv.levelData(l.n).stars < 3); if (no3 && rnd() < 0.35) return [no3.n, false];
    const noH = L.find((l) => !sv.levelData(l.n).heroic); if (noH) return [noH.n, true];
    return [1 + Math.floor(rnd() * N), false];
  };
  const caps = () => Object.keys({ ...C.CASTLE.upgrades, ...C.CASTLE.abilities });
  const session = () => {
    sv.checkBuild();
    // constructions : la moins chère disponible (dans la limite du monde atteint)
    const can = caps().filter((id) => d.castle[id] < Math.min(sv.castleDef(id).costs.length, sv.castleCap(id))).sort((a, b) => sv.castleDef(a).costs[d.castle[a]] - sv.castleDef(b).costs[d.castle[b]]);
    while (d.castleFree > 0 && can.length) { const id = can.shift(); d.castleFree--; sv.startBuild(id, true); }
    if (!d.build && can.length) { const id = can[0], c = sv.castleDef(id).costs[d.castle[id]]; if (d.coins >= c) { d.coins -= c; sv.startBuild(id); } }
    // talents : premier nœud disponible, branche par branche
    for (let k = 0; k < 10 && d.talentPts > 0; k++) {
      const opt = Object.entries(C.TALENTS).flatMap(([b, br]) => br.nodes.map((n) => [b, n])).find(([b, n]) => sv.canTalent(b, n));
      if (!opt) break; d.talents[opt[1].id] = sv.talent(opt[1].id) + 1; d.talentPts--;
    }
    // quêtes, passe, coffres d'étoiles, coffres (le joueur achète un coffre en bois à 80 gemmes)
    for (const q of [...d.daily.quests, d.daily.weekly].filter(Boolean)) sv.claimQuest(q);
    for (let t = 1; t <= sv.passTier(); t++) sv.claimPass(t);
    C.WORLDS.forEach((w, wi) => sv.starChests(wi).forEach((c) => c.ready && sv.claimStarChest(wi, c.k)));
    if (d.gems >= C.CHESTS.wood.cost + 20) { d.gems -= C.CHESTS.wood.cost; d.chests.wood++; stats.bought++; }
    for (const k of C.CHEST_ORDER) while (d.chests[k] > 0) sv.openChest(k);
  };
  const stats = { bought: 0 }, rows = [], marks = {};
  const MAXT = Object.values(C.TALENTS).reduce((a, b) => a + b.nodes.reduce((x, n) => x + n.max, 0), 0), MAXC = caps().reduce((a, id) => a + sv.castleDef(id).costs.length, 0);
  for (let day = 1; day <= DAYS; day++) {
    NOW = new RealDate(2026, 0, 4 + day, 8, 0, 0).getTime();
    sv.dailyTick(); sv.claimCalendar(); if (sv.wheelReady()) sv.spinWheel();
    const sessions = [8, 12.5, 18, 21.5]; let g = 0;
    for (let k = 0; k < sessions.length; k++) {
      NOW = new RealDate(2026, 0, 4 + day, Math.floor(sessions[k]), (sessions[k] % 1) * 60, 0).getTime();
      session();
      const nG = Math.round((GAMES * (k + 1)) / sessions.length) - g;
      for (let i = 0; i < nG; i++) { const [n, h] = pickLevel(); play(n, h); g++; }
      session();
    }
    const camp = sv.progress(), tal = talentSpent(), cs = sv.castleSum(), tier = sv.castleTier();
    if (!marks.w1 && camp >= 6) marks.w1 = day; if (!marks.t2 && tier >= 1) marks.t2 = day; if (!marks.camp && camp >= N) marks.camp = day;
    if (!marks.all && tal >= MAXT && cs >= MAXC) marks.all = day;
    rows.push({ day, lvl: d.level, gems: d.gems, coins: d.coins, tal: `${tal}/${MAXT}`, pts: d.talentPts, castle: `${cs}/${MAXC}`, tier: C.CASTLE.tiers.length ? tier + 1 : 0, camp: `${camp}/${N}`, stars: sv.campaignStars(), hero: Object.values(d.levels).filter((l) => l.heroic).length, pass: sv.passTier() });
  }
  const pad = (v, n) => String(v).padStart(n);
  console.log('jour | niv | gemmes | pièces | talents | pts | château | palier | campagne | étoiles | héroïque | passe');
  for (const r of rows) console.log(`${pad(r.day, 4)} | ${pad(r.lvl, 3)} | ${pad(r.gems, 6)} | ${pad(r.coins, 6)} | ${pad(r.tal, 7)} | ${pad(r.pts, 3)} | ${pad(r.castle, 7)} | ${pad(r.tier, 6)} | ${pad(r.camp, 8)} | ${pad(r.stars, 7)} | ${pad(r.hero + '/30', 8)} | ${pad(r.pass + '/30', 5)}`);
  console.log(`\nRepères : monde 1 fini jour ${marks.w1 || '-'} · palier 2 du château jour ${marks.t2 || '-'} · campagne finie jour ${marks.camp || '-'} · tout maxé jour ${marks.all || '-'} · coffres en bois achetés ${stats.bought}`);
})();
