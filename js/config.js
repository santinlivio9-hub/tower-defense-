// ============================================================================
//  CONFIG — toutes les valeurs d'équilibrage du jeu sont ici.
//  Voir le README pour le détail de chaque champ.
// ============================================================================

export const VIEW = { W: 600, H: 940 };    // zone jouable en portrait (le décor se prolonge autour pour remplir l'écran)

export const GAME = {
  sellRatio: 0.7,          // revente : 70 % de l'investissement
  critChance: 0.08,        // chance de critique de base
  critMult: 2,             // multiplicateur de critique de base
  interWaveTime: 12,       // secondes avant le lancement auto de la vague suivante
  overlapTime: 40,         // si des ennemis restent : la vague suivante part quand même après ce délai
  earlyBonusPerSec: 2,     // pièces par seconde restante si on lance en avance
  earlyBonusAlive: 15,     // bonus si on lance alors que des ennemis sont encore en vie
  waveBonusBase: 24,       // pièces de fin de vague = base + parVague * n
  waveBonusPerWave: 4,
  pathWidth: 64,
  towerRadius: 26,
  bossEvery: 10,           // mode infini : un boss toutes les 10 vagues
  rewardMult: 0.85,        // multiplicateur global des pièces par kill
  stealthRevealRange: 85,  // toute tourelle révèle les invisibles à bout portant (px)
  stealthRevealOnHit: 1.5, // secondes de révélation après un dégât (zone, brûlure, cryo)
};

// Raretés (niveau 1 → 5)
export const RARITY = [
  { name: 'Commun', color: '#a3acb8' },
  { name: 'Atypique', color: '#4cd137' },
  { name: 'Rare', color: '#3d9dfc' },
  { name: 'Épique', color: '#b05cff' },
  { name: 'Légendaire', color: '#ffc531' },
];

// ----------------------------------------------------------------------------
//  TOURELLES
//  base      : stats de niveau 1
//  upgrades  : niveaux 2 et 3 (communs)
//  branches  : 2 choix exclusifs au niveau 4 ; "master" = niveau 5 (doré)
//  Modificateurs : "xxxMul" multiplie la stat xxx, "xxxAdd" l'additionne,
//                  sinon la valeur remplace la stat.
//  Stats : damage, rate (tirs/s), range (px), pellets, spread (rad), splash (px),
//          slow (0-1), slowDur, pierce, ignoreArmor, detect, crit, critMult,
//          burn (dégâts/s), burnDur, barrels, homing, knockback, stun,
//          freezeChance, freezeDur, vuln, cluster, spinUp, minRate, projSpeed
// ----------------------------------------------------------------------------
const UP = (cost, d = 1.35, r = 1.1, g = 1.06) => ({ cost, damageMul: d, rateMul: r, rangeMul: g });

