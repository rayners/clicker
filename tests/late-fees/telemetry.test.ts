import { describe, it, expect } from 'vitest';
import { createLateGame, newLateGame, type LateGame } from '../../src/late-fees/game';
import { reduce } from '../../src/late-fees/store';
import { filmEvents, filmProperties } from '../../src/late-fees/telemetry';
import type { CampRun, ClinicRun, InsurerRun } from '../../src/late-fees/state';
import { chooseTape } from '../../src/late-fees/sequels';
import { startCut } from '../../src/late-fees/cut';

const withRun = (g: LateGame, patch: Partial<CampRun>): LateGame => ({ ...g, run: { ...g.run, ...patch } as LateGame['run'] });

describe('LATE FEES play events', () => {
  it('reports upgrades bought and story beats seen on the way to the first act', () => {
    const g = withRun(createLateGame(1, 0), { elapsed: 120 });
    const after = withRun(g, { upgrades: [...g.run.upgrades, 'x'], beats: { ...g.run.beats, memo: 120 } });
    expect(filmEvents(g, after).map((e) => e.name)).toEqual(['upgrade_bought', 'beat_seen']);
  });

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

  it('reports each new kind of bed the clinic opens', () => {
    const g = chooseTape(newLateGame(1, 0), 'clinic', 2);
    const k = g.run as ClinicRun;
    const before = { ...g, run: { ...k, elapsed: 600 } as LateGame['run'] };
    const after = { ...before, run: { ...(before.run as ClinicRun), beds: { ...k.beds, cot: 1 } } as LateGame['run'] };
    expect(filmEvents(before, after)).toEqual([{ name: 'bed_opened', props: { bed: 'cot', minutes: 10, part: 1 } }]);
    const more = { ...after, run: { ...(after.run as ClinicRun), beds: { ...k.beds, cot: 2 } } as LateGame['run'] };
    expect(filmEvents(after, more)).toEqual([]);
  });

  it('reports each survivor the design crosses off the list', () => {
    const g = chooseTape(newLateGame(1, 0), 'insurer', 2);
    const i = g.run as InsurerRun;
    const before = { ...g, run: { ...i, elapsed: 1_800 } as LateGame['run'] };
    const after = { ...before, run: { ...(before.run as InsurerRun), list: i.list.slice(1), bodyCount: 1 } as LateGame['run'] };
    expect(filmEvents(before, after)).toEqual([{ name: 'survivor_lost', props: { survivor: i.list[0], left: i.list.length - 1, minutes: 30, part: 1 } }]);
  });

  it('reports a film finished, with its ending and body count', () => {
    const done = withRun(createLateGame(1, 0), { flags: ['terminus'], bodyCount: 61, elapsed: 4 * 3600 });
    const [event] = filmEvents(done, reduce(done, { type: 'completeRun', ending: 'sell', seed: 3 }));
    expect(event).toMatchObject({ name: 'film_completed', props: { ending: 'sell', venue: 'camp', bodyCount: 61, minutes: 240, part: 1 } });
  });

  it("reports the tape flipped to the Killer's Cut, and each time a place puts the killer down", () => {
    const shelf = newLateGame(1, 0);
    const cut = startCut(shelf, 'burned', 5);
    expect(filmEvents(shelf, cut)).toEqual([{ name: 'cut_started', props: { killer: 'burned' } }]);
    const beaten = { ...cut, cut: { ...cut.cut!, hunt: { ...cut.cut!.hunt, beaten: 1, harvest: 77 } } };
    expect(filmEvents(cut, beaten)).toEqual([{ name: 'cut_beaten', props: { killer: 'burned', beaten: 1, harvest: 77 } }]);
  });

  it('describes the player for every event', () => {
    expect(filmProperties(createLateGame(1, 0))).toEqual({ game: 'late-fees', venue: 'camp', killer: 'drowned', part: 1, act: 1, sequels: 0 });
  });
});
