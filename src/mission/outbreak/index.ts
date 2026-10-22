import { OUTBREAK_ARCHIVE } from '../../data/outbreak/archive';
import { OUTBREAK_ENDINGS } from '../../data/outbreak/endings';
import { OUTBREAK_BEATS } from '../../data/outbreak/story';
import type { HorrorDef } from '../kinds';
import type { MissionState, OutbreakMission } from '../state';
import { firstTurned, outbreakPressure, outbreakProduction, tickOutbreak } from './spread';
import type { OutbreakFields } from './state';

const o = (m: MissionState) => m as OutbreakMission;

/** Strain KA-11, "the Pallor": a flu nobody worries about, until the workforce turns on the company. */
export const OUTBREAK: HorrorDef = {
  id: 'outbreak',
  fields: (): OutbreakFields => ({ horror: 'outbreak', exposed: 0, sick: 0, turned: 0, recovered: 0, quarantine: 0, crewTurned: 0 }),
  tick: (m, dt, hooks) => tickOutbreak(o(m), dt, hooks),
  beats: OUTBREAK_BEATS,
  pairings: {},
  archive: OUTBREAK_ARCHIVE,
  endings: OUTBREAK_ENDINGS,
  productionMultiplier: (m) => outbreakProduction(o(m)),
  pressure: (m) => outbreakPressure(o(m)),
  applyEffect: (m, action) => (action === 'first-turned' ? firstTurned(o(m)) : m),
};