export const TOWERS = {
  assault: {
    name: "Fusil d'assaut", desc: 'Polyvalent, cadence moyenne.', cost: 100, kind: 'bullet', targeting: 'first',
    base: { damage: 11, rate: 3.2, range: 175 },
    upgrades: [UP(70), UP(125)],
    branches: [
      { name: 'Rafale', desc: 'Cadence de tir +75 %.', cost: 260, mods: { rateMul: 1.75 },
        master: { name: 'Tempête de plomb', desc: 'Dégâts +50 %, cadence +20 %.', cost: 430, mods: { damageMul: 1.5, rateMul: 1.2 } } },
      { name: 'Balles traçantes', desc: 'Révèle les invisibles, +25 % de critiques (x3), portée +15 %.', cost: 240,
        mods: { critAdd: 0.25, critMult: 3, detect: true, rangeMul: 1.15 },
        master: { name: 'Œil de lynx', desc: 'Dégâts +50 %, critiques +15 %.', cost: 400, mods: { damageMul: 1.5, critAdd: 0.15 } } },
    ],
  },
  smg: {
    name: 'Mitraillette', desc: 'Très rapide, faibles dégâts, courte portée.', cost: 85, kind: 'bullet', targeting: 'first',
    base: { damage: 4.5, rate: 9, range: 120 },
    upgrades: [UP(60), UP(105)],
    branches: [
      { name: 'Balles perforantes', desc: 'Traverse 2 ennemis et ignore le blindage.', cost: 220,
        mods: { pierce: 2, ignoreArmor: true, damageMul: 1.3 },
        master: { name: 'Perce-tout', desc: 'Traverse 4 ennemis, dégâts +50 %.', cost: 380, mods: { pierce: 4, damageMul: 1.5 } } },
      { name: 'Double canon', desc: 'Tire 2 balles à la fois.', cost: 240, mods: { barrels: 2, rateMul: 1.1 },
        master: { name: 'Triple canon', desc: '3 balles à la fois, dégâts +20 %.', cost: 420, mods: { barrels: 3, damageMul: 1.2 } } },
    ],
  },
  shotgun: {
    name: 'Pompe', desc: 'Cône de plombs à courte portée, repousse.', cost: 130, kind: 'shotgun', targeting: 'close',
    base: { damage: 8, pellets: 6, spread: 0.6, rate: 0.95, range: 115, knockback: 6 },
    upgrades: [UP(85), UP(150)],
    branches: [
      { name: 'Souffle du dragon', desc: 'Les plombs enflamment les ennemis.', cost: 280,
        mods: { burn: 14, burnDur: 3, damageMul: 1.2 },
        master: { name: 'Brasier', desc: 'Brûlure x2, +2 plombs.', cost: 440, mods: { burnMul: 2, pelletsAdd: 2 } } },
      { name: 'Canon long', desc: 'Portée +60 %, cône resserré, dégâts +50 %, gros recul.', cost: 270,
        mods: { rangeMul: 1.6, spreadMul: 0.5, damageMul: 1.5, knockback: 14 },
        master: { name: 'Chasseur de gros', desc: 'Dégâts +60 %, cadence +25 %.', cost: 440, mods: { damageMul: 1.6, rateMul: 1.25 } } },
    ],
  },
  sniper: {
    name: 'Sniper', desc: 'Très longue portée, gros dégâts, lent. Vise les plus forts.', cost: 220, kind: 'bullet', targeting: 'strong',
    base: { damage: 95, rate: 0.45, range: 430, crit: 0.2 },
    upgrades: [UP(140), UP(240)],
    branches: [
      { name: 'Calibre lourd', desc: 'Dégâts x2,2, ignore le blindage, sonne la cible.', cost: 480,
        mods: { damageMul: 2.2, ignoreArmor: true, stun: 0.4 },
        master: { name: 'Tueur de boss', desc: 'Dégâts +70 %, x1,5 contre les boss.', cost: 750, mods: { damageMul: 1.7, bossMul: 1.5 } } },
      { name: 'Lunette thermique', desc: 'Révèle les invisibles, cadence +80 %.', cost: 420,
        mods: { detect: true, rateMul: 1.8, rangeMul: 1.15 },
        master: { name: 'Semi-auto', desc: 'Cadence +40 %, critiques +30 %.', cost: 680, mods: { rateMul: 1.4, critAdd: 0.3 } } },
    ],
  },
  rocket: {
    name: 'Lance-roquettes', desc: 'Explosion de zone.', cost: 280, kind: 'rocket', targeting: 'first',
    base: { damage: 50, rate: 0.5, range: 230, splash: 70, projSpeed: 380 },
    upgrades: [UP(170), UP(290)],
    branches: [
      { name: 'Fragmentation', desc: "L'explosion libère 4 sous-munitions.", cost: 520,
        mods: { cluster: 4, splashMul: 1.2 },
        master: { name: 'Tapis de bombes', desc: '7 sous-munitions, dégâts +50 %.', cost: 820, mods: { cluster: 7, damageMul: 1.5 } } },
      { name: 'Missile guidé', desc: 'Missiles à tête chercheuse, cadence +60 %, portée +20 %.', cost: 500,
        mods: { homing: true, rateMul: 1.6, projSpeedMul: 1.5, damageMul: 1.25, rangeMul: 1.2 },
        master: { name: 'Salve', desc: 'Cadence +30 %, dégâts +50 %.', cost: 800, mods: { rateMul: 1.3, damageMul: 1.5 } } },
    ],
  },
  minigun: {
    name: 'Minigun', desc: 'Monte en cadence puis déluge de balles.', cost: 400, kind: 'bullet', targeting: 'first',
    base: { damage: 6, rate: 15, minRate: 2, spinUp: 3, range: 175 },
    upgrades: [UP(240), UP(400)],
    branches: [
      { name: 'Surchauffe', desc: 'Cadence max +50 %, montée 2x plus rapide.', cost: 680,
        mods: { rateMul: 1.5, spinUpMul: 0.5 },
        master: { name: 'Fusion', desc: 'Cadence +25 %, dégâts +40 %.', cost: 1000, mods: { rateMul: 1.25, damageMul: 1.4 } } },
      { name: 'Balles incendiaires', desc: 'Enflamme les ennemis, dégâts +20 %.', cost: 640,
        mods: { burn: 20, burnDur: 2, damageMul: 1.2 },
        master: { name: 'Enfer', desc: 'Brûlure x2, dégâts +30 %.', cost: 950, mods: { burnMul: 2, damageMul: 1.3 } } },
    ],
  },
  cryo: {
    name: 'Tourelle cryo', desc: 'Onde de froid qui ralentit tous les ennemis proches.', cost: 150, kind: 'cryo', targeting: null,
    base: { damage: 3, rate: 1.1, range: 120, slow: 0.4, slowDur: 1.6 },
    upgrades: [
      { cost: 100, damageMul: 1.5, rangeMul: 1.1, slowAdd: 0.05 },
      { cost: 170, damageMul: 1.5, rangeMul: 1.1, slowAdd: 0.05, rateMul: 1.15 },
    ],
    branches: [
      { name: 'Zéro absolu', desc: '20 % de chance de geler complètement les ennemis.', cost: 320,
        mods: { freezeChance: 0.2, freezeDur: 1.2, slowAdd: 0.1 },
        master: { name: 'Ère glaciaire', desc: 'Gel à 35 %, portée +20 %.', cost: 520, mods: { freezeChance: 0.35, rangeMul: 1.2 } } },
      { name: 'Givre fragilisant', desc: 'Les ennemis touchés subissent +30 % de dégâts. Révèle les invisibles.', cost: 340,
        mods: { vuln: 0.3, detect: true, damageMul: 3 },
        master: { name: 'Cristal brisé', desc: 'Fragilité +50 %, portée +20 %.', cost: 540, mods: { vuln: 0.5, rangeMul: 1.2 } } },
    ],
  },
  mine: {
    name: 'Mine', desc: 'Piège posé sur une zone marquée du chemin. Explose puis se réarme. Inefficace contre les volants.', cost: 70, kind: 'mine', targeting: null,
    // rate = réarmements par seconde ; range = rayon de déclenchement ; splash = rayon d'explosion
    base: { damage: 75, rate: 0.15, range: 24, splash: 62 },
    upgrades: [
      { cost: 60, damageMul: 1.35, rateMul: 1.12, splashMul: 1.06 },
      { cost: 100, damageMul: 1.35, rateMul: 1.12, splashMul: 1.06 },
    ],
    branches: [
      { name: 'Méga-mine', desc: 'Dégâts x1,8, rayon +40 %.', cost: 220, mods: { damageMul: 1.8, splashMul: 1.4 },
        master: { name: 'Cratère', desc: 'Dégâts +60 %, réarmement +25 %.', cost: 380, mods: { damageMul: 1.6, rateMul: 1.25 } } },
      { name: 'Piège électrique', desc: 'Étourdit 1,5 s, réarmement +60 %.', cost: 210, mods: { stun: 1.5, rateMul: 1.6 },
        master: { name: 'Bobine Tesla', desc: 'Étourdit 2,2 s, dégâts +50 %.', cost: 360, mods: { stun: 2.2, damageMul: 1.5, rateMul: 1.2 } } },
    ],
  },
};

