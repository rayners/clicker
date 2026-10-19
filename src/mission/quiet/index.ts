import type { HorrorDef } from '../kinds';
import type { QuietFields } from './state';

/** A contract where nothing goes wrong. Used to prove scenarios don't depend on a horror. */
export const QUIET: HorrorDef = {
  id: 'quiet',
  fields: (): QuietFields => ({ horror: 'quiet' }),
  tick: (m) => m,
  beats: [],
  pairings: {},
  archive: [],
  productionMultiplier: () => 1,
  applyEffect: (m) => m,
};
