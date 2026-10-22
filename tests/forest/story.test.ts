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
        hired: { blade: 3, mender: 1, scout: 1, mystic: 0, sapper: 0 },
        lifetimeRelics: 5_000,
        lifetimeSilver: 5_000,
        lifetimeDead: 1,
        blight: 12,
        charted: 1.5,
        upgrades: ['quartermaster'],
        parties: [],
      }),
    );
    // Later-charter beats (cycle-*) can't fire on a first charter.
    const act1 = FOREST_STORY.filter((b) => (b.act ?? 1) === 1 && !b.id.startsWith('cycle-') && !b.id.startsWith('keep-'));
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
    const c = fresh({ hired: { blade: 1, mender: 0, scout: 0, mystic: 0, sapper: 0 }, silver: 1e6 });
    let next = c;
    for (let i = 0; i < 30; i++) next = tickCompany(next, 1);
    expect(Object.keys(next.beats).length).toBeGreaterThan(0);
  });
});

describe('later acts', () => {
  it('can reach every Act II-IV entry by playing a charter through to its reckoning', () => {
    let c = fresh({
      silver: 1e9,
      relics: 1_000,
      lifetimeRelics: 1e9,
      lifetimeDead: 10,
      blight: 30,
      charted: REGIONS[2]!.opensAt,
    });
    const step = (patch: Partial<Company>, times = 40) => {
      for (let i = 0; i < times; i++) c = runForestStory({ ...c, ...patch, elapsed: c.elapsed + FOREST_STORY_GAP + 61 });
    };
    step({});
    step({ charted: 99, keyFragments: 1 });
    step({ keyFragments: 3 });
    step({ keyFragments: 7 }, 60);
    const later = FOREST_STORY.filter((b) => (b.act ?? 1) >= 2 && !b.id.startsWith('keep-'));
    expect(later.filter((b) => c.beats[b.id] === undefined).map((b) => b.id)).toEqual([]);
    expect(c.flags).toContain('terminus');
  });

  it('writes a Keep charter its own entries, and never sends its hands past the forest\'s landmarks', () => {
    let c = createCompany(1, undefined, 'keep');
    c = { ...c, silver: 1e9, lifetimeRelics: 1e9, lifetimeSilver: 1e9, lifetimeDead: 10, blight: 30, hired: { blade: 9, mender: 1, scout: 1, mystic: 0, sapper: 0 } };
    const step = (patch: Partial<Company>, times = 40) => {
      for (let i = 0; i < times; i++) c = runForestStory({ ...c, ...patch, elapsed: c.elapsed + FOREST_STORY_GAP + 61 });
    };
    step({ charted: 2, posted: c.posted.map((_, i) => (i === 0 ? 1 : 0)) });
    step({ charted: 12 });
    step({ charted: 31, keyFragments: 1 });
    step({ keyFragments: 3 });
    step({ keyFragments: 7 }, 60);
    const keepBeats = FOREST_STORY.filter((b) => b.id.startsWith('keep-'));
    expect(keepBeats.length).toBeGreaterThanOrEqual(4);
    expect(keepBeats.filter((b) => c.beats[b.id] === undefined).map((b) => b.id)).toEqual([]);
    for (const id of ['carved-arch', 'thornmaze-antlers', 'undercity-hours']) expect(c.beats[id]).toBeUndefined();
    expect(c.flags).toContain('terminus');
  });
});
