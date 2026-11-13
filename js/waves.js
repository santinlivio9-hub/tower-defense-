// Génération procédurale (et déterministe) des vagues à partir de config.js.
import { ENEMIES, WAVES, GAME, BOSS_ORDER } from './config.js';
import { mulberry32, hashStr } from './maps.js';

export function buildWave(n, mapId, pathCount) {
  const rnd = mulberry32(hashStr(mapId) + n * 7919);
  const bossWave = n % GAME.bossEvery === 0;
  const budget = WAVES.budget(n) * (bossWave ? WAVES.bossEscortBudget : 1);
  const avail = Object.keys(ENEMIES).filter((k) => ENEMIES[k].unlock <= n);
  const picks = avail.filter((k) => ENEMIES[k].unlock === n); // un nouveau type est toujours présenté
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
    const count = Math.max(1, Math.min(WAVES.maxPerGroup, Math.round((budget * weights[i]) / wSum / cfg.cost)));
    const interval = cfg.interval * 1.35 * Math.max(0.5, 1 - n * 0.012);
    const path = pathCount > 1 ? (rnd() < 0.5 ? 'alt' : Math.floor(rnd() * pathCount)) : 0;
    groups.push({ type, count, interval, delay: t, path });
    t += count * interval * 0.55 + 1;
  });
  let boss = null, bossMul = 1;
  if (bossWave) {
    const idx = n / GAME.bossEvery - 1;
    boss = BOSS_ORDER[idx % BOSS_ORDER.length];
    bossMul = Math.pow(WAVES.bossHpGrowth, Math.floor(idx / BOSS_ORDER.length));
    groups.push({ type: boss, count: 1, interval: 0, delay: 2.5, path: 0 });
  }
  return { n, boss, bossMul, groups, hpScale: WAVES.hpScale(n) };
}

// Résumé { type: nombre } pour l'aperçu de la prochaine vague
export function waveSummary(wave) {
  const out = {};
  for (const g of wave.groups) out[g.type] = (out[g.type] || 0) + g.count;
  return out;
}

// File d'apparitions triée par temps
export function spawnQueue(wave, pathCount) {
  const q = [];
  for (const g of wave.groups) {
    for (let i = 0; i < g.count; i++) {
      q.push({ t: g.delay + i * g.interval, type: g.type, path: g.path === 'alt' ? i % pathCount : g.path, hpScale: wave.hpScale, bossMul: wave.bossMul });
    }
  }
  return q.sort((a, b) => a.t - b.t);
}
