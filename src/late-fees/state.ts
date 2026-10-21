import { appendLog, type LogEntry } from '../shared/log';
import type { CampFields } from './camp/state';
import type { DrownedFields } from './drowned/state';
import type { ClinicFields } from './clinic/state';
import type { BurnedFields } from './burned/state';
import type { InsurerFields } from './insurer/state';
import type { DesignFields } from './design/state';
import type { KillerDef, VenueDef } from './kinds';
import { KILLERS, VENUES } from './registry';

export type VenueId = 'camp' | 'clinic' | 'insurer';
export type KillerId = 'drowned' | 'burned' | 'design';
/** osd: the VCR's own text; news: the town and the owners; staff: your people; kill: the body count. */
export type EntryKind = 'osd' | 'news' | 'staff' | 'kill';

/** One tape: where, who hunts there, and which sequel this is. Plain data. */
export interface RunConfig {
  venue: VenueId;
  killer: KillerId;
  title: string;
  /** 1 for the original, 2 for Part II, ... */
  part: number;
  /** Box Office from earlier films. */
  productionMultiplier: number;
  /** The killer comes back stronger in every sequel. */
  pressureBonus: number;
}

export const CAMP_CONFIG = {
  venue: 'camp',
  killer: 'drowned',
  title: 'FRIDAY THE 12TH',
  part: 1,
  productionMultiplier: 1,
  pressureBonus: 0,
} satisfies RunConfig;

export const CLINIC_CONFIG = {
  venue: 'clinic',
  killer: 'burned',
  title: 'A NIGHTMARE ON SYCAMORE STREET',
  part: 1,
  productionMultiplier: 1,
  pressureBonus: 0,
} satisfies RunConfig;

export const INSURER_CONFIG = {
  venue: 'insurer',
  killer: 'design',
  title: 'PENULTIMATE DESTINATION',
  part: 1,
  productionMultiplier: 1,
  pressureBonus: 0,
} satisfies RunConfig;

/** State every run has, whatever the venue and killer. */
export interface RunCore {
  config: RunConfig;
  venue: VenueId;
  killer: KillerId;
  seed: number;
  rng: number;
  elapsed: number;
  cash: number;
  lifetimeCash: number;
  upgrades: string[];
  /** Everyone the killer has taken. */
  bodyCount: number;
  /** 0..1: how much the public still trusts the place. Scales income. */
  reputation: number;
  act: number;
  beats: Record<string, number>;
  lastBeatAt: number | null;
  flags: string[];
  log: LogEntry<EntryKind>[];
  nextLogId: number;
}

export type VenueFields = CampFields | ClinicFields | InsurerFields;
export type KillerFields = DrownedFields | BurnedFields | DesignFields;
export type Run = RunCore & VenueFields & KillerFields;
export type RunOf<V extends VenueId, K extends KillerId> = RunCore & Extract<VenueFields, { venue: V }> & Extract<KillerFields, { killer: K }>;
export type CampRun = RunCore & CampFields & KillerFields;
export type ClinicRun = RunCore & ClinicFields & KillerFields;
export type InsurerRun = RunCore & InsurerFields & KillerFields;

export function composeRun(config: RunConfig, seed: number, venue: VenueDef, killer: KillerDef): Run {
  const core: RunCore = {
    config: { ...config },
    venue: config.venue,
    killer: config.killer,
    seed,
    rng: seed,
    elapsed: 0,
    cash: 0,
    lifetimeCash: 0,
    upgrades: [],
    bodyCount: 0,
    reputation: 1,
    act: 1,
    beats: {},
    lastBeatAt: null,
    flags: [],
    log: [],
    nextLogId: 1,
  };
  const blank = { ...core, ...venue.fields(config), ...killer.fields() } as Run;
  return venue.boot(config).reduce<Run>((r, line) => appendLog<EntryKind, Run>(r, 'osd', line), blank);
}

export function createRun<V extends VenueId, K extends KillerId>(config: RunConfig & { venue: V; killer: K }, seed: number): RunOf<V, K> {
  return composeRun(config, seed, VENUES[config.venue], KILLERS[config.killer]) as RunOf<V, K>;
}
