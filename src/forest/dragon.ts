import { createHunt, tickHunt, type HuntRules, type HuntState, type PreyAdapter } from '../shared/hunt';
import { appendLog } from '../shared/log';
import { nextRandom } from '../shared/rng';
import { formatNumber } from '../shared/format';
import { CLASS_IDS } from '../forest-data/classes';
import { DRAGON_UPGRADES, type DragonEffect } from '../forest-data/dragon-upgrades';
import { defendCompany } from './bot';
import { available, tickCompany } from './company';
import type { ForestGame } from './game';
import { createCompany, type Company, type EntryKind } from './state';

/** Wake the dragon: the ledger as the dragon keeps it. You lie under the Heartwood; the companies dig, and you take. */
export const DRAGON_COMPANIES = 3;

const START_STRENGTH = 3;
const START_HUNGER = 60;
/** Seconds between raids at one unit of push. */
const RAID_SECONDS = 90;
/** Share of a company's unsold relics a raid carries off. */
const RAID_SHARE = 0.2;
/** Renown each company gains per point of notoriety: slayers come to Thistlegate, and the town pays for them. */
const RENOWN_PER_NOTORIETY = 0.6;
const BASE_RULES: HuntRules = {
  pushPerStep: 1,
  hungerPerStep: 0.006,
  feed: 3,
  maxHunger: 100,
  notorietyPerHarvest: 0.08,
  notorietyDecay: 0.0005,
  dormantDecay: 0.003,
  beatenFor: 600,
};

/** A company defended by its Factor's bot, and how much of it the dragon has had. */
export interface DragonPrey {
  company: Company;
  taps: number;
  decideIn: number;
  /** Renown it brought into the charter; notoriety is added on top. */
  baseRenown: number;
  /** Fractional progress toward the next raid. */
  raidIn: number;
  raids: number;
  /** The hoard taken from this company, all charters. */
  hoard: number;
}

export interface DragonHunt {
  hunt: HuntState<DragonPrey>;
  bought: Record<string, number>;
}

function multipliers(d: DragonHunt) {
  const m = { push: 1, patience: 1, appetite: 1, quiet: 1 };
  for (const u of DRAGON_UPGRADES) for (let i = 0; i < (d.bought[u.id] ?? 0); i++) apply(m, u.effect);
  return m;
}

function apply(m: { push: number; patience: number; appetite: number; quiet: number }, e: DragonEffect) {
  if (e.kind === 'push') m.push *= e.value;
  else if (e.kind === 'patience') m.patience *= e.value;
  else if (e.kind === 'appetite') m.appetite *= e.value;
  else if (e.kind === 'quiet') m.quiet *= e.value;
}

export function dragonRules(d: DragonHunt): HuntRules {
  const m = multipliers(d);
  return {
    ...BASE_RULES,
    pushPerStep: BASE_RULES.pushPerStep * m.push,
    hungerPerStep: BASE_RULES.hungerPerStep / m.patience,
    feed: BASE_RULES.feed * m.appetite,
    notorietyPerHarvest: BASE_RULES.notorietyPerHarvest / m.quiet,
  };
}

const log = (c: Company, text: string) => appendLog<EntryKind, Company>(c, 'omen', text);

/** One raid: a fifth of the vault carried off, and whoever was idle in the yard burned where they stood. */
export function raid(prey: DragonPrey): DragonPrey {
  const c = prey.company;
  const taken = c.relics * RAID_SHARE;
  const idle = [...CLASS_IDS].sort((a, b) => available(c, b) - available(c, a))[0]!;
  const burned = available(c, idle) > 0;
  let company: Company = {
    ...c,
    relics: c.relics - taken,
    hired: burned ? { ...c.hired, [idle]: c.hired[idle] - 1 } : c.hired,
    lifetimeDead: c.lifetimeDead + (burned ? 1 : 0),
  };
  company = log(company, `WINGS OVER THE VAULT AT NIGHT. ${formatNumber(taken)} RELICS GONE BY MORNING${burned ? ', AND ONE OF THE HANDS IN THE YARD BURNED TO THE BONE' : ''}. THE TOWN SAYS DRAGON. THE SYNOD SAYS FIRE.`);
  return { ...prey, company, raids: prey.raids + 1, hoard: prey.hoard + 1 + Math.log10(1 + taken) };
}

