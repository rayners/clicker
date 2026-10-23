import { COMPARTMENTS, CUTTERS, SALVAGE_SECONDS, SHORING, STRIP_PER_LOAD, type CutterDef, type ShoringDef } from '../../data/salvage/systems';
import { SALVAGE_UPGRADES, type SalvageEffect } from '../../data/salvage/upgrades';
import { SALVAGE_CREW_BOOSTS } from '../../data/salvage/crew-boosts';
import { assault, frontier, isSecured, tickGround, type SectionState } from '../../shared/ground';
import { isCrewEffective } from '../crew';
import { horrorPressure, horrorProductionMultiplier } from '../horrors';
import { appendLog } from '../log';
import type { SalvageMission as MissionState } from '../state';

export const COST_GROWTH = 1.15;
/** Shoring is the brake (as ammunition is for security): it gets dearer faster than the cutters. */
export const SHORING_COST_GROWTH = 1.2;
export const MIN_NOTCH = 1;
export const MAX_NOTCH = 10;
export const DEFAULT_NOTCH = 5;
const BASE_SAFE_LINE = 5;
/** Stress per second for each notch above the safe line, and bled off per second at or below it. */
const STRESS_PER_NOTCH = 0.01;
const STRESS_BLEED = 0.05;
/** Seconds a breached compartment stays sealed. */
export const SEAL_SECONDS = 60;
/** The hull governor backs off before stress would cross this. */
const GOVERNOR_LINE = 0.8;
const BASE_CUT = 1;
// Salvage compounds faster in the middle than extraction does, so it has its own story curve (tuned by the pacing bot).
const PROGRESS_SCALE = 0.777;
const PROGRESS_EXPONENT = 3.9;

interface Multipliers {
  cutPower: number;
  autoCut: number;
  cutter: Record<string, number>;
  cut: number;
  shoring: number;
  strip: number;
  safeLine: number;
  governor: boolean;
}

function applyEffect(r: Multipliers, e: SalvageEffect): void {
  switch (e.kind) {
    case 'cutPower':
      r.cutPower *= e.value;
      break;
    case 'autoCut':
      r.autoCut += e.value;
      break;
    case 'cutterMultiplier':
      r.cutter[e.cutter] = (r.cutter[e.cutter] ?? 1) * e.value;
      break;
    case 'cutMultiplier':
      r.cut *= e.value;
      break;
    case 'shoringMultiplier':
      r.shoring *= e.value;
      break;
    case 'stripMultiplier':
      r.strip *= e.value;
      break;
    case 'safeLine':
      r.safeLine += e.value;
      break;
    case 'governor':
      r.governor = true;
      break;
  }
}

function multipliers(m: MissionState): Multipliers {
  const r: Multipliers = {
    cutPower: 1,
    autoCut: 0,
    cutter: {},
    cut: 1,
    shoring: 1,
    strip: horrorProductionMultiplier(m) * m.config.productionMultiplier,
    safeLine: BASE_SAFE_LINE,
    governor: false,
  };
  for (const u of SALVAGE_UPGRADES) if (m.upgrades.includes(u.id)) applyEffect(r, u.effect);
  for (const [id, boost] of Object.entries(SALVAGE_CREW_BOOSTS)) if (isCrewEffective(m, id)) applyEffect(r, boost.effect);
  return r;
}

// ---------- purchases ----------

export const cutterCost = (def: CutterDef, owned: number): number => Math.ceil(def.baseCost * COST_GROWTH ** owned);
export const shoringCost = (def: ShoringDef, owned: number): number => Math.ceil(def.baseCost * SHORING_COST_GROWTH ** owned);

export function buyCutter<M extends MissionState>(m: M, id: string): M {
  const def = CUTTERS.find((c) => c.id === id);
  if (!def) return m;
  const owned = m.cutters[id] ?? 0;
  const cost = cutterCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, cutters: { ...m.cutters, [id]: owned + 1 } };
}

export function buyShoring<M extends MissionState>(m: M, id: string): M {
  const def = SHORING.find((s) => s.id === id);
  if (!def) return m;
  const owned = m.shoring[id] ?? 0;
  const cost = shoringCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, shoring: { ...m.shoring, [id]: owned + 1 } };
}

/** The first tier is always visible; each further one once the one before it is owned. */
export function isCutterRevealed(m: MissionState, index: number): boolean {
  return index === 0 || CUTTERS.slice(index - 1).some((c) => (m.cutters[c.id] ?? 0) > 0);
}

export function isShoringRevealed(m: MissionState, index: number): boolean {
  return index === 0 || SHORING.slice(index - 1).some((s) => (m.shoring[s.id] ?? 0) > 0);
}

// ---------- cutting and the torch ----------

export function cutterForce(m: MissionState, def: CutterDef): number {
  const mult = multipliers(m);
  return def.force * (mult.cutter[def.id] ?? 1) * mult.cut;
}

