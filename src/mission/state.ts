import { appendLog, type LogEntry } from './log';
import { createCrewState, type CrewMemberState } from './crew';
import type { ActiveDirective, DirectiveResult } from './directives';
import type { HorrorDef, ScenarioDef } from './kinds';
import type { ExtractionFields } from './extraction/state';
import type { TerraformFields } from './terraform/state';
import type { SecurityFields } from './security/state';
import type { HaulageFields } from './haulage/state';
import type { OrganismFields } from './organism/state';
import type { QuietFields } from './quiet/state';
import type { CreatureFields } from './creature/state';
import { HORRORS, SCENARIOS } from './registry';

export type ScenarioId = 'extraction' | 'terraform' | 'security' | 'haulage';
export type HorrorId = 'organism' | 'quiet' | 'creature';

/** Everything that varies between missions. Plain data so the future Boardroom layer can author it. */
export interface MissionConfig {
  /** What the contract is: the economy and its corporate story. */
  scenario: ScenarioId;
  /** What goes wrong. Independent of the scenario (see docs/TERRAFORM.md). */
  horror: HorrorId;
  shipName: string;
  targetBody: string;
  /** Multiplies all output (seniority from past contracts). */
  productionMultiplier: number;
  /** Extra crew who can be awake at once. */
  extraLifeSupport: number;
  /** Scales the chance of incidents caused by loose contacts. */
  incidentMultiplier: number;
}

export const DEFAULT_MISSION_CONFIG = {
  scenario: 'extraction',
  horror: 'organism',
  shipName: 'MSV Calloway Reach',
  targetBody: 'LV-0919 "Tethys Minor"',
  productionMultiplier: 1,
  extraLifeSupport: 0,
  incidentMultiplier: 1,
} satisfies MissionConfig;

/** A terraforming contract: Atmospheric Processing Station Ostrava-9. */
export const TERRAFORM_MISSION_CONFIG = {
  ...DEFAULT_MISSION_CONFIG,
  scenario: 'terraform',
  shipName: 'Ostrava-9 Station',
  targetBody: 'KA-T-88 "Merrow"',
} satisfies MissionConfig;

/** A security contract: a Combine Security detachment retaking the colony at Calder's Landing. */
export const SECURITY_MISSION_CONFIG = {
  ...DEFAULT_MISSION_CONFIG,
  scenario: 'security',
  shipName: 'CSV Bellwether Ascent',
  targetBody: 'LV-1201 "Calder\'s Landing"',
} satisfies MissionConfig;

/** A haulage contract: the tug Halvorsen Gale towing a refinery train home along a chain of stations. */
export const HAULAGE_MISSION_CONFIG = {
  ...DEFAULT_MISSION_CONFIG,
  scenario: 'haulage',
  shipName: 'Halvorsen Gale',
  targetBody: 'The Long Haul: Tethys Minor to Kessler Station',
} satisfies MissionConfig;

/** State every mission has, whatever its scenario or horror. */
export interface MissionCore {
  config: MissionConfig;
  scenario: ScenarioId;
  horror: HorrorId;
  /** The seed this mission started from; with the ship name it identifies the contract. */
  seed: number;
  rng: number;
  elapsed: number;
  credits: number;
  lifetimeCredits: number;
  /** Purchased upgrade ids, from the scenario's own upgrade table. */
  upgrades: string[];
  crew: Record<string, CrewMemberState>;
  directive: ActiveDirective | null;
  directiveResults: Record<string, DirectiveResult>;
  lastDirectiveAt: number | null;
  act: number;
  /** Story beat id -> mission time it fired. */
  beats: Record<string, number>;
  lastBeatAt: number | null;
  flags: string[];
  log: LogEntry[];
  nextLogId: number;
}

export type ScenarioFields = ExtractionFields | TerraformFields | SecurityFields | HaulageFields;
export type HorrorFields = OrganismFields | QuietFields | CreatureFields;

/** A single mission, fully self-contained and JSON-serializable. */
export type MissionState = MissionCore & ScenarioFields & HorrorFields;

export type MissionOf<S extends ScenarioId, H extends HorrorId> = MissionCore &
  Extract<ScenarioFields, { scenario: S }> &
  Extract<HorrorFields, { horror: H }>;
export type ExtractionMission = MissionCore & ExtractionFields & HorrorFields;
export type TerraformMission = MissionCore & TerraformFields & HorrorFields;
export type SecurityMission = MissionCore & SecurityFields & HorrorFields;
export type HaulageMission = MissionCore & HaulageFields & HorrorFields;
export type OrganismMission = MissionCore & ScenarioFields & OrganismFields;
export type CreatureMission = MissionCore & ScenarioFields & CreatureFields;

export function isExtraction(m: MissionState): m is ExtractionMission {
  return m.scenario === 'extraction';
}

export function isTerraform(m: MissionState): m is TerraformMission {
  return m.scenario === 'terraform';
}

export function isSecurity(m: MissionState): m is SecurityMission {
  return m.scenario === 'security';
}

export function isHaulage(m: MissionState): m is HaulageMission {
  return m.scenario === 'haulage';
}

export function isOrganism(m: MissionState): m is OrganismMission {
  return m.horror === 'organism';
}

/** Builds a mission from explicit scenario and horror definitions (tests use this with stubs). */
export function composeMission(config: MissionConfig, seed: number, scenario: ScenarioDef, horror: HorrorDef): MissionState {
  const core: MissionCore = {
    config: { ...config },
    scenario: config.scenario,
    horror: config.horror,
    seed,
    rng: seed,
    elapsed: 0,
    credits: 0,
    lifetimeCredits: 0,
    upgrades: [],
    crew: createCrewState(),
    directive: null,
    directiveResults: {},
    lastDirectiveAt: null,
    act: 1,
    beats: {},
    lastBeatAt: null,
    flags: [],
    log: [],
    nextLogId: 1,
  };
  const blank = { ...core, ...scenario.fields(config), ...horror.fields() } as MissionState;
  return scenario.boot(config).reduce<MissionState>((m, line) => appendLog(m, 'sys', line), blank);
}

export function createMission<S extends ScenarioId, H extends HorrorId>(
  config: MissionConfig & { scenario: S; horror: H },
  seed: number,
): MissionOf<S, H> {
  return composeMission(config, seed, SCENARIOS[config.scenario], HORRORS[config.horror]) as MissionOf<S, H>;
}
