import type { SectionDef } from '../shared/ground';

/** The coast the Breach comes ashore on, nearest first. Threat triples with each city; kaiju categories multiply it. */
const THREAT_GROWTH = 3;
const NAMES: { id: string; name: string }[] = [
  { id: 'harrow', name: 'HARROW POINT' },
  { id: 'saltmarsh', name: 'SALTMARSH' },
  { id: 'avery', name: 'PORT AVERY' },
  { id: 'kingsbay', name: 'KINGSBAY' },
  { id: 'meridian', name: 'MERIDIAN CITY' },
  { id: 'avalon', name: 'NEW AVALON' },
];

export const CITIES: readonly SectionDef[] = NAMES.map((n, i) => ({ ...n, threat: 1_000 * THREAT_GROWTH ** i, reclaim: 0.005 }));

/** Defence levy per second per point of a held city's threat. */
export const LEVY_PER_THREAT = 2;

export const WALL_HOLD = 400;
export const WALL_BASE_COST = 5_000_000;
export const WALL_COST_GROWTH = 1.3;

export const BULWARK_HOLD = 20_000;
export const BULWARK_BASE_COST = 200_000_000;
export const BULWARK_COST_GROWTH = 1.5;
/** A Bulwark needs two pilots linked to fight at all. */
export const PILOTS_PER_BULWARK = 2;
export const PILOT_BASE_COST = 20_000_000;
export const PILOT_COST_GROWTH = 1.35;

/** Seconds between landfalls once the Breach is open: each one is a category bigger. */
export const LANDFALL_SECONDS = 15 * 60;
export const MAX_CATEGORY = 5;

export const KAIJU_NAMES = ['TIDEBREAKER', 'HOLLOWJAW', 'MOTHERSHELL', 'SALT KING', 'THE LAST ONE'];
