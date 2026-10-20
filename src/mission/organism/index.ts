import { ORGANISM_BEATS } from '../../data/organism/story';
import { ORGANISM_ARCHIVE } from '../../data/organism/archive';
import { ORGANISM_ENDINGS } from '../../data/organism/endings';
import { NURSERY_BEATS } from '../../data/organism/nursery';
import type { HorrorDef } from '../kinds';
import type { MissionState, OrganismMission } from '../state';
import { breach, fundingMultiplier, organismPressure, tickContainment } from './containment';
import type { OrganismFields } from './state';

const o = (m: MissionState) => m as OrganismMission;

export const ORGANISM: HorrorDef = {
  id: 'organism',
  fields: (): OrganismFields => ({
    horror: 'organism',
    specimens: 0,
    specimensRecovered: 0,
    rigs: 0,
    integrity: 100,
    containmentLevel: 0,
    breaches: 0,
    contacts: 0,
    vents: 0,
  }),
  tick: (m, dt, hooks) => tickContainment(o(m), dt, hooks),
  beats: ORGANISM_BEATS,
  pairings: { terraform: NURSERY_BEATS },
  archive: ORGANISM_ARCHIVE,
  endings: ORGANISM_ENDINGS,
  productionMultiplier: (m) => fundingMultiplier(o(m)),
  pressure: (m) => organismPressure(o(m)),
  applyEffect: (m, action) => (action === 'breach' ? breach(o(m)) : m),
};
