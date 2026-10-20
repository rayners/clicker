import { describe, it, expect } from 'vitest';
import { createCompany, type Company } from '../../src/forest/state';
import { FOREST_STORY, runForestStory, FOREST_STORY_GAP } from '../../src/forest/story';
import { tickCompany } from '../../src/forest/company';
import { REGIONS } from '../../src/forest-data/regions';

const fresh = (patch: Partial<Company> = {}): Company => ({ ...createCompany(1), ...patch });
const play = (c: Company, steps = 60) => {
  let next = c;
  for (let i = 0; i < steps; i++) next = runForestStory({ ...next, elapsed: next.elapsed + FOREST_STORY_GAP + 1 });
  return next;
};

describe('the Elderdark story', () => {
  it('has unique beat ids and something to say in each', () => {
    expect(new Set(FOREST_STORY.map((b) => b.id)).size).toBe(FOREST_STORY.length);
    for (const b of FOREST_STORY) expect(b.entries.every((e) => e.text.length > 0)).toBe(true);
  });

  it('writes Act I into the ledger as the company finds its feet', () => {
    const c = play(
      fresh({
        hired: { blade: 3, mender: 1, scout: 1, mystic: 0 },
        lifetimeRelics: 5_000,
        lifetimeSilver: 5_000,
        lifetimeDead: 1,
        blight: 12,
        charted: 1.5,
        upgrades: ['quartermaster'],
        parties: [],
      }),
    );
    const act1 = FOREST_STORY.filter((b) => (b.act ?? 1) === 1);
    expect(act1.filter((b) => c.beats[b.id] === undefined).map((b) => b.id)).toEqual([]);
  });

  it('is grim from the start, but keeps outright omens for later acts', () => {
    for (const b of FOREST_STORY.filter((x) => (x.act ?? 1) === 1)) for (const e of b.entries) expect(e.kind).not.toBe('omen');
  });

  it('turns to Act II when the company reaches the drowned barrows', () => {
    expect(play(fresh({ charted: REGIONS[2]!.opensAt - 0.1 })).act).toBe(1);
    expect(play(fresh({ charted: REGIONS[2]!.opensAt })).act).toBe(2);
  });

  it('runs as part of the company tick', () => {
    const c = fresh({ hired: { blade: 1, mender: 0, scout: 0, mystic: 0 }, silver: 1e6 });
    let next = c;
    for (let i = 0; i < 30; i++) next = tickCompany(next, 1);
    expect(Object.keys(next.beats).length).toBeGreaterThan(0);
  });
});
