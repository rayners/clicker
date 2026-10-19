import type { TerraformEffect } from './upgrades';

/** What each crew member does for a terraforming contract while awake. */
export const TERRAFORM_CREW_BOOSTS: Readonly<Record<string, { effect: TerraformEffect; text: string }>> = {
  okonkwo: { effect: { kind: 'globalMultiplier', value: 1.2 }, text: 'ALL PROCESSING x1.2' },
  sorensen: { effect: { kind: 'reactorMultiplier', value: 1.5 }, text: 'REACTOR OUTPUT x1.5' },
  lam: { effect: { kind: 'lineMultiplier', line: 'atmosphere', value: 1.5 }, text: 'ATMOSPHERE LINE x1.5' },
  brandt: { effect: { kind: 'lineMultiplier', line: 'heat', value: 1.5 }, text: 'HEAT LINE x1.5' },
  kane: { effect: { kind: 'lineMultiplier', line: 'water', value: 2 }, text: 'WATER LINE x2' },
  'amari-reyes': { effect: { kind: 'surgeMultiplier', value: 2 }, text: 'PROCESSOR SURGE x2' },
};
