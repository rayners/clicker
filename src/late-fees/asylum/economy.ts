import { ASYLUM_STAFF, PATIENT_NAMES_ASYLUM, WARDS, type StaffDef, type WardDef } from '../../late-fees-data/asylum';
import { ASYLUM_UPGRADES, type AsylumEffect } from '../../late-fees-data/asylum-upgrades';
import { appendLog } from '../../shared/log';
import { nextRandom } from '../../shared/rng';
import { killerPressure } from '../killers';
import type { Signals } from '../kinds';
import type { AsylumRun as Run, EntryKind } from '../state';

export const COST_GROWTH = 1.15;
export const STAFF_COST_GROWTH = 1.2;
const DIAL_STEPS = 10;
export const DEFAULT_SEDATION = 2;
/** At full dose, staff calm this many times more patients, and the dose alone covers this share of the wards. */
const SEDATION_STAFF = 1;
const SEDATION_DIRECT = 0.8;
/** Seconds for a wholly unwatched ward to boil over, at pressure 1. */
const AGITATION_SECONDS = 240;
/** Calm wards settle this fast. */
const SETTLE_SECONDS = 60;
const ROUNDS_CALM = 0.02;
/** Where agitation lands after an incident: the ward is shaken, not settled. */
const AFTER_ESCAPE = 0.5;
const AFTER_HELD = 0.7;
/** How hard the inspector marks down a fully sedated hospital, and how fast her rating moves. */
const SEDATION_RATING = 0.7;
const RATING_SECONDS = 300;
const RATING_FLOOR = 0.3;
const DOOR_BASE_COST = 200;
const DOOR_COST_GROWTH = 1.25;
/** Seconds to find one escapee, before deputies and dogs. */
const SEARCH_SECONDS = 120;
/** On Candy Corn Day (act 3 on) the whole town is in costume: escapees are this much harder to find. */
const CANDY_CORN_SEARCH = 0.25;
/** Chance an escape ends with someone dead in Millbrook, at pressure 1. */
const ESCAPE_DEATH = 0.4;
const REPUTATION_HIT = 0.97;
const REPUTATION_RECOVERY_SECONDS = 900;
const REPUTATION_FLOOR = 0.4;
const BASE_ROUNDS = 1;
/** The state's per-diem on top of each bed's rate: the counterpart of the clinic's deep-sleep premium (tuned by the pacing bot). */
const PER_DIEM = 1.8;
// Same curve as DEEP CONTRACT's shaft depth, so the shared story scale lines up (tuned by the pacing bot).
const PROGRESS_SCALE = 0.0432;
const PROGRESS_EXPONENT = 5.48;

interface Multipliers {
  rounds: number;
  autoRounds: number;
  ward: Record<string, number>;
  funding: number;
  calm: number;
  calmer: number;
  door: number;
  search: number;
  autoSedation: boolean;
}

function applyEffect(m: Multipliers, e: AsylumEffect): void {
  switch (e.kind) {
    case 'roundsMultiplier':
      m.rounds *= e.value;
      break;
    case 'autoRounds':
      m.autoRounds += e.value;
      break;
    case 'wardMultiplier':
      m.ward[e.ward] = (m.ward[e.ward] ?? 1) * e.value;
      break;
    case 'fundingMultiplier':
      m.funding *= e.value;
      break;
    case 'calmMultiplier':
      m.calm *= e.value;
      break;
    case 'calmer':
      m.calmer *= e.value;
      break;
    case 'doorMultiplier':
      m.door *= e.value;
      break;
    case 'searchMultiplier':
      m.search *= e.value;
      break;
    case 'autoSedation':
      m.autoSedation = true;
      break;
  }
}

function multipliers(r: Run): Multipliers {
  const m: Multipliers = { rounds: 1, autoRounds: 0, ward: {}, funding: r.config.productionMultiplier, calm: 1, calmer: 1, door: 1, search: 1, autoSedation: false };
  for (const u of ASYLUM_UPGRADES) if (r.upgrades.includes(u.id)) applyEffect(m, u.effect);
  return m;
}

// ---------- purchases ----------

export const wardCost = (def: WardDef, owned: number): number => Math.ceil(def.baseCost * COST_GROWTH ** owned);
export const staffCost = (def: StaffDef, owned: number): number => Math.ceil(def.baseCost * STAFF_COST_GROWTH ** owned);
export const doorCost = (r: Run): number => Math.ceil(DOOR_BASE_COST * DOOR_COST_GROWTH ** r.doors);

export function buyWard<R extends Run>(r: R, id: string): R {
  const def = WARDS.find((w) => w.id === id);
  if (!def) return r;
  const owned = r.wards[id] ?? 0;
  const cost = wardCost(def, owned);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, wards: { ...r.wards, [id]: owned + 1 } };
}

