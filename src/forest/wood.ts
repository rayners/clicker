import { createHunt, legendEarned, tickHunt, type HuntRules, type HuntState, type PreyAdapter } from '../shared/hunt';
import { nextRandom } from '../shared/rng';
import { WOOD_UPGRADES, type WoodEffect } from '../forest-data/wood-upgrades';
import { defendCompany } from './bot';
import { tickCompany } from './company';
import type { ForestGame } from './game';
import { createCompany, type Company } from './state';

/** Listen to the wood: the ledger turned over. You are the forest; the companies under charter run themselves. */
export const WOOD_COMPANIES = 3;

/** Where this horror's Legend is kept in the profile. */
export const LEGEND_KEY = 'wood';
const START_STRENGTH = 3;
const START_HUNGER = 60;
/** Renown (more haul) the companies gain per point of notoriety: the town pays for protection. */
const RENOWN_PER_NOTORIETY = 0.6;
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

/** A company defended by its Factor's bot: forages, hires and sends parties every few seconds. */
export interface WoodPrey {
  company: Company;
  taps: number;
  decideIn: number;
  /** Renown it brought into the charter; notoriety is added on top. */
  baseRenown: number;
}

export interface WoodHunt {
  hunt: HuntState<WoodPrey>;
  bought: Record<string, number>;
}

function multipliers(w: WoodHunt) {
  const m = { push: 1, patience: 1, appetite: 1, quiet: 1 };
  for (const u of WOOD_UPGRADES) for (let i = 0; i < (w.bought[u.id] ?? 0); i++) apply(m, u.effect);
  return m;
}

function apply(m: { push: number; patience: number; appetite: number; quiet: number }, e: WoodEffect) {
  if (e.kind === 'push') m.push *= e.value;
  else if (e.kind === 'patience') m.patience *= e.value;
  else if (e.kind === 'appetite') m.appetite *= e.value;
  else if (e.kind === 'quiet') m.quiet *= e.value;
}

export function woodRules(w: WoodHunt): HuntRules {
  const m = multipliers(w);
  return {
    ...BASE_RULES,
    pushPerStep: BASE_RULES.pushPerStep * m.push,
    hungerPerStep: BASE_RULES.hungerPerStep / m.patience,
    feed: BASE_RULES.feed * m.appetite,
    notorietyPerHarvest: BASE_RULES.notorietyPerHarvest / m.quiet,
  };
}

const lostHands = (c: Company) => c.lifetimeDead + c.turned;

export const WOOD_ADAPTER: PreyAdapter<WoodPrey> = {
  step: (prey, dt, push, notoriety) => {
    const charter = { ...prey.company.charter, renown: prey.baseRenown + RENOWN_PER_NOTORIETY * notoriety };
    const defended = defendCompany({ ...prey, company: { ...prey.company, woodPush: push, charter } }, dt);
    return { ...defended, company: tickCompany(defended.company, dt) };
  },
  harvest: (before, after) => Math.max(0, lostHands(after.company) - lostHands(before.company)),
  alarm: (prey) => Math.min(1, (prey.company.act - 1) / 3),
  finished: (prey) => prey.company.flags.includes('terminus'),
  spawn: (prey) => {
    const [, seed] = nextRandom(prey.company.rng);
    const charter = { ...prey.company.charter, number: prey.company.charter.number + 1, renown: prey.baseRenown };
    return { company: createCompany(seed, charter), taps: 0, decideIn: 0, baseRenown: prey.baseRenown };
  },
};

/** Listen to the wood: start (or resume) the hunt over the companies under charter. */
export function startWood(game: ForestGame, seed: number): ForestGame {
  if (game.wood) return { ...game, mode: 'wood' };
  const prey = Array.from({ length: WOOD_COMPANIES }, (_, i) => ({ company: createCompany(seed + i), taps: 0, decideIn: 0, baseRenown: 0 }));
  return { ...game, mode: 'wood', wood: { hunt: createHunt(prey, { strength: START_STRENGTH, hunger: START_HUNGER, legend: game.profile.legend[LEGEND_KEY] ?? 0 }), bought: {} } };
}

/** End the hunt: the harvest becomes Legend for the next one, and the ledger is back. */
export function endWood(game: ForestGame): ForestGame {
  if (!game.wood) return game;
  const legend = { ...game.profile.legend, [LEGEND_KEY]: (game.profile.legend[LEGEND_KEY] ?? 0) + legendEarned(game.wood.hunt.harvest) };
  return { ...game, mode: 'charter', wood: null, profile: { ...game.profile, legend } };
}

export function leaveWood(game: ForestGame): ForestGame {
  return { ...game, mode: 'charter' };
}

export function woodUpgradeCost(w: WoodHunt, id: string): number {
  const u = WOOD_UPGRADES.find((x) => x.id === id);
  if (!u) return Infinity;
  return Math.ceil(u.cost * (u.growth ?? 1) ** (w.bought[id] ?? 0));
}

export const isWoodUpgradeAvailable = (w: WoodHunt, id: string): boolean => {
  const u = WOOD_UPGRADES.find((x) => x.id === id);
  return !!u && (u.growth !== undefined || (w.bought[id] ?? 0) === 0);
};

export function buyWoodUpgrade(game: ForestGame, id: string): ForestGame {
  const w = game.wood;
  if (!w || !isWoodUpgradeAvailable(w, id)) return game;
  const cost = woodUpgradeCost(w, id);
  if (w.hunt.dread < cost) return game;
  const u = WOOD_UPGRADES.find((x) => x.id === id)!;
  const strength = w.hunt.strength + (u.effect.kind === 'strength' ? u.effect.value : 0);
  return { ...game, wood: { hunt: { ...w.hunt, dread: w.hunt.dread - cost, strength }, bought: { ...w.bought, [id]: (w.bought[id] ?? 0) + 1 } } };
}

export function tickWood(game: ForestGame, dt: number): ForestGame {
  if (!game.wood) return game;
  return { ...game, wood: { ...game.wood, hunt: tickHunt(game.wood.hunt, WOOD_ADAPTER, dt, woodRules(game.wood)) } };
}
