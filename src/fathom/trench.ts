import { CREW_BASE_COST, CREW_COST_GROWTH, CREW_PER_MODULE, FLOOD_LINES, MODULE_BASE_COST, MODULE_COST_GROWTH, MODULE_RATE, SOURCE_NOTCH, TRENCH_AT } from '../fathom-data/trench';
import { appendLog } from '../engine/log';
import { nextRandom } from '../engine/rng';
import { depth } from './depth';
import { effects } from './upgrades';
import { incomeMultiplier, type EntryKind, type Outfit } from './state';

const DIAL_STEPS = 10;
/** Each notch deeper pays this share more for samples. */
const DEPTH_PAY = 0.5;
/** Hull lost per second per module at full depth (it rises with the square of the notch). */
const STRESS = 0.004;
/** Hull restored per second by each crew, shared across the modules. */
const REPAIR = 0.003;
/** Where integrity lands after a module floods and the station is sealed off around it. */
const AFTER_FLOOD = 0.5;

export const isTrenchOpen = (o: Outfit): boolean => depth(o) >= TRENCH_AT;

export const moduleCost = (o: Outfit): number => Math.ceil(MODULE_BASE_COST * MODULE_COST_GROWTH ** o.modules);
export const crewCost = (o: Outfit): number => Math.ceil(CREW_BASE_COST * CREW_COST_GROWTH ** o.crews);

export function buyModule(o: Outfit): Outfit {
  const cost = moduleCost(o);
  if (!isTrenchOpen(o) || o.cash < cost) return o;
  return { ...o, cash: o.cash - cost, modules: o.modules + 1 };
}

export function hireRepairCrew(o: Outfit): Outfit {
  const cost = crewCost(o);
  if (!isTrenchOpen(o) || o.cash < cost) return o;
  return { ...o, cash: o.cash - cost, crews: o.crews + 1 };
}

export function shiftStation(o: Outfit, step: 1 | -1): Outfit {
  const stationDepth = Math.max(1, Math.min(DIAL_STEPS, o.stationDepth + step));
  return stationDepth === o.stationDepth ? o : { ...o, stationDepth };
}

export const sampleRate = (o: Outfit): number => o.modules * MODULE_RATE * (1 + DEPTH_PAY * (o.stationDepth - 1)) * incomeMultiplier(o) * effects(o).sample;

export const isAutoStationActive = (o: Outfit): boolean => effects(o).autoStation;

/** The station computer's notch: the deepest at which the crews keep up with the hull. */
function autoNotch(o: Outfit): number {
  for (let notch = DIAL_STEPS; notch > 1; notch--) if (hullRate({ ...o, stationDepth: notch }) >= 0) return notch;
  return 1;
}

/** Change in hull integrity per second: the depth crushing every module, the crews patching it. */
export function hullRate(o: Outfit): number {
  if (o.modules === 0) return 0;
  const notch = o.stationDepth / DIAL_STEPS;
  return o.crews * REPAIR - o.modules * STRESS * notch * notch;
}

export const reachedSource = (o: Outfit): boolean => o.modules > 0 && o.stationDepth >= SOURCE_NOTCH;

const log = (o: Outfit, kind: EntryKind, text: string) => appendLog<EntryKind, Outfit>(o, kind, text);

function flood(o: Outfit): Outfit {
  const [roll, rng] = nextRandom(o.rng);
  const next: Outfit = { ...o, rng, modules: o.modules - 1, integrity: AFTER_FLOOD, bodyCount: o.bodyCount + CREW_PER_MODULE };
  return log(next, 'attack', FLOOD_LINES[Math.floor(roll * FLOOD_LINES.length)]!);
}

/** The station for one tick: samples paid for, the hull crushed and patched, and a module lost if it gives. */
export function tickTrench(o0: Outfit, dt: number): Outfit {
  if (o0.modules === 0) return o0;
  const o = effects(o0).autoStation ? { ...o0, stationDepth: autoNotch(o0) } : o0;
  const income = sampleRate(o) * dt;
  const integrity = Math.min(1, o.integrity + hullRate(o) * dt);
  const next = { ...o, integrity: Math.max(0, integrity), cash: o.cash + income, lifetimeCash: o.lifetimeCash + income };
  return integrity <= 0 ? flood(next) : next;
}
