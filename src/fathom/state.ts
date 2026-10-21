import { appendLog, type LogEntry } from '../shared/log';
import { ATTRACTIONS, GUARDS } from '../fathom-data/shallows';

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
