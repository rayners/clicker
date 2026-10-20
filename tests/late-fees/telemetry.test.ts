import { describe, it, expect } from 'vitest';
import { createLateGame, newLateGame, type LateGame } from '../../src/late-fees/game';
import { reduce } from '../../src/late-fees/store';
import { filmEvents, filmProperties } from '../../src/late-fees/telemetry';
import type { CampRun } from '../../src/late-fees/state';

const withRun = (g: LateGame, patch: Partial<CampRun>): LateGame => ({ ...g, run: { ...g.run, ...patch } as LateGame['run'] });

describe('LATE FEES play events', () => {
  it('reports nothing for an ordinary tick', () => {
    const g = createLateGame(1, 0);
    expect(filmEvents(g, reduce(g, { type: 'tick', dt: 1 }))).toEqual([]);
  });

  it('reports a tape rented from the shelf', () => {
    const shelf = newLateGame(1, 0);
    const rented = reduce(shelf, { type: 'chooseTape', venue: 'camp', seed: 2 });
    expect(filmEvents(shelf, rented)).toEqual([{ name: 'film_started', props: { venue: 'camp', killer: 'drowned', part: 1 } }]);
  });

  it('reports each act and each zone opened, with minutes into the film', () => {
    const g = withRun(createLateGame(1, 0), { elapsed: 3_600 });
    expect(filmEvents(g, withRun(g, { act: 2 }))).toEqual([{ name: 'act_reached', props: { act: 2, venue: 'camp', killer: 'drowned', part: 1, minutes: 60 } }]);
    expect(filmEvents(g, withRun(g, { deepest: 1 }))).toEqual([{ name: 'zone_opened', props: { zone: 'gate', zones: 1, minutes: 60, part: 1 } }]);
  });

  it('reports a film finished, with its ending and body count', () => {
    const done = withRun(createLateGame(1, 0), { flags: ['terminus'], bodyCount: 61, elapsed: 4 * 3600 });
    const [event] = filmEvents(done, reduce(done, { type: 'completeRun', ending: 'sell', seed: 3 }));
    expect(event).toMatchObject({ name: 'film_completed', props: { ending: 'sell', venue: 'camp', bodyCount: 61, minutes: 240, part: 1 } });
  });

  it('describes the player for every event', () => {
    expect(filmProperties(createLateGame(1, 0))).toEqual({ game: 'late-fees', venue: 'camp', killer: 'drowned', part: 1, act: 1, sequels: 0 });
  });
});
