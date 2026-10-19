import { GENERATORS, type GeneratorDef } from '../data/generators';
import { UPGRADES, type UpgradeEffect } from '../data/upgrades';
import { CREW } from '../data/crew';
import { isCrewEffective } from './crew';
import { fundingMultiplier } from './containment';
import type { MissionState } from './state';

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

function multipliers(m: MissionState): Multipliers {
  const result: Multipliers = { click: 1, clickRateShare: 0, global: fundingMultiplier(m), refinery: 1, generator: {} };
  for (const u of UPGRADES) if (m.upgrades.includes(u.id)) applyEffect(result, u.effect);
  for (const c of CREW) {
    if (c.boost.kind !== 'fatigueMultiplier' && isCrewEffective(m, c.id)) applyEffect(result, c.boost);
  }
  return result;
}

export function clickPower(m: MissionState): number {
  const mult = multipliers(m);
  return BASE_CLICK * mult.click + oreRate(m) * mult.clickRateShare;
}

export function drill(m: MissionState): MissionState {
  const power = clickPower(m);
  return { ...m, ore: m.ore + power, lifetimeOre: m.lifetimeOre + power };
}

export function buyGenerator(m: MissionState, id: string): MissionState {
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

export function oreRate(m: MissionState): number {
  return GENERATORS.reduce((sum, g) => sum + (m.generators[g.id] ?? 0) * generatorRate(m, g), 0);
}

export function refineryCapacity(m: MissionState): number {
  return REFINERY_BASE_CAPACITY * REFINERY_CAPACITY_GROWTH ** m.refineryLevel * multipliers(m).refinery;
}

export function refineryCost(m: MissionState): number {
  return REFINERY_BASE_COST * REFINERY_COST_GROWTH ** m.refineryLevel;
}

export function buyRefinery(m: MissionState): MissionState {
  const cost = refineryCost(m);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, refineryLevel: m.refineryLevel + 1 };
}

/** The first tier is always visible; each further tier appears once the one before it is owned. */
export function isGeneratorRevealed(m: MissionState, index: number): boolean {
  return index === 0 || GENERATORS.slice(index - 1).some((g) => (m.generators[g.id] ?? 0) > 0);
}
