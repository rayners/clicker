import type { UpgradeEffect } from './upgrades';

/** What each crew member does for an extraction contract while awake. */
export const CREW_BOOSTS: Readonly<Record<string, { effect: UpgradeEffect; text: string }>> = {
  okonkwo: { effect: { kind: 'globalMultiplier', value: 1.2 }, text: 'ALL OUTPUT x1.2' },
  sorensen: { effect: { kind: 'refineryMultiplier', value: 1.5 }, text: 'REFINERY THROUGHPUT x1.5' },
  lam: { effect: { kind: 'globalMultiplier', value: 1.15 }, text: 'ALL OUTPUT x1.15' },
  brandt: { effect: { kind: 'generatorMultiplier', generator: 'massdriver', value: 2 }, text: 'MASS DRIVER OUTPUT x2' },
  kane: { effect: { kind: 'generatorMultiplier', generator: 'bore', value: 2 }, text: 'DEEP-CORE BORE OUTPUT x2' },
  'amari-reyes': { effect: { kind: 'clickMultiplier', value: 2 }, text: 'DRILL CYCLE YIELD x2' },
};