/** Cutting force before the torch dial. */
export function cutForce(m: MissionState): number {
  return CUTTERS.reduce((s, c) => s + (m.cutters[c.id] ?? 0) * cutterForce(m, c), 0);
}

export const safeLine = (m: MissionState): number => Math.min(MAX_NOTCH, multipliers(m).safeLine);

export function isGovernorActive(m: MissionState): boolean {
  return multipliers(m).governor && !m.governorOff;
}

/** Take the torch back from WARDEN, or hand it over again. Only once the governor is installed. */
export function toggleGovernor<M extends MissionState>(m: M): M {
  if (!multipliers(m).governor) return m;
  return { ...m, governorOff: !m.governorOff };
}

export function shiftNotch<M extends MissionState>(m: M, step: 1 | -1): M {
  const notch = Math.max(MIN_NOTCH, Math.min(MAX_NOTCH, m.notch + step));
  return notch === m.notch ? m : { ...m, notch };
}

const stressRate = (m: MissionState, notch: number): number => (notch - safeLine(m)) * STRESS_PER_NOTCH;

/** The notch the torch runs at over the next dt seconds: the governor's choice while it runs, else the dial. */
function notchFor(m: MissionState, dt: number): number {
  if (!isGovernorActive(m)) return m.notch;
  return m.stress + stressRate(m, MAX_NOTCH) * dt < GOVERNOR_LINE ? MAX_NOTCH : safeLine(m);
}

export const effectiveNotch = (m: MissionState): number => notchFor(m, 1);

/** How much faster than the standard notch the torch cuts. */
export const torchFactor = (notch: number): number => notch / DEFAULT_NOTCH;

export const isSealed = (m: MissionState): boolean => m.sealedFor > 0;

const isCutting = (m: MissionState): boolean => frontier(m.ground) < COMPARTMENTS.length && !isSealed(m);

export const cutPower = (m: MissionState): number => BASE_CUT * multipliers(m).cutPower;
export const autoCutRate = (m: MissionState): number => multipliers(m).autoCut;

/** Force actually on the frontier per second at the current notch, crews and WARDEN's pulse together. */
export function frontierForce(m: MissionState): number {
  if (!isCutting(m)) return 0;
  return (cutForce(m) + autoCutRate(m) * cutPower(m)) * torchFactor(effectiveNotch(m));
}

// ---------- shoring ----------

export function shoringHold(m: MissionState): number {
  const mult = multipliers(m).shoring;
  return SHORING.reduce((s, x) => s + (m.shoring[x.id] ?? 0) * x.hold * mult, 0);
}

/** Bracing needed to keep every open compartment from buckling. */
export const holdNeeded = (m: MissionState): number =>
  m.ground.reduce((s, sec, i) => (isSecured(sec) ? s + COMPARTMENTS[i]!.threat : s), 0);

/** Shoring carried by each open compartment, from the airlock aft. */
export function garrisons(m: MissionState): number[] {
  let pool = shoringHold(m);
  return m.ground.map((s, i) => {
    if (!isSecured(s) || pool <= 0) return 0;
    const posted = Math.min(pool, COMPARTMENTS[i]!.threat);
    pool -= posted;
    return posted;
  });
}

// ---------- salvage ----------

export function stripRate(m: MissionState): number {
  const mult = multipliers(m).strip;
  return m.ground.reduce((s, sec, i) => (isSecured(sec) ? s + COMPARTMENTS[i]!.value * STRIP_PER_LOAD * mult : s), 0);
}

/** Salvage per second from cutting into a fresh compartment at the current force. */
export function cutPayRate(m: MissionState): number {
  const line = frontier(m.ground);
  if (line >= COMPARTMENTS.length || line < m.deepest) return 0;
  const def = COMPARTMENTS[line]!;
  const ratio = Math.min(4, frontierForce(m) / def.threat);
  return (ratio / 60) * def.value * STRIP_PER_LOAD * SALVAGE_SECONDS * multipliers(m).strip;
}

export const incomeRate = (m: MissionState): number => stripRate(m) + cutPayRate(m);

/** What one more cutter adds to salvage pay, or one more shoring to the bracing open compartments still need. */
export function salvageGain(m: MissionState, purchase: { cutter: string } | { shoring: string }): { income: number; hold: number } {
  const after =
    'cutter' in purchase
      ? { ...m, cutters: { ...m.cutters, [purchase.cutter]: (m.cutters[purchase.cutter] ?? 0) + 1 } }
      : { ...m, shoring: { ...m.shoring, [purchase.shoring]: (m.shoring[purchase.shoring] ?? 0) + 1 } };
  const need = holdNeeded(m);
  return {
    income: Math.max(0, incomeRate(after) - incomeRate(m)),
    hold: Math.max(0, Math.min(shoringHold(after), need) - Math.min(shoringHold(m), need)),
  };
}

