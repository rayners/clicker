import { describe, it, expect } from 'vitest';
import { createForestGame, type ForestGame } from '../../src/forest/game';
import { reduce } from '../../src/forest/store';
import { charterEvents, charterProperties } from '../../src/forest/telemetry';
import { startWood } from '../../src/forest/wood';
import { REGIONS } from '../../src/forest-data/regions';
import type { Company } from '../../src/forest/state';

const game = (patch: Partial<Company> = {}): ForestGame => {
  const g = createForestGame(1, 0);
  return { ...g, company: { ...g.company, ...patch } };
};
const company = (g: ForestGame, patch: Partial<Company>): ForestGame => ({ ...g, company: { ...g.company, ...patch } });
const hollows = REGIONS[1]!;

describe('Elderdark play events', () => {
  it('reports upgrades bought and story beats seen on the way to the first act', () => {
    const before = game({ elapsed: 120 });
    const after = company(before, { upgrades: [...before.company.upgrades, 'x'], beats: { ...before.company.beats, memo: 120 } });
    expect(charterEvents(before, after).map((e) => e.name)).toEqual(['upgrade_bought', 'beat_seen']);
  });

  it('reports nothing for an ordinary tick', () => {
    const g = game();
    expect(charterEvents(g, reduce(g, { type: 'tick', dt: 1 }))).toEqual([]);
  });

  it('reports a region of the wood opening, with how long it took', () => {
    const before = game({ charted: hollows.opensAt - 0.1, elapsed: 1200 });
    const after = company(before, { charted: hollows.opensAt });
    expect(charterEvents(before, after)).toEqual([{ name: 'region_opened', props: { region: hollows.id, minutes: 20, charter: 1 } }]);
  });

  it('reports each act reached', () => {
    const before = game({ act: 1, elapsed: 3300 });
    expect(charterEvents(before, company(before, { act: 2 }))).toEqual([{ name: 'act_reached', props: { act: 2, minutes: 55, charter: 1 } }]);
  });

  it('reports each fragment of the Ashen Key found', () => {
    const before = game({ keyFragments: 2, elapsed: 600 });
    expect(charterEvents(before, company(before, { keyFragments: 3 }))).toEqual([{ name: 'key_fragment_found', props: { fragments: 3, minutes: 10, charter: 1 } }]);
  });

  it('reports a charter completed, with the ending chosen', () => {
    const due = game({ flags: ['terminus'], elapsed: 4 * 3600 });
    const done = reduce(due, { type: 'completeCharter', ending: 'sell', seed: 4 });
    expect(charterEvents(due, done)[0]).toMatchObject({ name: 'charter_completed', props: { ending: 'sell', minutes: 240, charter: 1 } });
  });

  it('reports listening to the wood, and each time a charter beats it back', () => {
    const g = game();
    const listening = startWood(g, 5);
    expect(charterEvents(g, listening)).toEqual([{ name: 'wood_started', props: {} }]);
    const beaten = { ...listening, wood: { ...listening.wood!, hunt: { ...listening.wood!.hunt, beaten: 1, harvest: 20 } } };
    expect(charterEvents(listening, beaten)).toEqual([{ name: 'wood_beaten', props: { beaten: 1, harvest: 20 } }]);
  });

  it('describes the player for every event: game, charter and how far along', () => {
    expect(charterProperties(game({ act: 2 }))).toEqual({ game: 'elderdark', act: 2, charter: 1 });
  });
});
