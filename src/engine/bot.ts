/**
 * Pacing bots: a sensible, greedy player for timing a game's acts, and a horror bot for its hunt. Pure, for tests
 * and the `simulate` scripts.
 * @module
 */
import type { HuntState } from './hunt';

/** Acts on decisions until there is nothing worth doing, an action changes nothing, or `max` is reached. */
export function applyDecisions<G, A>(game: G, decide: (g: G) => A | null, reduce: (g: G, a: A) => G, max = 20): G {
  let g = game;
  for (let i = 0; i < max; i++) {
    const action = decide(g);
    if (action === null) break;
    const next = reduce(g, action);
    if (next === g) break;
    g = next;
  }
  return g;
}

/** How a game is played through by the bot. */
export interface PlaythroughOptions<G, A> {
  start: G;
  reduce(g: G, a: A): G;
  /** The big button. */
  press: A;
  /** What the player would do now, or null. */
  decide(g: G): A | null;
  /** Advance the game by `dt` seconds. */
  tick(g: G, dt: number): G;
  act(g: G): number;
  /** The run has reached its end (the terminus). */
  done(g: G): boolean;
  maxSeconds: number;
  /** Taps a second for the first stretch (default 4), and how long that stretch is (default 20 minutes). */
  activeTaps?: number;
  activeSeconds?: number;
  /** After the first stretch, one tap every this many seconds (default 10). */
  lateTapEvery?: number;
  /** Seconds between check-ins (default 5). */
  decisionInterval?: number;
  /** Most actions per check-in (default 20). */
  maxDecisions?: number;
  /** Called after every second, for anything else the game wants to time. */
  onStep?(g: G, t: number): void;
  /** Moments to time, besides the acts: the first second each holds. */
  milestones?: Record<string, (g: G) => boolean>;
  /** Called every ten minutes of game time, to watch a run. */
  trace?(g: G, t: number): void;
}

/** When each act came, when the run ended (if it did), when each milestone was first reached, and the last state. */
export interface PlaythroughResult<G> {
  actAt: Record<number, number>;
  doneAt?: number;
  firstAt: Record<string, number>;
  final: G;
}

/** A sensible, greedy player: taps for the first stretch, then checks in now and then. Not optimal on purpose. */
export function playthrough<G, A>(options: PlaythroughOptions<G, A>): PlaythroughResult<G> {
  const { activeTaps = 4, activeSeconds = 20 * 60, lateTapEvery = 10, decisionInterval = 5, maxDecisions = 20 } = options;
  let game = options.start;
  const actAt: Record<number, number> = { [options.act(game)]: 0 };
  const firstAt: Record<string, number> = {};
  let doneAt: number | undefined;
  for (let t = 1; t <= options.maxSeconds; t++) {
    const taps = t <= activeSeconds ? activeTaps : t % lateTapEvery === 0 ? 1 : 0;
    for (let i = 0; i < taps; i++) game = options.reduce(game, options.press);
    if (t % decisionInterval === 0) game = applyDecisions(game, options.decide, options.reduce, maxDecisions);
    game = options.tick(game, 1);
    options.onStep?.(game, t);
    if (options.trace && t % 600 === 0) options.trace(game, t);
    const act = options.act(game);
    if (actAt[act] === undefined) actAt[act] = t;
    for (const [name, reached] of Object.entries(options.milestones ?? {})) if (firstAt[name] === undefined && reached(game)) firstAt[name] = t;
    if (options.done(game)) {
      doneAt = t;
      break;
    }
  }
  return { actAt, doneAt, firstAt, final: game };
}

/** A horror's hunt played for `seconds`: it checks in every `interval` seconds (default 5), or never if `decide` is null. */
export function playHunt<G, A>(options: { start: G; reduce(g: G, a: A): G; decide: ((g: G) => A | null) | null; tick(g: G, dt: number): G; seconds: number; interval?: number }): G {
  const interval = options.interval ?? 5;
  let game = options.start;
  for (let t = 1; t <= options.seconds; t++) {
    if (options.decide && t % interval === 0) game = applyDecisions(game, options.decide, options.reduce);
    game = options.tick(game, 1);
  }
  return game;
}

