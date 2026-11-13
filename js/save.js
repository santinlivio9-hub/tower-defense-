// Sauvegarde automatique (localStorage) et progression persistante :
// campagne, château, niveau de joueur, talents, inventaire de boosts, coffres.
import { SHOP, ACHIEVEMENTS, LEVELS, CAMPAIGN, CASTLE, XP, TALENTS, BOOSTS, BOOST_ORDER, BOOST_SLOTS, STARTER_BOOSTS, CHESTS, COINS } from './config.js';

const KEY = 'brainrot-bastion-save-v1';   // même clé qu'avant : les anciennes sauvegardes sont converties (voir migrate)

const defaults = () => ({
  v: 2,
  gems: 0, coins: COINS.start,
  towers: [...SHOP.starterTowers],
  skins: ['default'], skin: 'default',
  levels: {},            // n -> { stars, best, heroic (0/1), heroicBest }
  endless: [],           // classement local : [{ score, wave, world, t }]
  castle: { walls: 0, repair: 0, treasury: 0, cannon: 0, air: 0, blizzard: 0, gold: 0 },
  xp: 0, level: 1, talentPts: 0, talents: {},
  boosts: { ...STARTER_BOOSTS }, chests: { wood: 1, gold: 0 }, loadout: [],
  seen: { enemies: [], towers: [...SHOP.starterTowers] },
  viewed: { enemies: 0, towers: 0 },   // fiches de collection déjà consultées (badge « nouveau »)
  avatar: 1,             // niveau où se trouve l'avatar sur la carte du monde
  legacyStars: 0, notice: null,
  achievements: [],
  stats: { kills: 0, bossKills: 0, towersBuilt: 0, legendaries: 0, wins: 0, perfectWins: 0, heroicWins: 0, bestEndless: 0, earlyStarts: 0, games: 0, bestScore: 0, chests: 0 },
  settings: { muted: false, volume: 0.7, shake: true, tutorialDone: false, damageNumbers: true, haptics: true, hints: true },
});

