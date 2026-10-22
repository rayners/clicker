/**
 * The hunt: the play-as-the-horror tier's engine (docs/HORROR-TIER.md). Several prey (first-tier runs, each
 * defended by its own bot) run at once; the horror splits its strength across them, spends hunger to push,
 * feeds on the harvest, and grows notorious, which makes every prey harder to take. Pure; no game imports.
 */

/** What a game supplies to put one of its first-tier runs in front of the horror. */
export interface PreyAdapter<P> {
  /** Advance the prey (its defender included) with the horror pushing at `push`; notoriety strengthens its defence. */
  step(prey: P, dt: number, push: number, notoriety: number): P;
  /** What the horror gained between two states (the dead, the corrupted). */
  harvest(before: P, after: P): number;
  /** 0..1: how much the prey has worked out. */
  alarm(prey: P): number;
  /** The prey has reached its end and turned on the horror. */
  finished(prey: P): boolean;
  /** A fresh prey to replace one that has ended. */
  spawn(prey: P, notoriety: number): P;
}

/** The numbers a game tunes. */
export interface HuntRules {
  /** Pressure each step of strength adds to a prey. */
  pushPerStep: number;
  /** Hunger spent per second per step pushed. */
  hungerPerStep: number;
  /** Hunger gained per point of harvest. */
  feed: number;
  maxHunger: number;
  /** Notoriety gained per point of harvest. */
  notorietyPerHarvest: number;
  /** Notoriety lost per second while hunting, and while dormant. */
  notorietyDecay: number;
  dormantDecay: number;
  /** Seconds the horror must lie low after a prey beats it. */
  beatenFor: number;
}

export interface HuntState<P> {
  prey: P[];
  /** Steps of strength on each prey. */
  split: number[];
  strength: number;
  hunger: number;
  /** Lifetime harvest. */
  harvest: number;
  /** Harvest not yet spent. */
  dread: number;
  notoriety: number;
  dormant: boolean;
  /** Prey that reached their end and beat the horror back. */
  beaten: number;
  /** Seconds left lying low after the last time it was beaten. */
  beatenFor: number;
}

/** Harvest per unit of Legend squared: Legend grows with the square root of a hunt's harvest. */
const LEGEND_HARVEST = 25;
/** Legend per extra step of strength a new hunt starts with, and harvest in hand per Legend. */
const LEGEND_PER_STRENGTH = 2;
const LEGEND_DREAD = 10;

/** What a finished hunt leaves behind, carried into the next hunt by the same horror. */
export const legendEarned = (harvest: number): number => Math.floor(Math.sqrt(Math.max(0, harvest) / LEGEND_HARVEST));

export function createHunt<P>(prey: P[], options: { strength: number; hunger: number; legend?: number }): HuntState<P> {
  const legend = options.legend ?? 0;
  return {
    prey,
    split: prey.map(() => 0),
    strength: options.strength + Math.floor(legend / LEGEND_PER_STRENGTH),
    hunger: options.hunger,
    harvest: 0,
    dread: legend * LEGEND_DREAD,
    notoriety: 0,
    dormant: false,
    beaten: 0,
    beatenFor: 0,
  };
}

const assigned = (h: HuntState<unknown>) => h.split.reduce((a, b) => a + b, 0);

/** Move one step of strength onto (+1) or off (-1) a prey. */
export function shiftPush<H extends HuntState<unknown>>(h: H, index: number, step: 1 | -1): H {
  const current = h.split[index];
  if (current === undefined) return h;
  if (step < 0 ? current === 0 : assigned(h) >= h.strength) return h;
  return { ...h, split: h.split.map((s, i) => (i === index ? s + step : s)) };
}

export function toggleDormant<H extends HuntState<unknown>>(h: H): H {
  return { ...h, dormant: !h.dormant };
}

/** Whether the horror can push at all: awake, fed, and not lying low. */
const active = (h: HuntState<unknown>) => !h.dormant && h.hunger > 0 && h.beatenFor <= 0;

export function pushOn(h: HuntState<unknown>, index: number, rules: HuntRules): number {
  return active(h) ? (h.split[index] ?? 0) * rules.pushPerStep : 0;
}

export function tickHunt<P>(h: HuntState<P>, adapter: PreyAdapter<P>, dt: number, rules: HuntRules): HuntState<P> {
  let gained = 0;
  let beaten = 0;
  const prey = h.prey.map((p, i) => {
    const next = adapter.step(p, dt, pushOn(h, i, rules), h.notoriety);
    gained += Math.max(0, adapter.harvest(p, next));
    if (!adapter.finished(next)) return next;
    beaten += 1;
    return adapter.spawn(next, h.notoriety);
  });
  const spent = active(h) ? assigned(h) * rules.hungerPerStep * dt : 0;
  const hunger = Math.max(0, Math.min(rules.maxHunger, h.hunger - spent + gained * rules.feed));
  const decay = (h.dormant ? rules.dormantDecay : rules.notorietyDecay) * dt;
  const notoriety = Math.max(0, h.notoriety + gained * rules.notorietyPerHarvest - decay);
  return {
    ...h,
    prey,
    hunger,
    notoriety,
    harvest: h.harvest + gained,
    dread: h.dread + gained,
    beaten: h.beaten + beaten,
    beatenFor: beaten > 0 ? rules.beatenFor : Math.max(0, h.beatenFor - dt),
  };
}