export const DRAGON_ADAPTER: PreyAdapter<DragonPrey> = {
  step: (prey, dt, push, notoriety) => {
    const charter = { ...prey.company.charter, renown: prey.baseRenown + RENOWN_PER_NOTORIETY * notoriety };
    const defended = defendCompany({ ...prey, company: { ...prey.company, charter } }, dt);
    let next: DragonPrey = { ...defended, company: tickCompany(defended.company, dt), raidIn: prey.raidIn + (push * dt) / RAID_SECONDS };
    while (next.raidIn >= 1) next = raid({ ...next, raidIn: next.raidIn - 1 });
    return next;
  },
  harvest: (before, after) => Math.max(0, after.hoard - before.hoard),
  alarm: (prey) => Math.min(1, (prey.company.act - 1) / 3),
  finished: (prey) => prey.company.flags.includes('terminus'),
  spawn: (prey) => {
    const [, seed] = nextRandom(prey.company.rng);
    const charter = { ...prey.company.charter, number: prey.company.charter.number + 1, renown: prey.baseRenown };
    return { ...prey, company: createCompany(seed, charter), taps: 0, decideIn: 0, raidIn: 0 };
  },
};

/** Wake the dragon: start (or resume) the hunt over the companies under charter. */
export function wakeDragon(game: ForestGame, seed: number): ForestGame {
  if (game.dragon) return { ...game, mode: 'dragon' };
  const prey = Array.from({ length: DRAGON_COMPANIES }, (_, i) => ({ company: createCompany(seed + i), taps: 0, decideIn: 0, baseRenown: 0, raidIn: 0, raids: 0, hoard: 0 }));
  return { ...game, mode: 'dragon', dragon: { hunt: createHunt(prey, { strength: START_STRENGTH, hunger: START_HUNGER }), bought: {} } };
}

export function leaveDragon(game: ForestGame): ForestGame {
  return { ...game, mode: 'charter' };
}

export function dragonUpgradeCost(d: DragonHunt, id: string): number {
  const u = DRAGON_UPGRADES.find((x) => x.id === id);
  if (!u) return Infinity;
  return Math.ceil(u.cost * (u.growth ?? 1) ** (d.bought[id] ?? 0));
}

export const isDragonUpgradeAvailable = (d: DragonHunt, id: string): boolean => {
  const u = DRAGON_UPGRADES.find((x) => x.id === id);
  return !!u && (u.growth !== undefined || (d.bought[id] ?? 0) === 0);
};

export function buyDragonUpgrade(game: ForestGame, id: string): ForestGame {
  const d = game.dragon;
  if (!d || !isDragonUpgradeAvailable(d, id)) return game;
  const cost = dragonUpgradeCost(d, id);
  if (d.hunt.dread < cost) return game;
  const u = DRAGON_UPGRADES.find((x) => x.id === id)!;
  const strength = d.hunt.strength + (u.effect.kind === 'strength' ? u.effect.value : 0);
  return { ...game, dragon: { hunt: { ...d.hunt, dread: d.hunt.dread - cost, strength }, bought: { ...d.bought, [id]: (d.bought[id] ?? 0) + 1 } } };
}

export function tickDragon(game: ForestGame, dt: number): ForestGame {
  if (!game.dragon) return game;
  return { ...game, dragon: { ...game.dragon, hunt: tickHunt(game.dragon.hunt, DRAGON_ADAPTER, dt, dragonRules(game.dragon)) } };
}
