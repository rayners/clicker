import type { MissionOf, MissionState } from '../src/mission/state';

/** The default contract (extraction with the organism horror), for tests that read its fields. */
export type ExtractionGameMission = MissionOf<'extraction', 'organism'>;
export const ext = (m: MissionState) => m as ExtractionGameMission;
export const tf = (m: MissionState) => m as MissionOf<'terraform', 'organism'>;

/** A game whose profile has finished enough contracts to be offered every kind (unlocks are covered in assignment tests). */
export const veteran = <G extends { profile: { contractsCompleted: number } }>(g: G): G => ({ ...g, profile: { ...g.profile, contractsCompleted: 10 } });

/** An Elderdark game whose Factor has finished enough charters to open every site and tier. */
export const seasoned = <G extends { profile: { chartersCompleted: number } }>(g: G): G => ({ ...g, profile: { ...g.profile, chartersCompleted: 10 } });

/** A LATE FEES member with enough films behind them to rent every tape and flip side B. */
export const member = <G extends { profile: { sequels: number } }>(g: G): G => ({ ...g, profile: { ...g.profile, sequels: 10 } });

/** Two-tap confirms ignore a second tap that comes too soon (a double tap); wait long enough before confirming. */
export const confirmPause = (): Promise<void> => new Promise((r) => setTimeout(r, 450));
