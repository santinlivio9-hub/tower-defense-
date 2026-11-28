// Simulation de progression d'un joueur régulier, jour par jour, avec la VRAIE logique de sauvegarde
// (js/save.js) et la même formule de gains que le jeu (js/economy.js). Rapide : aucune partie n'est jouée,
// l'issue d'un niveau dépend de la « puissance » du joueur (château, talents, niveau) face à la difficulté.
// Usage : node tools/progression.cjs [jours=45] [parties par jour=3] [graine=1]
//   Joueur régulier : 4 sessions par jour, 3 parties, cadeau + roue gratuite + quêtes + passe + coffres d'étoiles,
//   achète un coffre en bois quand il a 80 gemmes, n'accélère pas les constructions.
//   Boosts : il en utilise 1 sur un niveau difficile (2 sur un boss ou un défi héroïque), ce qui l'aide un peu,
//   et rachète en pièces les boosts qui lui manquent (3 de chaque) en gardant de quoi payer le château.
const path = require('path');
const DAYS = +(process.argv[2] || 45), GAMES = +(process.argv[3] || 3), SEED = +(process.argv[4] || 1), REBIRTH = process.argv[5] === 'renaissance';
// tours de roue gratuits par jour (un toutes les 6 h au mieux : 1 h, 7 h, 13 h, 19 h) — variable WHEEL, 4 par défaut
const WHEEL = +(process.env.WHEEL || 4), WHEEL_HOURS = [1, 7, 13, 19].slice(4 - Math.min(4, WHEEL));
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
  // SOURCES=1 : d'où viennent les pièces et les gemmes (niveaux, quotidien, coffres, succès...)
  let SRC = 'autre'; const src = {};
  const track = (k, c, g) => { const o = (src[k] = src[k] || { coins: 0, gems: 0 }); o.coins += c || 0; o.gems += g || 0; };
  { const grant0 = sv.grant.bind(sv); sv.grant = (r) => { track(SRC, r.coins, r.gems); return grant0(r); }; }
  { const open0 = sv.openChest.bind(sv); sv.openChest = (k) => { const c0 = d.coins, g0 = d.gems, r = open0(k); track('coffres (contenu)', d.coins - c0, d.gems - g0); return r; }; }
  const L = C.LEVELS, N = L.length;
  // coût total des ennemis d'un niveau (base de l'XP) : calculé depuis les vraies vagues
  const killCost = L.map((lv) => { let c = 0; for (let w = 1; w <= lv.waves; w++) for (const g of buildWave(w, lv, 1).groups) c += C.ENEMIES[g.type].boss ? 60 : C.ENEMIES[g.type].cost * g.count; return c; });
  const talentSpent = () => Object.values(d.talents).reduce((a, b) => a + b, 0);
  // Chances de victoire calées sur le robot (tools/simulate.cjs) : il gagne chaque niveau du monde w avec un
  // investissement moyen (rang du château et des talents, de 0 à 5) égal à w - 1, et il lui faut le maximum (5)
  // dans les mondes futuristes. Le joueur simulé joue un peu moins bien que le robot (SKILL) : il gagne à coup sûr
  // avec l'investissement requis, de moins en moins souvent en dessous, et un peu plus souvent avec le niveau.
  const MAXC0 = Object.keys({ ...C.CASTLE.upgrades, ...C.CASTLE.abilities }).reduce((a, id) => a + (C.CASTLE.upgrades[id] || C.CASTLE.abilities[id]).costs.length, 0);
  const MAXT0 = Object.values(C.TALENTS).reduce((a, b) => a + b.nodes.reduce((x, n) => x + n.max, 0), 0);
  const inv = () => 5 * (0.6 * sv.castleSum() / MAXC0 + 0.4 * talentSpent() / MAXT0) + d.level * 0.02;
  const req = (n, hero) => { const lv = L[n - 1]; return Math.min(5, lv.world) * (0.75 + 0.25 * (lv.idx / (C.PER_WORLD - 1))) + (lv.boss ? 0.4 : 0) + (hero ? 0.8 : 0); };
  const SKILL = 0.92;
  const winP = (n, hero) => Math.max(0.06, Math.min(0.96, SKILL - 0.06 * (L[n - 1].world >= 5 ? 1 : 0) + 0.32 * (inv() - req(n, hero))));
  const COIN_BOOSTS = C.BOOST_ORDER.filter((id) => (C.BOOSTS[id].cur || 'gems') === 'coins');
  const useBoosts = (k) => { let used = 0; for (const id of [...C.BOOST_ORDER].sort((a, b) => (d.boosts[b] || 0) - (d.boosts[a] || 0))) { if (used >= k) break; if (id !== 'revive' && (d.boosts[id] || 0) > 0) { d.boosts[id]--; used++; stats.used++; } } return used; };
  // SNAP=fichier : état du joueur (château, talents, niveau) à sa 1re tentative de chaque niveau (pour tools/balance.cjs win)
  const snaps = {};
  const play = (n, hero) => {
    { const k = n + (hero ? 'h' : ''); if (!snaps[k]) snaps[k] = { day: Math.ceil((NOW - new RealDate(2026, 0, 5).getTime()) / 86400000), level: d.level, castle: { ...d.castle }, talents: { ...d.talents }, boosts: { ...d.boosts }, rank: sv.rank() }; }
    const lv = L[n - 1], ld = sv.levelData(n), p0 = winP(n, hero);
    const used = lv.boss || hero ? useBoosts(2) : p0 < 0.85 ? useBoosts(1) : 0;
    const p = Math.min(0.97, p0 + 0.05 * used), win = rnd() < p;
    // étoiles par objectifs : gagner, aucun PV perdu (plus probable avec de la marge), 3e objectif (une fois sur trois)
    const stars = win ? 1 + (rnd() < p - 0.15 ? 1 : 0) + (rnd() < 0.35 ? 1 : 0) : 0, waves = win ? lv.waves : Math.floor(lv.waves * (0.4 + rnd() * 0.5));
    const E = levelRewards({ rebirthMult: sv.rewardMult(), victory: win, stars: Math.max(stars, ld.stars), prevStars: ld.stars, wavesDone: waves, boss: lv.boss, hero, heroDone: !!ld.heroic, killCost: killCost[n - 1] * (win ? 1 : waves / lv.waves), gemMult: sv.mods().gemMult });
    d.coins += E.coins; d.gems += E.gems; track('niveaux', E.coins, E.gems); SRC = 'niveau de joueur'; sv.addXp(E.xp); sv.addPass(E.pass); SRC = 'niveaux';
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
    can.splice(0, can.length, ...caps().filter((id) => d.castle[id] < Math.min(sv.castleDef(id).costs.length, sv.castleCap(id))).sort((a, b) => sv.castleDef(a).costs[d.castle[a]] - sv.castleDef(b).costs[d.castle[b]]));
    if (!d.build && can.length) { const id = can[0], c = sv.castleDef(id).costs[d.castle[id]]; if (d.coins >= c) { d.coins -= c; sv.startBuild(id); } }
    // talents : premier nœud disponible, branche par branche
    for (let k = 0; k < 10 && d.talentPts > 0; k++) {
      const opt = Object.entries(C.TALENTS).flatMap(([b, br]) => br.nodes.map((n) => [b, n])).find(([b, n]) => sv.canTalent(b, n));
      if (!opt) break; d.talents[opt[1].id] = sv.talent(opt[1].id) + 1; d.talentPts--;
    }
    // quêtes, passe, coffres d'étoiles, coffres (le joueur achète un coffre en bois à 80 gemmes)
    SRC = 'quêtes'; for (const q of [...d.daily.quests, d.daily.weekly].filter(Boolean)) sv.claimQuest(q);
    SRC = 'succès'; for (const st of sv.achievementSteps()) sv.claimAchievement(st.key);   // succès récupérés
    SRC = 'passe'; for (let t = 1; t <= sv.passTier(); t++) sv.claimPass(t);
    SRC = 'coffres d\'étoiles'; C.WORLDS.forEach((w, wi) => sv.starChests(wi).forEach((c) => c.ready && sv.claimStarChest(wi, c.k)));
    SRC = 'niveaux';
    // gemmes : garde une réserve de 30 ; échange contre des pièces quand le château attend des pièces, sinon coffre en bois
    { const left = caps().filter((id) => d.castle[id] < Math.min(sv.castleDef(id).costs.length, sv.castleCap(id))), need = left.length ? Math.min(...left.map((id) => sv.castleDef(id).costs[d.castle[id]])) : 0;
      const P = C.SHOP.exchange.packs;
      if (need > d.coins && d.gems >= P[1].gems + 30) { d.gems -= P[1].gems; d.coins += C.exchangeCoins(P[1], sv.worldReached()); stats.xch++; stats.gemsSpent += P[1].gems; }
      else if (d.gems >= C.CHESTS.wood.cost + 30) { d.gems -= C.CHESTS.wood.cost; d.chests.wood++; stats.bought++; stats.gemsSpent += C.CHESTS.wood.cost; } }
    // boosts en pièces : complète son stock (3 de chaque) en gardant de quoi payer la prochaine construction
    { const left = caps().filter((id) => d.castle[id] < Math.min(sv.castleDef(id).costs.length, sv.castleCap(id))), reserve = left.length ? Math.min(...left.map((id) => sv.castleDef(id).costs[d.castle[id]])) : 600;
      for (let k = 0; k < 12; k++) { const id = COIN_BOOSTS.filter((b) => (d.boosts[b] || 0) < 3).sort((a, b) => (d.boosts[a] || 0) - (d.boosts[b] || 0))[0]; if (!id) break; const c = C.boostCost(id, sv.worldReached()); if (d.coins - c < reserve) break; d.coins -= c; d.boosts[id] = (d.boosts[id] || 0) + 1; stats.boostBuys++; stats.boostCoins += c; } }
    { const left = caps().filter((id) => d.castle[id] < Math.min(sv.castleDef(id).costs.length, sv.castleCap(id))), reserve = left.length ? Math.min(...left.map((id) => sv.castleDef(id).costs[d.castle[id]])) * 1.2 : 1500;
      for (let k = 0; k < 6; k++) { const c = C.chestCoinCost('gold', sv.worldReached()); if (d.coins - c < reserve) break; d.coins -= c; d.chests.gold++; stats.coinChests++; stats.coinsChests += c; } }
    for (const k of C.CHEST_ORDER) while (d.chests[k] > 0) sv.openChest(k);
  };
  const stats = { bought: 0, used: 0, boostBuys: 0, boostCoins: 0, spins: 0, xch: 0, gemsSpent: 0, coinChests: 0, coinsChests: 0 }, rows = [], marks = {};
  const MAXT = Object.values(C.TALENTS).reduce((a, b) => a + b.nodes.reduce((x, n) => x + n.max, 0), 0), MAXC = caps().reduce((a, id) => a + sv.castleDef(id).costs.length, 0);
  for (let day = 1; day <= DAYS; day++) {
    NOW = new RealDate(2026, 0, 4 + day, 8, 0, 0).getTime();
    sv.dailyTick(); SRC = 'cadeau du jour'; sv.claimCalendar();
    SRC = 'roue'; for (const h of WHEEL_HOURS) { NOW = new RealDate(2026, 0, 4 + day, h, 0, 0).getTime(); if (sv.wheelReady()) { sv.spinWheel(); stats.spins++; } }
    SRC = 'niveaux';
    NOW = new RealDate(2026, 0, 4 + day, 8, 0, 0).getTime();
    // variante « renaissance » : le joueur renaît 2 jours après l'avoir débloquée (pièces converties en éclats)
    if (REBIRTH && marks.rb && day >= marks.rb + 2 && sv.rebirthReady()) { const r = sv.doRebirth(); (marks.rebirths = marks.rebirths || []).push(`jour ${day} : rang ${r.rank}, ${r.shards} éclats dont ${r.fromCoins} pour les pièces`); marks.rb = null; marks.rbGain = null; }
    const sessions = [8, 12.5, 18, 21.5]; let g = 0;
    for (let k = 0; k < sessions.length; k++) {
      NOW = new RealDate(2026, 0, 4 + day, Math.floor(sessions[k]), (sessions[k] % 1) * 60, 0).getTime();
      session();
      const nG = Math.round((GAMES * (k + 1)) / sessions.length) - g;
      for (let i = 0; i < nG; i++) { const [n, h] = pickLevel(); play(n, h); g++; }
      session();
    }
    const camp = sv.progress(), tal = talentSpent(), cs = sv.castleSum(), tier = sv.castleTier();
    if (!marks.w1 && camp >= C.PER_WORLD) marks.w1 = day; if (!marks.w5 && camp >= 5 * C.PER_WORLD) marks.w5 = day; if (!marks.t2 && tier >= 1) marks.t2 = day; if (!marks.camp && camp >= N) marks.camp = day;
    if (!marks.all && tal >= MAXT && cs >= MAXC) marks.all = day;
    if (!marks.rb && sv.rebirthReady()) { marks.rb = day; marks.rbGain = sv.rebirthGain(); }
    if (marks.rebirths && !marks.shown) { marks.shown = 1; }
    rows.push({ day, lvl: d.level, gems: d.gems, coins: d.coins, tal: `${tal}/${MAXT}`, pts: d.talentPts, castle: `${cs}/${MAXC}`, tier: C.CASTLE.tiers.length ? tier + 1 : 0, camp: `${camp}/${N}`, stars: sv.campaignStars(), hero: Object.values(d.levels).filter((l) => l.heroic).length, pass: sv.passTier() });
  }
  if (process.env.SNAP) require('fs').writeFileSync(process.env.SNAP, JSON.stringify(snaps));
  if (process.env.SOURCES) {
    const tot = Object.values(src).reduce((a, o) => ({ coins: a.coins + o.coins, gems: a.gems + o.gems }), { coins: 0, gems: 0 });
    const daily = ['cadeau du jour', 'roue', 'quêtes', 'passe'].reduce((a, k) => ({ coins: a.coins + ((src[k] || {}).coins || 0), gems: a.gems + ((src[k] || {}).gems || 0) }), { coins: 0, gems: 0 });
    console.log('\nSources de gains sur ' + DAYS + ' jours (pièces | gemmes) :');
    for (const [k, o] of Object.entries(src).sort((a, b) => b[1].coins - a[1].coins)) console.log(`  ${k.padEnd(20)} ${String(Math.round(o.coins)).padStart(8)} (${((o.coins / tot.coins) * 100).toFixed(0).padStart(2)} %) | ${String(Math.round(o.gems)).padStart(6)} (${((o.gems / tot.gems) * 100).toFixed(0).padStart(2)} %)`);
    console.log(`  Récompenses quotidiennes (cadeau, roue, quêtes, passe) : ${((daily.coins / tot.coins) * 100).toFixed(0)} % des pièces, ${((daily.gems / tot.gems) * 100).toFixed(0)} % des gemmes`);
  }
  const pad = (v, n) => String(v).padStart(n);
  const show = rows.filter((r) => r.day <= 7 || r.day % 3 === 0 || r.day === DAYS);
  console.log('jour | niv | gemmes | pièces | talents | pts | château | palier | campagne | étoiles | héroïque | passe');
  for (const r of show) console.log(`${pad(r.day, 4)} | ${pad(r.lvl, 3)} | ${pad(r.gems, 6)} | ${pad(r.coins, 6)} | ${pad(r.tal, 7)} | ${pad(r.pts, 3)} | ${pad(r.castle, 7)} | ${pad(r.tier, 6)} | ${pad(r.camp, 8)} | ${pad(r.stars, 7)} | ${pad(r.hero + '/' + N, 8)} | ${pad(r.pass + '/' + C.PASS.tiers, 5)}`);
  console.log(`\nRepères : monde 1 fini jour ${marks.w1 || '-'} · palier 2 du château jour ${marks.t2 || '-'} · 5 mondes jour ${marks.w5 || '-'} · campagne finie jour ${marks.camp || '-'} · tout maxé jour ${marks.all || '-'} · coffres en bois achetés ${stats.bought}`);
  console.log(`Gemmes : ${stats.gemsSpent + d.gems} gagnées, ${stats.gemsSpent} dépensées (${stats.bought} coffres en bois, ${stats.xch} échanges contre des pièces) · coffres dorés achetés en pièces : ${stats.coinChests} (${stats.coinsChests} pièces)`);
  console.log(`Roue : ${stats.spins} tours gratuits (${(stats.spins / DAYS).toFixed(1)} par jour)`);
  console.log(`Boosts : ${stats.used} utilisés, ${stats.boostBuys} achetés en pièces (${stats.boostCoins} pièces) · pièces en fin de simulation ${d.coins}`);
  if (marks.rebirths) console.log('Renaissances : ' + marks.rebirths.join(' · '));
  if (marks.rbGain) console.log(`Renaissance possible dès le jour ${marks.rb} : ${marks.rbGain.shards} éclats ce jour-là (dont ${marks.rbGain.fromCoins} pour les pièces) ; au jour ${DAYS} : ${sv.rebirthGain().shards} éclats (dont ${sv.rebirthGain().fromCoins} pour ${d.coins} pièces)`);
})();
