// ============================================================================
//  CONFIG — toutes les valeurs d'équilibrage du jeu sont ici.
//  Voir le README pour le détail de chaque champ.
// ============================================================================

export const VIEW = { W: 600, H: 940 };    // zone jouable en portrait (le décor se prolonge autour pour remplir l'écran)

export const GAME = {
  chillRate: 0.6,          // cadence des tourelles prises dans l'aura glacée d'un Yeti Spumone
  sellRatio: 0.7,          // revente : 70 % de l'investissement
  perfectBonus: 15,        // pièces en plus pour une vague « PARFAIT ! » (aucune fuite)
  maxBadges: 3,            // badges chiffrés visibles en même temps dans la barre d'onglets
  critChance: 0.08,        // chance de critique de base
  critMult: 2,             // multiplicateur de critique de base
  interWaveTime: 5,        // secondes avant le lancement auto de la vague suivante (désactivable)
  overlapTime: 20,         // si des ennemis restent : la vague suivante part quand même après ce délai
  earlyBonusPerSec: 3,     // pièces par seconde restante si on lance en avance
  earlyBonusAlive: 15,     // bonus si on lance alors que des ennemis sont encore en vie
  waveBonusBase: 30,       // pièces de fin de vague = base + parVague * n
  waveBonusPerWave: 6,
  pathWidth: 64,
  towerRadius: 26,
  bossEvery: 10,           // mode infini : un boss toutes les 10 vagues
  rewardMult: 1,           // multiplicateur global des pièces par kill
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
const UP = (cost, d = 1.5, r = 1.12, g = 1.07) => ({ cost, damageMul: d, rateMul: r, rangeMul: g });

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

// --- tourelles futuristes (mondes 6 à 8) ---------------------------------------
//  beam   : rayon continu ; damage = dégâts par tic, rate = tics/s ; ramp = bonus max après rampTime s sur la même cible
//  chain  : éclair qui saute de cible en cible (chain sauts, chainRange px, falloff = part des dégâts à chaque saut)
//  plasma : boule lente qui traverse tout (size = rayon, splash à la fin si > 0)
//  drone  : drone(s) qui patrouillent dans un rayon « patrol » autour de la base et tirent à « range » d'eux
Object.assign(TOWERS, {
  laser: {
    name: 'Laser', desc: 'Rayon continu qui chauffe : plus il reste sur une cible, plus il fait mal.', cost: 300, kind: 'beam', targeting: 'first',
    base: { damage: 5.5, rate: 10, range: 190, ramp: 1.6, rampTime: 2.2, beams: 1 },
    upgrades: [UP(200, 1.45), UP(330, 1.45)],
    branches: [
      { name: 'Prisme', desc: 'Le rayon se divise : 3 cibles à la fois.', cost: 560, mods: { beams: 3, damageMul: 0.85 },
        master: { name: 'Arc-en-ciel', desc: '5 rayons, dégâts +50 %.', cost: 880, mods: { beams: 5, damageMul: 1.5 } } },
      { name: 'Surchauffe', desc: 'Chauffe 2x plus vite et bien plus fort, enflamme.', cost: 540, mods: { rampTimeMul: 0.5, ramp: 3.2, burn: 12, burnDur: 2 },
        master: { name: 'Rayon solaire', desc: 'Dégâts +80 %, ignore le blindage.', cost: 860, mods: { damageMul: 1.8, ignoreArmor: true } } },
    ],
  },
  tesla: {
    name: 'Tesla', desc: "Éclair qui saute d'ennemi en ennemi.", cost: 280, kind: 'chain', targeting: 'first',
    base: { damage: 42, rate: 1, range: 165, chain: 4, chainRange: 95, falloff: 0.8 },
    upgrades: [UP(190), UP(310)],
    branches: [
      { name: 'Orage', desc: "L'éclair saute sur 7 ennemis, cadence +30 %.", cost: 520, mods: { chain: 7, rateMul: 1.3, chainRangeMul: 1.15 },
        master: { name: 'Tempête électrique', desc: '10 sauts, dégâts +50 %.', cost: 820, mods: { chain: 10, damageMul: 1.5 } } },
      { name: 'Surtension', desc: 'Étourdit chaque ennemi touché, dégâts +40 %.', cost: 540, mods: { stun: 0.45, damageMul: 1.4 },
        master: { name: 'Paralysie', desc: 'Étourdit 1 s, dégâts +60 %.', cost: 840, mods: { stun: 1, damageMul: 1.6 } } },
    ],
  },
  plasma: {
    name: 'Plasma', desc: 'Grosse boule lente qui traverse tous les ennemis sur sa route.', cost: 360, kind: 'plasma', targeting: 'strong',
    base: { damage: 105, rate: 0.45, range: 270, projSpeed: 240, size: 16, splash: 0 },
    upgrades: [UP(240), UP(390)],
    branches: [
      { name: 'Fusion', desc: 'Boule plus grosse qui explose en fin de course.', cost: 640, mods: { sizeMul: 1.5, damageMul: 1.4, splash: 80 },
        master: { name: 'Supernova', desc: 'Dégâts +60 %, explosion géante.', cost: 980, mods: { damageMul: 1.6, splash: 125 } } },
      { name: 'Double cœur', desc: 'Tire 2 boules à la fois.', cost: 620, mods: { barrels: 2, rateMul: 1.15 },
        master: { name: 'Réacteur', desc: '3 boules à la fois, dégâts +30 %.', cost: 960, mods: { barrels: 3, damageMul: 1.3 } } },
    ],
  },
  drone: {
    name: 'Drone', desc: 'Patrouille autour de sa base et mitraille tout ce qui passe.', cost: 320, kind: 'drone', targeting: 'close',
    base: { damage: 14, rate: 3.2, range: 105, patrol: 150, drones: 1, droneSpeed: 160 },
    upgrades: [UP(210, 1.45, 1.12, 1.05), UP(350, 1.45, 1.12, 1.05)],
    branches: [
      { name: 'Escadrille', desc: '2 drones en patrouille.', cost: 560, mods: { drones: 2, patrolMul: 1.15 },
        master: { name: 'Essaim', desc: '3 drones, dégâts +40 %.', cost: 880, mods: { drones: 3, damageMul: 1.4 } } },
      { name: 'Bombardier', desc: 'Lâche des bombes : zone, gros dégâts, plus lent.', cost: 580, mods: { splash: 55, damageMul: 3.2, rateMul: 0.42 },
        master: { name: 'Tapis de feu', desc: 'Zone +30 %, enflamme le sol.', cost: 900, mods: { splashMul: 1.3, burn: 20, burnDur: 2.5, damageMul: 1.3 } } },
    ],
  },
});

export const BOSS_ORDER = ['boss1', 'boss2', 'boss3', 'boss4', 'boss5', 'boss6', 'boss7', 'boss8'];
// noms courts (rangée de choix en partie)
export const TOWER_SHORT = { assault: 'Fusil', smg: 'Mitraillette', shotgun: 'Pompe', sniper: 'Sniper', rocket: 'Roquettes', minigun: 'Minigun', cryo: 'Cryo', laser: 'Laser', tesla: 'Tesla', plasma: 'Plasma', drone: 'Drone', mine: 'Mine' };
export const TOWER_ORDER = ['assault', 'smg', 'shotgun', 'sniper', 'rocket', 'minigun', 'cryo', 'laser', 'tesla', 'plasma', 'drone', 'mine'];

// Vitesse de rotation (rad/s) et distance de la bouche du canon (px) par tourelle
export const TOWER_VISUAL = {
  assault: { turn: 10, muzzle: 42 }, smg: { turn: 13, muzzle: 32 }, shotgun: { turn: 9, muzzle: 30 },
  sniper: { turn: 6, muzzle: 56 }, rocket: { turn: 5.5, muzzle: 30 }, minigun: { turn: 7, muzzle: 48 },
  cryo: { turn: 0, muzzle: 0 }, mine: { turn: 0, muzzle: 0 },
  laser: { turn: 7, muzzle: 44 }, tesla: { turn: 0, muzzle: 0 }, plasma: { turn: 4.5, muzzle: 40 }, drone: { turn: 0, muzzle: 0 },
};

// ----------------------------------------------------------------------------
//  ENNEMIS (brainrots originaux)
//  hp, speed (px/s), reward (pièces), leak (PV retirés au château), r (rayon),
//  cost = coût dans le budget de vague,
//  unlock = premier niveau de campagne (1, 2, ...) où il apparaît, from = vague minimale dans un niveau
// ----------------------------------------------------------------------------
export const ENEMIES = {
  basic:    { name: 'Lumaca Pizzetta', hint: "Lent et peu résistant. Il arrive en nombre.", tag: 'Basique',  hp: 30,  speed: 58,  reward: 5,  leak: 1, r: 22, cost: 5,  unlock: 1,  from: 1, interval: 0.7 },
  fast:     { name: 'Peperoncino Rollerino', hint: "Rapide mais fragile : mitraillette et cryo conseillées.", tag: 'Rapide',   hp: 18,  speed: 122, reward: 5,  leak: 1, r: 20, cost: 6,  unlock: 1,  from: 3, interval: 0.4 },
  tank:     { name: 'Ippo Tostapane', hint: "Lent, énorme sac à PV : sniper ou pompe.",        tag: 'Tank',     hp: 190, speed: 34,  reward: 16, leak: 3, r: 32, cost: 22, unlock: 3,  from: 4, interval: 1.6 },
  flying:   { name: 'Formaggio Farfalla', hint: "Vole au-dessus des mines.",    tag: 'Volant',   hp: 38,  speed: 82,  reward: 8,  leak: 1, r: 21, cost: 10, unlock: 6,  from: 4, interval: 0.7, flying: true },
  armored:  { name: 'Granchio Pentolino', hint: "Blindé : les petites balles font peu de dégâts. Utilise gros calibres, explosions ou balles perforantes.",    tag: 'Blindé',   hp: 85,  speed: 48,  reward: 12, leak: 2, r: 25, cost: 16, unlock: 12,  from: 4, interval: 1.1, armor: 5 },
  splitter: { name: 'Anguria Matrioska', hint: "Se divise en 3 minis à sa mort : les dégâts de zone aident.",     tag: 'Diviseur', hp: 100, speed: 50,  reward: 8,  leak: 2, r: 27, cost: 16, unlock: 15,  from: 4, interval: 1.2, split: { type: 'mini', count: 3 } },
  healer:   { name: 'Polpo Espressino', hint: "Soigne ses voisins : à éliminer en priorité.",      tag: 'Soigneur', hp: 75,  speed: 52,  reward: 14, leak: 1, r: 24, cost: 18, unlock: 22, from: 5, interval: 1.5, heal: { radius: 95, pct: 0.07, every: 2.2 } },
  stealth:  { name: 'Medusa Paralume', hint: "Invisible ! Révélé à bout portant, par les dégâts de zone, ou par une amélioration de détection (ex. Balles traçantes).",       tag: 'Invisible', hp: 45, speed: 74,  reward: 10, leak: 1, r: 21, cost: 12, unlock: 25, from: 5, interval: 0.8, stealth: true },
  // Glacier Granita (monde 4) et Jungle Basilico (monde 5)
  slider:   { name: 'Foca Ghiacciolo', hint: "Prend de la vitesse tant qu'on ne le touche pas : touche-le souvent (mitraillette, cryo).", tag: 'Glisseur', hp: 55, speed: 58, reward: 9, leak: 1, r: 24, cost: 11, unlock: 32, from: 3, interval: 0.8, glide: { max: 1.1, rate: 0.32 } },
  yeti:     { name: 'Yeti Spumone', hint: "Son aura glacée ralentit le tir des tourelles proches : élimine-le de loin (sniper, roquettes).", tag: 'Glacial', hp: 260, speed: 32, reward: 22, leak: 3, r: 33, cost: 26, unlock: 35, from: 5, interval: 1.8, armor: 2, chill: { radius: 125 } },
  monkey:   { name: 'Scimmia Bananina', hint: "Bondit en avant le long du chemin : répartis tes tourelles sur tout le parcours.", tag: 'Sauteur', hp: 60, speed: 64, reward: 10, leak: 1, r: 23, cost: 12, unlock: 42, from: 3, interval: 0.9, hop: { every: 3.2, dist: 95, dur: 0.45 } },
  chameleon:{ name: 'Camaleonte Pesto', hint: "Se camoufle par moments : la détection (balles traçantes, givre) ou une tourelle très proche le révèle.", tag: 'Caméléon', hp: 110, speed: 52, reward: 14, leak: 2, r: 26, cost: 17, unlock: 45, from: 5, interval: 1.1, camo: { every: 5, dur: 2.2 } },
  // Ville Néon (monde 6), Station Orbitale (monde 7), Dimension Brainrot (monde 8) : robots, cyborgs, glitchs
  robo:     { name: 'Robo Gnocchetto', hint: "Bouclier d'énergie qui se recharge : il faut le casser d'un coup (sniper, plasma, laser).", tag: 'Robot', hp: 90, speed: 50, reward: 14, leak: 2, r: 26, cost: 18, unlock: 52, from: 3, interval: 1.1, shield: { pct: 0.6, regen: 3 } },
  cyber:    { name: 'Cyborg Cannolo', hint: "À sa mort, une décharge coupe les tourelles proches : élimine-le loin d'elles.", tag: 'Cyborg', hp: 120, speed: 56, reward: 16, leak: 2, r: 27, cost: 20, unlock: 55, from: 5, interval: 1.2, deathEmp: { radius: 95, dur: 1.6 } },
  astro:    { name: 'Astro Polpetta', hint: 'Volant à réacteur : il fonce par à-coups. Mitraillette, tesla et drones sont parfaits.', tag: 'Fusée', hp: 70, speed: 70, reward: 12, leak: 1, r: 23, cost: 14, unlock: 62, from: 3, interval: 0.8, flying: true, boost: { every: 3, dur: 0.8, mult: 2.4 } },
  satellite:{ name: 'Satellite Spaghetto', hint: 'Projette des boucliers sur les brainrots voisins : à abattre en premier.', tag: 'Satellite', hp: 95, speed: 46, reward: 18, leak: 2, r: 26, cost: 22, unlock: 65, from: 5, interval: 1.6, flying: true, shieldAura: { radius: 110, every: 3.5, dur: 1.2 } },
  glitch:   { name: 'Glitch Mozzarella', hint: 'Se téléporte en avant en clignotant : la zone et le ralenti le gênent.', tag: 'Glitch', hp: 130, speed: 54, reward: 18, leak: 2, r: 26, cost: 22, unlock: 72, from: 3, interval: 1.1, blink: { every: 3.6, dist: 120 } },
  mini:     { name: 'Semino',                tag: 'Mini',     hp: 22,  speed: 92,  reward: 2,  leak: 1, r: 14, cost: 3,  unlock: 999, interval: 0.3 },
  // Boss de monde. Leurs PV sont multipliés par le niveau (CAMPAIGN.hpWorld), pas par la vague.
  boss1: { name: 'Tricheco Fisarmonica', tag: 'BOSS', hp: 9000,  speed: 24, reward: 300, leak: 99, r: 46, boss: true, unlock: 999,
           ability: { kind: 'summon', every: 6, type: 'fast', count: 3 }, title: 'Il souffle des sbires !' },
  boss2: { name: 'Gorilla Lavatrice',    tag: 'BOSS', hp: 9000,  speed: 22, reward: 400, leak: 99, r: 50, boss: true, armor: 4, unlock: 999,
           ability: { kind: 'emp', every: 8, radius: 190, dur: 2.5 }, title: 'Son essorage coupe tes tourelles !' },
  boss3: { name: 'Drago Cannolone',      tag: 'BOSS', hp: 12000, speed: 20, reward: 500, leak: 99, r: 56, boss: true, unlock: 999,
           ability: { kind: 'rage', every: 10, dur: 3, heal: 0.03 }, title: 'Bouclier de crème et rage finale !' },
  boss4: { name: 'Pinguino Frigorifero', tag: 'BOSS', hp: 10000, speed: 21, reward: 600, leak: 99, r: 52, boss: true, armor: 6, unlock: 999,
           ability: { kind: 'combo', every: 7, list: [{ kind: 'emp', radius: 220, dur: 3 }, { kind: 'summon', type: 'armored', count: 3 }] }, title: 'Il gèle tes tourelles et appelle ses crabes !' },
  boss5: { name: 'Leone Lasagna',        tag: 'BOSS', hp: 11500, speed: 20, reward: 900, leak: 99, r: 58, boss: true, armor: 3, unlock: 999,
           ability: { kind: 'combo', every: 6, rage: true, list: [{ kind: 'summon', type: 'tank', count: 2 }, { kind: 'rage', dur: 3, heal: 0.025 }, { kind: 'emp', radius: 200, dur: 2.5 }] }, title: 'Le roi de la jungle : sbires, bouclier et rugissement !' },
  boss6: { name: 'Robo Raviolo 3000',    tag: 'BOSS', hp: 12500, speed: 21, reward: 1000, leak: 99, r: 56, boss: true, armor: 5, unlock: 999,
           ability: { kind: 'combo', every: 6.5, list: [{ kind: 'emp', radius: 240, dur: 3 }, { kind: 'summon', type: 'robo', count: 3 }] }, title: 'Il coupe le courant et lance ses robots !' },
  boss7: { name: 'Astronauta Arancino',  tag: 'BOSS', hp: 13500, speed: 22, reward: 1100, leak: 99, r: 56, boss: true, armor: 3, unlock: 999,
           ability: { kind: 'combo', every: 6, list: [{ kind: 'summon', type: 'astro', count: 4 }, { kind: 'rage', dur: 3.5, heal: 0.025 }] }, title: 'Il appelle sa flotte et se blinde !' },
  boss8: { name: 'Re Spaghettone',       tag: 'BOSS', hp: 15000, speed: 21, reward: 1500, leak: 99, r: 62, boss: true, armor: 4, unlock: 999,
           ability: { kind: 'combo', every: 5.5, rage: true, list: [{ kind: 'summon', type: 'glitch', count: 3 }, { kind: 'emp', radius: 230, dur: 2.5 }, { kind: 'rage', dur: 3, heal: 0.03 }, { kind: 'summon', type: 'satellite', count: 2 }] }, title: 'Le roi des brainrots, maître de toutes les dimensions !' },
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
  maxSpan: 18,              // durée max (s) des apparitions d'une vague : au-delà, les groupes sont resserrés
  spawnPace: 1,             // écart entre deux apparitions (x l'intervalle de chaque ennemi)
  bossEscortBudget: 0.5,    // part du budget normal qui accompagne un boss ou un mini-boss
  finalWaveBudget: 1.1,     // dernière vague d'un niveau normal
  bossHpGrowth: 1.6,        // mode infini : PV des boss x1,6 à chaque boss
  eliteFrom: 31,            // niveau de campagne (4-1) à partir duquel des groupes « élite » apparaissent
  eliteChance: 0.22, eliteHp: 3, eliteReward: 3,
};

// ----------------------------------------------------------------------------
//  CAMPAGNE : mondes de PER_WORLD niveaux. Le dernier niveau de chaque monde est un niveau de boss, plus long.
// ----------------------------------------------------------------------------
export const PER_WORLD = 10;               // 9 niveaux normaux + 1 niveau de boss par monde
// numéro de niveau (1, 2, ...) du niveau idx (1 à 10) du monde w (1 à N)
export const lvl = (w, idx) => (w - 1) * PER_WORLD + idx;
// mech = petite mécanique propre au monde (voir Game.updateMech) :
//   sandstorm : tempête de sable périodique, portée des tourelles réduite
//   eruption  : rochers de lave annoncés puis qui tombent : blessent les brainrots, étourdissent les tourelles touchées
//   ice       : plaques de glace sur le chemin, les brainrots y glissent plus vite
//   grass     : hautes herbes sur le chemin, les brainrots y sont cachés (sauf tourelles qui détectent, ou de près)
export const WORLDS = [
  { id: 'prairie', name: 'Prairie Pesto',     theme: 'prairie', boss: 'boss1', color: '#5fb53c', era: 0, mech: null },
  { id: 'desert',  name: 'Désert Tiramisu',   theme: 'desert',  boss: 'boss2', color: '#e2a03c', era: 0,
    mech: { kind: 'sandstorm', name: 'Tempête de sable', desc: 'Portée des tourelles réduite pendant la tempête', first: 30, every: 45, dur: 9, range: 0.72 } },
  { id: 'volcano', name: 'Volcan Gelato',     theme: 'volcano', boss: 'boss3', color: '#8a5fb0', era: 0,
    mech: { kind: 'eruption', name: 'Éruption', desc: 'Des rochers de lave tombent : ils blessent les brainrots et étourdissent les tourelles', first: 25, every: 32, rocks: 3, warn: 1.4, radius: 58, damage: 70, stun: 2.5 } },
  { id: 'glacier', name: 'Glacier Granita',   theme: 'ice',     boss: 'boss4', color: '#5aa9e0', era: 0,
    mech: { kind: 'ice', name: 'Plaques de glace', desc: 'Les brainrots glissent plus vite sur la glace', patches: 3, len: 150, speed: 1.45 } },
  { id: 'jungle',  name: 'Jungle Basilico',   theme: 'jungle',  boss: 'boss5', color: '#2f9a45', era: 0,
    mech: { kind: 'grass', name: 'Hautes herbes', desc: 'Les brainrots s\'y cachent : tourelles proches ou détection', patches: 2, len: 150, see: 95 } },
  // --- ère futuriste ---
  { id: 'neon',      name: 'Ville Néon',         theme: 'neon',      boss: 'boss6', color: '#ff3fb4', era: 1,
    mech: { kind: 'blackout', name: 'Coupures de courant', desc: 'Des tourelles s\'éteignent quelques secondes', first: 28, every: 36, part: 0.34, dur: 3.2, warn: 1.6 } },
  { id: 'station',   name: 'Station Orbitale',   theme: 'station',   boss: 'boss7', color: '#5fd8ff', era: 1,
    mech: { kind: 'portal', name: 'Portails', desc: 'Portail bleu : bond en avant. Portail orange : retour en arrière', jump: 230, back: 170 } },
  { id: 'dimension', name: 'Dimension Brainrot', theme: 'dimension', boss: 'boss8', color: '#b05cff', era: 1,
    mech: { kind: 'chaos', name: 'Chaos', desc: 'Chaque vague déclenche une mécanique des autres mondes', first: 18, every: 30, patches: 1, len: 130, speed: 1.4, see: 95,
            storm: { dur: 8, range: 0.75 }, rocks: 3, warn: 1.4, radius: 58, damage: 70, stun: 2.2, part: 0.3, out: 3 } },
];
export const CAMPAIGN = {
  waves:     [9, 10, 10, 11, 11, 12, 12, 13, 14], // niveaux 1 à 9 d'un monde (~4 à 6 min)
  bossWaves: [20, 22, 24, 25, 26, 26, 27, 28],   // niveau 10 (boss) de chaque monde (15 à 20 min)
  bossPaceTo: 20,                         // un niveau de boss finit à la difficulté d'une « vague 20 »
  pathRef: 2000, pathEase: [0.62, 1.12],  // PV des ennemis x (longueur du chemin / pathRef), borné : un tracé court laisse moins de temps pour tirer
  money:     [260, 260, 255, 255, 250, 250, 245, 245, 240, 320],   // pièces de départ par niveau du monde
  lives: 20,
  slots:     [10, 10, 11, 11, 12, 12, 12, 13, 13, 14],    // emplacements de tourelles par niveau du monde
  mines: 5,
  layouts: [                              // tracé de chaque niveau ('!' = en miroir), voir LAYOUTS dans js/maps.js
    ['lacets', 'escalier', 'boucle', 'detour', 'zigzag', 'croix', 'serpent!', 'lacets!', 'escalier!', 'fourche'],
    ['detour!', 'serpent', 'lacets!', 'croix', 'boucle!', 'zigzag!', 'tour', 'escalier!', 'detour', 'ygrec'],
    ['boucle!', 'tour', 'fourche', 'serpent!', 'detour', 'escalier', 'zigzag', 'ygrec!', 'lacets', 'croix!'],
    ['escalier', 'ygrec!', 'lacets', 'boucle', 'croix', 'tour!', 'detour!', 'zigzag!', 'fourche!', 'serpent'],
    ['zigzag', 'fourche', 'serpent!', 'ygrec', 'detour!', 'boucle', 'croix!', 'lacets!', 'escalier', 'tour'],
    ['croix', 'lacets', 'detour!', 'fourche!', 'escalier!', 'zigzag', 'ygrec', 'boucle!', 'tour!', 'serpent!'],
    ['ygrec!', 'boucle', 'zigzag!', 'escalier', 'tour', 'croix!', 'fourche', 'detour', 'serpent', 'lacets'],
    ['fourche!', 'tour!', 'croix', 'serpent', 'ygrec', 'lacets!', 'boucle!', 'escalier!', 'zigzag', 'detour!'],
  ],
  hpWorld:    [1.4, 1.5, 1.6, 1.85, 2.1, 2.2, 2.32, 2.45], // PV des ennemis par monde...
  bossLevelHp: [1.1, 1.0, 1.35, 0.95, 1.2, 1.0, 0.92, 0.92],         // niveaux de boss : PV des ennemis x (monde) — ils se gagnent avec les boosts
  hpLevel:    0.012,                      // ...puis +1,2 % par niveau dans le monde
  density:    [1, 1.08, 1.16, 1.24, 1.32, 1.34, 1.37, 1.4],// budget des vagues par monde
  speedWorld: [1, 1.03, 1.06, 1.09, 1.12, 1.14, 1.16, 1.18],
  miniBossEvery: 10,                      // niveaux de boss : un mini-boss toutes les 10 vagues
  miniBossHp: [0.12, 0.3, 0.5, 0.7],      // PV des mini-boss successifs (part des PV du boss)
  endlessAfter: 20,                       // le mode infini se débloque après ce niveau (fin du monde 2)
  // gemmes
  // gemmes : seulement à la 1re victoire et aux premières 3 étoiles (pas aux replays) ; ×2 pour un boss
  gemsWin: 0, gemsPerStar: 0, gemsFirstClear: 3, gems3Stars: 2, gemsHeroicFirst: 4, gemsBossMult: 2, gemsPerWaveLost: 0, gemsPerWaveEndless: 0.09,   // gemmes : monnaie rare (-40 %)
};
// Liste à plat des niveaux (PER_WORLD par monde)
export const LEVELS = [];
WORLDS.forEach((w, wi) => {
  for (let i = 0; i < PER_WORLD; i++) {
    const boss = i === PER_WORLD - 1, waves = boss ? CAMPAIGN.bossWaves[wi] : CAMPAIGN.waves[i], lay = CAMPAIGN.layouts[wi][i];
    LEVELS.push({
      n: wi * PER_WORLD + i + 1, id: `${wi + 1}-${i + 1}`, world: wi, idx: i, boss, waves,
      layout: lay.replace('!', ''), mirror: lay.endsWith('!'), slots: CAMPAIGN.slots[i], money: CAMPAIGN.money[i],
      hp: +(CAMPAIGN.hpWorld[wi] * (1 + CAMPAIGN.hpLevel * i) * (boss ? CAMPAIGN.bossLevelHp[wi] : 1)).toFixed(3), density: CAMPAIGN.density[wi], speed: CAMPAIGN.speedWorld[wi],
      pace: boss ? (CAMPAIGN.bossPaceTo - 1) / (waves - 1) : 1,
    });
  }
});

// Défi « Héroïque » : débloqué en terminant un niveau. Une contrainte par niveau (à tour de rôle) + ennemis plus résistants.
export const HEROIC = {
  hp: 1.25, gemsMult: 2, xpMult: 2, scoreMult: 1.5,
  coinsMult: 1,   // pièces d'un défi héroïque : comme un niveau normal (le château est déjà au maximum à ce stade)
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
// coûts du château : ×CASTLE_GROWTH par rang (exponentiel)
const CASTLE_GROWTH = 1.55, CASTLE_COST = 1.3;   // CASTLE_COST : tous les coûts ×1,3 (plus de pièces gagnées)
const grow = (base, n = 5) => Array.from({ length: n }, (_, i) => Math.round((base * CASTLE_COST * CASTLE_GROWTH ** i) / 10) * 10);
export const CASTLE = {
  upgrades: {
    walls:    { name: 'Murs',        desc: '+2 PV max par niveau', icon: 'heart', per: 2, costs: grow(560) },
    repair:   { name: 'Réparation',  desc: 'Régénère 1 PV entre les vagues', icon: 'wrench', every: [0, 4, 3, 2, 2, 1], costs: grow(720) },   // every[niveau] = toutes les N vagues
    treasury: { name: 'Trésorerie',  desc: '+20 pièces au départ et +2 par vague, par niveau', icon: 'coins', start: 20, perWave: 2, costs: grow(620) },
    cannon:   { name: 'Canon',       desc: 'Le château tire sur les ennemis proches', icon: 'cannon', damage: [0, 14, 24, 38, 56, 80], rate: [0, 1, 1.1, 1.2, 1.35, 1.5], range: [0, 150, 160, 170, 185, 200], costs: grow(900) },
  },
  // capacités actives : niveau 0 = verrouillée. cd en secondes.
  abilities: {
    air:      { name: 'Frappe aérienne', desc: 'Bombarde une zone ciblée', icon: 'bomb', color: '#ff7a3c', cd: [0, 50, 45, 40], damage: [0, 220, 380, 600], pct: 0.25, bossPct: 0.04, radius: [0, 90, 100, 115], costs: grow(1200, 3) },
    blizzard: { name: 'Blizzard',        desc: "Ralentit tous les ennemis de l'écran", icon: 'snow', color: '#5fd8ff', cd: [0, 60, 55, 50], slow: [0, 0.5, 0.6, 0.7], dur: [0, 5, 6.5, 8], costs: grow(1400, 3) },
    gold:     { name: "Pluie d'or",      desc: 'Fait tomber des pièces bonus', icon: 'coins', color: '#ffd23f', cd: [0, 75, 70, 60], coins: [0, 50, 80, 120], perWave: [0, 3, 4, 6], costs: grow(1500, 3) },
  },
  build: { upgrades: [1, 3, 8, 15, 30], abilities: [5, 15, 30] },   // minutes de construction par rang (une à la fois)
  speedGemsPerMin: 1 / 3,     // accélérer : 1 gemme par tranche de 3 minutes restantes
  rankCap: { upgrades: [2, 3, 3, 4, 4, 5, 5, 5], abilities: [1, 1, 2, 2, 3, 3, 3, 3] },   // rang max selon le monde atteint (1 à 8)
  // palier d'apparence k (k >= 1) : il faut aussi avoir battu le boss du monde k
  // total de niveaux d'amélioration (29 au max) pour chaque apparence : fortin en bois, château de pierre, forteresse,
  // citadelle, palais doré, forteresse high-tech, citadelle orbitale, palais brainrot
  tiers: [0, 4, 8, 12, 16, 20, 24, 27],
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
// Prix en pièces des boosts selon le monde atteint (les gains en pièces grandissent avec les mondes) :
// prix de base x (1 + perWorld x (monde - 1)), arrondi à 10. Les boosts en gemmes ne changent pas.
export const BOOST_PRICE = { perWorld: 0.5 };
export const boostCost = (id, world = 1) => { const b = BOOSTS[id]; return (b.cur || 'gems') === 'coins' ? Math.round((b.cost * (1 + BOOST_PRICE.perWorld * (Math.max(1, world) - 1))) / 10) * 10 : b.cost; };
export const BOOST_SLOTS = { normal: 3, boss: 3 };   // emplacements rapides en partie (+ talent « Sacoche »)
// Bulles de boost lâchées par les brainrots (à toucher) et mise en scène des activations
export const DROPS = {
  chance: 0.012, eliteChance: 0.25,   // par kill (un boss en lâche toujours une)
  maxPerLevel: 3, minGap: 25,         // au plus 3 par niveau, 25 s d'écart minimum
  life: 7, tapRadius: 44, maxSlots: 6,
  pool: ['coins2', 'heal', 'over', 'shield', 'free'],
  slowMo: 0.25, slowTime: 0.5,        // ralenti à l'activation : vitesse x0,25 pendant 0,5 s
  crowd: 12,                          // ennemis à l'écran pour que la Surcharge « pulse »
};
export const STARTER_BOOSTS = { coins2: 1, heal: 1, free: 1, over: 1, shield: 0, revive: 0 };

// ----------------------------------------------------------------------------
//  NIVEAU DE JOUEUR, TALENTS, COFFRES
// ----------------------------------------------------------------------------
export const XP = {
  perCost: 0.25,                // XP par point de « coût » d'ennemi éliminé
  perWave: 4, perStar: 20, win: 30,
  replay3: 0.25,                // XP d'un niveau déjà fait en 3 étoiles : ×0,25 (le replay rapporte surtout des pièces)
  need: (lvl) => Math.round(260 + 95 * (lvl - 1) + 6 * (lvl - 1) ** 2),   // courbe plus raide
  // récompense de chaque niveau gagné (cycle), + un coffre doré tous les 10 niveaux
  // récompense de chaque niveau atteint : 1 point de talent tous les 2 niveaux, sinon pièces / boosts ;
  // coffre en bois tous les 5 niveaux, doré tous les 10
  rewards: [{ talent: 1 }, { coins: 120 }, { talent: 1 }, { boosts: 1 }],
};
// rangée i de l'arbre (1 à 4) disponible à ce niveau de joueur ; 1 point de talent de plus par 1re victoire Héroïque
export const TALENT_ROWS = [1, 8, 16, 25];
export const TALENTS = {
  attack: { name: 'Attaque', color: '#ff5d6c', icon: 'sword', nodes: [
    { id: 'dmg', icon: 'sword',   name: 'Poudre premium', desc: '+2 % de dégâts', max: 5, per: 0.02, pct: 1, fx: '+{v} % dégâts' },
    { id: 'rate', icon: 'bolt',  name: 'Culasse huilée', desc: '+2 % de cadence', max: 5, per: 0.02, pct: 1, fx: '+{v} % cadence' },
    { id: 'range', icon: 'target', name: 'Longue-vue',     desc: '+2 % de portée', max: 3, per: 0.02, pct: 1, fx: '+{v} % portée' },
    { id: 'crit', icon: 'crit',  name: 'Œil vif',        desc: '+1 % de coups critiques', max: 3, per: 0.01, pct: 1, fx: '+{v} % critiques' },
  ] },
  economy: { name: 'Économie', color: '#ffd23f', icon: 'coins', nodes: [
    { id: 'start', icon: 'piggy', name: 'Tirelire',       desc: '+15 pièces au départ', max: 5, per: 15, fx: '+{v} pièces' },
    { id: 'kill', icon: 'coins',  name: 'Chasseur de primes', desc: '+3 % de pièces par kill', max: 5, per: 0.03, pct: 1, fx: '+{v} % pièces' },
    { id: 'wave', icon: 'gift',  name: 'Prime de vague', desc: '+10 % de bonus de vague', max: 3, per: 0.1, pct: 1, fx: '+{v} % bonus' },
    { id: 'gems', icon: 'gem',  name: 'Joaillier',      desc: '+5 % de gemmes gagnées', max: 3, per: 0.05, pct: 1, fx: '+{v} % gemmes' },
  ] },
  castle: { name: 'Château', color: '#5c9df2', icon: 'shield', nodes: [
    { id: 'lives', icon: 'heart', name: 'Garnison',       desc: '+1 PV au château', max: 5, per: 1, fx: '+{v} PV' },
    { id: 'cd', icon: 'hourglass',    name: 'Artilleurs',     desc: '-4 % de recharge des capacités', max: 5, per: 0.04, pct: 1, fx: '-{v} % recharge' },
    { id: 'dur', icon: 'snow',   name: 'Ingénieur',      desc: '+10 % de durée de Surcharge et de Blizzard', max: 3, per: 0.1, pct: 1, fx: '+{v} % durée' },
    { id: 'slot', icon: 'boost',  name: 'Sacoche',        desc: '+1 emplacement de boost', max: 1, per: 1, need: 6, fx: '+{v} emplacement' },   // need = points déjà placés dans la branche
  ] },
};
export const CHESTS = {
  // cost = prix en gemmes ; coinCost = prix en pièces (×(1 + CHEST_COINS.perWorld × (monde - 1)), pour dépenser les pièces
  // en fin de partie, une fois le château terminé)
  wood: { name: 'Coffre en bois', cost: 60, coinCost: 600, cards: 3, coins: [60, 130], gems: [1, 3], boostChance: 0.6, rare: 0.15 },
  gold: { name: 'Coffre doré',    cost: 180, coinCost: 2000, cards: 5, coins: [220, 400], gems: [4, 9], boostChance: 0.65, rare: 0.4 },   // rare = chance qu'un boost soit Bouclier / Seconde chance
  legend: { name: 'Coffre légendaire', cost: 0, noBuy: true, cards: 7, coins: [450, 900], gems: [7, 15], boostChance: 0.75, rare: 0.7 },   // récompense uniquement
};
export const CHEST_ORDER = ['wood', 'gold', 'legend'];
export const CHEST_COINS = { perWorld: 0.15 };
export const chestCoinCost = (kind, world = 1) => Math.round((CHESTS[kind].coinCost * (1 + CHEST_COINS.perWorld * (Math.max(1, world) - 1))) / 10) * 10;
// ----------------------------------------------------------------------------
//  CALENDRIER DE DÉBLOCAGE par la campagne. Valeur = niveau (lvl(monde, n)) à partir duquel c'est disponible :
//  on l'obtient en battant le niveau précédent (1 = dès le départ ; 31 = en battant le dernier boss).
// ----------------------------------------------------------------------------
export const UNLOCKS = {
  towers: { assault: 1, smg: 1, shotgun: lvl(1, 2), mine: lvl(1, 4), cryo: lvl(1, 6), sniper: lvl(2, 1), rocket: lvl(2, 4), minigun: lvl(3, 1),
            laser: lvl(6, 1), tesla: lvl(6, 5), plasma: lvl(7, 1), drone: lvl(7, 5) },   // ère futuriste
  // améliorations légendaires (5e niveau), en début de monde 3, 4, 5, 7 et 8
  legend: { assault: lvl(3, 1), smg: lvl(3, 1), shotgun: lvl(3, 1), sniper: lvl(4, 1), rocket: lvl(4, 1), mine: lvl(4, 1), minigun: lvl(5, 1), cryo: lvl(5, 1),
            laser: lvl(7, 1), tesla: lvl(7, 1), plasma: lvl(8, 1), drone: lvl(8, 1) },
  // skin exclusif du boss de chaque monde (obtenu en le battant)
  skins: { emerald: lvl(2, 1), royal: lvl(3, 1), obsidian: lvl(4, 1), frost: lvl(5, 1), galaxy: lvl(6, 1), chrome: lvl(7, 1), nebula: lvl(8, 1), glitchy: lvl(8, 10) + 1 },
};
// Ce que rapporte la PREMIÈRE victoire au niveau n (en plus des pièces et gemmes)
export function unlocksOf(n) {
  const pick = (o) => Object.keys(o).filter((k) => o[k] === n + 1);
  return { towers: pick(UNLOCKS.towers), legend: pick(UNLOCKS.legend), skins: pick(UNLOCKS.skins) };
}
// Coffres d'étoiles de chaque monde : [étoiles, coffre]
export const STAR_CHESTS = [[10, 'wood'], [20, 'gold'], [30, 'legend']];   // 30 étoiles par monde
// Fin de monde (boss vaincu la 1re fois) : grosse récompense, en plus du skin exclusif
export const WORLD_REWARD = { chest: 'legend', gems: 9, boosts: { coins2: 2, shield: 1, over: 2 }, castleFree: 2 };
// Offre du jour (boutique) : un article tiré au sort chaque jour, remisé, achetable une fois
export const exchangeCoins = (pack, world = 1) => Math.round((pack.coins * (1 + SHOP.exchange.perWorld * (Math.max(1, world) - 1))) / 10) * 10;
export const OFFER = {
  discount: 0.4,
  pool: [
    { chest: 'gold' }, { chest: 'wood' }, { boost: 'shield', n: 2 }, { boost: 'revive', n: 2 },
    { boost: 'over', n: 3 }, { boost: 'coins2', n: 3 }, { skin: 'neon' }, { skin: 'lava' }, { skin: 'candy' }, { skin: 'gold' },
  ],
};

// ----------------------------------------------------------------------------
//  BOUTIQUE (gemmes) — tout se débloque en jouant
// ----------------------------------------------------------------------------
export const SHOP = {
  // Échange gemmes → pièces : 3 packs, plus le pack est gros, meilleur est le taux ; pièces ×(1 + perWorld × (monde - 1))
  exchange: { perWorld: 0.2, packs: [{ gems: 20, coins: 400 }, { gems: 60, coins: 1400, tag: '+17 %' }, { gems: 150, coins: 4000, tag: '+33 %' }] },
  boostPack: { gems: 40, n: 5 },   // lot de boosts au hasard
  get starterTowers() { return Object.keys(UNLOCKS.towers).filter((t) => UNLOCKS.towers[t] <= 1); },
  skins: [   // finish = rendu appliqué aux sprites d'armes (voir js/sprites.js)
    { id: 'default', name: 'Standard',   cost: 0,   finish: 'classic' },
    { id: 'camo',    name: 'Camouflage', cost: 60,  finish: 'camo' },
    { id: 'neon',    name: 'Néon',       cost: 90,  finish: 'neon' },
    { id: 'lava',    name: 'Lave',       cost: 90,  finish: 'lava' },
    { id: 'candy',   name: 'Bonbon',     cost: 120, finish: 'candy' },
    { id: 'gold',    name: 'Or massif',  cost: 200, finish: 'gold' },
    // skins exclusifs : offerts en battant le boss d'un monde (voir UNLOCKS.skins)
    { id: 'emerald',  name: 'Émeraude',   cost: 0, finish: 'emerald', exclusive: true },
    { id: 'royal',    name: 'Pharaon',    cost: 0, finish: 'royal', exclusive: true },
    { id: 'obsidian', name: 'Obsidienne', cost: 0, finish: 'obsidian', exclusive: true },
    { id: 'frost',    name: 'Givre',      cost: 0, finish: 'frost', exclusive: true },
    { id: 'galaxy',   name: 'Galaxie',    cost: 0, finish: 'galaxy', exclusive: true },
    { id: 'chrome',   name: 'Chrome',     cost: 0, finish: 'chrome', exclusive: true },
    { id: 'nebula',   name: 'Nébuleuse',  cost: 0, finish: 'nebula', exclusive: true },
    { id: 'glitchy',  name: 'Glitch',     cost: 0, finish: 'glitchy', exclusive: true },
    // skins de Renaissance (boutique d'éclats) : finition + aura autour des tourelles
    { id: 'phoenix',  name: 'Phénix',     cost: 0, finish: 'phoenix', rebirth: true, aura: '#ff7a3c' },
    { id: 'prism',    name: 'Prisme',     cost: 0, finish: 'prism', rebirth: true, aura: '#b05cff' },
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
// Menu radial d'un emplacement (px écran)
export const RADIAL = {
  ringMax: 6,        // choix de tourelle : anneau jusqu'à 6 tourelles, au-delà rangée défilante en bas de l'écran
  rRing: 76,         // rayon fixe de l'anneau de choix (px écran)
  cell: 62, cellBranch: 104, barGap: 6,   // barre d'amélioration : largeur d'une case (px), d'une case de branche, écart
  towerR: 34,        // rayon de la tourelle (unités du terrain) que les boutons et le panneau ne recouvrent pas
  ringPad: 44,       // marge autour des boutons (prix, libellés) que le panneau ne recouvre pas
  pathNear: 260,     // le panneau évite le chemin dans ce rayon autour de l'emplacement (unités du terrain)
  pathHalf: 30,      // demi-largeur du chemin prise en compte (unités du terrain)
};
// ----------------------------------------------------------------------------
//  RENAISSANCE (prestige) : disponible une fois le boss du dernier monde battu. Remet à zéro la campagne, le château,
//  les talents (points rendus) et les pièces ; garde collection, skins, succès, niveau, gemmes et boosts.
//  Chaque rang : bonus permanents, brainrots « mutés » (plus résistants, ils se régénèrent) mais gains multipliés.
// ----------------------------------------------------------------------------
export const REBIRTH = {
  shardsBase: 20, shardsPerStar: 1, shardsPerHeroic: 3,   // éclats gagnés : base + étoiles + défis héroïques réussis
  coinsPerShard: 250,                                      // + les pièces restantes, converties : 1 éclat par 250 pièces
  coinsPerRank: 0.10, damagePerRank: 0.05,                 // bonus permanents par rang
  hpPerRank: 0.30, speedPerRank: 0.03, regenPerRank: 0.004, // mutation : PV, vitesse, régénération (part des PV max / s)
  rewardPerRank: 0.5,                                      // gains de fin de niveau (pièces, gemmes, XP) x (1 + 0.5 x rang)
  // Mk II : une 3e branche d'amélioration (niveau 4, puis 5 légendaire)
  mk2: {
    smg:     { name: 'Balles ricochets', desc: 'Chaque balle rebondit sur 2 ennemis proches (60 % des dégâts).', cost: 260, mods: { ricochet: 2, ricochetPct: 0.6, rateMul: 1.1 },
               master: { name: 'Billard infernal', desc: '4 rebonds, dégâts +40 %.', cost: 440, mods: { ricochet: 4, damageMul: 1.4 } } },
    assault: { name: 'Munitions explosives', desc: 'Chaque balle explose (petite zone).', cost: 270, mods: { blast: 34, damageMul: 1.2 },
               master: { name: 'Obus', desc: 'Zone +40 %, dégâts +40 %.', cost: 450, mods: { blastMul: 1.4, damageMul: 1.4 } } },
    shotgun: { name: 'Fléchettes', desc: 'Les plombs traversent 2 ennemis, portée +30 %.', cost: 280, mods: { pierce: 2, rangeMul: 1.3, ignoreArmor: true },
               master: { name: 'Tempête de fléchettes', desc: '+4 plombs, traversent 4 ennemis.', cost: 460, mods: { pelletsAdd: 4, pierce: 4 } } },
    sniper:  { name: 'Rail-gun', desc: 'Le tir traverse toute la ligne et ignore le blindage.', cost: 500, mods: { pierce: 12, ignoreArmor: true, damageMul: 1.2 },
               master: { name: 'Canon électromagnétique', desc: 'Dégâts +80 %, étourdit.', cost: 780, mods: { damageMul: 1.8, stun: 0.5 } } },
    rocket:  { name: 'Napalm', desc: "L'explosion enflamme tous les ennemis touchés.", cost: 540, mods: { burn: 30, burnDur: 3, splashMul: 1.15 },
               master: { name: 'Mer de feu', desc: 'Brûlure x2, zone +25 %.', cost: 830, mods: { burnMul: 2, splashMul: 1.25 } } },
    tesla:   { name: 'Arc magnétique', desc: "L'éclair ralentit fortement les ennemis touchés.", cost: 540, mods: { slowZap: 0.5, chain: 6, damageMul: 1.2 },
               master: { name: 'Orage polaire', desc: 'Dégâts +60 %, 8 sauts.', cost: 840, mods: { damageMul: 1.6, chain: 8 } } },
  },
  // nouvelles capacités (pouvoirs de Renaissance, à côté des capacités du château)
  abilities: {
    meteor: { name: 'Pluie de météores', desc: 'Six météores tombent sur les brainrots', icon: 'flame', color: '#ff5d3c', cd: 55, count: 6, radius: 70, damage: 260, pct: 0.12, bossPct: 0.03 },
    rewind: { name: 'Retour arrière', desc: 'Renvoie tous les brainrots en arrière sur le chemin', icon: 'restart', color: '#b05cff', cd: 70, dist: 150 },
  },
  // boutique d'éclats
  shop: [
    ...['smg', 'assault', 'shotgun', 'sniper', 'rocket', 'tesla'].map((t) => ({ id: 'mk2_' + t, kind: 'mk2', tower: t, cost: t === 'sniper' || t === 'rocket' || t === 'tesla' ? 140 : 110 })),
    { id: 'ab_meteor', kind: 'ability', ability: 'meteor', cost: 180 },
    { id: 'ab_rewind', kind: 'ability', ability: 'rewind', cost: 200 },
    { id: 'skin_phoenix', kind: 'skin', skin: 'phoenix', cost: 150 },
    { id: 'skin_prism', kind: 'skin', skin: 'prism', cost: 150 },
    { id: 'slot', kind: 'slot', cost: 260, name: 'Emplacement de boost', desc: 'Un 4e boost à emporter dans chaque niveau' },
  ],
};
export const ROMAN = (n) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
// capacité active, du château ou de Renaissance
export const abilityDef = (id) => CASTLE.abilities[id] || REBIRTH.abilities[id];
// Qualité graphique automatique : si les images mettent trop de temps à se calculer, on descend d'un cran
// (définition du canvas et nombre de particules). On ne remonte pas en cours de session, pour éviter les à-coups.
// Écran de jeu : rangée du bas, pièces qui volent, textes flottants, notifications
export const HUD_FX = {
  dockMax: 3,            // boutons visibles de chaque côté (capacités à gauche, boosts à droite) ; au-delà, une pile
  coinCap: 24,           // pièces à l'écran au plus ; au-delà, elles se regroupent en grosses pièces
  coinPerEvent: 4,       // pièces par brainrot éliminé (au plus)
  coinDelay: 0.14, coinStagger: 0.03,   // envol : attente avant l'aimantation, puis décalage entre pièces
  coinSound: 70,         // ms entre deux sons de pièce
  textMax: 14,           // textes flottants à l'écran au plus
  textMerge: 40,         // distance (unités du terrain) sous laquelle deux nombres de même couleur s'additionnent
  toastMs: 2600, toastMax: 2,          // notifications en partie : durée, nombre affiché en même temps
};
export const QUALITY = {
  dpr: [2.5, 2, 1.5],               // définition maximale du canvas (pixels par point) par cran
  particles: [1400, 800, 400],      // particules simultanées
  slowWork: 11,                     // ms de calcul par image (moyenne glissante) au-delà desquelles on descend
  slowGap: 26, slowGapWork: 4,      // ou : intervalle entre images > slowGap ms alors que le calcul dépasse slowGapWork ms
  hold: 3,                          // secondes de lenteur continue avant de descendre
};
// Étoiles : 3 objectifs indépendants par niveau (une étoile gagnée le reste, on peut les obtenir en plusieurs fois)
//   1. gagner   2. aucun PV perdu   3. selon le niveau : N tourelles maximum, ou finir avant un temps limite
// three / two = anciens seuils (part de PV restants), encore utilisés pour le défi Héroïque et le défi du jour.
export const STARS = {
  three: 0.9, two: 0.5,
  towersRatio: 0.55,          // tourelles autorisées = emplacements x ce ratio (mines non comptées)
  timeRatio: 0.82,            // temps limite = durée de référence x ce ratio, arrondi à 15 s
  timeRatioBoss: 0.92,        // niveaux de boss : le combat contre le boss ne se raccourcit presque pas
  // durée de référence par vague (s), vagues lancées automatiquement (mesurée par tools/simulate.cjs, robot « good »)
  parPerWave: 28, parPerWaveBoss: 31,
};
const mmss = (s) => `${Math.floor(s / 60)} min${s % 60 ? ' ' + String(s % 60).padStart(2, '0') : ''}`;
// Les 3 objectifs d'un niveau : [{ id, text, n }]
export function starGoals(L) {
  const third = !L.boss && L.idx % 2 === 0
    ? (() => { const n = Math.max(3, Math.round(L.slots * STARS.towersRatio)); return { id: 'towers', n, text: `${n} tourelles maximum` }; })()
    : (() => { const n = Math.max(60, Math.round((L.waves * (L.boss ? STARS.parPerWaveBoss * STARS.timeRatioBoss : STARS.parPerWave * STARS.timeRatio)) / 15) * 15); return { id: 'time', n, text: `Finir en moins de ${mmss(n)}` }; })();
  return [{ id: 'win', text: 'Gagner le niveau' }, { id: 'clean', text: 'Aucun PV perdu' }, third];
}

// ----------------------------------------------------------------------------
//  SUCCÈS — "stat" lit save.stats[stat] ; "special" est géré dans save.js
// ----------------------------------------------------------------------------
export const ACHIEVEMENTS = [
  { id: 'kills100',  name: 'Première fournée',   desc: 'Éliminer 100 brainrots',         stat: 'kills', goal: 100,  gems: 3 },
  { id: 'kills1000', name: 'Exterminateur',      desc: 'Éliminer 1 000 brainrots',       stat: 'kills', goal: 1000, gems: 9 },
  { id: 'kills5000', name: 'Légende anti-rot',   desc: 'Éliminer 5 000 brainrots',       stat: 'kills', goal: 5000, gems: 24 },
  { id: 'boss1',     name: 'Chasseur de boss',   desc: 'Vaincre un boss',                stat: 'bossKills', goal: 1, gems: 6 },
  { id: 'boss10',    name: 'Terreur des boss',   desc: 'Vaincre 10 boss',                stat: 'bossKills', goal: 10, gems: 18 },
  { id: 'build50',   name: 'Armurier',           desc: 'Poser 50 tourelles',             stat: 'towersBuilt', goal: 50, gems: 6 },
  { id: 'legend',    name: 'Butin doré',         desc: 'Monter une tourelle au niveau Légendaire', stat: 'legendaries', goal: 1, gems: 6 },
  { id: 'win1',      name: 'Première victoire',  desc: 'Gagner une partie',              stat: 'wins', goal: 1, gems: 6 },
  { id: 'win10',     name: 'Vétéran',            desc: 'Gagner 10 parties',              stat: 'wins', goal: 10, gems: 18 },
  { id: 'perfect',   name: 'Sans une égratignure', desc: 'Gagner sans perdre un seul PV', stat: 'perfectWins', goal: 1, gems: 12 },
  { id: 'hard',      name: 'Dur à cuire',        desc: 'Gagner un défi Héroïque',        stat: 'heroicWins', goal: 1, gems: 15 },
  { id: 'world1',    name: 'Sauveur de la prairie', desc: 'Terminer le monde 1',          special: 'progress', goal: 6, gems: 12 },
  { id: 'rebirth1',  name: 'Phénix',             desc: 'Faire une Renaissance',          stat: 'rebirths', goal: 1, gems: 30 },
  { id: 'world5',    name: 'Roi du bastion',     desc: 'Terminer la campagne',           special: 'progress', goal: 80, gems: 60 },
  { id: 'stars9',    name: 'Collectionneur',     desc: 'Obtenir 9 étoiles au total',     special: 'stars', goal: 9, gems: 18 },
  { id: 'stars45',   name: 'Constellation',      desc: 'Obtenir 45 étoiles au total',    special: 'stars', goal: 45, gems: 36 },
  { id: 'endless40', name: 'Sans fin',           desc: 'Atteindre la vague 40 en mode infini', stat: 'bestEndless', goal: 40, gems: 18 },
  { id: 'early20',   name: 'Pressé',             desc: 'Lancer 20 vagues en avance',     stat: 'earlyStarts', goal: 20, gems: 6 },
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
  win: 60, perStar: 15, perWave: 4, perWaveLost: 3, firstClear: 80, bossMult: 2, endlessPerWave: 4,   // pièces : monnaie de tous les jours
};
// Barre d'onglets du hub (ordre affiché)
export const TABS = [
  { id: 'shop', label: 'Boutique', icon: 'cart' },
  { id: 'castle', label: 'Château', icon: 'castle' },
  { id: 'menu', label: 'Accueil', icon: 'home' },
  { id: 'talents', label: 'Talents', icon: 'talent' },
  { id: 'collection', label: 'Collection', icon: 'book' },
];

// ----------------------------------------------------------------------------
//  JUICE : combos, micro-pauses, couleurs des éclaboussures, musique
// ----------------------------------------------------------------------------
export const JUICE = {
  crowdKills: 6, crowdDecay: 1, crowdFx: 0.35,   // plus de 6 morts par seconde : particules par mort x0,35, sans confettis
  chainWindow: 1.3,          // s entre deux kills pour garder le combo
  chainTiers: [              // paliers du compteur de combo : [kills, texte, points bonus]
    [5, 'COMBO !', 60], [10, 'SUPER !', 160], [25, 'CARNAGE !', 500], [50, 'APOCALYPSE !', 1500], [100, 'LÉGENDAIRE !', 4000],
  ],
  hitStop: 0.04,             // micro-pause (s) sur les gros coups
  hitStopGap: 0.25,          // au plus une micro-pause toutes les 0,25 s
  bigHit: 0.3,               // un coup « gros » retire au moins 30 % des PV max
  bossIntro: 2,              // s de cinématique d'entrée du boss
  bossDeathSlow: 1.4,        // s de ralenti à la mort du boss
  slime: {                   // couleurs des éclaboussures à la mort de chaque brainrot
    basic: ['#ffb347', '#e8443c', '#fff3b0'], fast: ['#e8443c', '#ff8a5c', '#3fae7a'], tank: ['#b9b3c6', '#ffd23f', '#8b85a3'],
    flying: ['#ffe45c', '#ff9dbb', '#fff'], armored: ['#ff7a5c', '#8e9aab', '#ffd23f'], splitter: ['#4cd137', '#ff5d6c', '#1f9a4c'],
    healer: ['#c58cff', '#6b3e1e', '#fff'], stealth: ['#8fe3ff', '#c9a6ff', '#fff'], mini: ['#4cd137', '#ff5d6c'],
    boss: ['#ffd23f', '#ff5d8f', '#5fd8ff', '#fff'],
  },
};
// Musique procédurale (js/music.js). Gammes en demi-tons ; prog = degrés de la gamme de chaque mesure (4 mesures) ;
// bass / arp / drums = 16 pas par mesure ('x' joue, 'X' plus fort, 'o' = quinte pour la basse, '.' = silence).
// Percussions : k grosse caisse, s caisse claire, h charleston, o charleston ouvert, m shaker, t tom, c conga,
// p clap, b clochette, z bip électronique. Les percussions et l'arpège ne jouent que pendant les vagues.
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], LYD = [0, 2, 4, 6, 7, 9, 11];
const PHRY = [0, 1, 4, 5, 7, 8, 10], PENTA = [0, 2, 4, 7, 9], MINP = [0, 3, 5, 7, 10];
export const MUSIC = {
  volume: 0.5,   // volume maximal de la musique (curseur à 100 %)
  mix: { tonal: 2.4, drums: 0.5 },   // équilibre instruments / percussions (vérifié par tools/music-test.cjs)
  // morceau par écran : menus, thème de chaque décor (WORLDS[].theme), boss
  songs: {
    menu:     { bpm: 104, root: 60, scale: MAJ, prog: [0, 5, 3, 4], seed: 11, density: 0.45, swing: 0.08, bass: 'x...x...x...x.o.', arp: 'x.x.x.x.x.x.x.x.',
                inst: { pad: 'triangle', lead: 'triangle', bass: 'triangle', vib: true, leadGain: 0.045 }, drums: { k: 'x.......x.......', p: '....x.......x...', m: 'x.x.x.x.x.x.x.x.' } },
    prairie:  { bpm: 112, root: 62, scale: MAJ, prog: [0, 3, 4, 0], seed: 21, density: 0.5, swing: 0.1, bass: 'x.....x.x.....o.', arp: 'x...x...x...x...',
                inst: { pad: 'triangle', lead: 'square', leadCut: 2600, bass: 'triangle', vib: true, leadGain: 0.03, arp: 'triangle', arpGain: 0.02 }, drums: { k: 'x.......x.x.....', s: '....x.......x...', m: 'xxxxxxxxxxxxxxxx' } },
    desert:   { bpm: 100, root: 57, scale: PHRY, prog: [0, 1, 0, 6], seed: 31, density: 0.55, bass: 'x..x..x.x..x..x.', arp: 'x.xx.x.xx.x.x.xx',
                inst: { pad: 'sawtooth', padGain: 0.012, lead: 'sawtooth', leadCut: 1800, leadLen: 0.6, bass: 'triangle', leadGain: 0.035, arp: 'triangle' }, drums: { t: 'x..x..x.........', c: '..x..x..x.xx.x.x', m: 'x.x.x.x.x.x.x.x.' } },
    volcano:  { bpm: 120, root: 52, scale: MIN, prog: [0, 5, 6, 4], seed: 41, density: 0.45, bass: 'x.xx.xx.x.xx.xx.', arp: 'x.x.x.x.x.x.x.x.',
                inst: { pad: 'sawtooth', padGain: 0.014, lead: 'square', leadCut: 1500, bass: 'sawtooth', bassGain: 0.08, bassCut: 600, leadGain: 0.03 }, drums: { k: 'x..x..x.x..x..x.', t: '......x.......xx', s: '....x.......x...' } },
    ice:      { bpm: 92, root: 64, scale: LYD, prog: [0, 1, 0, 4], seed: 51, density: 0.35, bass: 'x.......x.......', arp: 'x..x..x..x..x.x.',
                inst: { pad: 'sine', padGain: 0.03, lead: 'sine', leadOct: 2, leadLen: 2.5, leadGain: 0.05, bass: 'sine', bassGain: 0.1, arp: 'sine', arpOct: 1, arpGain: 0.03 }, drums: { b: 'x...x...x...x...', m: '..x...x...x...x.', k: 'x.......x.......' } },
    jungle:   { bpm: 116, root: 62, scale: PENTA, prog: [0, 2, 3, 1], seed: 61, density: 0.6, swing: 0.12, bass: 'x..x..x...x..x..', arp: 'x.x..x.x.x..x.x.',
                inst: { pad: 'triangle', padGain: 0.015, lead: 'sine', leadLen: 0.35, leadGain: 0.06, bass: 'triangle', arp: 'sine', arpGain: 0.03 }, drums: { c: 'x.xx..x.x.x..x.x', t: 'x.....x...x.....', m: 'xxxxxxxxxxxxxxxx' } },
    neon:     { bpm: 118, root: 57, scale: MIN, prog: [0, 5, 2, 6], seed: 71, density: 0.4, bass: 'xxxxxxxxxxxxxxxx', arp: 'xxxxxxxxxxxxxxxx',
                inst: { pad: 'sawtooth', padGain: 0.016, lead: 'square', leadDetune: 8, leadCut: 2200, bass: 'sawtooth', bassLen: 0.9, bassGain: 0.06, bassCut: 700, leadGain: 0.03, arp: 'square', arpGain: 0.012, leadUp: true }, drums: { k: 'x...x...x...x...', p: '....x.......x...', h: '..x...x...x...x.' } },
    station:  { bpm: 96, root: 59, scale: DOR, prog: [0, 3, 1, 4], seed: 81, density: 0.3, bass: 'x.......x...o...', arp: 'x..x..x..x..x..x',
                inst: { pad: 'sine', padGain: 0.035, lead: 'triangle', leadAttack: 0.08, leadLen: 2, leadGain: 0.04, vib: true, bass: 'sine', bassGain: 0.11, arp: 'sine', arpOct: 1, arpGain: 0.025 }, drums: { z: 'x.....x...x.....', k: 'x.......x.......', h: '....x.......x...' } },
    dimension:{ bpm: 128, root: 61, scale: MINP, prog: [0, 3, 1, 4], seed: 91, density: 0.65, swing: 0.06, bass: 'x.x.xx.x.x.xx.x.', arp: 'x.xx.xx.x.xx.xx.',
                inst: { pad: 'square', padGain: 0.01, lead: 'square', leadCut: 3000, leadGain: 0.03, leadUp: true, bass: 'sawtooth', bassCut: 900, arp: 'triangle', arpOct: 1 }, drums: { k: 'x..x..x.x..x..x.', p: '....x.......x..x', z: '.x...x...x...x..', h: 'x.x.x.x.x.x.x.x.' } },
    boss:     { bpm: 142, root: 52, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 0, 6], seed: 101, density: 0.55, bass: 'x.xxx.xxx.xxx.xx', arp: 'x.x.x.x.x.x.x.x.',
                inst: { pad: 'sawtooth', padGain: 0.015, lead: 'sawtooth', leadCut: 2000, leadGain: 0.032, bass: 'sawtooth', bassGain: 0.08, bassCut: 500, bassLen: 1.2 }, drums: { k: 'X.x.X.x.X.x.X.xx', s: '....X.......X...', t: '............xxxx', h: 'xxxxxxxxxxxxxxxx' } },
  },
  // jingles : [note MIDI, départ (s), durée (s), forme d'onde]
  jingles: {
    victory: { dur: 2.4, wave: 'square', gain: 0.06, notes: [[72, 0, 0.14], [76, 0.13, 0.14], [79, 0.26, 0.14], [84, 0.39, 0.45], [79, 0.78, 0.12], [84, 0.9, 0.9], [60, 0, 0.5, 'triangle'], [67, 0.39, 0.5, 'triangle'], [48, 0.9, 1.2, 'triangle']], drums: [['k', 0], ['p', 0.39], ['k', 0.9], ['o', 0.9]] },
    defeat:  { dur: 2.6, wave: 'triangle', gain: 0.07, notes: [[67, 0, 0.35], [66, 0.35, 0.35], [65, 0.7, 0.35], [64, 1.05, 1.2], [52, 0, 1.4, 'sawtooth'], [40, 1.05, 1.4, 'sawtooth']], drums: [['t', 1.05]] },
  },
};

// ----------------------------------------------------------------------------
//  (talents : fx = texte de l'effet, {v} = per × rang, × 100 si pct)
//  RAISONS DE REVENIR : cadeau du jour (7 jours), quêtes, roue, défi du jour, passe de progression.
//  Tout est gratuit, aucun achat réel, aucun minuteur à attendre.
//  Une récompense = { coins, gems, chest: 'wood'|'gold', boosts: nombre (au hasard) ou { id: nombre }, talent }
// ----------------------------------------------------------------------------
export const DAILY = {
  calendar: [
    { coins: 120 }, { gems: 1 }, { boosts: { coins2: 1, heal: 1 } }, { coins: 220 },
    { gems: 2 }, { boosts: { over: 1, shield: 1 } }, { chest: 'wood', gems: 3 },
  ],
  perDay: 3,                  // quêtes du jour
  quests: [                   // {n} = objectif ; pass = points de passe en plus de la récompense
    { id: 'kills', text: 'Élimine {n} brainrots', n: 300, icon: 'skull', reward: { coins: 130 }, pass: 40 },
    { id: 'wins', text: 'Gagne {n} niveaux', n: 2, icon: 'trophy', reward: { coins: 170 }, pass: 50 },
    { id: 'boosts', text: 'Utilise {n} boosts', n: 3, icon: 'bolt', reward: { coins: 150 }, pass: 40 },
    { id: 'stars', text: 'Gagne {n} étoiles', n: 5, icon: 'star', reward: { coins: 160 }, pass: 50 },
    { id: 'built', text: 'Pose {n} tourelles', n: 15, icon: 'cannon', reward: { coins: 130 }, pass: 40 },
    { id: 'upgrades', text: 'Améliore tes tourelles {n} fois', n: 12, icon: 'arrowup', reward: { coins: 130 }, pass: 40 },
    { id: 'combo', text: 'Réussis un combo x{n}', n: 25, icon: 'flame', reward: { gems: 1 }, pass: 40 },
    { id: 'bosses', text: 'Bats {n} boss ou mini-boss', n: 1, icon: 'crown', reward: { coins: 220 }, pass: 50 },
    { id: 'drops', text: 'Ramasse {n} bulles de boost', n: 2, icon: 'gift', reward: { boosts: 1 }, pass: 40 },
    { id: 'waves', text: 'Termine {n} vagues', n: 30, icon: 'wave', reward: { coins: 130 }, pass: 40 },
  ],
  weekly: [                   // une grosse quête par semaine (lundi)
    { id: 'wins', text: 'Gagne {n} niveaux cette semaine', n: 12, icon: 'trophy', reward: { chest: 'gold', gems: 3 }, pass: 200 },
    { id: 'kills', text: 'Élimine {n} brainrots cette semaine', n: 3000, icon: 'skull', reward: { chest: 'gold', gems: 3 }, pass: 200 },
    { id: 'stars', text: 'Gagne {n} étoiles cette semaine', n: 30, icon: 'star', reward: { chest: 'gold', gems: 3 }, pass: 200 },
  ],
  // Roue de la chance : un tour gratuit toutes les wheelEvery heures. Segments (w = poids, sur 100) : le JACKPOT
  // (coffre doré) est le segment le plus rare. Gain moyen par tour : ~98 pièces, ~1,5 gemme, 0,16 coffre en bois,
  // 0,24 boost, 0,02 coffre doré (calé avec tools/progression.cjs : 4 tours par jour sans accélérer la campagne).
  wheel: [
    { coins: 200, w: 16 }, { gems: 3, w: 18 }, { coins: 450, w: 9 }, { boosts: 1, w: 24 },
    { coins: 900, w: 3 }, { gems: 6, w: 9 }, { chest: 'wood', w: 16 }, { gems: 15, w: 3 }, { chest: 'gold', w: 2 },
  ],
  wheelEvery: 6,              // heures entre deux tours gratuits
  wheelExtraCost: 25,         // gemmes pour un tour bonus (sans attendre le tour gratuit)
  challenges: [               // défi du jour : un niveau déjà joué + un modificateur fun
    { id: 'giant', name: 'Brainrots géants', desc: 'Énormes et coriaces, mais plus lents', size: 1.6, hp: 1.5, speed: 0.8 },
    { id: 'double', name: 'Tout en x2', desc: 'Deux fois plus de brainrots, deux fois plus de pièces', density: 2, coins: 2, money: 2 },
    { id: 'pump', name: 'Que des pompes', desc: 'Seule la pompe est autorisée', only: ['shotgun'], money: 1.5 },
    { id: 'rush', name: 'Ruée folle', desc: 'Brainrots 50 % plus rapides, pièces x1,5', speed: 1.5, coins: 1.5 },
    { id: 'tiny', name: 'Mini-invasion', desc: 'Brainrots minuscules, fragiles et très nombreux', size: 0.6, hp: 0.45, density: 2.4 },
    { id: 'sniper', name: 'Tireurs d\'élite', desc: 'Seul le sniper est autorisé', only: ['sniper'], money: 1.6 },
  ],
  challengeReward: { chest: 'wood', gems: 2, coins: 200 }, challengePass: 80,
};
export const PASS = {
  tiers: 30, perTier: 1050,    // points par palier (≈ 3 à 4 semaines de jeu régulier)
  perStar: 25,                // points par étoile gagnée (en plus de la moitié de l'XP gagnée)
  xpShare: 0.5,
  cycle: [{ coins: 180 }, { gems: 1 }, { boosts: 1 }, { coins: 260 }],
  every5: { chest: 'gold' },  // paliers 5, 10, 15...
  final: { coins: 1500, gems: 12, chest: 'legend' },
};
export const passReward = (tier) => (tier === PASS.tiers ? PASS.final : tier % 5 === 0 ? PASS.every5 : PASS.cycle[(tier - 1) % PASS.cycle.length]);
