import type { KillerDef, Signals } from './kinds';
import type { KillerId, Run } from './state';
import { DROWNED } from './drowned';

export const KILLERS: Readonly<Record<KillerId, KillerDef>> = { drowned: DROWNED };

/** How hard the run's killer pushes back on held ground. Venues call this instead of knowing any killer. */
export function killerPressure(r: Run, signals: Signals): number {
  return KILLERS[r.killer].pressure(r, signals);
}
