import { CLASS_IDS, type ClassId } from '../forest-data/classes';
import { REGIONS } from '../forest-data/regions';
import { BUILDINGS, type BuildingId } from '../forest-data/buildings';
import { appendLog, type LogEntry } from '../shared/log';
import { createGround, type SectionState } from '../shared/ground';
import { FLOORS, KEEP_NAME } from '../forest-data/keep';

/** Ledger entry voices: the clerk's own hand, the town and its orders, the hands themselves, and omens. */
export type EntryKind = 'ledger' | 'town' | 'hand' | 'omen';

export type Composition = Record<ClassId, number>;

export interface Party {
  id: number;
  region: string;
  comp: Composition;
  departedAt: number;
  returnsAt: number;
  /** Share of the trip's lamp oil the party went without (the Keep only): 0 lit, 1 in the dark. */
  dark?: number;
}

/** Where a charter delves: the open forest, or the floors of Morrowgate Keep. */
export type SiteId = 'forest' | 'keep';
/** The standing order (and party destination) for an assault on the Keep's frontier floor. */
export const KEEP = 'keep';

/** What a charter starts with from the ones before it. */
export interface CharterTerms {
  /** 1 for the first charter. */
  number: number;
  renown: number;
  grace: number;
}

export const FIRST_CHARTER: CharterTerms = { number: 1, renown: 0, grace: 0 };

/** One charter of the Company of the Ashen Key. Pure JSON; no DOM, clock or Math.random(). */
export interface Company {
  charter: CharterTerms;
  site: SiteId;
  /** The Keep's floors as held ground; empty for a forest charter. */
  floors: SectionState[];
  /** Blades posted to garrison each floor; empty for a forest charter. */
  posted: number[];
  /** Flasks of lamp oil in the stores (the Keep only). */
  oil: number;
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
  /** Hands the wood has taken: they are out there now, and the wood is more dangerous for it. */
  turned: number;
  /** Fractional turning carried between ticks. */
  turning: number;
  /** Fragments of the Ashen Key recovered from the deep wood. */
  keyFragments: number;
  /** How hard the wood itself is pushing on this company (the play-as-the-wood tier). Zero in an ordinary charter. */
  woodPush: number;
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

const DEFAULT_ORDER: Composition = { blade: 2, mender: 0, scout: 1, mystic: 0, sapper: 0 };

export function createCompany(seed: number, charter: CharterTerms = FIRST_CHARTER, site: SiteId = 'forest'): Company {
  const keep = site === 'keep';
  const blank: Company = {
    charter: { ...charter },
    site,
    floors: keep ? createGround(FLOORS) : [],
    posted: keep ? FLOORS.map(() => 0) : [],
    oil: 0,
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
    orders: Object.fromEntries([...REGIONS.map((r) => r.id), KEEP].map((id) => [id, { ...DEFAULT_ORDER }])),
    parties: [],
    nextPartyId: 1,
    standing: [],
    charted: 0,
    blight: 0,
    turned: 0,
    turning: 0,
    keyFragments: 0,
    woodPush: 0,
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
    keep
      ? `${KEEP_NAME} stands a day into the wood, half drowned. Hire hands, buy oil for the dark, and hold what you take.`
      : 'The Eaves begin a bowshot past the palisade. Hire hands before the money is gone.',
  ].reduce((c, line, i) => appendLog<EntryKind, Company>(c, i < 3 ? 'ledger' : 'town', line), blank);
}
