import type { OutbreakMission } from '../state';

/** The SICK BAY's levers (docs/OUTBREAK.md): what the player can buy against Strain KA-11, and what tempts them. */
const WELLNESS_BASE = 5e4;
const WELLNESS_GROWTH = 2.2;
const SCREENING_BASE = 2e6;
const SCREENING_GROWTH = 3;
const WARD_BASE = 1e6;
const WARD_GROWTH = 1.6;
const CULTURE_BASE = 1e6;
const CULTURE_GROWTH = 1.8;
const LOCKDOWN_BASE = 2e6;
const LOCKDOWN_GROWTH = 2;
export const OFFICER_COST = 5e6;
/** Seconds a sealed section keeps its workers from their shifts. */
export const LOCKDOWN_SECONDS = 120;
/** Share of the turned shut in behind a sealed section. */
const LOCKDOWN_HOLDS = 0.5;

const discovered = (m: OutbreakMission) => m.act >= 3 && m.flags.includes('outbreak');
const cost = (base: number, growth: number, owned: number) => Math.ceil(base * growth ** owned);

function buy<M extends OutbreakMission>(m: M, open: boolean, price: number, change: Partial<OutbreakMission>): M {
  if (!open || m.credits < price) return m;
  return { ...m, ...change, credits: m.credits - price };
}

export const wellnessCost = (m: OutbreakMission): number => cost(WELLNESS_BASE, WELLNESS_GROWTH, m.wellness);
export const screeningCost = (m: OutbreakMission): number => cost(SCREENING_BASE, SCREENING_GROWTH, m.screening);
export const wardCost = (m: OutbreakMission): number => cost(WARD_BASE, WARD_GROWTH, m.wards);
export const cultureCost = (m: OutbreakMission): number => cost(CULTURE_BASE, CULTURE_GROWTH, m.cultures);
export const lockdownCost = (m: OutbreakMission): number => cost(LOCKDOWN_BASE, LOCKDOWN_GROWTH, m.lockdowns);

export const buyWellness = <M extends OutbreakMission>(m: M): M => buy(m, m.act >= 2, wellnessCost(m), { wellness: m.wellness + 1 });
export const buyScreening = <M extends OutbreakMission>(m: M): M => buy(m, discovered(m), screeningCost(m), { screening: m.screening + 1 });
export const buyWard = <M extends OutbreakMission>(m: M): M => buy(m, discovered(m), wardCost(m), { wards: m.wards + 1 });
export const buyCulture = <M extends OutbreakMission>(m: M): M => buy(m, m.flags.includes('cultures'), cultureCost(m), { cultures: m.cultures + 1 });
export const hireOfficer = <M extends OutbreakMission>(m: M): M => (m.officer ? m : buy(m, discovered(m), OFFICER_COST, { officer: true }));

/** Seal a section: half the turned are shut in behind it, and nobody on that side works for a while. */
export function lockdown<M extends OutbreakMission>(m: M): M {
  return buy(m, m.act >= 4 && m.turned > 0, lockdownCost(m), {
    turned: m.turned * (1 - LOCKDOWN_HOLDS),
    lockdowns: m.lockdowns + 1,
    lockdownFor: LOCKDOWN_SECONDS,
  });
}
