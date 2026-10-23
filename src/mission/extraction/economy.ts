import { GENERATORS, type GeneratorDef } from '../../data/extraction/generators';
import { memoByState } from '../../engine/memo';
import { UPGRADES, type UpgradeEffect } from '../../data/extraction/upgrades';
import { CREW_BOOSTS } from '../../data/extraction/crew-boosts';
import { isCrewEffective } from '../crew';
import { horrorProductionMultiplier } from '../horrors';
import type { ExtractionMission as MissionState } from '../state';

export const COST_GROWTH = 1.15;
export const ORE_PRICE = 1;
const BASE_CLICK = 1;
const REFINERY_BASE_CAPACITY = 5;
const REFINERY_CAPACITY_GROWTH = 2;
const REFINERY_BASE_COST = 50;
const REFINERY_COST_GROWTH = 2.2;

export function generatorCost(def: GeneratorDef, owned: number): number {
  return Math.ceil(def.baseCost * COST_GROWTH ** owned);
}

interface Multipliers {
  click: number;
  clickRateShare: number;
  autoDrill: number;
  global: number;
  refinery: number;
  generator: Record<string, number>;
}

function applyEffect(result: Multipliers, e: UpgradeEffect): void {
  switch (e.kind) {
    case 'clickMultiplier':
      result.click *= e.value;
      break;
    case 'clickRateShare':
      result.clickRateShare += e.value;
      break;
    case 'autoDrill':
      result.autoDrill += e.value;
      break;
    case 'globalMultiplier':
      result.global *= e.value;
      break;
    case 'refineryMultiplier':
      result.refinery *= e.value;
      break;
    case 'generatorMultiplier':
      result.generator[e.generator] = (result.generator[e.generator] ?? 1) * e.value;
      break;
  }
}

// Asked many times a tick (once per processor, generator, car...), so worked out once per mission state.
const multipliers = memoByState((m: MissionState): Multipliers => {
  const global = horrorProductionMultiplier(m) * m.config.productionMultiplier;
  const result: Multipliers = { click: 1, clickRateShare: 0, autoDrill: 0, global, refinery: 1, generator: {} };
  for (const u of UPGRADES) if (m.upgrades.includes(u.id)) applyEffect(result, u.effect);
  for (const [id, boost] of Object.entries(CREW_BOOSTS)) if (isCrewEffective(m, id)) applyEffect(result, boost.effect);
  return result;
});

export function clickPower(m: MissionState): number {
  const mult = multipliers(m);
  return BASE_CLICK * mult.click + generatorOutput(m) * mult.clickRateShare;
}

export function autoDrillRate(m: MissionState): number {
  return multipliers(m).autoDrill;
}

export function drill<M extends MissionState>(m: M): M {
  const power = clickPower(m);
  return { ...m, ore: m.ore + power, lifetimeOre: m.lifetimeOre + power };
}

export function buyGenerator<M extends MissionState>(m: M, id: string): M {
  const def = GENERATORS.find((g) => g.id === id);
  if (!def) return m;
  const owned = m.generators[id] ?? 0;
  const cost = generatorCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, generators: { ...m.generators, [id]: owned + 1 } };
}

export function generatorRate(m: MissionState, def: GeneratorDef): number {
  const mult = multipliers(m);
  return def.baseRate * (mult.generator[def.id] ?? 1) * mult.global;
}

function generatorOutput(m: MissionState): number {
  return GENERATORS.reduce((sum, g) => sum + (m.generators[g.id] ?? 0) * generatorRate(m, g), 0);
}

/** Ore per second from WARDEN's own drill cycles: drill-head upgrades apply, the telemetry share does not. */
export function autoDrillOutput(m: MissionState): number {
  const mult = multipliers(m);
  return mult.autoDrill * BASE_CLICK * mult.click;
}

/** All automated extraction: generators plus WARDEN's own drill cycles. */
export function oreRate(m: MissionState): number {
  return generatorOutput(m) + autoDrillOutput(m);
}

/** Credits per second: whatever the refinery can process, from the hopper plus fresh extraction. */
export function creditRate(m: MissionState): number {
  return Math.min(m.ore + oreRate(m), refineryCapacity(m)) * ORE_PRICE;
}

/** Credits per second once the hopper has drained: the slower of extraction and the refinery. */
const steadyIncome = (m: MissionState): number => Math.min(oreRate(m), refineryCapacity(m)) * ORE_PRICE;

/** How much steady income one more generator, or one more refinery level, would add. Zero when the other end limits. */
export function incomeGain(m: MissionState, purchase: { generator: string } | { refinery: true }): number {
  const after =
    'generator' in purchase
      ? { ...m, generators: { ...m.generators, [purchase.generator]: (m.generators[purchase.generator] ?? 0) + 1 } }
      : { ...m, refineryLevel: m.refineryLevel + 1 };
  return Math.max(0, steadyIncome(after) - steadyIncome(m));
}

export function bottleneck(m: MissionState): 'extraction' | 'refinery' {
  return oreRate(m) >= refineryCapacity(m) ? 'refinery' : 'extraction';
}

export function refineryCapacity(m: MissionState): number {
  return REFINERY_BASE_CAPACITY * REFINERY_CAPACITY_GROWTH ** m.refineryLevel * multipliers(m).refinery;
}

export function refineryCost(m: MissionState): number {
  return REFINERY_BASE_COST * REFINERY_COST_GROWTH ** m.refineryLevel;
}

export function buyRefinery<M extends MissionState>(m: M): M {
  const cost = refineryCost(m);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, refineryLevel: m.refineryLevel + 1 };
}

/** The first tier is always visible; each further tier appears once the one before it is owned. */
export function isGeneratorRevealed(m: MissionState, index: number): boolean {
  return index === 0 || GENERATORS.slice(index - 1).some((g) => (m.generators[g.id] ?? 0) > 0);
}

/** Mines into the hopper, then refines what the refinery can take into credits. */
export function tickExtraction<M extends MissionState>(m: M, dt: number): M {
  const mined = oreRate(m) * dt;
  const hopper = m.ore + mined;
  const refined = Math.min(hopper, refineryCapacity(m) * dt);
  return {
    ...m,
    ore: hopper - refined,
    lifetimeOre: m.lifetimeOre + mined,
    credits: m.credits + refined * ORE_PRICE,
    lifetimeCredits: m.lifetimeCredits + refined * ORE_PRICE,
  };
}
