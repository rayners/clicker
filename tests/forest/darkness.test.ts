import { describe, it, expect } from 'vitest';
import { createCompany, type Company } from '../../src/forest/state';
import { dangerMultiplier, dispatch, project, tickCompany, KEY_FRAGMENTS, TURN_THRESHOLD } from '../../src/forest/company';
import { REGIONS } from '../../src/forest-data/regions';

const fresh = (patch: Partial<Company> = {}): Company => ({ ...createCompany(1), ...patch });
const run = (c: Company, seconds: number) => {
  let next = c;
  for (let t = 0; t < seconds; t++) next = tickCompany(next, 1);
  return next;
};
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
const undercity = REGIONS.find((r) => r.id === 'undercity')!;
const eaves = REGIONS[0]!;

describe('turning (blight with teeth)', () => {
  const crowded = (blight: number) => fresh({ silver: 1e9, blight, hired: { blade: 30, mender: 5, scout: 5, mystic: 5 } });

  it('leaves hands alone below the threshold', () => {
    expect(sum(run(crowded(TURN_THRESHOLD - 5), 300).hired)).toBe(45);
  });

  it('takes hands into the wood above it, faster the higher the blight', () => {
    const mild = run(crowded(TURN_THRESHOLD + 10), 600);
    const severe = run(crowded(95), 600);
    expect(sum(mild.hired)).toBeLessThan(45);
    expect(sum(severe.hired)).toBeLessThan(sum(mild.hired));
    expect(severe.turned).toBe(45 - sum(severe.hired));
    expect(severe.log.some((e) => e.kind === 'omen' && /turned|walked into the wood/i.test(e.text))).toBe(true);
  });

  it('makes the whole wood more dangerous for every hand it has taken', () => {
    const comp = { blade: 4, mender: 1, scout: 1, mystic: 0 };
    expect(project(fresh({ turned: 10 }), eaves, comp).danger).toBeCloseTo(project(fresh(), eaves, comp).danger * dangerMultiplier(fresh({ turned: 10 })));
    expect(dangerMultiplier(fresh({ turned: 10 }))).toBeGreaterThan(1);
  });
});

describe('the Ashen Key', () => {
  const deep = (rng: number) =>
    fresh({
      rng,
      silver: 1e12,
      charted: undercity.opensAt,
      buildings: { appraisal: 0, armoury: 20, hospice: 0, chapel: 0 },
      hired: { blade: 10, mender: 2, scout: 2, mystic: 2 },
      orders: { ...fresh().orders, undercity: { blade: 6, mender: 1, scout: 1, mystic: 1 } },
    });

  it('has fragments to find in the deepest regions only', () => {
    expect(KEY_FRAGMENTS).toBe(7);
    let found = 0;
    for (let seed = 1; seed <= 20; seed++) found += run(dispatch(deep(seed), 'undercity'), 400).keyFragments;
    expect(found).toBeGreaterThan(0);
    const shallow = run(dispatch(fresh({ silver: 1e9, hired: { blade: 5, mender: 0, scout: 1, mystic: 0 } }), eaves.id), 200);
    expect(shallow.keyFragments).toBe(0);
  });

  it('logs the first fragment, which opens Act III', () => {
    let c: Company | undefined;
    for (let seed = 1; seed <= 40 && !c; seed++) {
      const back = run(dispatch(deep(seed), 'undercity'), 400);
      if (back.keyFragments > 0) c = back;
    }
    const after = run({ ...c!, parties: [] }, 120);
    expect(after.act).toBeGreaterThanOrEqual(3);
    expect(after.log.some((e) => /key/i.test(e.text))).toBe(true);
  });

  it('raises blight just by being held', () => {
    expect(run(fresh({ keyFragments: 3 }), 120).blight).toBeGreaterThan(run(fresh(), 120).blight);
  });

  it('wakes the wood at three fragments (Act IV), and the wood grows more dangerous by the minute', () => {
    const woken = run(fresh({ act: 3, keyFragments: 3 }), 120);
    expect(woken.act).toBe(4);
    const later = run(woken, 1200);
    expect(dangerMultiplier(later)).toBeGreaterThan(dangerMultiplier(woken));
  });

  it('opens the terminus with every fragment, or once the wood has been awake long enough', () => {
    expect(run(fresh({ act: 4, keyFragments: KEY_FRAGMENTS, beats: { 'act-4': 0 } }), 60).flags).toContain('terminus');
    const waited = run(fresh({ act: 4, keyFragments: 3, beats: { 'act-4': 0 } }), 80 * 60);
    expect(waited.flags).toContain('terminus');
  });
});
