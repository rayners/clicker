import { GENERATORS } from '../data/generators';

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
  generators: Record<string, number>;
  refineryLevel: number;
}

export function createMission(config: MissionConfig, seed: number): MissionState {
  return {
    config: { ...config },
    rng: seed,
    elapsed: 0,
    ore: 0,
    credits: 0,
    lifetimeOre: 0,
    generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    refineryLevel: 0,
  };
}