export class Save {
  constructor() {
    this.data = defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && raw.v === 2) this.merge(raw);
      else if (raw) { this.migrate(raw); this.persist(); }
    } catch (e) { /* sauvegarde illisible : on repart de zéro */ }
  }
  merge(raw) {
    const d = this.data, def = defaults();
    Object.assign(d, raw);
    for (const k of ['castle', 'boosts', 'chests', 'stats', 'settings', 'seen', 'viewed']) d[k] = { ...def[k], ...raw[k] };
    if (raw.coins == null) d.coins = COINS.migrateBase + COINS.migratePerStar * this.campaignStars();   // sauvegarde d'avant les pièces
  }
  // Ancienne sauvegarde (3 cartes, 3 difficultés, bonus permanents) -> nouveau système
  migrate(raw) {
    const d = this.data, def = defaults();
    d.gems = raw.gems || 0; d.coins = COINS.migrateBase;
    d.towers = [...new Set([...def.towers, ...(raw.towers || [])])]; d.seen.towers = [...d.towers];
    d.skins = raw.skins || def.skins; d.skin = raw.skin || 'default';
    d.achievements = raw.achievements || [];
    d.stats = { ...def.stats, ...raw.stats, heroicWins: (raw.stats && raw.stats.hardWins) || 0 };
    d.settings = { ...def.settings, ...raw.settings };
    // bonus permanents achetés : remboursés en gemmes (à réinvestir dans le château)
    const old = { damage: [15, 25, 40, 60, 90], money: [10, 20, 30, 45, 65], lives: [10, 20, 30, 45, 65] };
    let refund = 0;
    for (const k in old) for (let i = 0; i < ((raw.perks || {})[k] || 0); i++) refund += old[k][i] || 0;
    // étoiles : converties en gemmes et en XP ; un coffre par carte terminée
    let stars = 0, beaten = 0;
    for (const m of Object.values(raw.maps || {})) { const s = Math.max(0, ...Object.values(m.stars || {})); stars += s; if (s > 0) beaten++; }
    d.legacyStars = stars; d.chests.wood += beaten;
    const gems = refund + stars * 10, xp = stars * 120;
    d.gems += gems;
    const ups = this.addXp(xp);
    if (gems || xp || beaten) d.notice = { gems, xp, stars, chests: beaten, levels: ups.length };
    d.legacy = { maps: raw.maps, perks: raw.perks };
  }
  persist() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* stockage indisponible */ } }
  reset() { this.data = defaults(); this.persist(); }

  // ------------------------------------------------------------- campagne
  levelData(n) { return (this.data.levels[n] ||= { stars: 0, best: 0, heroic: 0, heroicBest: 0 }); }
  levelDone(n) { return !!this.data.levels[n] && this.data.levels[n].stars > 0; }
  levelUnlocked(n) { return n <= 1 || this.levelDone(n - 1); }
  progress() { let p = 0; while (p < LEVELS.length && this.levelDone(p + 1)) p++; return p; }   // nombre de niveaux terminés à la suite
  totalStars() { return Object.values(this.data.levels).reduce((s, l) => s + (l.stars || 0), 0) + (this.data.legacyStars || 0); }
  campaignStars() { return Object.values(this.data.levels).reduce((s, l) => s + (l.stars || 0), 0); }
  bestScore() { return this.data.stats.bestScore || 0; }
  endlessUnlocked() { return this.progress() >= CAMPAIGN.endlessAfter; }
  addEndless(entry) { const e = this.data.endless; e.push(entry); e.sort((a, b) => b.score - a.score); e.length = Math.min(e.length, 10); return e.indexOf(entry); }
  towerUnlocked(t) { return this.data.towers.includes(t); }
  // Tourelles offertes par la progression ; renvoie celles qui viennent d'être débloquées
  grantTowers() {
    const p = this.progress(), got = [];
    for (const [t, n] of Object.entries(CAMPAIGN.towerUnlocks)) if (p >= n && !this.data.towers.includes(t)) { this.data.towers.push(t); got.push(t); }
    return got;
  }
  collectionNew() { const d = this.data; return d.towers.length > (d.viewed.towers || 0) || d.seen.enemies.length > (d.viewed.enemies || 0); }
  spend(n, cur = 'gems') { if (this.data[cur] < n) return false; this.data[cur] -= n; this.persist(); return true; }

  // ------------------------------------------------------------- château
  castleSum() { return Object.values(this.data.castle).reduce((a, b) => a + b, 0); }
  castleTier() { const s = this.castleSum(); let t = 0; CASTLE.tiers.forEach((v, i) => { if (s >= v) t = i; }); return t; }

  // ------------------------------------------------------------- talents
  talent(id) { return this.data.talents[id] || 0; }
  branchPoints(b) { return TALENTS[b].nodes.reduce((s, n) => s + this.talent(n.id), 0); }
  talentOpen(b, node) { const ns = TALENTS[b].nodes, i = ns.indexOf(node); return (i <= 0 || this.talent(ns[i - 1].id) > 0) && this.branchPoints(b) >= (node.need || 0); }
  canTalent(b, node) { return this.data.talentPts > 0 && this.talent(node.id) < node.max && this.talentOpen(b, node); }
  // Effets cumulés des talents
  mods() {
    const v = (b, id) => { const n = TALENTS[b].nodes.find((x) => x.id === id); return this.talent(id) * n.per; };
    return {
      damage: 1 + v('attack', 'dmg'), rate: 1 + v('attack', 'rate'), range: 1 + v('attack', 'range'), crit: v('attack', 'crit'),
      startMoney: v('economy', 'start'), coinMult: 1 + v('economy', 'kill'), waveBonus: 1 + v('economy', 'wave'), gemMult: 1 + v('economy', 'gems'),
      lives: v('castle', 'lives'), cdMult: 1 - v('castle', 'cd'), durMult: 1 + v('castle', 'dur'), slots: v('castle', 'slot'),
    };
  }
  boostSlots(level) { return (level.boss ? BOOST_SLOTS.boss : BOOST_SLOTS.normal) + this.mods().slots; }

  // ------------------------------------------------------------- XP et récompenses
  // Ajoute de l'XP ; renvoie la liste des niveaux gagnés [{ level, reward, text }] (récompenses déjà appliquées)
  addXp(n) {
    const d = this.data, ups = [];
    d.xp += Math.round(n);
    while (d.xp >= XP.need(d.level)) {
      d.xp -= XP.need(d.level); d.level++;
      const r = { ...XP.rewards[(d.level - 2) % XP.rewards.length] };
      if (d.level % 10 === 0) r.chest = 'gold';
      ups.push({ level: d.level, reward: r, text: this.grant(r) });
    }
    return ups;
  }
  // Applique une récompense { gems, talent, chest, boosts } ; renvoie sa description
  grant(r) {
    const d = this.data, out = [];
    if (r.gems) { d.gems += r.gems; out.push(`${r.gems} gemmes`); }
    if (r.talent) { d.talentPts += r.talent; out.push(r.talent > 1 ? `${r.talent} points de talent` : '1 point de talent'); }
    if (r.chest) { d.chests[r.chest]++; out.push(CHESTS[r.chest].name); }
    if (r.boosts) { for (let i = 0; i < r.boosts; i++) { const id = BOOST_ORDER[Math.floor(Math.random() * 4)]; d.boosts[id]++; } out.push(`${r.boosts} boosts`); }
    return out.join(' + ');
  }
  // Ouvre un coffre ; renvoie les cartes [{ kind: 'gems'|'boost', id, n }] (déjà ajoutées à l'inventaire)
  openChest(kind) {
    const d = this.data, c = CHESTS[kind]; if (!c || d.chests[kind] <= 0) return null;
    d.chests[kind]--; d.stats.chests = (d.stats.chests || 0) + 1;
    const cards = [];
    for (let i = 0; i < c.cards; i++) {
      if (i > 0 && Math.random() < c.boostChance) {
        const rare = Math.random() < c.rare, id = rare ? (Math.random() < 0.6 ? 'shield' : 'revive') : BOOST_ORDER[Math.floor(Math.random() * 4)];
        const n = rare ? 1 : 1 + (Math.random() < 0.35 ? 1 : 0);
        d.boosts[id] += n; cards.push({ kind: 'boost', id, n });
      } else {
        const n = Math.round(c.gems[0] + Math.random() * (c.gems[1] - c.gems[0]));
        d.gems += n; cards.push({ kind: 'gems', n });
      }
    }
    this.persist();
    return cards;
  }

  // ------------------------------------------------------------- succès
  // Vérifie les succès ; renvoie la liste des succès nouvellement débloqués.
  checkAchievements() {
    const got = [];
    for (const a of ACHIEVEMENTS) {
      if (this.data.achievements.includes(a.id)) continue;
      if (this.achievementProgress(a) >= a.goal) { this.data.achievements.push(a.id); this.data.gems += a.gems; got.push(a); }
    }
    if (got.length) this.persist();
    return got;
  }
  achievementProgress(a) { return a.special === 'stars' ? this.totalStars() : a.special === 'progress' ? this.progress() : (this.data.stats[a.stat] || 0); }
}
