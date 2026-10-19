import type { Line } from '../../data/terraform/systems';

/** Terraforming scenario state: an atmospheric processing station making a cold rock habitable. */
export interface TerraformFields {
  scenario: 'terraform';
  reactors: Record<string, number>;
  processors: Record<string, number>;
  /** Manual power split in tenths (10 = 100%). Ignored once WARDEN auto-balances. */
  allocation: Record<Line, number>;
  /** Cumulative output per line, shown as pressure, temperature and hydrosphere. */
  lineTotals: Record<Line, number>;
  /** Cumulative on-spec processing: drives story progress, spec revisions and colonist waves. */
  processed: number;
  /** Cumulative raw processing, on spec or not: unlocks upgrades. */
  lifetimeUnits: number;
}
