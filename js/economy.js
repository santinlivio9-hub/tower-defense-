// Gains de fin de niveau (gemmes, pièces, XP, points de passe) : une seule formule, utilisée par le jeu
// (game.commit) et par la simulation de progression (tools/progression.cjs). Valeurs dans config.js.
import { CAMPAIGN, COINS, XP, HEROIC, PASS } from './config.js';

// o = { victory, stars, prevStars, wavesDone, boss, hero, heroDone, endless, challenge, killCost, gemMult }
export function levelRewards(o) {
  const win = !!o.victory, stars = o.stars || 0, prev = o.prevStars || 0, bossM = o.boss ? CAMPAIGN.gemsBossMult : 1;
  const firstClear = win && (o.hero ? !o.heroDone : prev === 0);
  const firstThree = win && !o.hero && stars >= 3 && prev < 3;
  let gems = 0, coins, xp;
  if (o.challenge) gems = 0;
  else if (o.endless) gems = (o.wavesDone || 0) * CAMPAIGN.gemsPerWaveEndless;
  else if (win) gems = o.hero ? (firstClear ? CAMPAIGN.gemsHeroicFirst * bossM : 0)
    : ((firstClear ? CAMPAIGN.gemsFirstClear : 0) + (firstThree ? CAMPAIGN.gems3Stars : 0)) * bossM;
  if (o.endless || o.challenge) coins = (o.wavesDone || 0) * COINS.endlessPerWave;
  else if (!win) coins = (o.wavesDone || 0) * COINS.perWaveLost;
  else coins = (COINS.win + stars * COINS.perStar + (o.wavesDone || 0) * COINS.perWave) * (o.boss ? COINS.bossMult : 1) + (firstClear ? COINS.firstClear : 0);
  if (win && o.hero) coins *= HEROIC.gemsMult;
  const newStars = o.hero ? 0 : Math.max(0, stars - prev);
  xp = (o.killCost || 0) * XP.perCost + (o.wavesDone || 0) * XP.perWave + (win ? XP.win + newStars * XP.perStar : 0);
  if (o.hero) xp *= HEROIC.xpMult;
  else if (prev >= 3 && !o.endless && !o.challenge) xp *= XP.replay3;   // replay d'un niveau déjà en 3 étoiles
  const pass = Math.round(xp * PASS.xpShare) + (win && !o.challenge && !o.endless ? newStars * PASS.perStar : 0);
  return { gems: Math.round(gems * (o.gemMult || 1)), coins: Math.round(coins), xp: Math.round(xp), pass, firstClear, firstThree, newStars, talent: win && o.hero && firstClear ? 1 : 0 };
}
