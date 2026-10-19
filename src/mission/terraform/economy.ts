import { COLONIST_WAVES, LINES, PROCESSORS, REACTORS, SPEC_REVISIONS, type Line, type ProcessorDef, type ReactorDef } from '../../data/terraform/systems';
import { TERRAFORM_UPGRADES, type TerraformEffect } from '../../data/terraform/upgrades';
import { TERRAFORM_CREW_BOOSTS } from '../../data/terraform/crew-boosts';
import { isCrewEffective } from '../crew';
import { horrorProductionMultiplier } from '../horrors';
import type { TerraformMission as MissionState } from '../state';

export const COST_GROWTH = 1.15;
/** Power is the brake (as the refinery is for extraction): reactors get dearer much faster than processors. */
export const REACTOR_COST_GROWTH = 1.2;
/** Megawatts the station provides before any reactor is built. */
export const BASE_POWER = 1;
const CREDITS_PER_UNIT = 1;
const BASE_SURGE = 1;
const ALLOCATION_STEPS = 10;
const WAVE_BONUS = 0.25;
// Same curve as extraction's shaft depth, so the shared story scale lines up (tuned by the pacing bot).
const PROGRESS_SCALE = 0.0432;
const PROGRESS_EXPONENT = 5.48;

type PerLine = Record<Line, number>;
const perLine = (f: (line: Line) => number): PerLine =>
  Object.fromEntries(LINES.map((l) => [l.id, f(l.id)])) as PerLine;
const total = (r: PerLine) => LINES.reduce((s, l) => s + r[l.id], 0);

interface Multipliers {
  surge: number;
  autoSurge: number;
  reactor: number;
  global: number;
  line: PerLine;
  processor: Record<string, number>;
  autoBalance: boolean;
}

function applyEffect(r: Multipliers, e: TerraformEffect): void {
  switch (e.kind) {
    case 'surgeMultiplier':
      r.surge *= e.value;
      break;
    case 'autoSurge':
      r.autoSurge += e.value;
      break;
    case 'reactorMultiplier':
      r.reactor *= e.value;
      break;
    case 'lineMultiplier':
      r.line[e.line] *= e.value;
      break;
    case 'processorMultiplier':
      r.processor[e.processor] = (r.processor[e.processor] ?? 1) * e.value;
      break;
    case 'globalMultiplier':
      r.global *= e.value;
      break;
    case 'autoBalance':
      r.autoBalance = true;
      break;
  }
}

function multipliers(m: MissionState): Multipliers {
  const r: Multipliers = {
    surge: 1,
    autoSurge: 0,
    reactor: 1,
    global: horrorProductionMultiplier(m) * m.config.productionMultiplier,
    line: perLine(() => 1),
    processor: {},
    autoBalance: false,
  };
  for (const u of TERRAFORM_UPGRADES) if (m.upgrades.includes(u.id)) applyEffect(r, u.effect);
  for (const [id, boost] of Object.entries(TERRAFORM_CREW_BOOSTS)) if (isCrewEffective(m, id)) applyEffect(r, boost.effect);
  return r;
}

export function reactorCost(def: ReactorDef, owned: number): number {
  return Math.ceil(def.baseCost * REACTOR_COST_GROWTH ** owned);
}

export function processorCost(def: ProcessorDef, owned: number): number {
  return Math.ceil(def.baseCost * COST_GROWTH ** owned);
}

export function buyReactor<M extends MissionState>(m: M, id: string): M {
  const def = REACTORS.find((r) => r.id === id);
  if (!def) return m;
  const owned = m.reactors[id] ?? 0;
  const cost = reactorCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, reactors: { ...m.reactors, [id]: owned + 1 } };
}

export function buyProcessor<M extends MissionState>(m: M, id: string): M {
  const def = PROCESSORS.find((p) => p.id === id);
  if (!def) return m;
  const owned = m.processors[id] ?? 0;
  const cost = processorCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, processors: { ...m.processors, [id]: owned + 1 } };
}

/** The first reactor is always visible; each further one once the one before it is owned. */
export function isReactorRevealed(m: MissionState, index: number): boolean {
  return index === 0 || REACTORS.slice(index - 1).some((r) => (m.reactors[r.id] ?? 0) > 0);
}

