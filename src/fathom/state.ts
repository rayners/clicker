import { appendLog, type LogEntry } from '../shared/log';
import type { SectionState } from '../shared/ground';
import { ATTRACTIONS, GUARDS } from '../fathom-data/shallows';
import { TRAWLERS } from '../fathom-data/shelf';
import { SPECIMENS } from '../fathom-data/open-water';

/** sonar: the outfit's own instruments; town: Harrow Point and its council; crew: your people; attack: what the water takes. */
export type EntryKind = 'sonar' | 'town' | 'crew' | 'attack';

/** One season of Harrow Point Marine Safety. Pure JSON: no DOM, clock or Math.random(). */
export interface Outfit {
  seed: number;
  rng: number;
  elapsed: number;
  cash: number;
  lifetimeCash: number;
  /** The Shallows: what brings the tourists, and who keeps them safe. */
  attractions: Record<string, number>;
  guards: Record<string, number>;
  /** Tenths of the beach open to swimmers. */
  open: number;
  /** The Shelf: boats, the sonar buoys that keep them safe, and how far out they fish (tenths). */
  trawlers: Record<string, number>;
  buoys: number;
  range: number;
  /** Fractional boats lost carried between ticks. */
  losses: number;
  /** Open Water: penned specimens, their pens, how hard the lab enhances them (tenths), and what has got out. */
  specimens: Record<string, number>;
  pens: number;
  enhance: number;
  loose: number;
  /** Fractional escapes, and escapees drifting away, carried between ticks. */
  escaping: number;
  drifting: number;
  /** The Trench: station modules, the crews that repair the hull, how deep the station sits (notch 1-10), and the hull. */
  modules: number;
  crews: number;
  stationDepth: number;
  /** 0..1. At 0 a module floods. */
  integrity: number;
  /** The Breach: the coast's cities as held ground (empty until it opens), what defends them, and the kaiju so far. */
  cities: SectionState[];
  walls: number;
  bulwarks: number;
  pilots: number;
  /** The category of the kaiju now coming ashore, and seconds until the next, bigger one. */
  category: number;
  landfallIn: number;
  /** 0..1: how far the town still trusts the beaches. Scales tourist money. */
  reputation: number;
  bodyCount: number;
  /** Fractional attacks carried between ticks. */
  attacks: number;
  upgrades: string[];
  act: number;
  beats: Record<string, number>;
  lastBeatAt: number | null;
  flags: string[];
  log: LogEntry<EntryKind>[];
  nextLogId: number;
}

export const DEFAULT_OPEN = 5;
export const DEFAULT_RANGE = 2;
export const DEFAULT_ENHANCE = 0;
export const DEFAULT_STATION_DEPTH = 1;

const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));

export function createOutfit(seed: number): Outfit {
  const blank: Outfit = {
    seed,
    rng: seed,
    elapsed: 0,
    cash: 0,
    lifetimeCash: 0,
    attractions: zeroes(ATTRACTIONS),
    guards: zeroes(GUARDS),
    open: DEFAULT_OPEN,
    trawlers: zeroes(TRAWLERS),
    buoys: 0,
    range: DEFAULT_RANGE,
    losses: 0,
    specimens: zeroes(SPECIMENS),
    pens: 0,
    enhance: DEFAULT_ENHANCE,
    loose: 0,
    escaping: 0,
    drifting: 0,
    modules: 0,
    crews: 0,
    stationDepth: DEFAULT_STATION_DEPTH,
    integrity: 1,
    cities: [],
    walls: 0,
    bulwarks: 0,
    pilots: 0,
    category: 0,
    landfallIn: 0,
    reputation: 1,
    bodyCount: 0,
    attacks: 0,
    upgrades: [],
    act: 1,
    beats: {},
    lastBeatAt: null,
    flags: [],
    log: [],
    nextLogId: 1,
  };
  return [
    'SONAR ONLINE. DEPTH UNDER THE KEEL: 4 M.',
    'HARROW POINT MARINE SAFETY. ONE TOWER, TWO BOATS, ONE NET, AND A TOWN THAT LIVES ON THE SUMMER.',
    'THE SEASON OPENS ON SATURDAY. THE COUNCIL WOULD LIKE THE BEACHES OPEN FOR IT.',
  ].reduce((o, line, i) => appendLog<EntryKind, Outfit>(o, i === 2 ? 'town' : 'sonar', line), blank);
}
