import { BEDS, PATIENT_NAMES, REM_MULTIPLIER, STAFF, type BedDef, type StaffDef } from '../../late-fees-data/clinic';
import { CLINIC_UPGRADES, type ClinicEffect } from '../../late-fees-data/clinic-upgrades';
import { appendLog } from '../../engine/log';
import { nextRandom } from '../../engine/rng';
import { killerPressure } from '../killers';
import type { Signals } from '../kinds';
import type { ClinicRun as Run, EntryKind } from '../state';

export const COST_GROWTH = 1.15;
export const STAFF_COST_GROWTH = 1.2;
const DIAL_STEPS = 10;
/** The share of deep sleep a person needs; below it, sleep debt builds. */
export const REM_NEED = 0.3;
const DEBT_SECONDS = 300;
const MAX_DEBT = 2;
/** Share of patients who nod off unwatched per point of debt over 1. */
const MICROSLEEP = 0.2;
/** Chance per second that an exposed deep sleeper dies, at pressure 1. */
const DEATH_RATE = 0.002;
const REPUTATION_HIT = 0.97;
const REPUTATION_RECOVERY_SECONDS = 900;
const REPUTATION_FLOOR = 0.4;
const SUPPRESSANT_PROTECTS = 6;
const SUPPRESSANT_BASE_COST = 500;
const SUPPRESSANT_COST_GROWTH = 3;
const BASE_READING = 1;
// Same curve as DEEP CONTRACT's shaft depth, so the shared story scale lines up (tuned by the pacing bot).
const PROGRESS_SCALE = 0.0432;
const PROGRESS_EXPONENT = 5.48;

interface Multipliers {
  reading: number;
  autoReading: number;
  bed: Record<string, number>;
  data: number;
  watch: number;
  lucid: number;
  suppressant: number;
  autoDial: boolean;
}

function applyEffect(m: Multipliers, e: ClinicEffect): void {
  switch (e.kind) {
    case 'readingMultiplier':
      m.reading *= e.value;
      break;
    case 'autoReading':
      m.autoReading += e.value;
      break;
    case 'bedMultiplier':
      m.bed[e.bed] = (m.bed[e.bed] ?? 1) * e.value;
      break;
    case 'dataMultiplier':
      m.data *= e.value;
      break;
    case 'watchMultiplier':
      m.watch *= e.value;
      break;
    case 'lucid':
      m.lucid *= e.value;
      break;
    case 'suppressantMultiplier':
      m.suppressant *= e.value;
      break;
    case 'autoDial':
      m.autoDial = true;
      break;
  }
}

function multipliers(r: Run): Multipliers {
  const m: Multipliers = { reading: 1, autoReading: 0, bed: {}, data: r.config.productionMultiplier, watch: 1, lucid: 1, suppressant: 1, autoDial: false };
  for (const u of CLINIC_UPGRADES) if (r.upgrades.includes(u.id)) applyEffect(m, u.effect);
  return m;
}

// ---------- purchases ----------

export const bedCost = (def: BedDef, owned: number): number => Math.ceil(def.baseCost * COST_GROWTH ** owned);
export const staffCost = (def: StaffDef, owned: number): number => Math.ceil(def.baseCost * STAFF_COST_GROWTH ** owned);
export const suppressantCost = (r: Run): number => Math.ceil(SUPPRESSANT_BASE_COST * SUPPRESSANT_COST_GROWTH ** r.suppressant);

export function buyBed<R extends Run>(r: R, id: string): R {
  const def = BEDS.find((b) => b.id === id);
  if (!def) return r;
  const owned = r.beds[id] ?? 0;
  const cost = bedCost(def, owned);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, beds: { ...r.beds, [id]: owned + 1 } };
}

export function hireStaff<R extends Run>(r: R, id: string): R {
  const def = STAFF.find((s) => s.id === id);
  if (!def) return r;
  const owned = r.staff[id] ?? 0;
  const cost = staffCost(def, owned);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, staff: { ...r.staff, [id]: owned + 1 } };
}

export function buySuppressant<R extends Run>(r: R): R {
  const cost = suppressantCost(r);
  if (r.cash < cost) return r;
  return { ...r, cash: r.cash - cost, suppressant: r.suppressant + 1 };
}

export const isBedRevealed = (r: Run, index: number): boolean => index === 0 || BEDS.slice(index - 1).some((b) => (r.beds[b.id] ?? 0) > 0);
export const isStaffRevealed = (r: Run, index: number): boolean => index === 0 || STAFF.slice(index - 1).some((s) => (r.staff[s.id] ?? 0) > 0);

// ---------- patients, the dial and the watch ----------

export const patients = (r: Run): number => BEDS.reduce((n, b) => n + (r.beds[b.id] ?? 0), 0);

export function watchCapacity(r: Run): number {
  const mult = multipliers(r).watch;
  return STAFF.reduce((n, s) => n + (r.staff[s.id] ?? 0) * s.watches * mult, 0);
}

export const protectedCount = (r: Run): number => r.suppressant * SUPPRESSANT_PROTECTS * multipliers(r).suppressant;

export const isAutoDialActive = (r: Run): boolean => multipliers(r).autoDial && !r.dialOff;

export function toggleAutoDial<R extends Run>(r: R): R {
  if (!multipliers(r).autoDial) return r;
  return { ...r, dialOff: !r.dialOff };
}