export function isProcessorRevealed(m: MissionState, def: ProcessorDef): boolean {
  const line = PROCESSORS.filter((p) => p.line === def.line);
  const index = line.indexOf(def);
  return index <= 0 || line.slice(index - 1).some((p) => (m.processors[p.id] ?? 0) > 0);
}

export function power(m: MissionState): number {
  const mult = multipliers(m).reactor;
  return BASE_POWER + REACTORS.reduce((s, r) => s + (m.reactors[r.id] ?? 0) * r.mw * mult, 0);
}

export function processorRate(m: MissionState, def: ProcessorDef): number {
  const mult = multipliers(m);
  return def.rate * (mult.processor[def.id] ?? 1) * mult.line[def.line] * mult.global;
}

/** Units per second each line could process with unlimited power. */
export function capacity(m: MissionState): PerLine {
  return perLine((line) =>
    PROCESSORS.filter((p) => p.line === line).reduce((s, p) => s + (m.processors[p.id] ?? 0) * processorRate(m, p), 0),
  );
}

function revisionIndex(m: MissionState): number {
  const p = progress(m);
  let index = 0;
  SPEC_REVISIONS.forEach((rev, i) => {
    if (p >= rev.at) index = i;
  });
  return index;
}

/** The current spec revision number, 1-based. */
export function specRevision(m: MissionState): number {
  return revisionIndex(m) + 1;
}

/** Target share of throughput per line under the current corporate spec. */
export function spec(m: MissionState): PerLine {
  return SPEC_REVISIONS[revisionIndex(m)]!.targets;
}

export function isAutoBalanced(m: MissionState): boolean {
  return multipliers(m).autoBalance;
}

/**
 * Megawatts going to each line. Manual: the player's tenths. Auto-balance: run every line on spec as far
 * as the weakest line allows, then spill spare power into lines with spare processors (still worth w per unit).
 */
export function linePower(m: MissionState): PerLine {
  const p = power(m);
  if (!isAutoBalanced(m)) return perLine((line) => (p * m.allocation[line]) / ALLOCATION_STEPS);
  const cap = capacity(m);
  const w = spec(m);
  const balanced = Math.min(p, ...LINES.map((l) => (w[l.id] > 0 ? cap[l.id] / w[l.id] : Infinity)));
  const given = perLine((line) => balanced * w[line]);
  let spare = p - total(given);
  // Spill in order of spec weight, since each spilled unit is worth that line's weight.
  for (const l of [...LINES].sort((a, b) => w[b.id] - w[a.id])) {
    const room = cap[l.id] - given[l.id];
    const extra = Math.max(0, Math.min(room, spare));
    given[l.id] += extra;
    spare -= extra;
  }
  return given;
}

export function throughput(m: MissionState): PerLine {
  const cap = capacity(m);
  const pw = linePower(m);
  return perLine((line) => Math.min(cap[line], pw[line]));
}

export type LineState = 'power-limited' | 'processor-limited' | 'idle';

export function lineStates(m: MissionState): Record<Line, LineState> {
  const cap = capacity(m);
  const pw = linePower(m);
  return Object.fromEntries(
    LINES.map((l) => [l.id, cap[l.id] === 0 ? 'idle' : pw[l.id] < cap[l.id] ? 'power-limited' : 'processor-limited']),
  ) as Record<Line, LineState>;
}

/** Overlap between the throughput mix and the spec, 0..1. Nothing running counts as on spec. */
export function specMatch(m: MissionState): number {
  const t = throughput(m);
  const sum = total(t);
  if (sum === 0) return 1;
  const w = spec(m);
  return LINES.reduce((s, l) => s + Math.min(t[l.id] / sum, w[l.id]), 0);
}

export function colonistWaves(m: MissionState): number {
  const p = progress(m);
  return COLONIST_WAVES.filter((at) => p >= at).length;
}

function colonistMultiplier(m: MissionState): number {
  return 1 + WAVE_BONUS * colonistWaves(m);
}

/** On-spec units per second from the processing lines. */
function balancedRate(m: MissionState): number {
  return total(throughput(m)) * specMatch(m);
}