export const BOSS_ORDER = ['boss1', 'boss2', 'boss3', 'boss4', 'boss5'];
export const TOWER_ORDER = ['assault', 'smg', 'shotgun', 'sniper', 'rocket', 'minigun', 'cryo', 'mine'];

// Vitesse de rotation (rad/s) et distance de la bouche du canon (px) par tourelle
export const TOWER_VISUAL = {
  assault: { turn: 10, muzzle: 42 }, smg: { turn: 13, muzzle: 32 }, shotgun: { turn: 9, muzzle: 30 },
  sniper: { turn: 6, muzzle: 56 }, rocket: { turn: 5.5, muzzle: 30 }, minigun: { turn: 7, muzzle: 48 },
  cryo: { turn: 0, muzzle: 0 }, mine: { turn: 0, muzzle: 0 },
};

// ----------------------------------------------------------------------------
//  ENNEMIS (brainrots originaux)
//  hp, speed (px/s), reward (pièces), leak (PV retirés au château), r (rayon),
//  cost = coût dans le budget de vague,
//  unlock = premier niveau de campagne (1 à 30) où il apparaît, from = vague minimale dans un niveau
// ----------------------------------------------------------------------------
export const ENEMIES = {
  basic:    { name: 'Lumaca Pizzetta', hint: "Lent et peu résistant. Il arrive en nombre.", tag: 'Basique',  hp: 30,  speed: 58,  reward: 5,  leak: 1, r: 22, cost: 5,  unlock: 1,  from: 1, interval: 0.7 },
  fast:     { name: 'Peperoncino Rollerino', hint: "Rapide mais fragile : mitraillette et cryo conseillées.", tag: 'Rapide',   hp: 18,  speed: 122, reward: 5,  leak: 1, r: 20, cost: 6,  unlock: 1,  from: 3, interval: 0.4 },
  tank:     { name: 'Ippo Tostapane', hint: "Lent, énorme sac à PV : sniper ou pompe.",        tag: 'Tank',     hp: 190, speed: 34,  reward: 16, leak: 3, r: 32, cost: 22, unlock: 2,  from: 4, interval: 1.6 },
  flying:   { name: 'Formaggio Farfalla', hint: "Vole au-dessus des mines.",    tag: 'Volant',   hp: 38,  speed: 82,  reward: 8,  leak: 1, r: 21, cost: 10, unlock: 4,  from: 4, interval: 0.7, flying: true },
  armored:  { name: 'Granchio Pentolino', hint: "Blindé : les petites balles font peu de dégâts. Utilise gros calibres, explosions ou balles perforantes.",    tag: 'Blindé',   hp: 85,  speed: 48,  reward: 12, leak: 2, r: 25, cost: 16, unlock: 7,  from: 4, interval: 1.1, armor: 5 },
  splitter: { name: 'Anguria Matrioska', hint: "Se divise en 3 minis à sa mort : les dégâts de zone aident.",     tag: 'Diviseur', hp: 100, speed: 50,  reward: 8,  leak: 2, r: 27, cost: 16, unlock: 9,  from: 4, interval: 1.2, split: { type: 'mini', count: 3 } },
  healer:   { name: 'Polpo Espressino', hint: "Soigne ses voisins : à éliminer en priorité.",      tag: 'Soigneur', hp: 75,  speed: 52,  reward: 14, leak: 1, r: 24, cost: 18, unlock: 11, from: 5, interval: 1.5, heal: { radius: 95, pct: 0.07, every: 2.2 } },
  stealth:  { name: 'Medusa Paralume', hint: "Invisible ! Révélé à bout portant, par les dégâts de zone, ou par une amélioration de détection (ex. Balles traçantes).",       tag: 'Invisible', hp: 45, speed: 74,  reward: 10, leak: 1, r: 21, cost: 12, unlock: 14, from: 5, interval: 0.8, stealth: true },
  mini:     { name: 'Semino',                tag: 'Mini',     hp: 22,  speed: 92,  reward: 2,  leak: 1, r: 14, cost: 3,  unlock: 999, interval: 0.3 },
  // Boss de monde. Leurs PV sont multipliés par le niveau (CAMPAIGN.hpWorld), pas par la vague.
  boss1: { name: 'Tricheco Fisarmonica', tag: 'BOSS', hp: 15000,  speed: 24, reward: 300, leak: 99, r: 46, boss: true, unlock: 999,
           ability: { kind: 'summon', every: 6, type: 'fast', count: 3 }, title: 'Il souffle des sbires !' },
  boss2: { name: 'Gorilla Lavatrice',    tag: 'BOSS', hp: 24000, speed: 22, reward: 400, leak: 99, r: 50, boss: true, armor: 4, unlock: 999,
           ability: { kind: 'emp', every: 8, radius: 190, dur: 2.5 }, title: 'Son essorage coupe tes tourelles !' },
  boss3: { name: 'Drago Cannolone',      tag: 'BOSS', hp: 29000, speed: 20, reward: 500, leak: 99, r: 56, boss: true, unlock: 999,
           ability: { kind: 'rage', every: 10, dur: 3, heal: 0.03 }, title: 'Bouclier de crème et rage finale !' },
  boss4: { name: 'Pinguino Frigorifero', tag: 'BOSS', hp: 33000, speed: 21, reward: 600, leak: 99, r: 52, boss: true, armor: 6, unlock: 999,
           ability: { kind: 'combo', every: 7, list: [{ kind: 'emp', radius: 220, dur: 3 }, { kind: 'summon', type: 'armored', count: 3 }] }, title: 'Il gèle tes tourelles et appelle ses crabes !' },
  boss5: { name: 'Leone Lasagna',        tag: 'BOSS', hp: 30000, speed: 20, reward: 900, leak: 99, r: 58, boss: true, armor: 3, unlock: 999,
           ability: { kind: 'combo', every: 6, rage: true, list: [{ kind: 'summon', type: 'tank', count: 2 }, { kind: 'rage', dur: 3, heal: 0.025 }, { kind: 'emp', radius: 200, dur: 2.5 }] }, title: 'Le roi des brainrots : sbires, bouclier et rugissement !' },
};

