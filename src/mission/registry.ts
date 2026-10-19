import type { HorrorDef, ScenarioDef } from './kinds';
import type { MissionState, ScenarioId } from './state';
import { EXTRACTION } from './extraction';
import { TERRAFORM } from './terraform';
import { HORRORS } from './horrors';

export { HORRORS };

export const SCENARIOS: Readonly<Record<ScenarioId, ScenarioDef>> = { extraction: EXTRACTION, terraform: TERRAFORM };

export function scenarioOf(m: MissionState): ScenarioDef {
  return SCENARIOS[m.scenario];
}

export function horrorOf(m: MissionState): HorrorDef {
  return HORRORS[m.horror];
}
