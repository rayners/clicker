import { createRun, ASYLUM_CONFIG, CAMP_CONFIG, CLINIC_CONFIG, INSURER_CONFIG, type KillerId, type Run, type RunConfig, type VenueId } from './state';
import { KILLERS, VENUES } from './registry';
import type { Ending, EndingText } from './kinds';
import type { LateGame, LateProfile } from './game';

const BOX_OFFICE: Record<Ending, number> = { kill: 1, sell: 2, burn: 1 };
const LORE: Record<Ending, number> = { kill: 1, sell: 0, burn: 3 };
const BURN_AFTER_SEQUELS = 3;
const BOX_OFFICE_PRODUCTION = 0.25;
/** The killer comes back this much stronger with every film. */
const SEQUEL_PRESSURE = 0.15;
/** ...and the survivors' lore takes some of it back. */
const LORE_PRESSURE = 0.03;
const MIN_PRESSURE_BONUS = -0.9;
/** Per-crossover pressure tuning (tuned by the pacing bot): some killers hit harder in places where it is always night. */
const CROSSOVER_PRESSURE: Record<string, number> = {
  'camp:burned': 1.3,
  'camp:design': 1,
  'clinic:drowned': -0.4,
  'insurer:drowned': -0.72,
  'insurer:burned': -0.6,
  'insurer:patient': -0.6,
};

export interface TapeDef {
  venue: VenueId;
  killer: KillerId;
  title: string;
  blurb: string;
  available: boolean;
  /** Tuning for a crossover: the killer's pressure is scaled by (1 + this) so every pairing paces like the originals. */
  pressureBonus?: number;
  crossover?: boolean;
}

/** Films finished before each tape is stocked (user, 2026-10-22: one to start, the rest unlocked). */
const ORIGINAL_UNLOCK_FILMS: Record<VenueId, number> = { camp: 0, clinic: 1, insurer: 2, asylum: 3 };
export const CROSSOVER_UNLOCK_FILMS = 4;
/** Films finished before side B, the Killer's Cut, can be played. */
export const CUT_UNLOCK_FILMS = 2;

export const tapeUnlock = (tape: TapeDef): number => (tape.crossover ? CROSSOVER_UNLOCK_FILMS : ORIGINAL_UNLOCK_FILMS[tape.venue]);
export const isCutUnlocked = (profile: LateProfile): boolean => profile.sequels >= CUT_UNLOCK_FILMS;

/** The three originals: each killer in its own place. */
export const ORIGINALS: readonly TapeDef[] = [
  { venue: 'camp', killer: 'drowned', title: 'FRIDAY THE 12TH', blurb: 'Camp Blackwater reopens twenty years after the drowning. Fill every bunk. Keep the lights on.', available: true },
  { venue: 'clinic', killer: 'burned', title: 'A NIGHTMARE ON SYCAMORE STREET', blurb: 'A sleep study pays by the dreaming hour. Something else is in the dreams.', available: true },
  { venue: 'insurer', killer: 'design', title: 'PENULTIMATE DESTINATION', blurb: 'You insured every survivor of Flight 213. Death has a list, and it is very patient.', available: true },
  { venue: 'asylum', killer: 'patient', title: 'CANDY CORN DAY', blurb: 'Run the asylum on the hill above Millbrook. Fill the beds, mind the dose, and keep Ward Ten locked until National Candy Corn Day.', available: true },
];

