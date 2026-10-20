import { CLASS_IDS, type ClassId } from '../forest-data/classes';
import { REGIONS } from '../forest-data/regions';
import { BUILDINGS, type BuildingId } from '../forest-data/buildings';
import { appendLog, type LogEntry } from '../shared/log';

/** Ledger entry voices: the clerk's own hand, the town and its orders, the hands themselves, and omens. */
export type EntryKind = 'ledger' | 'town' | 'hand' | 'omen';

export type Composition = Record<ClassId, number>;

export interface Party {
  id: number;
  region: string;
  comp: Composition;
  departedAt: number;
  returnsAt: number;
}

/** One charter of the Company of the Ashen Key. Pure JSON; no DOM, clock or Math.random(). */
export interface Company {
  seed: number;
  rng: number;
  elapsed: number;
  silver: number;
  lifetimeSilver: number;
  /** Relics in the vault, waiting for appraisal. */
  relics: number;
  lifetimeRelics: number;
  hired: Composition;
  /** Hands lost to the wood over the charter. */
  lifetimeDead: number;
  wounded: Composition;
  /** Fractional healing carried between ticks, per class. */
  mending: Composition;
  /** Fractional desertion carried between ticks. */
  arrears: number;
  /** Standing order per region: who goes when a party is sent there. */
  orders: Record<string, Composition>;
  parties: Party[];
  nextPartyId: number;
  /** Regions whose standing orders the Quartermaster sends without being told. */
  standing: string[];
  /** Leagues of the wood charted by returning parties: how deep the company dares go. */
  charted: number;
  /** Company-wide corruption, 0-100. */
  blight: number;
  buildings: Record<BuildingId, number>;
  upgrades: string[];
  act: number;
  beats: Record<string, number>;
  lastBeatAt: number | null;
  flags: string[];
  log: LogEntry<EntryKind>[];
  nextLogId: number;
}

export const STARTING_SILVER = 30;

export const emptyComposition = (): Composition => Object.fromEntries(CLASS_IDS.map((id) => [id, 0])) as Composition;

const DEFAULT_ORDER: Composition = { blade: 2, mender: 0, scout: 1, mystic: 0 };

export function createCompany(seed: number): Company {
  const blank: Company = {
    seed,
    rng: seed,
    elapsed: 0,
    silver: STARTING_SILVER,
    lifetimeSilver: 0,
    relics: 0,
    lifetimeRelics: 0,
    hired: emptyComposition(),
    lifetimeDead: 0,
    wounded: emptyComposition(),
    mending: emptyComposition(),
    arrears: 0,
    orders: Object.fromEntries(REGIONS.map((r) => [r.id, { ...DEFAULT_ORDER }])),
    parties: [],
    nextPartyId: 1,
    standing: [],
    charted: 0,
    blight: 0,
    buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>,
    upgrades: [],
    act: 1,
    beats: {},
    lastBeatAt: null,
    flags: [],
    log: [],
    nextLogId: 1,
  };
  return [
    'LEDGER OF THE COMPANY OF THE ASHEN KEY. KEPT AT THISTLEGATE BY THE FACTOR.',
    'ROYAL CHARTER RECEIVED: TO DELVE THE ELDERDARK AND RECOVER WHAT MAY BE SOLD.',
    `IN THE STRONGBOX: ${STARTING_SILVER} THALERS. ON THE ROSTER: NO ONE.`,
    'The Eaves begin a bowshot past the palisade. Hire hands before the money is gone.',
  ].reduce((c, line, i) => appendLog<EntryKind, Company>(c, i < 3 ? 'ledger' : 'town', line), blank);
}
