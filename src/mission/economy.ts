import { GENERATORS, type GeneratorDef } from '../data/generators';
import type { MissionState } from './state';

export const COST_GROWTH = 1.15;
export const ORE_PRICE = 1;
const CLICK_POWER = 1;
const REFINERY_BASE_CAPACITY = 5;
const REFINERY_CAPACITY_GROWTH = 2;
const REFINERY_BASE_COST = 50;
const REFINERY_COST_GROWTH = 3;

export function generatorCost(def: GeneratorDef, owned: number): number {
  return Math.ceil(def.baseCost * COST_GROWTH ** owned);
}

export function drill(m: MissionState): MissionState {
  return { ...m, ore: m.ore + CLICK_POWER, lifetimeOre: m.lifetimeOre + CLICK_POWER };
}

export function buyGenerator(m: MissionState, id: string): MissionState {
  const def = GENERATORS.find((g) => g.id === id);
  if (!def) return m;
  const owned = m.generators[id] ?? 0;
  const cost = generatorCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, generators: { ...m.generators, [id]: owned + 1 } };
}

export function oreRate(m: MissionState): number {
  return GENERATORS.reduce((sum, g) => sum + (m.generators[g.id] ?? 0) * g.baseRate, 0);
}

export function refineryCapacity(m: MissionState): number {
  return REFINERY_BASE_CAPACITY * REFINERY_CAPACITY_GROWTH ** m.refineryLevel;
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