/** Every killer in every other killer's place, as the genre eventually always does. */
export const CROSSOVERS: readonly TapeDef[] = [
  { venue: 'camp', killer: 'burned', title: 'A NIGHTMARE AT CAMP BLACKWATER', blurb: 'The Burned Man finds the campers asleep in their bunks. Every lights-out is a door left open.' },
  { venue: 'camp', killer: 'design', title: 'PENULTIMATE SUMMER', blurb: 'The survivors of Flight 213 go to summer camp to get away from it all. Death has a canoe.' },
  { venue: 'clinic', killer: 'drowned', title: 'FRIDAY THE 12TH: CHECKED IN', blurb: 'The Drowned Boy walks out of the clinic\'s hydrotherapy pool. The night staff never hear him coming.' },
  { venue: 'clinic', killer: 'design', title: 'PENULTIMATE DREAM', blurb: 'A sleep study of people who should have died. The design comes for them in their beds, in order.' },
  { venue: 'insurer', killer: 'drowned', title: 'FRIDAY THE 12TH: CLAIMS PENDING', blurb: 'Providence Mutual insured the camp. Now its policyholders keep turning up in the water.' },
  { venue: 'insurer', killer: 'burned', title: 'SYCAMORE STREET 4: THE ADJUSTER', blurb: 'Every claims adjuster on the floor has the same dream about a man with a burned face.' },
  { venue: 'asylum', killer: 'drowned', title: 'FRIDAY THE 12TH: COMMITTED', blurb: 'Something climbs out of the hydrotherapy tubs at Grayhaven. The patients say it has been down there since the lake was drained.' },
  { venue: 'asylum', killer: 'burned', title: 'A NIGHTMARE ON THE HILL', blurb: 'Every sedated patient at Grayhaven is asleep. Every one of them dreams of a boiler room.' },
  { venue: 'asylum', killer: 'design', title: 'PENULTIMATE DESTINATION: INVOLUNTARY', blurb: 'The survivors of Flight 213 are committed for their own safety. Death has visiting hours.' },
  { venue: 'camp', killer: 'patient', title: 'CANDY CORN DAY AT CAMP BLACKWATER', blurb: 'The camp reopens for a late-October session. A man in a white mask walks out of the lake fog and does not hurry.' },
  { venue: 'clinic', killer: 'patient', title: 'CANDY CORN DAY: LIGHTS OUT', blurb: 'He escaped on Candy Corn Day and came to the one house on Sycamore Street where everyone is asleep.' },
  { venue: 'insurer', killer: 'patient', title: 'CANDY CORN DAY: TOTAL LOSS', blurb: 'Providence Mutual insured the hospital. Now he is working through the policyholders, one by one, in no hurry at all.' },
].map((t) => ({ ...t, available: true, crossover: true, pressureBonus: CROSSOVER_PRESSURE[`${t.venue}:${t.killer}`] ?? 0 })) as TapeDef[];

/** The horror shelf at Late Fees Video. */
export const TAPES: readonly TapeDef[] = [...ORIGINALS, ...CROSSOVERS];

const BASE: Record<VenueId, RunConfig> = { camp: CAMP_CONFIG, clinic: CLINIC_CONFIG, insurer: INSURER_CONFIG, asylum: ASYLUM_CONFIG };
const HOME: Record<VenueId, KillerId> = { camp: 'drowned', clinic: 'burned', insurer: 'design', asylum: 'patient' };

export const tapeFor = (venue: VenueId, killer: KillerId = HOME[venue]): TapeDef =>
  TAPES.find((t) => t.venue === venue && t.killer === killer) ?? ORIGINALS.find((t) => t.venue === venue)!;

/** Whether the shelf stocks a tape yet: each one comes in after enough films are finished. */
export const isTapeStocked = (profile: LateProfile, tape: TapeDef): boolean => tape.available && profile.sequels >= tapeUnlock(tape);

/** The genre's sequel ladder. Part numbers carry on forever; the subtitles run out. */
export function sequelTitle(title: string, part: number): string {
  const named: Record<number, string> = { 2: ' PART II', 3: ' PART III', 4: ': THE FINAL CHAPTER', 5: ': A NEW BEGINNING', 6: ': IT LIVES AGAIN', 7: ' TAKES MANHATTAN', 8: ' IN SPACE' };
  return part === 1 ? title : `${title}${named[part] ?? ` PART ${part}`}`;
}

export function runConfigFor(profile: LateProfile, venue: VenueId, killer: KillerId = HOME[venue]): RunConfig {
  const tape = tapeFor(venue, killer);
  const part = profile.history.filter((h) => h.venue === venue && h.killer === killer).length + 1;
  const sequel = Math.max(0, SEQUEL_PRESSURE * (part - 1) - LORE_PRESSURE * profile.lore);
  return {
    ...BASE[venue],
    killer,
    part,
    title: sequelTitle(tape.title, part),
    productionMultiplier: 1 + BOX_OFFICE_PRODUCTION * profile.boxOffice,
    pressureBonus: Math.max(MIN_PRESSURE_BONUS, (tape.pressureBonus ?? 0) + sequel),
  };
}

export function chooseTape(game: LateGame, venue: VenueId, seed: number, killer: KillerId = HOME[venue]): LateGame {
  return { ...game, shelf: false, run: createRun(runConfigFor(game.profile, venue, killer), seed) };
}

/** How a film can end: the killer says how it is stopped, the place says how the business ends. */
export function endingFor(r: Run, id: Ending): EndingText {
  return id === 'kill' ? KILLERS[r.killer].endings.kill : VENUES[r.venue].endings[id];
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
    history: [...game.profile.history, { venue: r.venue, killer: r.killer, title: r.config.title, ending, bodyCount: r.bodyCount, duration: r.elapsed }],
  };
  return { ...game, profile, shelf: true, run: createRun(runConfigFor(profile, r.venue, r.killer), seed) };
}
