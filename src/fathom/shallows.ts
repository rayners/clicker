import { ATTRACTIONS, GUARDS, SWIMMERS, type AttractionDef, type GuardDef } from '../fathom-data/shallows';
import { appendLog } from '../engine/log';
import { nextRandom } from '../engine/rng';
import { effects } from './upgrades';
import { coverMultiplier, incomeMultiplier, type EntryKind, type Outfit } from './state';

export const COST_GROWTH = 1.15;
export const GUARD_COST_GROWTH = 1.2;
const DIAL_STEPS = 10;
/** A closed beach still sells something: parking, the pier, the view. */
const CLOSED_INCOME = 0.25;
/** Chance per second that an unwatched swimmer is taken, at pressure 1. */
const ATTACK_RATE = 0.002;
/** Share of even watched swimmers within the Source's reach, per point of its push. */
const DEEP_REACH = 0.1;
const REPUTATION_HIT = 0.97;
const REPUTATION_RECOVERY_SECONDS = 900;
const REPUTATION_FLOOR = 0.4;
const PASS_PRICE = 1;
/** The high season: every attraction's rate is worth this much more while the town is full (tuned by the pacing bot). */
const SEASON_RATE = 2;

// ---------- purchases ----------

export const attractionCost = (def: AttractionDef, owned: number): number => Math.ceil(def.baseCost * COST_GROWTH ** owned);
export const guardCost = (def: GuardDef, owned: number): number => Math.ceil(def.baseCost * GUARD_COST_GROWTH ** owned);

export function buyAttraction(o: Outfit, id: string): Outfit {
  const def = ATTRACTIONS.find((a) => a.id === id);
  if (!def) return o;
  const owned = o.attractions[id] ?? 0;
  const cost = attractionCost(def, owned);
  if (o.cash < cost) return o;
  return { ...o, cash: o.cash - cost, attractions: { ...o.attractions, [id]: owned + 1 } };
}

export function hireGuard(o: Outfit, id: string): Outfit {
  const def = GUARDS.find((g) => g.id === id);
  if (!def) return o;
  const owned = o.guards[id] ?? 0;
  const cost = guardCost(def, owned);
  if (o.cash < cost) return o;
  return { ...o, cash: o.cash - cost, guards: { ...o.guards, [id]: owned + 1 } };
}

export const isAttractionRevealed = (o: Outfit, index: number): boolean => index === 0 || ATTRACTIONS.slice(index - 1).some((a) => (o.attractions[a.id] ?? 0) > 0);
export const isGuardRevealed = (o: Outfit, index: number): boolean => index === 0 || GUARDS.slice(index - 1).some((g) => (o.guards[g.id] ?? 0) > 0);

// ---------- the beach, the dial and the watch ----------

/** Everyone the attractions bring down to the water. */
export const swimmers = (o: Outfit): number => ATTRACTIONS.reduce((n, a) => n + (o.attractions[a.id] ?? 0), 0);

export const watch = (o: Outfit): number => GUARDS.reduce((n, g) => n + (o.guards[g.id] ?? 0) * g.covers, 0) * coverMultiplier(o) * effects(o).guard;

/** How much of the beach is open: the player's dial, or the head lifeguard's (as wide as the watch covers). */
export function openShare(o: Outfit): number {
  if (!effects(o).autoOpen) return o.open / DIAL_STEPS;
  const n = swimmers(o);
  return n === 0 ? 1 : Math.min(1, Math.floor((watch(o) / n) * DIAL_STEPS) / DIAL_STEPS);
}

export const isAutoOpenActive = (o: Outfit): boolean => effects(o).autoOpen;

export function shiftOpen(o: Outfit, step: 1 | -1): Outfit {
  const open = Math.max(0, Math.min(DIAL_STEPS, o.open + step));
  return open === o.open ? o : { ...o, open };
}

/** Swimmers actually in the water, and the share of them someone is watching. */
export const inWater = (o: Outfit): number => swimmers(o) * openShare(o);

export function coverage(o: Outfit): number {
  const n = inWater(o);
  return n === 0 ? 1 : Math.min(1, watch(o) / n);
}

export const exposed = (o: Outfit): number => Math.max(0, inWater(o) - watch(o));

// ---------- tourist money ----------

export const attractionRate = (o: Outfit, def: AttractionDef): number => def.rate * SEASON_RATE * (effects(o).attraction[def.id] ?? 1);

export const tourism = (o: Outfit): number => ATTRACTIONS.reduce((s, a) => s + (o.attractions[a.id] ?? 0) * attractionRate(o, a), 0);

export function incomeRate(o: Outfit): number {
  const open = openShare(o);
  const reputation = REPUTATION_FLOOR + (1 - REPUTATION_FLOOR) * o.reputation;
  return tourism(o) * (CLOSED_INCOME + (1 - CLOSED_INCOME) * open) * reputation * incomeMultiplier(o);
}

/** Sell a beach pass at the hut by hand. */
export const passPrice = (o: Outfit): number => PASS_PRICE * effects(o).pass;
export const autoPassRate = (o: Outfit): number => effects(o).autoPasses;

export function sellPass(o: Outfit): Outfit {
  const p = passPrice(o);
  return { ...o, cash: o.cash + p, lifetimeCash: o.lifetimeCash + p };
}

const log = (o: Outfit, kind: EntryKind, text: string) => appendLog<EntryKind, Outfit>(o, kind, text);

/** Unwatched swimmers are taken; each one costs the town's trust. */
function attacks(o: Outfit, dt: number, pressure: number): Outfit {
  const reached = exposed(o) + inWater(o) * DEEP_REACH * o.deepPush;
  let next: Outfit = { ...o, attacks: o.attacks + reached * ATTACK_RATE * pressure * dt };
  while (next.attacks >= 1) {
    const [roll, rng] = nextRandom(next.rng);
    const who = SWIMMERS[Math.floor(roll * SWIMMERS.length)]!;
    next = { ...next, rng, attacks: next.attacks - 1, bodyCount: next.bodyCount + 1, reputation: next.reputation * REPUTATION_HIT };
    next = log(next, 'attack', `${who} WAS TAKEN OFF THE BEACH. NOBODY WAS WATCHING THAT STRETCH OF WATER. THE COUNCIL CALLS IT A BOATING ACCIDENT.`);
  }
  return next;
}

/** The beach for one tick: tourist money, the town's trust healing, and the water taking whoever is unwatched. */
export function tickShallows(o: Outfit, dt: number, pressure = 1): Outfit {
  const income = (incomeRate(o) + autoPassRate(o) * passPrice(o)) * dt;
  const reputation = Math.min(1, o.reputation + ((1 - o.reputation) * dt) / REPUTATION_RECOVERY_SECONDS);
  return attacks({ ...o, reputation, cash: o.cash + income, lifetimeCash: o.lifetimeCash + income }, dt, pressure);
}
