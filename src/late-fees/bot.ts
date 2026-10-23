import { advance, createLateGame, newLateGame, type LateGame } from './game';
import { CUT_ADAPTER, cutUpgradeCost, isCutUpgradeAvailable, startCut, type KillerCut } from './cut';
import { huntDecider, playHunt, playthrough } from '../engine/bot';
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
  const run = playthrough<LateGame, LateAction>({
    start: { ...base, profile, run: createRun(runConfigFor(profile, venue, killer), seed) },
    reduce,
    press: PRESS[venue],
    decide: (g) => DECIDE[g.run.venue](g),
    tick: (g, dt) => ({ ...g, run: tickRun(g.run, dt) }),
    act: (g) => g.run.act,
    done: (g) => g.run.flags.includes('terminus'),
    maxSeconds,
    activeTaps: activeClicks,
    activeSeconds,
    decisionInterval,
    trace: options.trace,
  });
  return { actAt: run.actAt, terminusAt: run.doneAt, final: run.final };
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

/** A sensible killer: buy what dread allows, push the least alarmed places, lie low when too notorious. */
const decideCut = huntDecider<LateGame, KillerCut['hunt']['prey'][number], LateAction>({
  hunt: (g) => g.cut!.hunt,
  upgrade: (g) => CUT_UPGRADES.find((u) => isCutUpgradeAvailable(g.cut!, u.id) && cutUpgradeCost(g.cut!, u.id) <= g.cut!.hunt.dread)?.id ?? null,
  alarm: CUT_ADAPTER.alarm,
  buy: (id) => ({ type: 'buyCutUpgrade', id }),
  toggle: () => ({ type: 'toggleCutDormant' }),
  push: (index) => ({ type: 'shiftCutPush', index, step: 1 }),
});

export function simulateCut(options: CutSimOptions): CutSimResult {
  const game = playHunt<LateGame, LateAction>({
    start: startCut(newLateGame(options.seed, 0), options.killer, options.seed),
    reduce,
    decide: options.passive ? null : decideCut,
    tick: advance,
    seconds: options.maxSeconds,
  });
  const h = game.cut!.hunt;
  return { harvest: h.harvest, upgrades: Object.values(game.cut!.bought).reduce((a, b) => a + b, 0), beaten: h.beaten, final: game };
}
