import type { HorrorDef } from './kinds';
import type { HorrorId, MissionState } from './state';
import { ORGANISM } from './organism';
import { QUIET } from './quiet';

export const HORRORS: Readonly<Record<HorrorId, HorrorDef>> = { organism: ORGANISM, quiet: QUIET };

/** How the mission's horror scales scenario output. Scenarios call this instead of knowing any horror. */
export function horrorProductionMultiplier(m: MissionState): number {
  return HORRORS[m.horror].productionMultiplier(m);
}
