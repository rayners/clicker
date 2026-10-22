import { describe, it, expect } from 'vitest';
import { createLateGame, newLateGame } from '../../src/late-fees/game';
import { endCut, startCut } from '../../src/late-fees/cut';
import { reduce } from '../../src/late-fees/store';
import { lateSaves } from '../../src/late-fees/save';
import { filmEvents } from '../../src/late-fees/telemetry';

const NOW = 1_000_000;

describe('Legend on the tape', () => {
  it('ends a killer\'s cut for Legend, kept for that killer, and the next cut with them starts stronger', () => {
    const g = startCut(newLateGame(1, NOW), 'burned', 7);
    const fed = { ...g, cut: { ...g.cut!, hunt: { ...g.cut!.hunt, harvest: 400 } } };
    const ended = endCut(fed);
    expect(ended.cut).toBeNull();
    expect(ended.mode).toBe('films');
    expect(ended.profile.legend).toEqual({ burned: 4 });
    expect(startCut(ended, 'burned', 8).cut!.hunt.strength).toBe(g.cut!.hunt.strength + 2);
    expect(startCut(ended, 'drowned', 8).cut!.hunt.strength).toBe(g.cut!.hunt.strength);
    expect(filmEvents(fed, ended)).toEqual([{ name: 'hunt_ended', props: { horror: 'burned', harvest: 400, legend: 4 } }]);
  });

  it('takes the order, and older saves start with no Legend', () => {
    expect(reduce(startCut(newLateGame(1, NOW), 'drowned', 7), { type: 'endCut' }).cut).toBeNull();
    const old = createLateGame(1, NOW);
    const { legend: _l, ...profile } = old.profile;
    expect(lateSaves.deserialize(JSON.stringify({ ...old, version: 3, profile })).profile.legend).toEqual({});
  });
});
