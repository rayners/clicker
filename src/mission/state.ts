import { GENERATORS } from '../data/generators';
import { appendLog, type LogEntry } from './log';
import { createCrewState, type CrewMemberState } from './crew';
import type { ActiveDirective, DirectiveResult } from './directives';

/** Everything that varies between missions. Plain data so the future Boardroom layer can author it. */
export interface MissionConfig {
  shipName: string;
  targetBody: string;
}

export const DEFAULT_MISSION_CONFIG: MissionConfig = {
  shipName: 'MSV Calloway Reach',
  targetBody: 'LV-0919 "Tethys Minor"',
};

/** A single mission, fully self-contained and JSON-serializable. */
export interface MissionState {
  config: MissionConfig;
  rng: number;
  elapsed: number;
  ore: number;
  credits: number;
  lifetimeOre: number;
  lifetimeCredits: number;
  generators: Record<string, number>;
  refineryLevel: number;
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

export function createMission(config: MissionConfig, seed: number): MissionState {
  const blank: MissionState = {
    config: { ...config },
    rng: seed,
    elapsed: 0,
    ore: 0,
    credits: 0,
    lifetimeOre: 0,
    lifetimeCredits: 0,
    generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    refineryLevel: 0,
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
  return [
    'WARDEN OPERATIONS INTELLIGENCE v4.1.7 ... ONLINE',
    `VESSEL: ${config.shipName.toUpperCase()} // KESSLER-AMARI COMBINE`,
    `ORBIT ESTABLISHED: ${config.targetBody.toUpperCase()}`,
    'CREW STATUS: 7/7 IN CRYOSTASIS. ALL VITALS NOMINAL.',
    'AWAITING EXTRACTION ORDERS.',
  ].reduce((m, line) => appendLog(m, 'sys', line), blank);
}
