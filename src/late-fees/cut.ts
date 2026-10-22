import { createHunt, legendEarned, tickHunt, type HuntRules, type HuntState, type PreyAdapter } from '../shared/hunt';
import { nextRandom } from '../shared/rng';
import { CUT_UPGRADES, type CutEffect } from '../late-fees-data/cut-upgrades';
import { defend, type Defended } from './defenders';
import type { LateGame } from './game';
import { runConfigFor, sequelTitle, tapeFor } from './sequels';
import { createRun, type KillerId, type Run, type VenueId } from './state';
import { tickRun } from './tick';

/** The Killer's Cut: the tape flipped over. You are the killer; every place runs itself, defended by its bot. */
export const CUT_VENUES: VenueId[] = ['camp', 'clinic', 'insurer'];

const START_STRENGTH = 3;
const START_HUNGER = 60;
/** With nothing pushing, the killer barely stirs in a place. */
const MIN_PUSH = 0.1;
/** Defenders get this much richer per point of notoriety: the county believes you now. */
const DEFENDER_PER_NOTORIETY = 0.3;
/** Dread per body, by place: a death at the insurer is rarer and costs the design more effort than one at camp. */
const HARVEST_WEIGHT: Record<VenueId, number> = { camp: 1, clinic: 1.5, insurer: 8, asylum: 1.5 };
const BASE_RULES: HuntRules = {
  pushPerStep: 1,
  hungerPerStep: 0.015,
  feed: 1,
  maxHunger: 100,
  notorietyPerHarvest: 0.008,
  notorietyDecay: 0.0005,
  dormantDecay: 0.003,
  beatenFor: 600,
};

export type CutPrey = Defended;

export interface KillerCut {
  killer: KillerId;
  hunt: HuntState<CutPrey>;
  /** Upgrade id -> times bought. */
  bought: Record<string, number>;
}

function multipliers(cut: KillerCut) {
  const m = { push: 1, patience: 1, appetite: 1, quiet: 1 };
  for (const u of CUT_UPGRADES) {
    const times = cut.bought[u.id] ?? 0;
    for (let i = 0; i < times; i++) apply(m, u.effect);
  }
  return m;
}

function apply(m: { push: number; patience: number; appetite: number; quiet: number }, e: CutEffect) {
  if (e.kind === 'push') m.push *= e.value;
  else if (e.kind === 'patience') m.patience *= e.value;
  else if (e.kind === 'appetite') m.appetite *= e.value;
  else if (e.kind === 'quiet') m.quiet *= e.value;
}

export function cutRules(cut: KillerCut): HuntRules {
  const m = multipliers(cut);
  return {
    ...BASE_RULES,
    pushPerStep: BASE_RULES.pushPerStep * m.push,
    hungerPerStep: BASE_RULES.hungerPerStep / m.patience,
    feed: BASE_RULES.feed * m.appetite,
    notorietyPerHarvest: BASE_RULES.notorietyPerHarvest / m.quiet,
  };
}

/** A place in the Killer's Cut: the push becomes the killer's pressure there; notoriety funds the defence. */
export const CUT_ADAPTER: PreyAdapter<CutPrey> = {
  step: (prey, dt, push, notoriety) => {
    const bias = tapeFor(prey.run.venue, prey.run.killer).pressureBonus ?? 0;
    const config = {
      ...prey.run.config,
      pressureBonus: (1 + bias) * Math.max(MIN_PUSH, push) - 1,
      productionMultiplier: 1 + DEFENDER_PER_NOTORIETY * notoriety,
    };
    const defended = defend({ ...prey, run: { ...prey.run, config } }, dt);
    return { ...defended, run: tickRun(defended.run, dt) };
  },
  harvest: (before, after) => Math.max(0, after.run.bodyCount - before.run.bodyCount) * HARVEST_WEIGHT[after.run.venue],
  alarm: (prey) => Math.min(1, (prey.run.act - 1) / 3),
  finished: (prey) => prey.run.flags.includes('terminus'),
  spawn: (prey) => {
    const part = prey.run.config.part + 1;
    const [, seed] = nextRandom(prey.run.rng);
    const tape = tapeFor(prey.run.venue, prey.run.killer);
    return { run: createRun({ ...prey.run.config, part, title: sequelTitle(tape.title, part) }, seed), presses: 0, decideIn: 0 };
  },
};

/** Flip the tape: start (or resume) the Killer's Cut with this killer. */
export function startCut(game: LateGame, killer: KillerId, seed: number): LateGame {
  if (game.cut && game.cut.killer === killer) return { ...game, mode: 'cut', shelf: false };
  const prey = CUT_VENUES.map((venue, i) => ({ run: createRun(runConfigFor(game.profile, venue, killer), seed + i), presses: 0, decideIn: 0 }));
  const cut: KillerCut = { killer, hunt: createHunt(prey, { strength: START_STRENGTH, hunger: START_HUNGER, legend: game.profile.legend[killer] ?? 0 }), bought: {} };
  return { ...game, mode: 'cut', shelf: false, cut };
}

/** End the cut: its body count becomes the killer's Legend for their next cut, and the tape goes back on the shelf. */
export function endCut(game: LateGame): LateGame {
  if (!game.cut) return game;
  const killer = game.cut.killer;
  const legend = { ...game.profile.legend, [killer]: (game.profile.legend[killer] ?? 0) + legendEarned(game.cut.hunt.harvest) };
  return { ...game, mode: 'films', shelf: true, cut: null, profile: { ...game.profile, legend } };
}

/** Rewind to the shelf. The cut is kept, paused, for when the tape is flipped again. */
export function leaveCut(game: LateGame): LateGame {
  return { ...game, mode: 'films', shelf: true };
}

export function cutUpgradeCost(cut: KillerCut, id: string): number {
  const u = CUT_UPGRADES.find((x) => x.id === id);
  if (!u) return Infinity;
  const times = cut.bought[id] ?? 0;
  return Math.ceil(u.cost * (u.growth ?? 1) ** times);
}

export const isCutUpgradeAvailable = (cut: KillerCut, id: string): boolean => {
  const u = CUT_UPGRADES.find((x) => x.id === id);
  return !!u && (u.growth !== undefined || (cut.bought[id] ?? 0) === 0);
};

export function buyCutUpgrade(game: LateGame, id: string): LateGame {
  const cut = game.cut;
  if (!cut || !isCutUpgradeAvailable(cut, id)) return game;
  const cost = cutUpgradeCost(cut, id);
  if (cut.hunt.dread < cost) return game;
  const u = CUT_UPGRADES.find((x) => x.id === id)!;
  const strength = cut.hunt.strength + (u.effect.kind === 'strength' ? u.effect.value : 0);
  const hunt = { ...cut.hunt, dread: cut.hunt.dread - cost, strength };
  return { ...game, cut: { ...cut, hunt, bought: { ...cut.bought, [id]: (cut.bought[id] ?? 0) + 1 } } };
}

export function tickCut(game: LateGame, dt: number): LateGame {
  if (!game.cut) return game;
  return { ...game, cut: { ...game.cut, hunt: tickHunt(game.cut.hunt, CUT_ADAPTER, dt, cutRules(game.cut)) } };
}

/** Prey runs inside the cut, flattened for anything that wants to read them (UI, telemetry). */
export const cutRuns = (cut: KillerCut): Run[] => cut.hunt.prey.map((p) => p.run);
