// ============================================================================
//  CONFIG — toutes les valeurs d'équilibrage du jeu sont ici.
//  Voir le README pour le détail de chaque champ.
// ============================================================================

export const VIEW = { W: 600, H: 940 };    // zone jouable en portrait (le décor se prolonge autour pour remplir l'écran)

export const GAME = {
  sellRatio: 0.7,          // revente : 70 % de l'investissement
  critChance: 0.08,        // chance de critique de base
  critMult: 2,             // multiplicateur de critique de base
  interWaveTime: 18,       // secondes avant le lancement auto de la vague suivante
  earlyBonusPerSec: 2,     // pièces par seconde restante si on lance en avance
  earlyBonusAlive: 15,     // bonus si on lance alors que des ennemis sont encore en vie
  waveBonusBase: 30,       // pièces de fin de vague = base + parVague * n
  waveBonusPerWave: 5,
  pathWidth: 64,
  towerRadius: 26,
  totalWaves: 30,
  bossEvery: 10,
  rewardMult: 1,           // multiplicateur global des pièces par kill
  maxMines: 6,             // nombre maximum de mines posées en même temps
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

export const DIFFICULTIES = {
  easy:   { name: 'Facile',    hp: 0.8,  speed: 1,    lives: 25, money: 300, gems: 0.75 },
  normal: { name: 'Normal',    hp: 1,    speed: 1,    lives: 20, money: 250, gems: 1 },
  hard:   { name: 'Difficile', hp: 1.3,  speed: 1.08, lives: 15, money: 230, gems: 1.6 },
};

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
    name: 'Mine', desc: 'Piège posé sur le chemin (6 max). Explose puis se réarme. Inefficace contre les volants.', cost: 70, kind: 'mine', targeting: null,
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

export const TOWER_ORDER = ['assault', 'smg', 'shotgun', 'sniper', 'rocket', 'minigun', 'cryo', 'mine'];

// Vitesse de rotation (rad/s) et longueur du canon (px) par arme
export const TOWER_VISUAL = {
  assault: { turn: 10, muzzle: 44 }, smg: { turn: 13, muzzle: 36 }, shotgun: { turn: 9, muzzle: 44 },
  sniper: { turn: 6, muzzle: 60 }, rocket: { turn: 5.5, muzzle: 46 }, minigun: { turn: 7, muzzle: 50 },
  cryo: { turn: 0, muzzle: 0 }, mine: { turn: 0, muzzle: 0 },
};

// ----------------------------------------------------------------------------
//  ENNEMIS (brainrots originaux)
//  hp, speed (px/s), reward (pièces), leak (PV retirés à la base), r (rayon),
//  cost = coût dans le budget de vague, unlock = première vague d'apparition
// ----------------------------------------------------------------------------
export const ENEMIES = {
  basic:    { name: 'Lumaca Pizzetta',      tag: 'Basique',  hp: 30,  speed: 58,  reward: 5,  leak: 1, r: 22, cost: 5,  unlock: 1,  interval: 0.7 },
  fast:     { name: 'Peperoncino Rollerino', hint: "Rapide mais fragile : mitraillette et cryo conseillées.", tag: 'Rapide',   hp: 18,  speed: 122, reward: 5,  leak: 1, r: 20, cost: 6,  unlock: 2,  interval: 0.4 },
  tank:     { name: 'Ippo Tostapane', hint: "Lent, énorme sac à PV : sniper ou pompe.",        tag: 'Tank',     hp: 190, speed: 34,  reward: 16, leak: 3, r: 32, cost: 22, unlock: 4,  interval: 1.6 },
  flying:   { name: 'Formaggio Farfalla', hint: "Vole au-dessus des mines.",    tag: 'Volant',   hp: 38,  speed: 82,  reward: 8,  leak: 1, r: 21, cost: 10, unlock: 6,  interval: 0.7, flying: true },
  armored:  { name: 'Granchio Pentolino', hint: "Blindé : les petites balles font peu de dégâts. Utilise gros calibres, explosions ou balles perforantes.",    tag: 'Blindé',   hp: 85,  speed: 48,  reward: 12, leak: 2, r: 25, cost: 16, unlock: 8,  interval: 1.1, armor: 5 },
  splitter: { name: 'Anguria Matrioska', hint: "Se divise en 3 minis à sa mort : les dégâts de zone aident.",     tag: 'Diviseur', hp: 100, speed: 50,  reward: 8,  leak: 2, r: 27, cost: 16, unlock: 9,  interval: 1.2, split: { type: 'mini', count: 3 } },
  healer:   { name: 'Polpo Espressino', hint: "Soigne ses voisins : à éliminer en priorité.",      tag: 'Soigneur', hp: 75,  speed: 52,  reward: 14, leak: 1, r: 24, cost: 18, unlock: 12, interval: 1.5, heal: { radius: 95, pct: 0.07, every: 2.2 } },
  stealth:  { name: 'Medusa Paralume', hint: "Invisible ! Révélé à bout portant, par les dégâts de zone, ou par une amélioration de détection (ex. Balles traçantes).",       tag: 'Invisible', hp: 45, speed: 74,  reward: 10, leak: 1, r: 21, cost: 12, unlock: 14, interval: 0.8, stealth: true },
  mini:     { name: 'Semino',                tag: 'Mini',     hp: 22,  speed: 92,  reward: 2,  leak: 1, r: 14, cost: 3,  unlock: 999, interval: 0.3 },
  // Boss (hp non multipliés par la vague, voir WAVES.bossHpGrowth pour le mode infini)
  boss1: { name: 'Tricheco Fisarmonica', tag: 'BOSS', hp: 4000,  speed: 24, reward: 250, leak: 10, r: 46, boss: true, unlock: 999,
           ability: { kind: 'summon', every: 6, type: 'fast', count: 3 }, title: 'Il souffle des sbires !' },
  boss2: { name: 'Gorilla Lavatrice',    tag: 'BOSS', hp: 14000, speed: 22, reward: 500, leak: 12, r: 50, boss: true, armor: 4, unlock: 999,
           ability: { kind: 'emp', every: 8, radius: 190, dur: 2.5 }, title: 'Son essorage coupe tes tourelles !' },
  boss3: { name: 'Drago Cannolone',      tag: 'BOSS', hp: 36000, speed: 20, reward: 900, leak: 99, r: 56, boss: true, unlock: 999,
           ability: { kind: 'rage', every: 10, dur: 3, heal: 0.03 }, title: 'Bouclier de crème et rage finale !' },
};

export const BOSS_ORDER = ['boss1', 'boss2', 'boss3'];

// ----------------------------------------------------------------------------
//  VAGUES (générées procéduralement, voir js/waves.js)
// ----------------------------------------------------------------------------
export const WAVES = {
  budget: (n) => 30 + 18 * n + 0.4 * n * n,                       // "points" d'ennemis par vague
  hpScale: (n) => 1 + 0.16 * (n - 1) + 0.02 * (n - 1) * (n - 1),  // multiplicateur de PV par vague
  maxGroups: 5,
  maxPerGroup: 28,
  bossEscortBudget: 0.45,   // part du budget normal qui accompagne un boss
  bossHpGrowth: 1.8,        // mode infini : PV des boss x1.8 à chaque cycle de 30 vagues
};

// ----------------------------------------------------------------------------
//  BOUTIQUE (gemmes) — tout se débloque en jouant
// ----------------------------------------------------------------------------
export const SHOP = {
  starterTowers: ['assault', 'smg', 'shotgun'],
  towerUnlocks: { mine: 15, sniper: 25, cryo: 30, rocket: 45, minigun: 70 },
  perks: [
    { id: 'damage', name: 'Poudre premium', desc: '+5 % de dégâts par niveau', per: 0.05, max: 5, costs: [15, 25, 40, 60, 90] },
    { id: 'money',  name: 'Tirelire',       desc: '+30 pièces de départ par niveau', per: 30, max: 5, costs: [10, 20, 30, 45, 65] },
    { id: 'lives',  name: 'Murs renforcés', desc: '+2 PV de base par niveau', per: 2, max: 5, costs: [10, 20, 30, 45, 65] },
  ],
  skins: [   // finish = rendu appliqué aux sprites d'armes (voir js/sprites.js)
    { id: 'default', name: 'Standard',   cost: 0,   finish: 'classic' },
    { id: 'camo',    name: 'Camouflage', cost: 20,  finish: 'camo' },
    { id: 'neon',    name: 'Néon',       cost: 35,  finish: 'neon' },
    { id: 'lava',    name: 'Lave',       cost: 35,  finish: 'lava' },
    { id: 'candy',   name: 'Bonbon',     cost: 45,  finish: 'candy' },
    { id: 'gold',    name: 'Or massif',  cost: 100, finish: 'gold' },
  ],
  // Gemmes de fin de partie
  gemsWinBase: 20, gemsPerStar: 10, gemsPerWaveLost: 0.6, gemsPerWaveEndless: 1.2,
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
  diffMult: { easy: 0.8, normal: 1, hard: 1.5 },
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
  { id: 'hard',      name: 'Dur à cuire',        desc: 'Gagner en Difficile',            stat: 'hardWins', goal: 1, gems: 25 },
  { id: 'stars9',    name: 'Collectionneur',     desc: 'Obtenir 9 étoiles au total',     special: 'stars', goal: 9, gems: 30 },
  { id: 'endless40', name: 'Sans fin',           desc: 'Atteindre la vague 40 en mode infini', stat: 'bestEndless', goal: 40, gems: 30 },
  { id: 'early20',   name: 'Pressé',             desc: 'Lancer 20 vagues en avance',     stat: 'earlyStarts', goal: 20, gems: 10 },
];
