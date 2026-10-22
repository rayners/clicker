import { describe, it, expect } from 'vitest';
import { createForestGame } from '../../src/forest/game';
import { endWood, startWood } from '../../src/forest/wood';
import { endDragon, wakeDragon } from '../../src/forest/dragon';
import { reduce } from '../../src/forest/store';
import { forestSaves } from '../../src/forest/save';
import { charterEvents } from '../../src/forest/telemetry';

const NOW = 1_000_000;

describe('Legend in the Elderdark', () => {
  it('ends the wood\'s hunt for Legend, and the next wood wakes stronger for it', () => {
    const g = startWood(createForestGame(1, NOW), 7);
    const fed = { ...g, wood: { ...g.wood!, hunt: { ...g.wood!.hunt, harvest: 400 } } };
    const ended = endWood(fed);
    expect(ended.wood).toBeNull();
    expect(ended.mode).toBe('charter');
    expect(ended.profile.legend.wood).toBe(4);
    expect(startWood(ended, 8).wood!.hunt.strength).toBe(g.wood!.hunt.strength + 2);
    expect(charterEvents(fed, ended)).toEqual([{ name: 'hunt_ended', props: { horror: 'wood', harvest: 400, legend: 4 } }]);
  });

  it('keeps the dragon\'s Legend apart from the wood\'s', () => {
    const g = wakeDragon(createForestGame(1, NOW), 7);
    const fed = { ...g, dragon: { ...g.dragon!, hunt: { ...g.dragon!.hunt, harvest: 900 } } };
    const ended = endDragon(fed);
    expect(ended.dragon).toBeNull();
    expect(ended.profile.legend).toEqual({ dragon: 6 });
    expect(charterEvents(fed, ended)).toEqual([{ name: 'hunt_ended', props: { horror: 'dragon', harvest: 900, legend: 6 } }]);
  });

  it('takes the orders, and older saves start with no Legend', () => {
    expect(reduce(startWood(createForestGame(1, NOW), 7), { type: 'endWood' }).wood).toBeNull();
    expect(reduce(wakeDragon(createForestGame(1, NOW), 7), { type: 'endDragon' }).dragon).toBeNull();
    const old = createForestGame(1, NOW);
    const { legend: _l, ...profile } = old.profile;
    expect(forestSaves.deserialize(JSON.stringify({ ...old, version: 10, profile })).profile.legend).toEqual({});
  });
});
