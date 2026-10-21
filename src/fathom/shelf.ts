import { BUOY_BASE_COST, BUOY_COST_GROWTH, BUOY_REACH, SHELF_OPENS_AT, SHELF_TAKERS, TRAWLERS, type TrawlerDef } from '../fathom-data/shelf';
import { appendLog } from '../shared/log';
import { nextRandom } from '../shared/rng';
import { depth } from './depth';
import { incomeMultiplier, type EntryKind, type Outfit } from './state';

export const TRAWLER_COST_GROWTH = 1.15;
const DIAL_STEPS = 10;
/** The nearest grounds pay this share of a boat's rate; each tenth further out adds the same again. */
const NEAR_SHARE = 0.4;
const RANGE_SHARE = 0.12;
/** Sonar covers this far out with no buoys at all: the harbour's own. */
const HARBOUR_REACH = 1;
/** Chance per second that a boat fishing blind is lost, at pressure 1, scaled by how far past the sonar it is. */
const LOSS_RATE = 0.003;

export const isShelfOpen = (o: Outfit): boolean => depth(o) >= SHELF_OPENS_AT;

export const trawlerCost = (def: TrawlerDef, owned: number): number => Math.ceil(def.baseCost * TRAWLER_COST_GROWTH ** owned);
export const buoyCost = (o: Outfit): number => Math.ceil(BUOY_BASE_COST * BUOY_COST_GROWTH ** o.buoys);

export function buyTrawler(o: Outfit, id: string): Outfit {
  const def = TRAWLERS.find((t) => t.id === id);
  if (!def || !isShelfOpen(o)) return o;
  const owned = o.trawlers[id] ?? 0;
  const cost = trawlerCost(def, owned);
  if (o.cash < cost) return o;
  return { ...o, cash: o.cash - cost, trawlers: { ...o.trawlers, [id]: owned + 1 } };
}

export function buyBuoy(o: Outfit): Outfit {
  const cost = buoyCost(o);
  if (!isShelfOpen(o) || o.cash < cost) return o;
  return { ...o, cash: o.cash - cost, buoys: o.buoys + 1 };
}

export const isTrawlerRevealed = (o: Outfit, index: number): boolean => index === 0 || TRAWLERS.slice(index - 1).some((t) => (o.trawlers[t.id] ?? 0) > 0);

export const rangeShare = (o: Outfit): number => o.range / DIAL_STEPS;

export function shiftRange(o: Outfit, step: 1 | -1): Outfit {
  const range = Math.max(1, Math.min(DIAL_STEPS, o.range + step));
  return range === o.range ? o : { ...o, range };
}

export const boats = (o: Outfit): number => TRAWLERS.reduce((n, t) => n + (o.trawlers[t.id] ?? 0), 0);

/** How far out (in tenths) the sonar can see. */
export const coveredRange = (o: Outfit): number => Math.min(DIAL_STEPS, HARBOUR_REACH + o.buoys * BUOY_REACH);

/** The share of the fishing grounds the boats work that the sonar cannot see. */
export const blindShare = (o: Outfit): number => (o.range <= coveredRange(o) ? 0 : (o.range - coveredRange(o)) / o.range);

export const catchRate = (o: Outfit): number =>
  TRAWLERS.reduce((s, t) => s + (o.trawlers[t.id] ?? 0) * t.rate, 0) * (NEAR_SHARE + RANGE_SHARE * o.range) * incomeMultiplier(o);

const log = (o: Outfit, kind: EntryKind, text: string) => appendLog<EntryKind, Outfit>(o, kind, text);

/** Boats fishing past the sonar go missing; the smallest go first. */
function losses(o: Outfit, dt: number, pressure: number): Outfit {
  let next: Outfit = { ...o, losses: o.losses + boats(o) * blindShare(o) * LOSS_RATE * pressure * dt };
  while (next.losses >= 1) {
    const lost = TRAWLERS.find((t) => (next.trawlers[t.id] ?? 0) > 0);
    if (!lost) {
      next = { ...next, losses: 0 };
      break;
    }
    const [roll, rng] = nextRandom(next.rng);
    const taker = SHELF_TAKERS[Math.floor(roll * SHELF_TAKERS.length)]!;
    next = { ...next, rng, losses: next.losses - 1, trawlers: { ...next.trawlers, [lost.id]: next.trawlers[lost.id]! - 1 } };
    next = log(next, 'attack', `A ${lost.name} FISHING PAST THE SONAR STOPPED ANSWERING. THE LAST CALL SAID ${taker} HAD THE NET.`);
  }
  return next;
}

/** The shelf for one tick: the catch, and whatever takes the boats that fish blind. */
export function tickShelf(o: Outfit, dt: number, pressure = 1): Outfit {
  if (boats(o) === 0) return o;
  const income = catchRate(o) * dt;
  return losses({ ...o, cash: o.cash + income, lifetimeCash: o.lifetimeCash + income }, dt, pressure);
}