export function hireAsylumStaff<R extends Run>(r: R, id: string): R {
  const def = ASYLUM_STAFF.find((s) => s.id === id);
  if (!def) return r;
  const owned = r.staff[id] ?? 0;
  const cost = staffCost(def, owned);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, staff: { ...r.staff, [id]: owned + 1 } };
}

export function buyDoor<R extends Run>(r: R): R {
  const cost = doorCost(r);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, doors: r.doors + 1 };
}

export const isWardRevealed = (r: Run, index: number): boolean => index === 0 || WARDS.slice(index - 1).some((w) => (r.wards[w.id] ?? 0) > 0);
export const isStaffRevealed = (r: Run, index: number): boolean => index === 0 || ASYLUM_STAFF.slice(index - 1).some((s) => (r.staff[s.id] ?? 0) > 0);

// ---------- patients, calm and the dial ----------

export const patients = (r: Run): number => WARDS.reduce((n, w) => n + (r.wards[w.id] ?? 0), 0);

export function calmCapacity(r: Run): number {
  const mult = multipliers(r).calm;
  return ASYLUM_STAFF.reduce((n, s) => n + (r.staff[s.id] ?? 0) * s.calms * mult, 0);
}

/** The share of the wards kept calm at a given dose: staff (stretched further by the dose) and the dose itself. */
function coverageAt(r: Run, share: number): number {
  const n = patients(r);
  if (n === 0) return 1;
  return Math.min(1, (calmCapacity(r) * (1 + SEDATION_STAFF * share)) / n + SEDATION_DIRECT * share);
}

export const isAutoSedationActive = (r: Run): boolean => multipliers(r).autoSedation && !r.dialOff;

export function toggleAutoSedation<R extends Run>(r: R): R {
  if (!multipliers(r).autoSedation) return r;
  return { ...r, dialOff: !r.dialOff };
}

export function shiftSedation<R extends Run>(r: R, step: 1 | -1): R {
  const sedation = Math.max(0, Math.min(DIAL_STEPS, r.sedation + step));
  return sedation === r.sedation ? r : { ...r, sedation };
}

/** The dose on the wards: the superintendent's, or the pharmacy's lowest notch that keeps every ward calm. */
export function sedationShare(r: Run): number {
  if (!isAutoSedationActive(r)) return r.sedation / DIAL_STEPS;
  for (let notch = 0; notch <= DIAL_STEPS; notch++) if (coverageAt(r, notch / DIAL_STEPS) >= 1) return notch / DIAL_STEPS;
  return 1;
}

export const coverage = (r: Run): number => coverageAt(r, sedationShare(r));

/** Change in agitation per second: it builds on wards nobody is calming, and settles where everyone is calm. */
export function agitationRate(r: Run): number {
  if (patients(r) === 0) return -1 / SETTLE_SECONDS;
  const cover = coverage(r);
  const pressure = killerPressure(r, asylumSignals(r));
  return ((1 - cover) * pressure) / (AGITATION_SECONDS * multipliers(r).calmer) - cover / SETTLE_SECONDS;
}

// ---------- funding ----------

export function wardRate(r: Run, def: WardDef): number {
  const m = multipliers(r);
  return def.rate * PER_DIEM * (m.ward[def.id] ?? 1) * m.funding;
}

export const fundingRate = (r: Run): number => WARDS.reduce((s, w) => s + (r.wards[w.id] ?? 0) * wardRate(r, w), 0);

export function incomeRate(r: Run): number {
  const rating = RATING_FLOOR + (1 - RATING_FLOOR) * r.rating;
  const reputation = REPUTATION_FLOOR + (1 - REPUTATION_FLOOR) * r.reputation;
  return fundingRate(r) * rating * reputation;
}

export const roundsPower = (r: Run): number => BASE_ROUNDS * multipliers(r).rounds;
export const autoRoundsRate = (r: Run): number => multipliers(r).autoRounds;

/** The superintendent walks the wards: a round billed to the state, and a ward settled for a moment. */
export function rounds<R extends Run>(r: R): R {
  const p = roundsPower(r);
  return { ...r, cash: r.cash + p, lifetimeCash: r.lifetimeCash + p, agitation: Math.max(0, r.agitation - ROUNDS_CALM) };
}

const log = <R extends Run>(r: R, kind: EntryKind, text: string) => appendLog<EntryKind, R>(r, kind, text);

