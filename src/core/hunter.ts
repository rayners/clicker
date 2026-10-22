import { createHunt, legendEarned, tickHunt, type HuntRules, type HuntState, type PreyAdapter } from '../shared/hunt';
import { nextRandom } from '../shared/rng';
import { HUNTER_UPGRADES, type HunterEffect } from '../data/hunter/upgrades';
import { HUNTER_DRIVEN_AT } from '../mission/hunter';
import { createMission, type HunterMission, type MissionState, type ScenarioId } from '../mission/state';
import { tickMission } from '../mission/tick';
import { defendMission } from '../sim/bot';
import { createProfile, type GameState } from './game';
import { missionConfigFor } from './prestige';

/** The hunt, accepted: something on the hull has chosen three crews, and only the armed ones count. */
export const HUNTER_SHIPS = 3;
const SCENARIOS: readonly ScenarioId[] = ['security', 'extraction', 'haulage'];

/** Where this horror's Legend is kept in the profile. */
export const LEGEND_KEY = 'hunter';
const START_STRENGTH = 3;
const START_HUNGER = 60;
/** Output bonus each ship gets per point of legend: the Combine arms the crews who tell the stories. */
const OUTPUT_PER_NOTORIETY = 0.15;
const BASE_RULES: HuntRules = {
  pushPerStep: 1,
  hungerPerStep: 0.006,
  feed: 2.5,
  maxHunger: 100,
  notorietyPerHarvest: 0.06,
  notorietyDecay: 0.0005,
  dormantDecay: 0.003,
  beatenFor: 600,
};

/** A contract defended by its own WARDEN's bot. */
export interface HunterPrey {
  mission: MissionState;
  taps: number;
  decideIn: number;
  /** Which ship this is on that line: a crew that drives the hunter off is replaced by the next. */
  contract: number;
}

export interface HunterHunt {
  hunt: HuntState<HunterPrey>;
  bought: Record<string, number>;
}

function multipliers(h: HunterHunt) {
  const m = { push: 1, patience: 1, appetite: 1, quiet: 1 };
  for (const u of HUNTER_UPGRADES) for (let i = 0; i < (h.bought[u.id] ?? 0); i++) apply(m, u.effect);
  return m;
}

function apply(m: { push: number; patience: number; appetite: number; quiet: number }, e: HunterEffect) {
  if (e.kind === 'push') m.push *= e.value;
  else if (e.kind === 'patience') m.patience *= e.value;
  else if (e.kind === 'appetite') m.appetite *= e.value;
  else if (e.kind === 'quiet') m.quiet *= e.value;
}

export function hunterRules(h: HunterHunt): HuntRules {
  const m = multipliers(h);
  return {
    ...BASE_RULES,
    pushPerStep: BASE_RULES.pushPerStep * m.push,
    hungerPerStep: BASE_RULES.hungerPerStep / m.patience,
    feed: BASE_RULES.feed * m.appetite,
    notorietyPerHarvest: BASE_RULES.notorietyPerHarvest / m.quiet,
  };
}

const trophies = (m: MissionState) => (m as HunterMission).trophies ?? 0;

function ship(scenario: ScenarioId, seed: number, contract: number): HunterPrey {
  const config = { ...missionConfigFor({ ...createProfile(), contractsCompleted: contract - 1 }, scenario), horror: 'hunter' as const };
  return { mission: createMission(config, seed), taps: 0, decideIn: 0, contract };
}

export const HUNTER_ADAPTER: PreyAdapter<HunterPrey> = {
  step: (prey, dt, push, notoriety) => {
    const config = { ...prey.mission.config, productionMultiplier: 1 + OUTPUT_PER_NOTORIETY * notoriety };
    const defended = defendMission({ ...prey, mission: { ...prey.mission, config, push } as MissionState }, dt);
    return { ...defended, mission: tickMission(defended.mission, dt, { cycle: prey.contract - 1, endings: [] }) };
  },
  harvest: (before, after) => Math.max(0, trophies(after.mission) - trophies(before.mission)),
  alarm: (prey) => Math.min(1, (prey.mission as HunterMission).alert / HUNTER_DRIVEN_AT),
  finished: (prey) => prey.mission.flags.includes('terminus'),
  spawn: (prey) => {
    const [, seed] = nextRandom(prey.mission.rng);
    return ship(prey.mission.scenario, seed, prey.contract + 1);
  },
};

/** Accept the hunt: start (or resume) it. The player's own contract waits meanwhile. */
export function startHunter(game: GameState, seed: number): GameState {
  if (game.hunter) return { ...game, mode: 'hunter' };
  const prey = SCENARIOS.slice(0, HUNTER_SHIPS).map((s, i) => ship(s, seed + i, 1));
  return { ...game, mode: 'hunter', hunter: { hunt: createHunt(prey, { strength: START_STRENGTH, hunger: START_HUNGER, legend: game.profile.legend[LEGEND_KEY] ?? 0 }), bought: {} } };
}

/** End the hunt: the harvest becomes Legend for the next one, and the contract is back. */
export function endHunter(game: GameState): GameState {
  if (!game.hunter) return game;
  const legend = { ...game.profile.legend, [LEGEND_KEY]: (game.profile.legend[LEGEND_KEY] ?? 0) + legendEarned(game.hunter.hunt.harvest) };
  return { ...game, mode: 'mission', hunter: null, profile: { ...game.profile, legend } };
}

export function leaveHunter(game: GameState): GameState {
  return { ...game, mode: 'mission' };
}

export function hunterUpgradeCost(h: HunterHunt, id: string): number {
  const u = HUNTER_UPGRADES.find((x) => x.id === id);
  if (!u) return Infinity;
  return Math.ceil(u.cost * (u.growth ?? 1) ** (h.bought[id] ?? 0));
}

export const isHunterUpgradeAvailable = (h: HunterHunt, id: string): boolean => {
  const u = HUNTER_UPGRADES.find((x) => x.id === id);
  return !!u && (u.growth !== undefined || (h.bought[id] ?? 0) === 0);
};

export function buyHunterUpgrade(game: GameState, id: string): GameState {
  const h = game.hunter;
  if (!h || !isHunterUpgradeAvailable(h, id)) return game;
  const cost = hunterUpgradeCost(h, id);
  if (h.hunt.dread < cost) return game;
  const u = HUNTER_UPGRADES.find((x) => x.id === id)!;
  const strength = h.hunt.strength + (u.effect.kind === 'strength' ? u.effect.value : 0);
  return { ...game, hunter: { hunt: { ...h.hunt, dread: h.hunt.dread - cost, strength }, bought: { ...h.bought, [id]: (h.bought[id] ?? 0) + 1 } } };
}

export function tickHunter(game: GameState, dt: number): GameState {
  if (!game.hunter) return game;
  return { ...game, hunter: { ...game.hunter, hunt: tickHunt(game.hunter.hunt, HUNTER_ADAPTER, dt, hunterRules(game.hunter)) } };
}
