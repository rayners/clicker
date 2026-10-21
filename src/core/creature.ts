import { createHunt, tickHunt, type HuntRules, type HuntState, type PreyAdapter } from '../shared/hunt';
import { nextRandom } from '../shared/rng';
import { CREATURE_UPGRADES, type CreatureEffect } from '../data/creature/upgrades';
import { CREATURE_ALARM_AT } from '../mission/creature';
import { createMission, type CreatureMission, type MissionState, type ScenarioId } from '../mission/state';
import { tickMission } from '../mission/tick';
import { defendMission } from '../sim/bot';
import { createProfile, type GameState } from './game';
import { missionConfigFor } from './prestige';

/** Special Order 0-77, accepted: WARDEN is the thing in the vents, and three contracts run themselves. */
export const CREATURE_SHIPS = 3;
const SCENARIOS: readonly ScenarioId[] = ['extraction', 'terraform', 'security'];

const START_STRENGTH = 3;
const START_HUNGER = 60;
/** Output bonus each ship gets per point of notoriety: the Combine pays for armed, better-run crews. */
const OUTPUT_PER_NOTORIETY = 0.15;
/** Biomass from a crew member compared with a piece of equipment. */
const CREW_WEIGHT = 3;
const BASE_RULES: HuntRules = {
  pushPerStep: 1,
  hungerPerStep: 0.008,
  feed: 2,
  maxHunger: 100,
  notorietyPerHarvest: 0.08,
  notorietyDecay: 0.0005,
  dormantDecay: 0.003,
  beatenFor: 600,
};

/** A contract defended by its own WARDEN's bot, which builds and buys every few seconds. */
export interface CreaturePrey {
  mission: MissionState;
  taps: number;
  decideIn: number;
  /** Which ship this is on that line: a vented contract is replaced by the next. */
  contract: number;
}

export interface CreatureHunt {
  hunt: HuntState<CreaturePrey>;
  bought: Record<string, number>;
}

function multipliers(c: CreatureHunt) {
  const m = { push: 1, patience: 1, appetite: 1, quiet: 1 };
  for (const u of CREATURE_UPGRADES) for (let i = 0; i < (c.bought[u.id] ?? 0); i++) apply(m, u.effect);
  return m;
}

function apply(m: { push: number; patience: number; appetite: number; quiet: number }, e: CreatureEffect) {
  if (e.kind === 'push') m.push *= e.value;
  else if (e.kind === 'patience') m.patience *= e.value;
  else if (e.kind === 'appetite') m.appetite *= e.value;
  else if (e.kind === 'quiet') m.quiet *= e.value;
}

export function creatureRules(c: CreatureHunt): HuntRules {
  const m = multipliers(c);
  return {
    ...BASE_RULES,
    pushPerStep: BASE_RULES.pushPerStep * m.push,
    hungerPerStep: BASE_RULES.hungerPerStep / m.patience,
    feed: BASE_RULES.feed * m.appetite,
    notorietyPerHarvest: BASE_RULES.notorietyPerHarvest / m.quiet,
  };
}

const lostCrew = (m: MissionState) => Object.values(m.crew).filter((x) => x.status === 'lost').length;
const taken = (m: MissionState) => (m as CreatureMission).taken ?? 0;

function ship(scenario: ScenarioId, seed: number, contract: number): CreaturePrey {
  const config = { ...missionConfigFor({ ...createProfile(), contractsCompleted: contract - 1 }, scenario), horror: 'creature' as const };
  return { mission: createMission(config, seed), taps: 0, decideIn: 0, contract };
}

export const CREATURE_ADAPTER: PreyAdapter<CreaturePrey> = {
  step: (prey, dt, push, notoriety) => {
    const config = { ...prey.mission.config, productionMultiplier: 1 + OUTPUT_PER_NOTORIETY * notoriety };
    const defended = defendMission({ ...prey, mission: { ...prey.mission, config, push } as MissionState }, dt);
    return { ...defended, mission: tickMission(defended.mission, dt, { cycle: prey.contract - 1, endings: [] }) };
  },
  harvest: (before, after) =>
    Math.max(0, taken(after.mission) - taken(before.mission) + (CREW_WEIGHT - 1) * (lostCrew(after.mission) - lostCrew(before.mission))),
  alarm: (prey) => Math.min(1, (prey.mission as CreatureMission).suspicion / CREATURE_ALARM_AT),
  finished: (prey) => prey.mission.flags.includes('terminus'),
  spawn: (prey) => {
    const [, seed] = nextRandom(prey.mission.rng);
    return ship(prey.mission.scenario, seed, prey.contract + 1);
  },
};

/** Accept Special Order 0-77: start (or resume) the hunt. The player's own contract waits meanwhile. */
export function startCreature(game: GameState, seed: number): GameState {
  if (game.creature) return { ...game, mode: 'creature' };
  const prey = SCENARIOS.slice(0, CREATURE_SHIPS).map((s, i) => ship(s, seed + i, 1));
  return { ...game, mode: 'creature', creature: { hunt: createHunt(prey, { strength: START_STRENGTH, hunger: START_HUNGER }), bought: {} } };
}

export function leaveCreature(game: GameState): GameState {
  return { ...game, mode: 'mission' };
}

export function creatureUpgradeCost(c: CreatureHunt, id: string): number {
  const u = CREATURE_UPGRADES.find((x) => x.id === id);
  if (!u) return Infinity;
  return Math.ceil(u.cost * (u.growth ?? 1) ** (c.bought[id] ?? 0));
}

export const isCreatureUpgradeAvailable = (c: CreatureHunt, id: string): boolean => {
  const u = CREATURE_UPGRADES.find((x) => x.id === id);
  return !!u && (u.growth !== undefined || (c.bought[id] ?? 0) === 0);
};

export function buyCreatureUpgrade(game: GameState, id: string): GameState {
  const c = game.creature;
  if (!c || !isCreatureUpgradeAvailable(c, id)) return game;
  const cost = creatureUpgradeCost(c, id);
  if (c.hunt.dread < cost) return game;
  const u = CREATURE_UPGRADES.find((x) => x.id === id)!;
  const strength = c.hunt.strength + (u.effect.kind === 'strength' ? u.effect.value : 0);
  return { ...game, creature: { hunt: { ...c.hunt, dread: c.hunt.dread - cost, strength }, bought: { ...c.bought, [id]: (c.bought[id] ?? 0) + 1 } } };
}

export function tickCreature(game: GameState, dt: number): GameState {
  if (!game.creature) return game;
  return { ...game, creature: { ...game.creature, hunt: tickHunt(game.creature.hunt, CREATURE_ADAPTER, dt, creatureRules(game.creature)) } };
}
