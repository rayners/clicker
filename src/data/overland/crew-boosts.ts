import type { HaulageEffect } from '../haulage/upgrades';

/** What each ship's officer does for the overland haul while awake (they ride in the rig's sleeper cab). */
export const OVERLAND_CREW_BOOSTS: Readonly<Record<string, { effect: HaulageEffect; text: string }>> = {
  okonkwo: { effect: { kind: 'payMultiplier', value: 1.2 }, text: 'FREIGHT PAY x1.2' },
  sorensen: { effect: { kind: 'thrustMultiplier', value: 1.5 }, text: 'ALL PULL x1.5' },
  lam: { effect: { kind: 'windowMultiplier', value: 1.25 }, text: 'DELIVERY WINDOWS x1.25 (ROUTE READING)' },
  brandt: { effect: { kind: 'engineMultiplier', engine: 'turbo', value: 2 }, text: 'TURBO-DIESEL PULL x2' },
  kane: { effect: { kind: 'safeBurn', value: 1 }, text: 'SAFE THROTTLE +1 (LOAD SECURING)' },
  'amari-reyes': { effect: { kind: 'thrusterMultiplier', value: 2 }, text: 'ENGINE BLIPS x2' },
};
