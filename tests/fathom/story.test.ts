import { describe, it, expect } from 'vitest';
import { createOutfit, type Outfit } from '../../src/fathom/state';
import { FATHOM_STORY, runFathomStory, STORY_GAP } from '../../src/fathom/story';
import { tickOutfit } from '../../src/fathom/tick';
import { isBreachOpen } from '../../src/fathom/breach';
import { SOURCE_NOTCH } from '../../src/fathom-data/trench';

const fresh = (patch: Partial<Outfit> = {}): Outfit => ({ ...createOutfit(1), ...patch });
const play = (o: Outfit, steps = 80, patch: Partial<Outfit> = {}) => {
  let next = o;
  for (let i = 0; i < steps; i++) next = runFathomStory({ ...next, ...patch, elapsed: next.elapsed + STORY_GAP + 61 });
  return next;
};

describe('the season\'s story', () => {
  it('has unique beat ids and something to say in each', () => {
    expect(new Set(FATHOM_STORY.map((b) => b.id)).size).toBe(FATHOM_STORY.length);
    for (const b of FATHOM_STORY) expect(b.entries.every((e) => e.text.length > 0)).toBe(true);
  });

  it('stays small and coastal in act 1: no attack-voiced entries before something bigger turns up', () => {
    for (const b of FATHOM_STORY.filter((x) => (x.act ?? 1) === 1)) for (const e of b.entries) expect(e.kind).not.toBe('attack');
  });

  it('turns to act 2 at a thousand metres, when something bigger is seen', () => {
    expect(play(fresh({ lifetimeCash: 1e5 })).act).toBe(1);
    expect(play(fresh({ lifetimeCash: 1e9 })).act).toBe(2);
  });

  it('turns to act 3 only once the station reaches the source in the trench', () => {
    const deep = play(fresh({ lifetimeCash: 1e13 }));
    expect(deep.act).toBe(2);
    const source = play(fresh({ lifetimeCash: 1e13, modules: 1, stationDepth: SOURCE_NOTCH }), 10);
    expect(source.act).toBe(3);
  });

  it('opens the Breach in act 4, and rolls to the season\'s end after the kaiju come', () => {
    let o = play(fresh({ lifetimeCash: 1e13, modules: 1, stationDepth: SOURCE_NOTCH }), 120);
    expect(o.act).toBe(4);
    expect(isBreachOpen(o)).toBe(true);
    o = play(o, 120);
    expect(o.flags).toContain('terminus');
  });

  it('runs as part of the season tick', () => {
    let o = fresh({ lifetimeCash: 50, attractions: { ...fresh().attractions, umbrellas: 1 } });
    for (let t = 0; t < 120; t++) o = tickOutfit(o, 1);
    expect(Object.keys(o.beats).length).toBeGreaterThan(0);
  });
});
