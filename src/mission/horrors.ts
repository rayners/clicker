import type { HorrorDef } from './kinds';
import type { HorrorId, MissionState } from './state';
import { ORGANISM } from './organism';
import { QUIET } from './quiet';
import { CREATURE } from './creature';
import { HUNTER } from './hunter';

export const HORRORS: Readonly<Record<HorrorId, HorrorDef>> = { organism: ORGANISM, quiet: QUIET, creature: CREATURE, hunter: HUNTER };

/** How the mission's horror scales scenario output. Scenarios call this instead of knowing any horror. */
export function horrorProductionMultiplier(m: MissionState): number {
  return HORRORS[m.horror].productionMultiplier(m);
}

/** How hard the mission's horror pushes back on held ground (1 = mundane). Scenarios call this instead of knowing any horror. */
export function horrorPressure(m: MissionState): number {
  return HORRORS[m.horror].pressure?.(m) ?? 1;
}
