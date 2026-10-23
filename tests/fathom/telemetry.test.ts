import { endDeep, startDeep } from '../../src/fathom/deep';
import { describe, it, expect } from 'vitest';
import { createFathomGame, type FathomGame } from '../../src/fathom/game';
import { completeSeason } from '../../src/fathom/season';
import { seasonEvents, seasonProperties } from '../../src/fathom/telemetry';
import type { Outfit } from '../../src/fathom/state';

const g = (patch: Partial<Outfit> = {}): FathomGame => {
  const base = createFathomGame(1, 0);
  return { ...base, outfit: { ...base.outfit, elapsed: 1_200, ...patch } };
};
const with_ = (game: FathomGame, patch: Partial<Outfit>): FathomGame => ({ ...game, outfit: { ...game.outfit, ...patch } });

describe('deep-water play events', () => {
  it('reports nothing for an ordinary tick', () => {
    expect(seasonEvents(g(), with_(g(), { elapsed: 1_201 }))).toEqual([]);
  });

  it('reports each zone opening as the outfit goes deeper, with minutes into the season', () => {
    const before = g({ lifetimeCash: 3_000 });
    const after = with_(before, { lifetimeCash: 1e5 });
    expect(seasonEvents(before, after)).toEqual([{ name: 'zone_reached', props: { zone: 'shelf', minutes: 20, season: 1 } }]);
  });

  it('reports each upgrade bought and story beat seen, like every game, to fill the time before the first milestone', () => {
    const before = g();
    const after = with_(before, { upgrades: ['u1'], beats: { first: 1_200 } });
    expect(seasonEvents(before, after).map((e) => e.name)).toEqual(['upgrade_bought', 'beat_seen']);
  });

  it('reports each act reached', () => {
    expect(seasonEvents(g(), with_(g(), { act: 2 }))).toEqual([{ name: 'act_reached', props: { act: 2, minutes: 20, season: 1 } }]);
  });

  it('reports every kaiju landfall by category', () => {
    expect(seasonEvents(g({ category: 1 }), with_(g({ category: 1 }), { category: 2 }))).toEqual([{ name: 'landfall', props: { category: 2, minutes: 20, season: 1 } }]);
  });

  it('reports the season ending, with the choice made', () => {
    const due = g({ flags: ['terminus'], lifetimeCash: 1e12, bodyCount: 7 });
    const [event] = seasonEvents(due, completeSeason(due, 'close', 2));
    expect(event).toMatchObject({ name: 'season_completed', props: { ending: 'close', minutes: 20, lost: 7, season: 1 } });
  });

  it('describes the player for every event', () => {
    expect(seasonProperties(g({ act: 3 }))).toEqual({ game: 'fathom', act: 3, season: 1 });
  });

  it('reports the Source answered, and each time a town beats it back', () => {
    const before = createFathomGame(1, 0);
    const answering = startDeep(before, 5);
    expect(seasonEvents(before, answering)).toEqual([{ name: 'deep_started', props: {} }]);
    const beaten = { ...answering, deep: { ...answering.deep!, hunt: { ...answering.deep!.hunt, beaten: 1, harvest: 40 } } };
    expect(seasonEvents(answering, beaten)).toEqual([{ name: 'deep_beaten', props: { beaten: 1, harvest: 40 } }]);
    expect(seasonEvents(beaten, beaten)).toEqual([]);
  });

  it('reports a hunt ended for Legend', () => {
    const answering = startDeep(createFathomGame(1, 0), 5);
    const fed = { ...answering, deep: { ...answering.deep!, hunt: { ...answering.deep!.hunt, harvest: 400 } } };
    expect(seasonEvents(fed, endDeep(fed))).toEqual([{ name: 'hunt_ended', props: { horror: 'source', harvest: 400, legend: 4 } }]);
  });
});