// ----------------------------------------------------------------------------
//  VAGUES (générées procéduralement, voir js/waves.js)
//  « m » = vague équivalente : n dans un niveau normal, étirée dans un niveau de boss.
// ----------------------------------------------------------------------------
export const WAVES = {
  budget: (m) => 32 + 19 * m + 0.42 * m * m,                       // « points » d'ennemis par vague
  hpScale: (m) => 1 + 0.16 * (m - 1) + 0.018 * (m - 1) * (m - 1),  // multiplicateur de PV par vague
  maxGroups: 5,
  maxPerGroup: 28,
  maxSpan: 30,              // durée max (s) des apparitions d'une vague : au-delà, les groupes sont resserrés
  bossEscortBudget: 0.5,    // part du budget normal qui accompagne un boss ou un mini-boss
  finalWaveBudget: 1.1,     // dernière vague d'un niveau normal
  bossHpGrowth: 1.6,        // mode infini : PV des boss x1,6 à chaque boss
  eliteFrom: 19,            // niveau de campagne à partir duquel des groupes « élite » apparaissent
  eliteChance: 0.22, eliteHp: 3, eliteReward: 3,
};

// ----------------------------------------------------------------------------
//  CAMPAGNE : 5 mondes x 6 niveaux. Le 6e niveau de chaque monde est un niveau de boss, plus long.
// ----------------------------------------------------------------------------
export const WORLDS = [
  { id: 'prairie', name: 'Prairie Pesto',          theme: 'prairie', boss: 'boss1', color: '#5fb53c' },
  { id: 'desert',  name: 'Désert Tiramisu',        theme: 'desert',  boss: 'boss2', color: '#e2a03c' },
  { id: 'volcano', name: 'Volcan Gelato',          theme: 'volcano', boss: 'boss3', color: '#8a5fb0' },
  { id: 'ice',     name: 'Banquise Stracciatella', theme: 'ice',     boss: 'boss4', color: '#5aa9e0' },
  { id: 'candy',   name: 'Cité Meringue',          theme: 'candy',   boss: 'boss5', color: '#f070a8' },
];
export const CAMPAIGN = {
  waves:     [15, 16, 17, 18, 20],        // niveaux 1 à 5 d'un monde
  bossWaves: [30, 33, 36, 40, 45],        // niveau 6 (boss) du monde 1 à 5
  bossPaceTo: 28,                         // un niveau de boss finit à la difficulté d'une « vague 28 »
  pathRef: 2000, pathEase: [0.62, 1.12],  // PV des ennemis x (longueur du chemin / pathRef), borné : un tracé court laisse moins de temps pour tirer
  money:     [200, 200, 190, 190, 180, 260],   // pièces de départ par niveau du monde
  lives: 20,
  slots:     [10, 11, 12, 12, 13, 16],    // emplacements de tourelles par niveau du monde
  mines: 5,
  layouts: [                              // tracé de chaque niveau ('!' = en miroir), voir LAYOUTS dans js/maps.js
    ['lacets', 'escalier', 'boucle', 'detour', 'zigzag', 'fourche'],
    ['detour!', 'serpent', 'lacets!', 'croix', 'escalier!', 'ygrec'],
    ['boucle!', 'tour', 'fourche', 'serpent!', 'detour', 'croix!'],
    ['escalier', 'ygrec!', 'lacets', 'boucle', 'croix', 'serpent'],
    ['zigzag', 'fourche', 'serpent!', 'ygrec', 'detour!', 'tour'],
  ],
  hpWorld:    [1.4, 1.45, 1.9, 2.55, 3.0], // PV des ennemis par monde...
  bossLevelHp: [1.28, 1.5, 1.7, 1.3, 1.25],      // niveaux de boss : PV des ennemis x (monde) — ils se gagnent avec les boosts
  hpLevel:    0.015,                      // ...puis +1,5 % par niveau dans le monde
  density:    [1, 1.08, 1.16, 1.24, 1.32],// budget des vagues par monde
  speedWorld: [1, 1.03, 1.06, 1.09, 1.12],
  miniBossEvery: 10,                      // niveaux de boss : un mini-boss toutes les 10 vagues
  miniBossHp: [0.12, 0.3, 0.5, 0.7],      // PV des mini-boss successifs (part des PV du boss)
  endlessAfter: 12,                       // le mode infini se débloque après ce niveau (fin du monde 2)
  towerUnlocks: { mine: 2, sniper: 4, cryo: 6, rocket: 9, minigun: 13 },   // tourelle offerte en terminant ce niveau
  // gemmes
  gemsWin: 6, gemsPerStar: 3, gemsFirstClear: 10, gemsBossMult: 2, gemsPerWaveLost: 0.3, gemsPerWaveEndless: 0.8,
};
// Liste à plat des 30 niveaux
export const LEVELS = [];
WORLDS.forEach((w, wi) => {
  for (let i = 0; i < 6; i++) {
    const boss = i === 5, waves = boss ? CAMPAIGN.bossWaves[wi] : CAMPAIGN.waves[i], lay = CAMPAIGN.layouts[wi][i];
    LEVELS.push({
      n: wi * 6 + i + 1, id: `${wi + 1}-${i + 1}`, world: wi, idx: i, boss, waves,
      layout: lay.replace('!', ''), mirror: lay.endsWith('!'), slots: CAMPAIGN.slots[i], money: CAMPAIGN.money[i],
      hp: +(CAMPAIGN.hpWorld[wi] * (1 + CAMPAIGN.hpLevel * i) * (boss ? CAMPAIGN.bossLevelHp[wi] : 1)).toFixed(3), density: CAMPAIGN.density[wi], speed: CAMPAIGN.speedWorld[wi],
      pace: boss ? (CAMPAIGN.bossPaceTo - 1) / (waves - 1) : 1,
    });
  }
});

