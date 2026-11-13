// Génération procédurale (et déterministe) des vagues d'un niveau à partir de config.js.
import { ENEMIES, WAVES, GAME, CAMPAIGN, WORLDS, BOSS_ORDER } from './config.js';
import { mulberry32, hashStr } from './maps.js';

// level : entrée de LEVELS (+ endless: true pour le mode infini)
export function buildWave(n, level, pathCount) {
  const rnd = mulberry32(hashStr('lvl' + level.n + (level.endless ? 'inf' : '')) + n * 7919);
  const m = 1 + (n - 1) * (level.endless ? 1 : level.pace);          // vague « équivalente »
  const last = !level.endless && n === level.waves;
  // boss : fin d'un niveau de boss, mini-boss en cours de route, ou tous les 10 en mode infini
  let boss = null, bossMul = 1, mini = false;
  if (level.endless) {
    if (n % GAME.bossEvery === 0) { const k = n / GAME.bossEvery - 1; boss = BOSS_ORDER[k % BOSS_ORDER.length]; bossMul = 0.5 * Math.pow(WAVES.bossHpGrowth, k); }
  } else if (level.boss) {
    if (last) boss = WORLDS[level.world].boss;
    else if (n % CAMPAIGN.miniBossEvery === 0) { boss = WORLDS[level.world].boss; mini = true; bossMul = CAMPAIGN.miniBossHp[Math.min(CAMPAIGN.miniBossHp.length - 1, n / CAMPAIGN.miniBossEvery - 1)]; }
  }
  const budget = WAVES.budget(m) * level.density * (boss ? WAVES.bossEscortBudget : last ? WAVES.finalWaveBudget : 1);
  const lvl = level.endless ? 99 : level.n;
  const avail = Object.keys(ENEMIES).filter((k) => ENEMIES[k].unlock <= lvl && (ENEMIES[k].from || 1) <= n);
  // un type qui apparaît pour la première fois dans la campagne est toujours présenté à sa vague « from »
  const picks = avail.filter((k) => ENEMIES[k].unlock === lvl && ENEMIES[k].from === n);
  const nGroups = Math.min(WAVES.maxGroups, avail.length, 1 + Math.floor(n / 3));
  let guard = 0;
  while (picks.length < nGroups && guard++ < 50) {
    const k = avail[Math.floor(rnd() * avail.length)];
    if (!picks.includes(k)) picks.push(k);
  }
  const weights = picks.map(() => 0.5 + rnd());
  const wSum = weights.reduce((a, b) => a + b, 0);
  const groups = [];
  let t = 0;
  picks.forEach((type, i) => {
    const cfg = ENEMIES[type];
    let count = Math.max(1, Math.min(WAVES.maxPerGroup, Math.round((budget * weights[i]) / wSum / cfg.cost)));
    const elite = lvl >= WAVES.eliteFrom && n > 4 && rnd() < WAVES.eliteChance;
    if (elite) count = Math.max(1, Math.round(count / WAVES.eliteHp));
    const interval = cfg.interval * 1.35 * Math.max(0.5, 1 - m * 0.012) * (elite ? 1.6 : 1);
    const path = pathCount > 1 ? (rnd() < 0.5 ? 'alt' : Math.floor(rnd() * pathCount)) : 0;
    groups.push({ type, count, interval, delay: t, path, elite });
    t += count * interval * 0.55 + 1;
  });
  if (boss) groups.push({ type: boss, count: 1, interval: 0, delay: 2.5, path: 0, mini });
  return { n, boss, mini, bossMul, groups, hpScale: WAVES.hpScale(m) };
}

// Résumé { type: nombre } pour l'aperçu de la prochaine vague
export function waveSummary(wave) {
  const out = {};
  for (const g of wave.groups) out[g.type] = (out[g.type] || 0) + g.count;
  return out;
}
// Types d'ennemis qu'un niveau peut envoyer (pour l'écran de préparation)
export function levelEnemies(level) {
  return Object.keys(ENEMIES).filter((k) => ENEMIES[k].unlock <= level.n && (ENEMIES[k].from || 1) <= level.waves);
}

// File d'apparitions triée par temps
export function spawnQueue(wave, pathCount) {
  const q = [];
  for (const g of wave.groups) {
    for (let i = 0; i < g.count; i++) {
      q.push({ t: g.delay + i * g.interval, type: g.type, path: g.path === 'alt' ? i % pathCount : g.path, hpScale: wave.hpScale, bossMul: wave.bossMul, elite: g.elite, mini: g.mini });
    }
  }
  return q.sort((a, b) => a.t - b.t);
}