export function incomeRate(m: MissionState): number {
  return (balancedRate(m) + autoSurgeRate(m) * surgePower(m)) * CREDITS_PER_UNIT * colonistMultiplier(m);
}

export function surgePower(m: MissionState): number {
  return BASE_SURGE * multipliers(m).surge;
}

export function autoSurgeRate(m: MissionState): number {
  return multipliers(m).autoSurge;
}

/** Processes perfectly on-spec units, earning as the lines do. */
function process<M extends MissionState>(m: M, units: number, dt: number): M {
  const w = spec(m);
  const t = throughput(m);
  const lineRate = balancedRate(m);
  const credits = (lineRate * dt + units) * CREDITS_PER_UNIT * colonistMultiplier(m);
  return {
    ...m,
    credits: m.credits + credits,
    lifetimeCredits: m.lifetimeCredits + credits,
    processed: m.processed + lineRate * dt + units,
    lifetimeUnits: m.lifetimeUnits + total(t) * dt + units,
    lineTotals: perLine((line) => m.lineTotals[line] + t[line] * dt + units * w[line]),
  };
}

export function surge<M extends MissionState>(m: M): M {
  return process(m, surgePower(m), 0);
}

export function tickTerraform<M extends MissionState>(m: M, dt: number): M {
  return process(m, autoSurgeRate(m) * surgePower(m) * dt, dt);
}

/**
 * Shift one 10% step of power into (+1) or out of (-1) a line. A step up comes from idle power if there is
 * any, otherwise from the largest other line, so one tap is always enough on a phone.
 */
export function allocate<M extends MissionState>(m: M, line: Line, step: 1 | -1): M {
  const a = { ...m.allocation };
  if (step < 0) {
    if (a[line] === 0) return m;
    a[line] -= 1;
    return { ...m, allocation: a };
  }
  if (a[line] >= ALLOCATION_STEPS) return m;
  if (total(a) >= ALLOCATION_STEPS) {
    const donor = LINES.filter((l) => l.id !== line).sort((x, y) => a[y.id] - a[x.id])[0]!;
    if (a[donor.id] === 0) return m;
    a[donor.id] -= 1;
  }
  a[line] += 1;
  return { ...m, allocation: a };
}

/** Terraforming progress on the shared story scale (extraction's metres). */
export function progress(m: MissionState): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + m.processed) ** PROGRESS_EXPONENT);
}

export function isTerraformUpgradeUnlocked(m: MissionState, id: string): boolean {
  const u = TERRAFORM_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.lifetimeUnits !== undefined && m.lifetimeUnits < u.unlock.lifetimeUnits) return false;
  if (u.unlock.processor && (m.processors[u.unlock.processor.id] ?? 0) < u.unlock.processor.count) return false;
  return true;
}

export function availableTerraformUpgrades(m: MissionState) {
  return TERRAFORM_UPGRADES.filter((u) => !m.upgrades.includes(u.id) && isTerraformUpgradeUnlocked(m, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buyTerraformUpgrade<M extends MissionState>(m: M, id: string): M {
  const u = TERRAFORM_UPGRADES.find((x) => x.id === id);
  if (!u || m.upgrades.includes(id) || !isTerraformUpgradeUnlocked(m, id) || m.credits < u.cost) return m;
  return { ...m, credits: m.credits - u.cost, upgrades: [...m.upgrades, id] };
}

/** Cumulative line output at which a reading reaches its final value. */
const READING_FULL = 1e10;
const READING_RANGES: Record<Line, [number, number]> = {
  atmosphere: [0, 101.3], // surface pressure, kPa
  heat: [61, 304], // mean temperature, K
  water: [0, 96], // hydrosphere / humidity, %
};

/** Diegetic readings for each line: pressure (kPa), mean temperature (K), hydrosphere (%). */
export function planetReadings(m: MissionState): PerLine {
  return perLine((line) => {
    const [from, to] = READING_RANGES[line];
    const f = Math.min(1, Math.log10(1 + m.lineTotals[line]) / Math.log10(READING_FULL));
    return from + (to - from) * f;
  });
}