export function shiftRem<R extends Run>(r: R, step: 1 | -1): R {
  const remShare = Math.max(0, Math.min(DIAL_STEPS, r.remShare + step));
  return remShare === r.remShare ? r : { ...r, remShare };
}

/** The share of patients in deep sleep: the administrator's, or as deep as the watch allows but never below need. */
export function remFraction(r: Run): number {
  if (!isAutoDialActive(r)) return r.remShare / DIAL_STEPS;
  const n = patients(r);
  if (n === 0) return REM_NEED;
  const covered = Math.floor(((watchCapacity(r) + protectedCount(r)) / n) * DIAL_STEPS) / DIAL_STEPS;
  return Math.max(REM_NEED, Math.min(1, covered));
}

export const remPatients = (r: Run): number => patients(r) * remFraction(r);

const microsleepFraction = (r: Run): number => (r.debt > 1 ? Math.min(1, (r.debt - 1) * MICROSLEEP) : 0);

/** Deep sleepers nobody is watching, plus anyone nodding off from sleep debt. */
export function exposed(r: Run): number {
  const unwatched = Math.max(0, remPatients(r) - watchCapacity(r) - protectedCount(r));
  return unwatched + patients(r) * microsleepFraction(r);
}

// ---------- grant money ----------

export function bedRate(r: Run, def: BedDef): number {
  const m = multipliers(r);
  return def.rate * (m.bed[def.id] ?? 1) * m.data;
}

export const dataRate = (r: Run): number => BEDS.reduce((s, b) => s + (r.beds[b.id] ?? 0) * bedRate(r, b), 0);

export function incomeRate(r: Run): number {
  const share = remFraction(r);
  const deep = remPatients(r);
  const monitored = deep === 0 ? 1 : Math.min(1, (watchCapacity(r) + protectedCount(r)) / deep);
  const mix = 1 - share + share * REM_MULTIPLIER * monitored;
  const reputation = REPUTATION_FLOOR + (1 - REPUTATION_FLOOR) * r.reputation;
  return dataRate(r) * mix * (1 - microsleepFraction(r)) * reputation;
}

export const readingPower = (r: Run): number => BASE_READING * multipliers(r).reading;
export const autoReadingRate = (r: Run): number => multipliers(r).autoReading;

/** The administrator takes a reading by hand. */
export function reading<R extends Run>(r: R): R {
  const p = readingPower(r);
  return { ...r, cash: r.cash + p, lifetimeCash: r.lifetimeCash + p };
}

const log = <R extends Run>(r: R, kind: EntryKind, text: string) => appendLog<EntryKind, R>(r, kind, text);

/** Exposed sleepers die in their beds; each death costs the clinic's name. */
function nightmares<R extends Run>(r: R, dt: number): R {
  const m = multipliers(r);
  let next: R = { ...r, nightmares: r.nightmares + (exposed(r) * DEATH_RATE * killerPressure(r, clinicSignals(r)) * dt) / m.lucid };
  while (next.nightmares >= 1) {
    const [roll, rng] = nextRandom(next.rng);
    const name = PATIENT_NAMES[Math.floor(roll * PATIENT_NAMES.length)]!;
    next = { ...next, rng, nightmares: next.nightmares - 1, bodyCount: next.bodyCount + 1, reputation: next.reputation * REPUTATION_HIT };
    next = log(next, 'kill', `${name} DIED IN DEEP SLEEP. NOBODY WAS WATCHING THE MONITOR. CAUSE OF DEATH: "HEART FAILURE".`);
  }
  return next;
}

export function tickClinic<R extends Run>(r: R, dt: number): R {
  const share = remFraction(r);
  const debt = Math.max(0, Math.min(MAX_DEBT, r.debt + ((REM_NEED - share) / REM_NEED) * (dt / DEBT_SECONDS)));
  const income = (incomeRate(r) + autoReadingRate(r) * readingPower(r)) * dt;
  const reputation = Math.min(1, r.reputation + ((1 - r.reputation) * dt) / REPUTATION_RECOVERY_SECONDS);
  return nightmares({ ...r, debt, reputation, cash: r.cash + income, lifetimeCash: r.lifetimeCash + income }, dt);
}

export function progress(r: Run): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + r.lifetimeCash) ** PROGRESS_EXPONENT);
}

/** What the clinic tells the story and the killer. Inside, it is always night: somebody is always asleep. */
export function clinicSignals(r: Run): Signals {
  return { progress: progress(r), deep: BEDS.some((b) => b.deep && (r.beds[b.id] ?? 0) > 0), night: patients(r) > 0 };
}

// ---------- the clinic store ----------

export function isClinicUpgradeUnlocked(r: Run, id: string): boolean {
  const u = CLINIC_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.takings !== undefined && r.lifetimeCash < u.unlock.takings) return false;
  if (u.unlock.bed && (r.beds[u.unlock.bed.id] ?? 0) < u.unlock.bed.count) return false;
  return true;
}

export function availableClinicUpgrades(r: Run) {
  return CLINIC_UPGRADES.filter((u) => !r.upgrades.includes(u.id) && isClinicUpgradeUnlocked(r, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buyClinicUpgrade<R extends Run>(r: R, id: string): R {
  const u = CLINIC_UPGRADES.find((x) => x.id === id);
  if (!u || r.upgrades.includes(id) || !isClinicUpgradeUnlocked(r, id) || r.cash < u.cost) return r;
  return { ...r, cash: r.cash - u.cost, upgrades: [...r.upgrades, id] };
}