/** A ward boils over: a door holds (and wears), or a patient gets out into Millbrook. */
function incident<R extends Run>(r: R): R {
  if (r.doors > 0) {
    const doorWear = r.doorWear + 1 / multipliers(r).door;
    const broken = doorWear >= 1 - 1e-9;
    const next = { ...r, agitation: AFTER_HELD, doorWear: broken ? 0 : doorWear, doors: r.doors - (broken ? 1 : 0) };
    return log(next, 'staff', broken ? 'A SECURITY DOOR HELD THROUGH THE NIGHT. IN THE MORNING IT HAS TO BE CUT OFF ITS HINGES.' : 'A SECURITY DOOR HELD. THE DENTS IN IT ARE AT HEAD HEIGHT.');
  }
  const [roll, rng] = nextRandom(r.rng);
  const [who, rng2] = nextRandom(rng);
  const name = PATIENT_NAMES_ASYLUM[Math.floor(who * PATIENT_NAMES_ASYLUM.length)]!;
  let next: R = { ...r, rng: rng2, agitation: AFTER_ESCAPE, loose: r.loose + 1, escapes: r.escapes + 1, reputation: r.reputation * REPUTATION_HIT };
  next = log(next, 'news', `${name} IS MISSING FROM THE HILL. A WINDOW IN THE DAY ROOM IS OPEN. THE SEARCH STARTS AT DAWN.`);
  if (roll < ESCAPE_DEATH * killerPressure(r, asylumSignals(r))) {
    next = log({ ...next, bodyCount: next.bodyCount + 1 }, 'kill', `A BODY ON THE ROAD DOWN TO MILLBROOK. ${name} WAS SEEN NEARBY. NOBODY HAS SEEN THEM SINCE.`);
  }
  return next;
}

/** Search teams bring escapees back, slowly; on Candy Corn Day everyone in town is wearing a mask. */
function search<R extends Run>(r: R, dt: number): R {
  if (r.loose === 0) return r.searching === 0 ? r : { ...r, searching: 0 };
  const pace = (multipliers(r).search * (r.act >= 3 ? CANDY_CORN_SEARCH : 1)) / SEARCH_SECONDS;
  let next: R = { ...r, searching: r.searching + pace * dt };
  while (next.searching >= 1 && next.loose > 0) {
    next = { ...next, searching: next.searching - 1, loose: next.loose - 1 };
    next = log(next, 'staff', `AN ESCAPEE IS BROUGHT BACK UP THE HILL. ${next.loose > 0 ? `${next.loose} STILL OUT THERE.` : 'EVERYONE IS ACCOUNTED FOR. FOR NOW.'}`);
  }
  return next;
}

export function tickAsylum<R extends Run>(r: R, dt: number): R {
  const ratingTarget = 1 - SEDATION_RATING * sedationShare(r);
  const rating = r.rating + ((ratingTarget - r.rating) * dt) / RATING_SECONDS;
  const income = (incomeRate(r) + autoRoundsRate(r) * roundsPower(r)) * dt;
  // The town does not forgive the hill while anyone is still loose.
  const reputation = r.loose > 0 ? r.reputation : Math.min(1, r.reputation + ((1 - r.reputation) * dt) / REPUTATION_RECOVERY_SECONDS);
  const agitation = Math.max(0, r.agitation + agitationRate(r) * dt);
  let next: R = { ...r, rating, reputation, agitation: Math.min(1, agitation), cash: r.cash + income, lifetimeCash: r.lifetimeCash + income };
  if (agitation >= 1) next = incident(next);
  return search(next, dt);
}

export function progress(r: Run): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + r.lifetimeCash) ** PROGRESS_EXPONENT);
}

/** What the hospital tells the story and the killer. On the wards it is always night: someone is always awake. */
export function asylumSignals(r: Run): Signals {
  return { progress: progress(r), deep: WARDS.some((w) => w.deep && (r.wards[w.id] ?? 0) > 0), night: patients(r) > 0 };
}

// ---------- the hospital store ----------

export function isAsylumUpgradeUnlocked(r: Run, id: string): boolean {
  const u = ASYLUM_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.takings !== undefined && r.lifetimeCash < u.unlock.takings) return false;
  if (u.unlock.ward && (r.wards[u.unlock.ward.id] ?? 0) < u.unlock.ward.count) return false;
  return true;
}

export function availableAsylumUpgrades(r: Run) {
  return ASYLUM_UPGRADES.filter((u) => !r.upgrades.includes(u.id) && isAsylumUpgradeUnlocked(r, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buyAsylumUpgrade<R extends Run>(r: R, id: string): R {
  const u = ASYLUM_UPGRADES.find((x) => x.id === id);
  if (!u || r.upgrades.includes(id) || !isAsylumUpgradeUnlocked(r, id) || r.cash < u.cost) return r;
  return { ...r, cash: r.cash - u.cost, upgrades: [...r.upgrades, id] };
}
