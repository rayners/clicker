import type { HaulageEffect } from './upgrades';

/** What each ship's officer does for a haulage contract while awake. */
export const HAULAGE_CREW_BOOSTS: Readonly<Record<string, { effect: HaulageEffect; text: string }>> = {
  okonkwo: { effect: { kind: 'payMultiplier', value: 1.2 }, text: 'DELIVERY PAY x1.2' },
  sorensen: { effect: { kind: 'thrustMultiplier', value: 1.5 }, text: 'ALL THRUST x1.5' },
  lam: { effect: { kind: 'windowMultiplier', value: 1.25 }, text: 'DELIVERY WINDOWS x1.25 (ROUTE PLOTTING)' },
  brandt: { effect: { kind: 'engineMultiplier', engine: 'torch', value: 2 }, text: 'FUSION TORCH THRUST x2' },
  kane: { effect: { kind: 'safeBurn', value: 1 }, text: 'SAFE BURN +1 (LOAD BALANCING)' },
  'amari-reyes': { effect: { kind: 'thrusterMultiplier', value: 2 }, text: 'MANUAL THRUSTERS x2' },
};
