import type { SalvageEffect } from './upgrades';

/** What each ship's officer does for a salvage contract while awake. */
export const SALVAGE_CREW_BOOSTS: Readonly<Record<string, { effect: SalvageEffect; text: string }>> = {
  okonkwo: { effect: { kind: 'stripMultiplier', value: 1.2 }, text: 'SALVAGE x1.2' },
  sorensen: { effect: { kind: 'shoringMultiplier', value: 1.5 }, text: 'SHORING HOLDS x1.5' },
  lam: { effect: { kind: 'cutMultiplier', value: 1.15 }, text: 'ALL CUTTING x1.15 (DECK PLANS)' },
  brandt: { effect: { kind: 'cutterMultiplier', cutter: 'lance', value: 2 }, text: 'PLASMA LANCE x2' },
  kane: { effect: { kind: 'safeLine', value: 1 }, text: 'SAFE LINE +1 (HULL SENSOR CALIBRATION)' },
  'amari-reyes': { effect: { kind: 'cutPower', value: 2 }, text: 'MANUAL CUTS x2' },
};