// Défi « Héroïque » : débloqué en terminant un niveau. Une contrainte par niveau (à tour de rôle) + ennemis plus résistants.
export const HEROIC = {
  hp: 1.25, gemsMult: 2, xpMult: 2, scoreMult: 1.5,
  mods: [
    { id: 'limit', name: 'Effectif réduit',    desc: '6 tourelles maximum (hors mines)', towerLimit: 6 },
    { id: 'fast',  name: 'Ruée',               desc: 'Ennemis 25 % plus rapides', speed: 1.25 },
    { id: 'frail', name: 'Château fragile',    desc: '5 PV seulement', lives: 5 },
    { id: 'ban',   name: 'Arsenal restreint',  desc: "Fusil d'assaut et pompe interdits", ban: ['assault', 'shotgun'] },
    { id: 'poor',  name: 'Caisses vides',      desc: 'Moitié moins de pièces au départ, aucun bonus de vague', money: 0.5, noWaveBonus: true },
    { id: 'tough', name: 'Peaux dures',        desc: 'PV des ennemis +40 %', hp: 1.4 },
  ],
};
export const heroicMod = (n) => HEROIC.mods[(n - 1) % HEROIC.mods.length];

// ----------------------------------------------------------------------------
//  CHÂTEAU (amélioré avec les gemmes entre les niveaux)
// ----------------------------------------------------------------------------
export const CASTLE = {
  upgrades: {
    walls:    { name: 'Murs',        desc: '+2 PV max par niveau', icon: 'heart', per: 2, costs: [120, 260, 450, 700, 1000] },
    repair:   { name: 'Réparation',  desc: 'Régénère 1 PV entre les vagues', icon: 'wrench', every: [0, 4, 3, 2, 2, 1], costs: [180, 360, 600, 900, 1300] },   // every[niveau] = toutes les N vagues
    treasury: { name: 'Trésorerie',  desc: '+20 pièces au départ et +2 par vague, par niveau', icon: 'coins', start: 20, perWave: 2, costs: [120, 260, 450, 700, 1000] },
    cannon:   { name: 'Canon',       desc: 'Le château tire sur les ennemis proches', icon: 'cannon', damage: [0, 14, 24, 38, 56, 80], rate: [0, 1, 1.1, 1.2, 1.35, 1.5], range: [0, 150, 160, 170, 185, 200], costs: [250, 420, 650, 950, 1400] },
  },
  // capacités actives : niveau 0 = verrouillée. cd en secondes.
  abilities: {
    air:      { name: 'Frappe aérienne', desc: 'Bombarde une zone ciblée', icon: 'bomb', color: '#ff7a3c', cd: [0, 50, 45, 40], damage: [0, 220, 380, 600], pct: 0.25, bossPct: 0.04, radius: [0, 90, 100, 115], costs: [300, 550, 950] },
    blizzard: { name: 'Blizzard',        desc: "Ralentit tous les ennemis de l'écran", icon: 'snow', color: '#5fd8ff', cd: [0, 60, 55, 50], slow: [0, 0.5, 0.6, 0.7], dur: [0, 5, 6.5, 8], costs: [400, 650, 1050] },
    gold:     { name: "Pluie d'or",      desc: 'Fait tomber des pièces bonus', icon: 'coins', color: '#ffd23f', cd: [0, 75, 70, 60], coins: [0, 50, 80, 120], perWave: [0, 3, 4, 6], costs: [450, 700, 1150] },
  },
  tiers: [0, 5, 12, 20],      // total de niveaux d'amélioration pour : bois, pierre, forteresse, citadelle dorée
};

