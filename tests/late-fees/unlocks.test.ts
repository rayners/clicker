import { describe, it, expect } from 'vitest';
import { newLateGame, type LateGame } from '../../src/late-fees/game';
import { CROSSOVERS, CROSSOVER_UNLOCK_FILMS, CUT_UNLOCK_FILMS, isTapeStocked, ORIGINALS, tapeUnlock } from '../../src/late-fees/sequels';
import { reduce } from '../../src/late-fees/store';

const after = (n: number): LateGame => {
  const g = newLateGame(1, 0);
  return { ...g, profile: { ...g.profile, sequels: n } };
};
const stocked = (n: number) => ORIGINALS.filter((t) => isTapeStocked(after(n).profile, t)).map((t) => t.venue);

describe('the shelf fills up film by film', () => {
  it('stocks only the camp for a new member, then the clinic, the insurer and the asylum one film at a time', () => {
    expect(stocked(0)).toEqual(['camp']);
    expect(stocked(1)).toEqual(['camp', 'clinic']);
    expect(stocked(2)).toEqual(['camp', 'clinic', 'insurer']);
    expect(stocked(3)).toEqual(['camp', 'clinic', 'insurer', 'asylum']);
    expect(tapeUnlock(ORIGINALS.find((t) => t.venue === 'asylum')!)).toBe(3);
  });

  it('puts the crossovers out after four films', () => {
    expect(CROSSOVER_UNLOCK_FILMS).toBe(4);
    expect(isTapeStocked(after(3).profile, CROSSOVERS[0]!)).toBe(false);
    expect(isTapeStocked(after(4).profile, CROSSOVERS[0]!)).toBe(true);
  });

  it('will not rent a tape that is not on the shelf yet', () => {
    const g = after(0);
    expect(reduce(g, { type: 'chooseTape', venue: 'clinic', seed: 2 })).toBe(g);
    expect(reduce(after(1), { type: 'chooseTape', venue: 'clinic', seed: 2 }).run.venue).toBe('clinic');
  });

  it("keeps side B, the Killer's Cut, for members with two films behind them", () => {
    expect(CUT_UNLOCK_FILMS).toBe(2);
    expect(reduce(after(1), { type: 'startCut', killer: 'drowned', seed: 1 }).mode).toBe('films');
    expect(reduce(after(2), { type: 'startCut', killer: 'drowned', seed: 1 }).mode).toBe('cut');
  });
});
