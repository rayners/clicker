import type { SectionDef } from '../engine/ground';

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

export const CITIES: readonly SectionDef[] = NAMES.map((n, i) => ({ ...n, threat: 500 * THREAT_GROWTH ** i, reclaim: 0.005 }));

/** Defence levy per second per point of a held city's threat. */
export const LEVY_PER_THREAT = 2;

export const WALL_HOLD = 2_000;
export const WALL_BASE_COST = 2_000_000;
export const WALL_COST_GROWTH = 1.25;

export const BULWARK_HOLD = 50_000;
export const BULWARK_BASE_COST = 100_000_000;
export const BULWARK_COST_GROWTH = 1.4;
/** A Bulwark needs two pilots linked to fight at all. */
export const PILOTS_PER_BULWARK = 2;
export const PILOT_BASE_COST = 10_000_000;
export const PILOT_COST_GROWTH = 1.35;
/** A pair's link falls this much per unit of temperament between them, but never below the floor. */
export const LINK_SPREAD = 2;
export const MIN_LINK = 0.3;
/** Fatigue gained per second with every pair crewed, and shed per second with every pair resting. */
export const FATIGUE_RATE = 1 / 1800;
export const REST_RATE = 1 / 600;
/** Share of a Bulwark's hold lost to a wholly exhausted crew. */
export const FATIGUE_PENALTY = 0.5;

/** Seconds between landfalls once the Breach is open: each one is a category bigger. */
export const LANDFALL_SECONDS = 15 * 60;
export const MAX_CATEGORY = 5;

export const KAIJU_NAMES = ['TIDEBREAKER', 'HOLLOWJAW', 'MOTHERSHELL', 'SALT KING', 'THE LAST ONE'];