// ----------------------------------------------------------------------------
//  BOOSTS (consommables, inventaire persistant)
// ----------------------------------------------------------------------------
export const BOOSTS = {
  coins2: { name: 'Pièces x2',        desc: 'Double les pièces des kills pendant 1 vague', icon: 'coins',  color: '#ffd23f', cost: 150, cur: 'coins', rarity: 1 },
  heal:   { name: '+5 PV',            desc: 'Répare 5 PV du château (peut dépasser le maximum)', icon: 'heart', color: '#ff5d6c', cost: 120, cur: 'coins', rarity: 0, amount: 5 },
  free:   { name: 'Tourelle gratuite', desc: 'La prochaine tourelle posée ne coûte rien', icon: 'gift', color: '#3fd873', cost: 180, cur: 'coins', rarity: 1 },
  over:   { name: 'Surcharge',        desc: 'Cadence de toutes les tourelles +50 % pendant 20 s', icon: 'bolt', color: '#ff9f1a', cost: 200, cur: 'coins', rarity: 2, rate: 1.5, dur: 20 },
  shield: { name: 'Bouclier',         desc: 'Bloque toutes les fuites pendant 1 vague', icon: 'shield', color: '#5c9df2', cost: 25, cur: 'gems', rarity: 3 },
  revive: { name: 'Seconde chance',   desc: 'À la défaite : château réparé à moitié, ennemis balayés', icon: 'revive', color: '#b05cff', cost: 40, cur: 'gems', rarity: 4 },
};
export const BOOST_ORDER = ['coins2', 'heal', 'free', 'over', 'shield', 'revive'];
export const BOOST_SLOTS = { normal: 2, boss: 4 };   // emplacements à emporter (+ talent « Sacoche »)
export const STARTER_BOOSTS = { coins2: 1, heal: 1, free: 1, over: 1, shield: 0, revive: 0 };