/** Notoriety at which the horror bot lies low, and where it wakes again. */
const HIDE_ABOVE = 4;
const WAKE_BELOW = 1;
/** Each step already on a prey counts as this much more alarm, so the push spreads out. */
const PUSH_WEIGHT = 0.2;

/** How a game's hunt is played by the horror bot. */
export interface HuntDeciderOptions<G, P, A> {
  hunt(g: G): HuntState<P>;
  /** The first upgrade it can afford now, or null. */
  upgrade(g: G): string | null;
  alarm(prey: P): number;
  buy(id: string): A;
  toggle(): A;
  push(index: number): A;
  /** Take a step off a prey (needed with `wary`). */
  pull?(index: number): A;
  /** Back off a prey once its alarm reaches `easeOffAt`; start on one only below `returnAt`. */
  wary?: { easeOffAt: number; returnAt: number };
}

/** A sensible horror: buy what the harvest allows, lie low when too notorious, push the least alarmed prey. */
export function huntDecider<G, P, A>(options: HuntDeciderOptions<G, P, A>): (g: G) => A | null {
  return (g) => {
    const h = options.hunt(g);
    const upgrade = options.upgrade(g);
    if (upgrade) return options.buy(upgrade);
    if (!h.dormant && h.notoriety > HIDE_ABOVE) return options.toggle();
    if (h.dormant && h.notoriety < WAKE_BELOW) return options.toggle();
    const wary = options.wary;
    if (wary && options.pull) {
      const backOff = h.prey.findIndex((p, i) => options.alarm(p) >= wary.easeOffAt && (h.split[i] ?? 0) > 0);
      if (backOff >= 0) return options.pull(backOff);
    }
    const used = h.split.reduce((a, b) => a + b, 0);
    if (used >= h.strength) return null;
    const ready = (p: P, i: number) => !wary || ((h.split[i] ?? 0) > 0 ? options.alarm(p) < wary.easeOffAt : options.alarm(p) < wary.returnAt);
    const order = h.prey
      .map((p, i) => ({ i, alarm: options.alarm(p) + (h.split[i] ?? 0) * PUSH_WEIGHT, ready: ready(p, i) }))
      .filter((x) => x.ready)
      .sort((a, b) => a.alarm - b.alarm);
    return order[0] ? options.push(order[0].i) : null;
  };
}

/** How a prey run's own bot plays it. */
export interface DefendOptions<G, A> {
  elapsed(g: G): number;
  press: A;
  reduce(g: G, a: A): G;
  decide(g: G): A | null;
  /** Taps a second early (default 4) and later (default 0.1), and how long "early" lasts (default 20 minutes). */
  earlyTaps?: number;
  lateTaps?: number;
  earlySeconds?: number;
  /** Seconds between check-ins (default 5), and the most it does in one (default 30). */
  interval?: number;
  maxDecisions?: number;
}

/**
 * One step of a prey run played by its own bot (its WARDEN, its Factor, its outfit): fractional taps carried between
 * steps, and a check-in every few seconds. `p` carries the bot's own clock between steps.
 */
export function defend<G, A>(p: { taps: number; decideIn: number }, game: G, dt: number, options: DefendOptions<G, A>): { game: G; taps: number; decideIn: number } {
  const { earlyTaps = 4, lateTaps = 0.1, earlySeconds = 20 * 60, interval = 5, maxDecisions = 30 } = options;
  let g = game;
  let taps = p.taps + dt * (options.elapsed(game) < earlySeconds ? earlyTaps : lateTaps);
  while (taps >= 1) {
    g = options.reduce(g, options.press);
    taps -= 1;
  }
  let decideIn = p.decideIn - dt;
  if (decideIn <= 0) {
    decideIn += interval;
    g = applyDecisions(g, options.decide, options.reduce, maxDecisions);
  }
  return { game: g, taps, decideIn };
}
