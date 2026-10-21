import { advance, createLateGame, newLateGame, type LateGame } from './game';
import { CUT_ADAPTER, cutUpgradeCost, isCutUpgradeAvailable, startCut } from './cut';
import { CUT_UPGRADES } from '../late-fees-data/cut-upgrades';
import { runConfigFor } from './sequels';
import { createRun, type KillerId, type VenueId } from './state';
import { reduce, type LateAction } from './store';
import { tickRun } from './tick';
import { DECIDE, PRESS } from './defenders';

export interface LateSimOptions {
  seed: number;
  venue?: VenueId;
  /** A crossover: this killer in that place (defaults to the place's own). */
  killer?: KillerId;
  maxSeconds: number;
  /** Films already finished (sequels start richer, against a stronger killer). */
  sequels?: number;
  activeClicks?: number;
  activeSeconds?: number;
  decisionInterval?: number;
  trace?(game: LateGame, t: number): void;
}

export interface LateSimResult {
  actAt: Record<number, number>;
  terminusAt?: number;
  final: LateGame;
}

/** A sensible, greedy player: clicks for the first stretch, then checks in now and then. */
export function simulateLate(options: LateSimOptions): LateSimResult {
  const { seed, maxSeconds, venue = 'camp', sequels = 0, activeClicks = 4, activeSeconds = 20 * 60, decisionInterval = 5 } = options;
  const base = createLateGame(seed, 0);
  const killer = options.killer ?? createRun(runConfigFor(base.profile, venue), seed).killer;
  const profile = {
    ...base.profile,
    sequels,
    boxOffice: sequels,
    history: Array.from({ length: sequels }, () => ({ venue, killer, title: '', ending: 'kill', bodyCount: 0, duration: 0 })),
  };
  let game: LateGame = { ...base, profile, run: createRun(runConfigFor(profile, venue, killer), seed) };
  const actAt: Record<number, number> = { 1: 0 };
  let terminusAt: number | undefined;
  for (let t = 1; t <= maxSeconds; t++) {
    const clicks = t <= activeSeconds ? activeClicks : t % 10 === 0 ? 1 : 0;
    for (let c = 0; c < clicks; c++) game = reduce(game, PRESS[venue]);
    if (t % decisionInterval === 0) {
      for (let i = 0; i < 20; i++) {
        const action = DECIDE[game.run.venue](game);
        if (!action) break;
        const next = reduce(game, action);
        if (next === game) break;
        game = next;
      }
    }
    game = { ...game, run: tickRun(game.run, 1) };
    if (options.trace && t % 600 === 0) options.trace(game, t);
    if (actAt[game.run.act] === undefined) actAt[game.run.act] = t;
    if (game.run.flags.includes('terminus')) {
      terminusAt = t;
      break;
    }
  }
  return { actAt, terminusAt, final: game };
}

export interface CutSimOptions {
  seed: number;
  killer: KillerId;
  maxSeconds: number;
  /** A killer who never pushes, for comparison. */
  passive?: boolean;
}

export interface CutSimResult {
  harvest: number;
  upgrades: number;
  beaten: number;
  final: LateGame;
}

/** Notoriety at which the horror bot goes to ground, and where it wakes again. */
const HIDE_ABOVE = 4;
const WAKE_BELOW = 1;

/** A sensible killer: buy what dread allows, push the least alarmed places, lie low when too notorious. */
function decideCut(game: LateGame): LateAction | null {
  const cut = game.cut!;
  const h = cut.hunt;
  const upgrade = CUT_UPGRADES.find((u) => isCutUpgradeAvailable(cut, u.id) && cutUpgradeCost(cut, u.id) <= h.dread);
  if (upgrade) return { type: 'buyCutUpgrade', id: upgrade.id };
  if (!h.dormant && h.notoriety > HIDE_ABOVE) return { type: 'toggleCutDormant' };
  if (h.dormant && h.notoriety < WAKE_BELOW) return { type: 'toggleCutDormant' };
  const used = h.split.reduce((a, b) => a + b, 0);
  if (used < h.strength) {
    // The place that has worked out the least about you.
    const order = h.prey.map((p, i) => ({ i, alarm: CUT_ADAPTER.alarm(p) + h.split[i]! * 0.2 })).sort((a, b) => a.alarm - b.alarm);
    return { type: 'shiftCutPush', index: order[0]!.i, step: 1 };
  }
  return null;
}

export function simulateCut(options: CutSimOptions): CutSimResult {
  let game = startCut(newLateGame(options.seed, 0), options.killer, options.seed);
  for (let t = 1; t <= options.maxSeconds; t++) {
    if (!options.passive && t % 5 === 0) {
      for (let i = 0; i < 20; i++) {
        const action = decideCut(game);
        if (!action) break;
        const next = reduce(game, action);
        if (next === game) break;
        game = next;
      }
    }
    game = advance(game, 1);
  }
  const h = game.cut!.hunt;
  return { harvest: h.harvest, upgrades: Object.values(game.cut!.bought).reduce((a, b) => a + b, 0), beaten: h.beaten, final: game };
}