// ----------------------------------------------------------------------------
//  NIVEAU DE JOUEUR, TALENTS, COFFRES
// ----------------------------------------------------------------------------
export const XP = {
  perCost: 0.5,                 // XP par point de « coût » d'ennemi éliminé
  perWave: 5, perStar: 30, win: 40,
  need: (lvl) => 220 + 90 * (lvl - 1),      // XP pour passer du niveau lvl au suivant
  // récompense de chaque niveau gagné (cycle), + un coffre doré tous les 10 niveaux
  rewards: [{ talent: 1 }, { gems: 15 }, { talent: 1 }, { chest: 'wood' }, { talent: 1 }, { boosts: 2 }],
};
export const TALENTS = {
  attack: { name: 'Attaque', color: '#ff5d6c', icon: 'sword', nodes: [
    { id: 'dmg', icon: 'sword',   name: 'Poudre premium', desc: '+2 % de dégâts', max: 5, per: 0.02 },
    { id: 'rate', icon: 'bolt',  name: 'Culasse huilée', desc: '+2 % de cadence', max: 5, per: 0.02 },
    { id: 'range', icon: 'target', name: 'Longue-vue',     desc: '+2 % de portée', max: 3, per: 0.02 },
    { id: 'crit', icon: 'star',  name: 'Œil vif',        desc: '+1 % de coups critiques', max: 3, per: 0.01 },
  ] },
  economy: { name: 'Économie', color: '#ffd23f', icon: 'coins', nodes: [
    { id: 'start', icon: 'coins', name: 'Tirelire',       desc: '+15 pièces au départ', max: 5, per: 15 },
    { id: 'kill', icon: 'skull',  name: 'Chasseur de primes', desc: '+3 % de pièces par kill', max: 5, per: 0.03 },
    { id: 'wave', icon: 'wave',  name: 'Prime de vague', desc: '+10 % de bonus de vague', max: 3, per: 0.1 },
    { id: 'gems', icon: 'gem',  name: 'Joaillier',      desc: '+5 % de gemmes gagnées', max: 3, per: 0.05 },
  ] },
  castle: { name: 'Château', color: '#5c9df2', icon: 'shield', nodes: [
    { id: 'lives', icon: 'heart', name: 'Garnison',       desc: '+1 PV au château', max: 5, per: 1 },
    { id: 'cd', icon: 'cannon',    name: 'Artilleurs',     desc: '-4 % de recharge des capacités', max: 5, per: 0.04 },
    { id: 'dur', icon: 'snow',   name: 'Ingénieur',      desc: '+10 % de durée de Surcharge et de Blizzard', max: 3, per: 0.1 },
    { id: 'slot', icon: 'bag',  name: 'Sacoche',        desc: '+1 emplacement de boost', max: 1, per: 1, need: 6 },   // need = points déjà placés dans la branche
  ] },
};
export const CHESTS = {
  wood: { name: 'Coffre en bois', cost: 30, cards: 3, gems: [6, 14], boostChance: 0.6, rare: 0.15 },
  gold: { name: 'Coffre doré',    cost: 75, cards: 5, gems: [15, 35], boostChance: 0.65, rare: 0.4 },   // rare = chance qu'un boost soit Bouclier / Seconde chance
};

// ----------------------------------------------------------------------------
//  BOUTIQUE (gemmes) — tout se débloque en jouant
// ----------------------------------------------------------------------------
export const SHOP = {
  starterTowers: ['assault', 'smg', 'shotgun'],
  skins: [   // finish = rendu appliqué aux sprites d'armes (voir js/sprites.js)
    { id: 'default', name: 'Standard',   cost: 0,   finish: 'classic' },
    { id: 'camo',    name: 'Camouflage', cost: 20,  finish: 'camo' },
    { id: 'neon',    name: 'Néon',       cost: 35,  finish: 'neon' },
    { id: 'lava',    name: 'Lave',       cost: 35,  finish: 'lava' },
    { id: 'candy',   name: 'Bonbon',     cost: 45,  finish: 'candy' },
    { id: 'gold',    name: 'Or massif',  cost: 100, finish: 'gold' },
  ],
};

// ----------------------------------------------------------------------------
//  SCORE
// ----------------------------------------------------------------------------
export const SCORE = {
  perCost: 10,              // points par kill = coût de l'ennemi (ENEMIES.cost) x perCost
  boss: 3000,               // points par boss (x numéro du boss)
  multiWindow: 0.45,        // secondes pour enchaîner un multi-kill
  multi: { 2: ['DOUBLE', 40], 3: ['TRIPLE', 100], 4: ['QUADRUPLE', 200], 5: ['MASSACRE', 400] }, // 5 = 5 kills et plus
  cleanWave: 150,           // vague terminée sans perdre de PV (+ cleanWavePerWave x n)
  cleanWavePerWave: 15,
  earlyPerCoin: 4,          // points par pièce de bonus « en avance »
  lifeBonus: 120,           // points par PV restant en cas de victoire
};

// Étoiles : part des PV restants nécessaire
export const STARS = { three: 0.9, two: 0.5 };

