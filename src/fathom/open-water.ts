import { ESCAPE_LINES, OPEN_WATER_AT, PEN_BASE_COST, PEN_COST_GROWTH, PEN_HOLDS, SPECIMENS, type SpecimenDef } from '../fathom-data/open-water';
import { appendLog } from '../shared/log';
import { nextRandom } from '../shared/rng';
import { depth } from './depth';
import { incomeMultiplier, type EntryKind, type Outfit } from './state';

export const SPECIMEN_COST_GROWTH = 1.15;
const DIAL_STEPS = 10;
/** Full enhancement pays this many times more per specimen, and makes each this many times harder to hold. */
const ENHANCED_PAY = 2.5;
const ENHANCED_HOLD = 3;
/** Chance per second an uncontained specimen gets out, at pressure 1. */
const ESCAPE_RATE = 0.004;
/** Each specimen loose adds this much to the beach's pressure, until it swims off (one every this many seconds). */
const LOOSE_PRESSURE = 0.25;
const DRIFT_SECONDS = 600;

export const isOpenWaterOpen = (o: Outfit): boolean => depth(o) >= OPEN_WATER_AT;

export const specimenCost = (def: SpecimenDef, owned: number): number => Math.ceil(def.baseCost * SPECIMEN_COST_GROWTH ** owned);
export const penCost = (o: Outfit): number => Math.ceil(PEN_BASE_COST * PEN_COST_GROWTH ** o.pens);

export function catchSpecimen(o: Outfit, id: string): Outfit {
  const def = SPECIMENS.find((s) => s.id === id);
  if (!def || !isOpenWaterOpen(o)) return o;
  const owned = o.specimens[id] ?? 0;
  const cost = specimenCost(def, owned);
  if (o.cash < cost) return o;
  return { ...o, cash: o.cash - cost, specimens: { ...o.specimens, [id]: owned + 1 } };
}

export function buyPen(o: Outfit): Outfit {
  const cost = penCost(o);
  if (!isOpenWaterOpen(o) || o.cash < cost) return o;
  return { ...o, cash: o.cash - cost, pens: o.pens + 1 };
}

export const isSpecimenRevealed = (o: Outfit, index: number): boolean => index === 0 || SPECIMENS.slice(index - 1).some((s) => (o.specimens[s.id] ?? 0) > 0);

export const enhancement = (o: Outfit): number => o.enhance / DIAL_STEPS;

export function shiftEnhancement(o: Outfit, step: 1 | -1): Outfit {
  const enhance = Math.max(0, Math.min(DIAL_STEPS, o.enhance + step));
  return enhance === o.enhance ? o : { ...o, enhance };
}

export const specimens = (o: Outfit): number => SPECIMENS.reduce((n, s) => n + (o.specimens[s.id] ?? 0), 0);

/** How many specimens the pens can hold at this level of enhancement. */
export const contained = (o: Outfit): number => (o.pens * PEN_HOLDS) / (1 + (ENHANCED_HOLD - 1) * enhancement(o));

export const uncontained = (o: Outfit): number => Math.max(0, specimens(o) - contained(o));

export const researchRate = (o: Outfit): number =>
  SPECIMENS.reduce((s, sp) => s + (o.specimens[sp.id] ?? 0) * sp.rate, 0) * (1 + (ENHANCED_PAY - 1) * enhancement(o)) * incomeMultiplier(o);

/** How hard the water pushes on the beach: the season, plus whatever the lab let out. */
export const beachPressure = (o: Outfit): number => 1 + LOOSE_PRESSURE * o.loose;

const log = (o: Outfit, kind: EntryKind, text: string) => appendLog<EntryKind, Outfit>(o, kind, text);

/** Uncontained specimens get out, the cleverest first; the loose drift off, slowly. */
function escapes(o: Outfit, dt: number, pressure: number): Outfit {
  let next: Outfit = { ...o, escaping: o.escaping + uncontained(o) * ESCAPE_RATE * pressure * dt };
  while (next.escaping >= 1) {
    const gone = [...SPECIMENS].reverse().find((s) => (next.specimens[s.id] ?? 0) > 0);
    if (!gone) {
      next = { ...next, escaping: 0 };
      break;
    }
    const [roll, rng] = nextRandom(next.rng);
    next = { ...next, rng, escaping: next.escaping - 1, loose: next.loose + 1, specimens: { ...next.specimens, [gone.id]: next.specimens[gone.id]! - 1 } };
    next = log(next, 'attack', `${gone.name} OUT OF ITS PEN. ${ESCAPE_LINES[Math.floor(roll * ESCAPE_LINES.length)]!} THE BEACH PATROLS ARE TOLD TO WATCH FOR A FIN.`);
  }
  return next;
}

function drift(o: Outfit, dt: number): Outfit {
  if (o.loose === 0) return o.drifting === 0 ? o : { ...o, drifting: 0 };
  let next: Outfit = { ...o, drifting: o.drifting + dt / DRIFT_SECONDS };
  while (next.drifting >= 1 && next.loose > 0) {
    next = { ...next, drifting: next.drifting - 1, loose: next.loose - 1 };
    next = log(next, 'sonar', 'SONAR LOSES AN ESCAPED SPECIMEN PAST THE SHELF EDGE, HEADING DEEP.');
  }
  return next;
}

/** The station for one tick: research money, escapes, and the escaped swimming away. */
export function tickOpenWater(o: Outfit, dt: number, pressure = 1): Outfit {
  const income = researchRate(o) * dt;
  const paid = income > 0 ? { ...o, cash: o.cash + income, lifetimeCash: o.lifetimeCash + income } : o;
  return drift(escapes(paid, dt, pressure), dt);
}
