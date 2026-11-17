// Tests de la sauvegarde (sans navigateur) :  node tools/save-test.cjs
// anciennes versions, valeurs abîmées, JSON illisible + copie de secours, export / import, réinitialisation annulable.
const path = require('path'); const root = 'file://' + path.resolve(__dirname, '..') + '/js/';
let store = {}; global.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.btoa = (s) => Buffer.from(s, 'binary').toString('base64'); global.atob = (s) => Buffer.from(s, 'base64').toString('binary');
const KEY = 'brainrot-bastion-save-v1'; let bad = 0;
const ok = (c, m) => { if (!c) bad++; console.log(c ? 'ok ' : 'KO ', m); };
(async () => {
  const { Save } = await import(root + 'save.js');
  const fresh = (o) => { store = {}; if (o !== undefined) store[KEY] = typeof o === 'string' ? o : JSON.stringify(o); return new Save(); };
  let s = fresh(); ok(s.data.v === 2 && s.data.level === 1 && s.recovered === null, 'première ouverture : sauvegarde neuve');
  // 1re version du jeu : 3 cartes, 3 difficultés, bonus permanents
  s = fresh({ gems: 120, towers: ['assault', 'smg', 'sniper'], perks: { damage: 2, money: 1 }, maps: { meadow: { stars: { easy: 3, normal: 2 } }, desert: { stars: { easy: 1 } } }, stats: { kills: 900, hardWins: 2 }, settings: { muted: true } });
  ok(s.data.v === 2 && s.data.gems >= 120 && s.data.towers.includes('sniper') && s.data.settings.muted === true && s.data.stats.kills === 900 && s.data.stats.heroicWins === 2, 'ancienne sauvegarde (v1) convertie sans rien perdre');
  ok(JSON.parse(store[KEY]).v === 2, 'conversion écrite tout de suite');
  // v2 d'avant les pièces, les coffres, le passe, les constructions
  s = fresh({ v: 2, gems: 40, towers: ['assault', 'smg'], levels: { 1: { stars: 3, best: 500 }, 2: { stars: 2, best: 300 } }, castle: { walls: 2 }, stats: { kills: 50 }, settings: { volume: 0.3 } });
  ok(s.data.coins > 0 && s.data.castle.walls === 2 && s.data.castle.gold === 0 && s.data.pass.pts === 0 && s.data.build === null && s.data.settings.sfxVol === 0.3 && s.data.settings.musicVol === 0.3 && s.data.settings.volume === undefined && s.data.levels[1].stars === 3, 'v2 ancienne : champs manquants complétés, existant conservé');
  ok(s.data.towers.includes('shotgun'), 'déblocages de la campagne rattrapés (pompe après 1-1)');
  s = fresh({ v: 2, settings: { volume: 0.9, music: false } }); ok(s.data.settings.sfxVol === 0.9 && s.data.settings.musicVol === 0, 'musique coupée avant : volume Musique à 0, Effets repris');
  // campagne à 6 niveaux par monde -> 10 : chaque niveau garde sa place, le boss reste le boss, rien ne bloque
  { const lv = {}; for (let n = 1; n <= 8; n++) lv[n] = { stars: n === 6 ? 2 : 3, best: n, heroic: 0, heroicBest: 0 };
    s = fresh({ v: 2, levels: lv, avatar: 9, towers: ['assault', 'smg'] }); const d = s.data;
    ok(d.lpw === 10 && Object.keys(d.levels).join() === '1,2,3,4,5,10,11,12' && d.levels[10].stars === 2 && d.levels[12].best === 8, 'campagne 6 -> 10 niveaux : niveaux et boss replacés, étoiles gardées');
    ok(s.progress() === 12 && s.worldsDone() === 1 && s.levelUnlocked(7) && s.levelUnlocked(13) && !s.levelUnlocked(14) && s.skipped().join() === '6,7,8,9', 'nouveaux niveaux 1-6 à 1-9 ouverts sans rien bloquer');
    ok(d.avatar === 13 && d.towers.includes('cryo') && d.towers.includes('sniper'), 'avatar replacé, déblocages rattrapés');
    const again = new Save(); ok(Object.keys(again.data.levels).join() === '1,2,3,4,5,10,11,12', 'pas de double conversion au rechargement'); }
  // valeurs abîmées
  s = fresh({ v: 2, gems: null, coins: 'abc', xp: NaN, level: 0, talentPts: -3, castle: { walls: null }, levels: { 1: { stars: 2 } }, towers: 'x', achievements: null });
  ok(s.data.gems === 0 && Number.isFinite(s.data.coins) && s.data.xp === 0 && s.data.level === 1 && s.data.talentPts === 0 && s.data.castle.walls === 0 && Array.isArray(s.data.towers) && s.data.levels[1].stars === 2, 'valeurs abîmées réparées, étoiles conservées');
  // JSON illisible, avec puis sans copie de secours
  s = fresh({ v: 2, gems: 77, levels: { 1: { stars: 3 } } }); ok(!!store[KEY + '-bak1'], 'copie de secours créée à l\'ouverture');
  store[KEY] = '{"v":2,"gems":7'; s = new Save();
  ok(s.recovered === 'backup' && s.data.gems === 77 && s.data.levels[1].stars === 3 && store[KEY + '-broken'] === '{"v":2,"gems":7', 'sauvegarde illisible : copie de secours chargée, original mis de côté');
  s = fresh('pas du json'); ok(s.recovered === 'lost' && store[KEY + '-broken'] === 'pas du json' && s.data.level === 1, 'illisible sans copie : jeu neuf, original gardé de côté');
  s = fresh('[1,2]'); ok(s.data.v === 2 && s.data.level === 1, 'JSON valide mais pas une sauvegarde : pas de plantage');
  // export / import
  s = fresh({ v: 2, gems: 321, coins: 999, levels: { 1: { stars: 3, best: 1 }, 2: { stars: 1, best: 1 } }, castle: { walls: 3 }, skins: ['default', 'néon'] });
  const txt = s.exportText(); const t = fresh(); ok(t.importText(txt) && t.data.gems === 321 && t.data.coins === 999 && t.data.castle.walls === 3 && t.data.levels[2].stars === 1 && t.data.skins.includes('néon'), 'export puis import : progression identique (accents compris)');
  ok(t.hasUndo() && t.restoreUndo() && t.data.gems === 0, 'import annulable');
  ok(!t.importText('n\'importe quoi') && !t.importText('BRAINROT1:@@@') && !t.importText('{"a":1}') && t.data.gems === 0, 'import invalide refusé, progression intacte');
  // réinitialisation annulable
  s = fresh({ v: 2, gems: 55, levels: { 1: { stars: 2 } } }); s.reset(); ok(s.data.gems === 0 && s.hasUndo(), 'réinitialisation : état d\'avant gardé');
  ok(s.restoreUndo() && s.data.gems === 55 && s.data.levels[1].stars === 2 && !s.hasUndo(), 'annulation : tout revient');
  // Renaissance : ce qui part, ce qui reste, ce qu'on gagne
  { const lv = {}; for (let n = 1; n <= 80; n++) lv[n] = { stars: 3, best: 1, heroic: n % 10 === 0 ? 1 : 0, heroicBest: 0 };
    s = fresh({ v: 2, lpw: 10, levels: lv, gems: 300, coins: 9000, level: 30, xp: 50, talents: { dmg: 3, rate: 2 }, talentPts: 1, castle: { walls: 5, gold: 2 }, skins: ['default', 'neon'], achievements: ['first'], boosts: { coins2: 4 }, seen: { enemies: ['basic'], towers: [] } });
    const d = s.data; ok(s.rebirthReady() && s.rebirthGain().shards === 20 + 240 + 8 * 3 + 36 && s.rebirthGain().fromCoins === 36, 'Renaissance disponible, éclats = base + étoiles + héroïques + pièces converties (9000 / 250)');
    const r = s.doRebirth();
    ok(r && d.rebirth.rank === 1 && d.rebirth.shards === 320 && Object.keys(d.levels).length === 0 && s.castleSum() === 0 && d.coins === 150 && d.talentPts === 6 && Object.keys(d.talents).length === 0, 'remise à zéro : campagne, château, pièces ; points de talent rendus');
    ok(d.gems === 300 && d.level === 30 && d.skins.includes('neon') && d.achievements.includes('first') && d.boosts.coins2 === 4 && d.towers.includes('drone') && d.seen.enemies.includes('basic'), 'gardés : gemmes, niveau, skins, succès, boosts, tourelles, collection');
    ok(s.endlessUnlocked() && s.legendOk('drone') && !s.rebirthReady() && s.levelUnlocked(1) && !s.levelUnlocked(2), 'mode infini et légendaires gardés, campagne à refaire');
    ok(Math.abs(s.mods().damage - 1.05 * (1 + 3 * 0.05)) < 0.01 || s.mods().damage > 1, 'bonus permanent de dégâts');
    ok(s.buyRebirth('mk2_smg') && s.owns('mk2_smg') && d.rebirth.shards === 210 && !s.buyRebirth('mk2_smg'), 'boutique d\'éclats : achat unique');
    ok(s.buyRebirth('skin_phoenix') && d.skins.includes('phoenix'), 'skin de Renaissance ajouté aux skins');
    const again = new Save(); ok(again.rank() === 1 && again.owns('mk2_smg'), 'Renaissance enregistrée'); }
  // roue : un tour gratuit toutes les 6 h ; ancienne sauvegarde (date du jour) : tour disponible ; tour bonus sans effet sur le minuteur
  { const realNow = Date.now; let t = realNow(); Date.now = () => t;
    s = fresh({ v: 2, lpw: 10, daily: { day: '', streak: 0, cal: 0, calDay: '', quests: [], wheel: new Date().toDateString(), chDay: '', week: '', weekly: null, popped: '', offer: '' } });
    ok(s.wheelReady(), 'roue : ancienne sauvegarde (tour du jour déjà pris) -> tour gratuit disponible');
    const r = s.spinWheel(); ok(r && !s.wheelReady() && Math.abs(s.wheelLeft() - 6 * 3600000) < 1000, 'roue : après un tour gratuit, prochain dans 6 h');
    t += 3 * 3600000; s.spinWheel(false); ok(!s.wheelReady() && Math.abs(s.wheelLeft() - 3 * 3600000) < 1000, 'roue : un tour bonus ne repousse pas le tour gratuit');
    t += 3 * 3600000 + 1000; ok(s.wheelReady(), 'roue : tour gratuit de nouveau disponible 6 h après');
    s.data.daily.wheelAt = t + 48 * 3600000; ok(s.wheelLeft() <= 6 * 3600000, 'roue : horloge reculée, jamais bloquée plus de 6 h');
    Date.now = realNow; }
  // talents : anciens points conservés (mêmes identifiants), respécialisation contre des gemmes
  { s = fresh({ v: 2, lpw: 10, level: 30, gems: 70, talents: { dmg: 5, rate: 2, slot: 1, lives: 3, cd: 2, dur: 1 }, talentPts: 2 });
    const d = s.data, n = s.talentsSpent();
    ok(n === 14 && d.talents.slot === 1 && s.mods().slots === 1 && d.talentPts === 2, 'talents : points déjà placés conservés (Sacoche comprise)');
    ok(s.respec() === 14 && d.talentPts === 16 && d.gems === 20 && s.talentsSpent() === 0, 'respécialisation : 14 points rendus contre 50 gemmes');
    d.talents = { dmg: 1 }; ok(s.respec() === 0 && d.talents.dmg === 1 && d.gems === 20, 'respécialisation refusée sans assez de gemmes, rien de perdu'); }
  // succès : anciens succès (déjà payés) conservés comme étapes récupérées ; les autres étapes atteintes sont à récupérer
  { s = fresh({ v: 2, lpw: 10, gems: 40, achievements: ['kills1000', 'boss1', 'win1'], stats: { kills: 12000, bossKills: 3, chests: 6 } });
    const d = s.data;
    ok(d.ach.claimed.includes('kills:0') && d.ach.claimed.includes('bosses:0') && !d.ach.claimed.includes('kills:1'), 'succès : anciens succès repris comme étapes déjà récompensées');
    const ready = s.achievementsReady(), g0 = d.gems, c0 = d.coins, r = s.claimAchievement('kills:1');
    ok(ready >= 2 && r && d.gems === g0 + 8 && d.coins === c0 + 600 && !s.claimAchievement('kills:1') && !s.claimAchievement('kills:2'), `succès : étape argent récupérée une seule fois (${ready} à récupérer), étape non atteinte refusée`);
    ok(s.achievementTotal() >= 48 && s.achievementTotal() <= 60, `succès : ${s.achievementTotal()} étapes au total`); }
  // stockage plein
  s = fresh({ v: 2, gems: 5 }); const set = localStorage.setItem; localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
  ok(s.persist() === false && s.saveFailed === true, 'stockage plein : échec signalé, pas de plantage'); localStorage.setItem = set;
  console.log(bad ? `${bad} KO` : 'Sauvegarde : tous les tests passent'); process.exit(bad ? 1 : 0);
})();
