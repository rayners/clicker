import { createRun, CAMP_CONFIG, CLINIC_CONFIG, type RunConfig, type VenueId } from './state';
import type { Ending } from './kinds';
import type { LateGame, LateProfile } from './game';

const BOX_OFFICE: Record<Ending, number> = { kill: 1, sell: 2, burn: 1 };
const LORE: Record<Ending, number> = { kill: 1, sell: 0, burn: 3 };
const BURN_AFTER_SEQUELS = 3;
const BOX_OFFICE_PRODUCTION = 0.25;
/** The killer comes back this much stronger with every film. */
const SEQUEL_PRESSURE = 0.15;
/** ...and the survivors' lore takes some of it back. */
const LORE_PRESSURE = 0.03;

export interface TapeDef {
  venue: VenueId | 'clinic' | 'insurer';
  title: string;
  blurb: string;
  available: boolean;
}

/** The horror shelf at Late Fees Video. */
export const TAPES: readonly TapeDef[] = [
  { venue: 'camp', title: 'FRIDAY THE 12TH', blurb: 'Camp Blackwater reopens twenty years after the drowning. Fill every bunk. Keep the lights on.', available: true },
  { venue: 'clinic', title: 'A NIGHTMARE ON SYCAMORE STREET', blurb: 'A sleep study pays by the dreaming hour. Something else is in the dreams.', available: true },
  { venue: 'insurer', title: 'FINAL DEPARTURE', blurb: 'You insured every survivor of Flight 213. Death has a list, and it is very patient.', available: false },
];

const BASE: Record<VenueId, RunConfig> = { camp: CAMP_CONFIG, clinic: CLINIC_CONFIG };

/** The genre's sequel ladder. Part numbers carry on forever; the subtitles run out. */
export function sequelTitle(title: string, part: number): string {
  const named: Record<number, string> = { 2: ' PART II', 3: ' PART III', 4: ': THE FINAL CHAPTER', 5: ': A NEW BEGINNING', 6: ': IT LIVES AGAIN', 7: ' TAKES MANHATTAN', 8: ' IN SPACE' };
  return part === 1 ? title : `${title}${named[part] ?? ` PART ${part}`}`;
}

export function runConfigFor(profile: LateProfile, venue: VenueId): RunConfig {
  const base = BASE[venue];
  const part = profile.history.filter((h) => h.venue === venue).length + 1;
  return {
    ...base,
    part,
    title: sequelTitle(base.title, part),
    productionMultiplier: 1 + BOX_OFFICE_PRODUCTION * profile.boxOffice,
    pressureBonus: Math.max(0, SEQUEL_PRESSURE * (part - 1) - LORE_PRESSURE * profile.lore),
  };
}

export function chooseTape(game: LateGame, venue: VenueId, seed: number): LateGame {
  return { ...game, shelf: false, run: createRun(runConfigFor(game.profile, venue), seed) };
}

export function availableEndings(game: LateGame): Ending[] {
  if (!game.run.flags.includes('terminus')) return [];
  return game.profile.sequels >= BURN_AFTER_SEQUELS ? ['kill', 'sell', 'burn'] : ['kill', 'sell'];
}

/** Roll credits: bank the film in the franchise and put the next tape on the shelf. */
export function completeRun(game: LateGame, ending: Ending, seed: number): LateGame {
  if (!availableEndings(game).includes(ending)) return game;
  const r = game.run;
  const profile: LateProfile = {
    ...game.profile,
    sequels: game.profile.sequels + 1,
    boxOffice: game.profile.boxOffice + BOX_OFFICE[ending],
    lore: game.profile.lore + LORE[ending],
    endingsSeen: game.profile.endingsSeen.includes(ending) ? game.profile.endingsSeen : [...game.profile.endingsSeen, ending],
    history: [...game.profile.history, { venue: r.venue, title: r.config.title, ending, bodyCount: r.bodyCount, duration: r.elapsed }],
  };
  return { ...game, profile, shelf: true, run: createRun(runConfigFor(profile, r.venue), seed) };
}