// ----------------------------------------------------------------------------
//  SUCCÈS — "stat" lit save.stats[stat] ; "special" est géré dans save.js
// ----------------------------------------------------------------------------
export const ACHIEVEMENTS = [
  { id: 'kills100',  name: 'Première fournée',   desc: 'Éliminer 100 brainrots',         stat: 'kills', goal: 100,  gems: 5 },
  { id: 'kills1000', name: 'Exterminateur',      desc: 'Éliminer 1 000 brainrots',       stat: 'kills', goal: 1000, gems: 15 },
  { id: 'kills5000', name: 'Légende anti-rot',   desc: 'Éliminer 5 000 brainrots',       stat: 'kills', goal: 5000, gems: 40 },
  { id: 'boss1',     name: 'Chasseur de boss',   desc: 'Vaincre un boss',                stat: 'bossKills', goal: 1, gems: 10 },
  { id: 'boss10',    name: 'Terreur des boss',   desc: 'Vaincre 10 boss',                stat: 'bossKills', goal: 10, gems: 30 },
  { id: 'build50',   name: 'Armurier',           desc: 'Poser 50 tourelles',             stat: 'towersBuilt', goal: 50, gems: 10 },
  { id: 'legend',    name: 'Butin doré',         desc: 'Monter une tourelle au niveau Légendaire', stat: 'legendaries', goal: 1, gems: 10 },
  { id: 'win1',      name: 'Première victoire',  desc: 'Gagner une partie',              stat: 'wins', goal: 1, gems: 10 },
  { id: 'win10',     name: 'Vétéran',            desc: 'Gagner 10 parties',              stat: 'wins', goal: 10, gems: 30 },
  { id: 'perfect',   name: 'Sans une égratignure', desc: 'Gagner sans perdre un seul PV', stat: 'perfectWins', goal: 1, gems: 20 },
  { id: 'hard',      name: 'Dur à cuire',        desc: 'Gagner un défi Héroïque',        stat: 'heroicWins', goal: 1, gems: 25 },
  { id: 'world1',    name: 'Sauveur de la prairie', desc: 'Terminer le monde 1',          special: 'progress', goal: 6, gems: 20 },
  { id: 'world5',    name: 'Roi du bastion',     desc: 'Terminer la campagne',           special: 'progress', goal: 30, gems: 100 },
  { id: 'stars9',    name: 'Collectionneur',     desc: 'Obtenir 9 étoiles au total',     special: 'stars', goal: 9, gems: 30 },
  { id: 'stars45',   name: 'Constellation',      desc: 'Obtenir 45 étoiles au total',    special: 'stars', goal: 45, gems: 60 },
  { id: 'endless40', name: 'Sans fin',           desc: 'Atteindre la vague 40 en mode infini', stat: 'bestEndless', goal: 40, gems: 30 },
  { id: 'early20',   name: 'Pressé',             desc: 'Lancer 20 vagues en avance',     stat: 'earlyStarts', goal: 20, gems: 10 },
];

// Séquence de fin de niveau : messages de défaite, conseils (selon l'ennemi qui a fait le plus de dégâts au château)
export const END = {
  maxBadges: 3,              // succès affichés au maximum (puis « +N autres »)
  starGap: 0.42,             // secondes entre deux étoiles
  cheers: [
    'Presque ! Encore un essai et c\'est gagné.',
    'Belle résistance ! Tu y es presque.',
    'Les brainrots ont eu de la chance. Revanche ?',
    'Pas mal du tout ! Change une tourelle et retente.',
  ],
  tips: {
    basic: 'La Mitraillette nettoie les vagues de Lumaca en un clin d\'œil.',
    fast: 'La Tourelle cryo ralentit les Peperoncino : place-la au début du chemin.',
    tank: 'Le Sniper est efficace contre les Tanks.',
    flying: 'Les mines ne touchent pas les volants : la Minigun et le Sniper, si.',
    armored: 'Le Lance-roquettes et le Sniper percent les blindés.',
    splitter: 'Les dégâts de zone (Pompe, roquettes) détruisent les Anguria et leurs minis.',
    healer: 'Élimine les Polpo en premier : Sniper ou visée « Plus fort ».',
    stealth: 'Les explosions révèlent les Medusa invisibles.',
    boss: 'Garde la frappe aérienne et la Surcharge pour l\'arrivée du boss.',
    upgrade: 'Améliore tes tourelles : un niveau 3 vaut mieux que trois niveaux 1.',
  },
  generic: [
    'Utilise tes boosts : ceux que tu n\'utilises pas reviennent dans l\'inventaire.',
    'Lance les vagues en avance pour gagner des pièces bonus.',
    'Les virages sont les meilleurs emplacements : les ennemis y restent plus longtemps.',
  ],
};

// ----------------------------------------------------------------------------
//  PIÈCES (monnaie conservée entre les parties ; les pièces de partie restent à part)
//  Pièces : château, boosts courants. Gemmes (plus rares) : coffres, skins, boosts rares.
// ----------------------------------------------------------------------------
export const COINS = {
  start: 150,                 // nouveau joueur
  migrateBase: 300, migratePerStar: 60,   // anciennes sauvegardes (avant les pièces)
  win: 90, perStar: 35, perWave: 6, perWaveLost: 5, firstClear: 120, bossMult: 2, endlessPerWave: 8,
};
// Barre d'onglets du hub (ordre affiché)
export const TABS = [
  { id: 'shop', label: 'Boutique', icon: 'cart' },
  { id: 'castle', label: 'Château', icon: 'castle' },
  { id: 'menu', label: 'Jouer', icon: 'play' },
  { id: 'talents', label: 'Talents', icon: 'talent' },
  { id: 'collection', label: 'Collection', icon: 'book' },
];
