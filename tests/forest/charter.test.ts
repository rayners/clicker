import { describe, it, expect } from 'vitest';
import { createForestGame, type ForestGame } from '../../src/forest/game';
import { availableEndings, completeCharter, endingRewards } from '../../src/forest/charter';
import { createCompany } from '../../src/forest/state';
import { project, healRate } from '../../src/forest/company';
import { REGIONS } from '../../src/forest-data/regions';
import { reduce } from '../../src/forest/store';
import { FOREST_STORY_GAP, runForestStory } from '../../src/forest/story';

const NOW = 1_000;
const due = (patch: Partial<ForestGame['company']> = {}, profile: Partial<ForestGame['profile']> = {}): ForestGame => {
  const g = createForestGame(1, NOW);
  return {
    ...g,
    profile: { ...g.profile, ...profile },
    company: { ...g.company, flags: ['terminus'], keyFragments: 5, lifetimeRelics: 1e7, lifetimeDead: 12, elapsed: 15_000, hired: { blade: 20, mender: 3, scout: 4, mystic: 3, sapper: 0 }, ...patch },
  };
};

describe('the reckoning', () => {
  it('offers nothing until the charter comes due', () => {
    expect(availableEndings(createForestGame(1, NOW))).toEqual([]);
  });

  it('offers selling the Key or returning it; burning the ledger only to a Factor who has done this before', () => {
    expect(availableEndings(due())).toEqual(['sell', 'return']);
    expect(availableEndings(due({}, { chartersCompleted: 3, grace: 3 }))).toEqual(['sell', 'return', 'burn']);
  });

  it('rewards Renown for selling (more for more fragments) and Grace for returning (more for more hands alive)', () => {
    const r = endingRewards(due());
    expect(r.sell.renown).toBeGreaterThan(0);
    expect(r.sell.grace).toBe(0);
    expect(r.return.grace).toBeGreaterThan(0);
    expect(endingRewards(due({ keyFragments: 7 })).sell.renown).toBeGreaterThan(r.sell.renown);
    expect(endingRewards(due({ hired: { blade: 60, mender: 3, scout: 4, mystic: 3, sapper: 0 } })).return.grace).toBeGreaterThan(r.return.grace);
    expect(r.burn.renown).toBeGreaterThan(0);
    expect(r.burn.grace).toBeGreaterThan(0);
  });

  it('closes the charter: records it, keeps the profile, and starts a new company', () => {
    const g = due();
    const next = completeCharter(g, 'sell', 9);
    expect(next.profile.chartersCompleted).toBe(1);
    expect(next.profile.renown).toBe(endingRewards(g).sell.renown);
    expect(next.profile.history).toEqual([{ ending: 'sell', relics: 1e7, dead: 12, duration: 15_000, site: 'forest' }]);
    expect(next.company.elapsed).toBe(0);
    expect(next.company.seed).toBe(9);
    expect(next.company.charter).toEqual({ number: 2, renown: next.profile.renown, grace: 0 });
  });

  it('refuses an ending that is not on offer', () => {
    const g = due();
    expect(completeCharter(g, 'burn', 9)).toBe(g);
    const early = createForestGame(1, NOW);
    expect(completeCharter(early, 'sell', 9)).toBe(early);
  });

  it('is reachable through the store', () => {
    expect(reduce(due(), { type: 'completeCharter', ending: 'return', seed: 3 }).profile.grace).toBeGreaterThan(0);
  });
});

describe('what a charter carries forward', () => {
  const eaves = REGIONS[0]!;
  const comp = { blade: 3, mender: 1, scout: 1, mystic: 0, sapper: 0 };

  it('Renown brings bigger hauls', () => {
    const plain = createCompany(1);
    const renowned = createCompany(1, { number: 2, renown: 2, grace: 0 });
    expect(project(renowned, eaves, comp).haul).toBeCloseTo(project(plain, eaves, comp).haul * 1.5);
  });

  it('Grace keeps the blight off and the wounded mending', () => {
    const plain = createCompany(1);
    const graced = createCompany(1, { number: 2, renown: 0, grace: 2 });
    expect(project(graced, eaves, comp).blightPerHand).toBeLessThan(project(plain, eaves, comp).blightPerHand);
    expect(healRate(graced)).toBeGreaterThan(healRate(plain));
  });

  it('a later charter remembers the earlier ones', () => {
    let c = { ...createCompany(1, { number: 2, renown: 1, grace: 0 }), lifetimeRelics: 50 };
    for (let i = 0; i < 10; i++) c = runForestStory({ ...c, elapsed: c.elapsed + FOREST_STORY_GAP + 1 });
    expect(c.log.some((e) => /factor's own/i.test(e.text))).toBe(true);
  });
});

describe('choosing where the charter delves', () => {
  it('writes the next charter for the forest or for Morrowgate Keep, as the Factor chooses', () => {
    expect(completeCharter(due(), 'sell', 2).company.site).toBe('forest');
    const keep = reduce(due(), { type: 'completeCharter', ending: 'sell', seed: 2, site: 'keep' });
    expect(keep.company.site).toBe('keep');
    expect(keep.company.charter.number).toBe(2);
    expect(keep.profile.history.at(-1)!.site).toBe('forest');
  });

  it('can tear up the current charter for one at the other site, keeping what earlier charters earned but earning nothing', () => {
    const g = { ...createForestGame(1, NOW), profile: { ...createForestGame(1, NOW).profile, renown: 2, chartersCompleted: 1 } };
    const started = { ...g, company: createCompany(1, { number: 2, renown: 2, grace: 0 }) };
    const moved = reduce(started, { type: 'rewriteCharter', site: 'keep', seed: 5 });
    expect(moved.company.site).toBe('keep');
    expect(moved.company.charter).toEqual(started.company.charter);
    expect(moved.profile).toEqual(started.profile);
    expect(reduce(moved, { type: 'rewriteCharter', site: 'keep', seed: 6 })).toBe(moved);
  });
});