const earn = <M extends MissionState>(m: M, amount: number): M =>
  amount <= 0 ? m : { ...m, credits: m.credits + amount, lifetimeCredits: m.lifetimeCredits + amount, recovered: m.recovered + amount };

/** Cut into the frontier with this much force for this long, paying for fresh progress and logging a compartment opened. */
function cutInto<M extends MissionState>(m: M, pushing: number, seconds: number): M {
  if (!isCutting(m) || pushing <= 0) return m;
  const line = frontier(m.ground);
  const def = COMPARTMENTS[line]!;
  const ground = assault(m.ground, COMPARTMENTS, pushing, seconds).states;
  let next = { ...m, ground };
  if (line < m.deepest) return next;
  const control = ground[line]!.control;
  next = earn(next, Math.max(0, control - m.paidTo) * def.value * STRIP_PER_LOAD * SALVAGE_SECONDS * multipliers(m).strip);
  next = { ...next, paidTo: Math.max(m.paidTo, control) };
  if (isSecured(ground[line]!)) {
    next = { ...next, deepest: line + 1, paidTo: 0 };
    next = appendLog(next, 'corp', `COMPARTMENT OPENED: ${def.name}. SALVAGE CLAIM FILED.`);
  }
  return next;
}

function addStress<M extends MissionState>(m: M, notch: number, seconds: number): M {
  const rate = stressRate(m, notch);
  const stress = rate > 0 ? m.stress + rate * seconds : Math.max(0, m.stress - STRESS_BLEED * seconds);
  if (stress < 1) return { ...m, stress };
  const line = frontier(m.ground);
  const def = COMPARTMENTS[line];
  const ground = m.ground.map((s, i) => (i === line ? { ...s, control: 0 } : s));
  const next = { ...m, ground, stress: 0, sealedFor: SEAL_SECONDS, breaches: m.breaches + 1 };
  return appendLog(next, 'sys', `HULL BREACH: ${def?.name ?? 'FRONTIER'}. COMPARTMENT VENTED AND SEALED. CUTTING SUSPENDED ${SEAL_SECONDS} S.`);
}

/** WARDEN fires the cutting arm: a second of torch on the frontier at the dial's notch. */
export function cut<M extends MissionState>(m: M): M {
  if (!isCutting(m)) return m;
  const notch = notchFor(m, 1);
  return addStress(cutInto(m, cutPower(m) * torchFactor(notch), 1), notch, 1);
}

function logBuckled<M extends MissionState>(before: M, after: M): M {
  let m = after;
  for (let i = 0; i < COMPARTMENTS.length; i++) {
    if (isSecured(before.ground[i]!) && !isSecured(m.ground[i]!)) {
      m = appendLog(m, 'sys', `COMPARTMENT BUCKLED: ${COMPARTMENTS[i]!.name}. FRAMES FOLDED SHUT. SHORING SHORT.`);
    }
  }
  return m;
}

export function tickSalvage<M extends MissionState>(m: M, dt: number): M {
  const g = garrisons(m);
  const braced = { ...m, ground: m.ground.map((s, i) => ({ ...s, garrison: g[i]! })) };
  const cutting = isCutting(braced);
  const notch = notchFor(braced, dt);
  const pushing = (cutForce(braced) + autoCutRate(braced) * cutPower(braced)) * torchFactor(notch);
  let next = cutInto(braced, pushing, dt);
  next = cutting && pushing > 0 ? addStress(next, notch, dt) : { ...next, stress: Math.max(0, next.stress - STRESS_BLEED * dt) };
  if (!cutting) next = { ...next, sealedFor: Math.max(0, next.sealedFor - dt) };
  next = { ...next, ground: tickGround(next.ground, COMPARTMENTS, dt, horrorPressure(m)) };
  next = earn(next, stripRate(next) * dt);
  return logBuckled(m, next);
}

/** Salvage progress on the shared story scale (extraction's metres). */
export function progress(m: MissionState): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + m.recovered) ** PROGRESS_EXPONENT);
}

// ---------- requisitions ----------

export function isSalvageUpgradeUnlocked(m: MissionState, id: string): boolean {
  const u = SALVAGE_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.recovered !== undefined && m.recovered < u.unlock.recovered) return false;
  if (u.unlock.cutter && (m.cutters[u.unlock.cutter.id] ?? 0) < u.unlock.cutter.count) return false;
  return true;
}

export function availableSalvageUpgrades(m: MissionState) {
  return SALVAGE_UPGRADES.filter((u) => !m.upgrades.includes(u.id) && isSalvageUpgradeUnlocked(m, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buySalvageUpgrade<M extends MissionState>(m: M, id: string): M {
  const u = SALVAGE_UPGRADES.find((x) => x.id === id);
  if (!u || m.upgrades.includes(id) || !isSalvageUpgradeUnlocked(m, id) || m.credits < u.cost) return m;
  return { ...m, credits: m.credits - u.cost, upgrades: [...m.upgrades, id] };
}

export type { SectionState };
