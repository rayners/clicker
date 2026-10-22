import type { MissionOf, MissionState } from '../src/mission/state';

/** The default contract (extraction with the organism horror), for tests that read its fields. */
export type ExtractionGameMission = MissionOf<'extraction', 'organism'>;
export const ext = (m: MissionState) => m as ExtractionGameMission;
export const tf = (m: MissionState) => m as MissionOf<'terraform', 'organism'>;

/** A game whose profile has finished enough contracts to be offered every kind (unlocks are covered in assignment tests). */
export const veteran = <G extends { profile: { contractsCompleted: number } }>(g: G): G => ({ ...g, profile: { ...g.profile, contractsCompleted: 10 } });
