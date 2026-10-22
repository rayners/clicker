import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/game';
import { endCreature, startCreature } from '../../src/core/creature';
import { endHunter, startHunter } from '../../src/core/hunter';
import { reduce } from '../../src/core/store';
import { deserialize } from '../../src/core/save';
import { contractEvents } from '../../src/core/telemetry';
import { createProfile } from '../../src/core/game';

const NOW = 1_000_000;

describe('Legend in DEEP CONTRACT', () => {
  it('ends the creature\'s hunt for Legend, and the next creature starts stronger for it', () => {
    const g = startCreature(createGame(1, NOW), 7);
    const fed = { ...g, creature: { ...g.creature!, hunt: { ...g.creature!.hunt, harvest: 400 } } };
    const ended = endCreature(fed);
    expect(ended.creature).toBeNull();
    expect(ended.mode).toBe('mission');
    expect(ended.profile.legend.creature).toBe(4);
    expect(startCreature(ended, 8).creature!.hunt.strength).toBe(g.creature!.hunt.strength + 2);
    expect(contractEvents(fed, ended)).toEqual([{ name: 'hunt_ended', props: { horror: 'creature', harvest: 400, legend: 4 } }]);
  });

  it('keeps the hunter\'s Legend apart from the creature\'s', () => {
    const g = startHunter(createGame(1, NOW), 7);
    const fed = { ...g, hunter: { ...g.hunter!, hunt: { ...g.hunter!.hunt, harvest: 900 } } };
    const ended = endHunter(fed);
    expect(ended.hunter).toBeNull();
    expect(ended.profile.legend).toEqual({ hunter: 6 });
    expect(contractEvents(fed, ended)).toEqual([{ name: 'hunt_ended', props: { horror: 'hunter', harvest: 900, legend: 6 } }]);
  });

  it('takes the orders, and older saves start with no Legend', () => {
    expect(reduce(startCreature(createGame(1, NOW), 7), { type: 'endCreature' }).creature).toBeNull();
    expect(reduce(startHunter(createGame(1, NOW), 7), { type: 'endHunter' }).hunter).toBeNull();
    expect(createProfile().legend).toEqual({});
    const old = createGame(1, NOW);
    const { legend: _l, ...profile } = old.profile;
    expect(deserialize(JSON.stringify({ ...old, version: 7, profile })).profile.legend).toEqual({});
  });
});
