import { createHunt, legendEarned, tickHunt, type HuntRules, type HuntState, type PreyAdapter } from '../engine/hunt';
import { nextRandom } from '../engine/rng';
import { isSecured } from '../engine/ground';
import { DEEP_UPGRADES, type DeepEffect } from '../fathom-data/deep-upgrades';
import { defendOutfit } from './bot';
import type { FathomGame } from './game';
import { createOutfit, type Outfit } from './state';
import { tickOutfit } from './tick';

/** Answer the Source: the sonar turned around. You are what is behind the seam; the seaside towns run themselves. */
export const DEEP_TOWNS = ['HARROW POINT', 'GULLHAVEN', 'CAPE MORROW'] as const;

/** Seasons finished before the Source can be answered (user, 2026-10-22: the rest unlocked). */
export const DEEP_UNLOCK_SEASONS = 2;
export const isDeepUnlocked = (profile: FathomGame['profile']): boolean => profile.seasons >= DEEP_UNLOCK_SEASONS;

/** Where the Source's Legend is kept in the profile. */
export const LEGEND_KEY = 'deep';
const START_STRENGTH = 3;
const START_HUNGER = 60;
/** Standing (more income) each town gains per point of notoriety: the sightings bring money for defences. */
const STANDING_PER_NOTORIETY = 0.6;
/** The drowned a fallen city counts for. */
const CITY_DROWNED = 25;
const BASE_RULES: HuntRules = {
  pushPerStep: 1,
  hungerPerStep: 0.006,
  feed: 4,
  maxHunger: 100,
  notorietyPerHarvest: 0.1,
  notorietyDecay: 0.0005,
  dormantDecay: 0.003,
  beatenFor: 600,
};

/** A town's season, defended by the season bot: sells passes, buys and balances every few seconds. */
export interface DeepPrey {
  outfit: Outfit;
  taps: number;
  decideIn: number;
  town: string;
  /** Standing it brought into the season; notoriety is added on top. */
  baseStanding: number;
}

export interface DeepHunt {
  hunt: HuntState<DeepPrey>;
  bought: Record<string, number>;
}

function multipliers(d: DeepHunt) {
  const m = { push: 1, patience: 1, appetite: 1, quiet: 1 };
  for (const u of DEEP_UPGRADES) for (let i = 0; i < (d.bought[u.id] ?? 0); i++) apply(m, u.effect);
  return m;
}

function apply(m: { push: number; patience: number; appetite: number; quiet: number }, e: DeepEffect) {
  if (e.kind === 'push') m.push *= e.value;
  else if (e.kind === 'patience') m.patience *= e.value;
  else if (e.kind === 'appetite') m.appetite *= e.value;
  else if (e.kind === 'quiet') m.quiet *= e.value;
}

export function deepRules(d: DeepHunt): HuntRules {
  const m = multipliers(d);
  return {
    ...BASE_RULES,
    pushPerStep: BASE_RULES.pushPerStep * m.push,
    hungerPerStep: BASE_RULES.hungerPerStep / m.patience,
    feed: BASE_RULES.feed * m.appetite,
    notorietyPerHarvest: BASE_RULES.notorietyPerHarvest / m.quiet,
  };
}

const citiesHeld = (o: Outfit) => o.cities.filter(isSecured).length;

export const DEEP_ADAPTER: PreyAdapter<DeepPrey> = {
  step: (prey, dt, push, notoriety) => {
    const terms = { ...prey.outfit.terms, standing: prey.baseStanding + STANDING_PER_NOTORIETY * notoriety };
    const defended = defendOutfit({ ...prey, outfit: { ...prey.outfit, deepPush: push, terms } }, dt);
    return { ...defended, outfit: tickOutfit(defended.outfit, dt) };
  },
  harvest: (before, after) =>
    Math.max(0, after.outfit.bodyCount - before.outfit.bodyCount + CITY_DROWNED * Math.max(0, citiesHeld(before.outfit) - citiesHeld(after.outfit))),
  alarm: (prey) => Math.min(1, (prey.outfit.act - 1) / 3),
  finished: (prey) => prey.outfit.flags.includes('terminus'),
  spawn: (prey) => {
    const [, seed] = nextRandom(prey.outfit.rng);
    const terms = { ...prey.outfit.terms, season: prey.outfit.terms.season + 1, standing: prey.baseStanding };
    return { outfit: createOutfit(seed, terms), taps: 0, decideIn: 0, town: prey.town, baseStanding: prey.baseStanding };
  },
};

/** Answer the Source: start (or resume) the hunt over the seaside towns. */
export function startDeep(game: FathomGame, seed: number): FathomGame {
  if (game.deep) return { ...game, mode: 'deep' };
  const prey = DEEP_TOWNS.map((town, i) => ({ outfit: createOutfit(seed + i), taps: 0, decideIn: 0, town, baseStanding: 0 }));
  const legend = game.profile.legend[LEGEND_KEY] ?? 0;
  return { ...game, mode: 'deep', deep: { hunt: createHunt(prey, { strength: START_STRENGTH, hunger: START_HUNGER, legend }), bought: {} } };
}

/** End the hunt: the harvest becomes Legend for the next Source, and the season is back on the sonar. */
export function endDeep(game: FathomGame): FathomGame {
  if (!game.deep) return game;
  const legend = { ...game.profile.legend, [LEGEND_KEY]: (game.profile.legend[LEGEND_KEY] ?? 0) + legendEarned(game.deep.hunt.harvest) };
  return { ...game, mode: 'season', deep: null, profile: { ...game.profile, legend } };
}

export function leaveDeep(game: FathomGame): FathomGame {
  return { ...game, mode: 'season' };
}

export function deepUpgradeCost(d: DeepHunt, id: string): number {
  const u = DEEP_UPGRADES.find((x) => x.id === id);
  if (!u) return Infinity;
  return Math.ceil(u.cost * (u.growth ?? 1) ** (d.bought[id] ?? 0));
}

export const isDeepUpgradeAvailable = (d: DeepHunt, id: string): boolean => {
  const u = DEEP_UPGRADES.find((x) => x.id === id);
  return !!u && (u.growth !== undefined || (d.bought[id] ?? 0) === 0);
};

export function buyDeepUpgrade(game: FathomGame, id: string): FathomGame {
  const d = game.deep;
  if (!d || !isDeepUpgradeAvailable(d, id)) return game;
  const cost = deepUpgradeCost(d, id);
  if (d.hunt.dread < cost) return game;
  const u = DEEP_UPGRADES.find((x) => x.id === id)!;
  const strength = d.hunt.strength + (u.effect.kind === 'strength' ? u.effect.value : 0);
  return { ...game, deep: { hunt: { ...d.hunt, dread: d.hunt.dread - cost, strength }, bought: { ...d.bought, [id]: (d.bought[id] ?? 0) + 1 } } };
}

export function tickDeep(game: FathomGame, dt: number): FathomGame {
  if (!game.deep) return game;
  return { ...game, deep: { ...game.deep, hunt: tickHunt(game.deep.hunt, DEEP_ADAPTER, dt, deepRules(game.deep)) } };
}
