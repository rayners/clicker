import {
  BULWARK_BASE_COST,
  BULWARK_COST_GROWTH,
  BULWARK_HOLD,
  CITIES,
  KAIJU_NAMES,
  LANDFALL_SECONDS,
  LEVY_PER_THREAT,
  MAX_CATEGORY,
  PILOTS_PER_BULWARK,
  PILOT_BASE_COST,
  PILOT_COST_GROWTH,
  WALL_BASE_COST,
  WALL_COST_GROWTH,
  WALL_HOLD,
} from '../fathom-data/breach';
import { assault, frontier, held, isSecured, tickGround, type SectionDef, type SectionState } from '../shared/ground';
import { appendLog } from '../shared/log';
import { effects } from './upgrades';
import { incomeMultiplier, type EntryKind, type Outfit } from './state';

/** The story opens the Breach (act 4) by setting this flag. */
export const BREACH_FLAG = 'breach';

export const isBreachOpen = (o: Outfit): boolean => o.flags.includes(BREACH_FLAG);

export const wallCost = (o: Outfit): number => Math.ceil(WALL_BASE_COST * WALL_COST_GROWTH ** o.walls);
export const bulwarkCost = (o: Outfit): number => Math.ceil(BULWARK_BASE_COST * BULWARK_COST_GROWTH ** o.bulwarks);
export const pilotCost = (o: Outfit): number => Math.ceil(PILOT_BASE_COST * PILOT_COST_GROWTH ** o.pilots);

function buy(o: Outfit, cost: number, change: Partial<Outfit>): Outfit {
  if (!isBreachOpen(o) || o.cash < cost) return o;
  return { ...o, ...change, cash: o.cash - cost };
}

export const buildWall = (o: Outfit): Outfit => buy(o, wallCost(o), { walls: o.walls + 1 });
export const buildBulwark = (o: Outfit): Outfit => buy(o, bulwarkCost(o), { bulwarks: o.bulwarks + 1 });
export const hirePilot = (o: Outfit): Outfit => buy(o, pilotCost(o), { pilots: o.pilots + 1 });

/** Bulwarks with a linked pair of pilots aboard. */
export const activeBulwarks = (o: Outfit): number => Math.min(o.bulwarks, Math.floor(o.pilots / PILOTS_PER_BULWARK));

/** Holding force: every wall, and every crewed Bulwark. */
export const defence = (o: Outfit): number => o.walls * WALL_HOLD + activeBulwarks(o) * BULWARK_HOLD;

/** The coast as the current kaiju sees it: every city's threat scaled by its category. */
const threatened = (o: Outfit): SectionDef[] => CITIES.map((c) => ({ ...c, threat: c.threat * Math.max(1, o.category) }));

export const citiesHeld = (o: Outfit): number => held(o.cities);

export const levyRate = (o: Outfit): number =>
  o.cities.reduce((s, c, i) => (isSecured(c) ? s + CITIES[i]!.threat * LEVY_PER_THREAT : s), 0) * incomeMultiplier(o) * effects(o).levy;

/** Defence posted city by city from the nearest out; whatever is left over goes back on the attack. */
function post(cities: SectionState[], defs: SectionDef[], pool: number): { cities: SectionState[]; spare: number } {
  let left = pool;
  const posted = cities.map((c, i) => {
    if (!isSecured(c) || left <= 0) return { ...c, garrison: 0 };
    const g = Math.min(left, defs[i]!.threat);
    left -= g;
    return { ...c, garrison: g };
  });
  return { cities: posted, spare: left };
}

const log = (o: Outfit, kind: EntryKind, text: string) => appendLog<EntryKind, Outfit>(o, kind, text);

/** The Breach opens: the coast is the outfit's to hold, and the first kaiju is on its way. */
function openBreach(o: Outfit): Outfit {
  const cities = CITIES.map(() => ({ control: 1, garrison: 0, secured: true }));
  return log({ ...o, cities, category: 1, landfallIn: LANDFALL_SECONDS }, 'attack', `CATEGORY 1 LANDFALL AT HARROW POINT. THEY ARE CALLING IT ${KAIJU_NAMES[0]}.`);
}

function landfall(o: Outfit, dt: number): Outfit {
  const landfallIn = o.landfallIn - dt;
  if (landfallIn > 0 || o.category >= MAX_CATEGORY) return { ...o, landfallIn: Math.max(0, landfallIn) };
  const category = o.category + 1;
  return log({ ...o, category, landfallIn: LANDFALL_SECONDS }, 'attack', `CATEGORY ${category} LANDFALL. ${KAIJU_NAMES[category - 1]}. IT IS BIGGER THAN THE LAST ONE. THEY ALWAYS ARE.`);
}

/** The coast for one tick: the levy from every held city, landfalls, and the kaiju pushing back whatever is undefended. */
export function tickBreach(o: Outfit, dt: number): Outfit {
  if (!isBreachOpen(o)) return o;
  const opened = o.cities.length === 0 ? openBreach(o) : o;
  const next = landfall(opened, dt);
  const defs = threatened(next);
  const { cities: posted, spare } = post(next.cities, defs, defence(next));
  const retaken = frontier(posted) < CITIES.length && spare > 0 ? assault(posted, defs, spare, dt).states : posted;
  const cities = tickGround(retaken, defs, dt, 1);
  const income = levyRate({ ...next, cities }) * dt;
  let out: Outfit = { ...next, cities, cash: next.cash + income, lifetimeCash: next.lifetimeCash + income };
  cities.forEach((c, i) => {
    const was = next.cities[i]!;
    if (was.secured && !c.secured) out = log(out, 'attack', `${CITIES[i]!.name} HAS FALLEN. THE KAIJU WALKED THROUGH IT ON ITS WAY INLAND.`);
    if (!was.secured && c.secured) out = log(out, 'crew', `${CITIES[i]!.name} RETAKEN. THE BULWARKS STAND IN THE HARBOUR WHILE THE FIRES ARE PUT OUT.`);
  });
  return out;
}
