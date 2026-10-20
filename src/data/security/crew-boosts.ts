import type { SecurityEffect } from './upgrades';

/** What each ship's officer does for a security contract while awake. */
export const SECURITY_CREW_BOOSTS: Readonly<Record<string, { effect: SecurityEffect; text: string }>> = {
  okonkwo: { effect: { kind: 'retainerMultiplier', value: 1.2 }, text: 'RETAINER x1.2' },
  sorensen: { effect: { kind: 'fabricatorMultiplier', value: 1.5 }, text: 'FABRICATOR OUTPUT x1.5' },
  lam: { effect: { kind: 'forceMultiplier', value: 1.15 }, text: 'ALL FORCE x1.15 (COLONY SURVEY MAPS)' },
  brandt: { effect: { kind: 'trooperMultiplier', trooper: 'gunship', value: 2 }, text: 'GUNSHIP FORCE x2' },
  kane: { effect: { kind: 'trooperMultiplier', trooper: 'smartgun', value: 2 }, text: 'SMARTGUN FORCE x2 (TRACKER CALIBRATION)' },
  'amari-reyes': { effect: { kind: 'supportMultiplier', value: 2 }, text: 'FIRE SUPPORT x2' },
};
