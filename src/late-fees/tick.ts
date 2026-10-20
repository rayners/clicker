import { killerOf, venueOf } from './registry';
import type { Run } from './state';
import { runStory } from './story';

/** One step of a run: the venue's business, then the killer, then the story. Pure. */
export function tickRun(r: Run, dt: number): Run {
  const venue = venueOf(r);
  const killer = killerOf(r);
  const later = venue.tick({ ...r, elapsed: r.elapsed + dt }, dt);
  const signals = venue.signals(later);
  const hunted = killer.tick(later, dt, { claim: venue.claim, lexicon: venue.lexicon }, signals);
  return runStory(hunted, [...venue.beats, ...killer.beats], venue.signals(hunted), venue.lexicon);
}
