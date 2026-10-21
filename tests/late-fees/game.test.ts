import { describe, it, expect } from 'vitest';
import { advance, catchUp, createLateGame, newLateGame, type LateGame } from '../../src/late-fees/game';
import { availableEndings, chooseTape, completeRun, runConfigFor, sequelTitle, TAPES } from '../../src/late-fees/sequels';
import { lateSaves, LATE_SAVE_KEY } from '../../src/late-fees/save';
import { reduce } from '../../src/late-fees/store';
import { COUNSELORS, LIGHTS } from '../../src/late-fees-data/camp';
import { CAMP_UPGRADES } from '../../src/late-fees-data/camp-upgrades';
import type { CampRun } from '../../src/late-fees/state';

const NOW = 1_000_000;
const camp = (g: LateGame) => g.run as CampRun;
const finished = (patch: Partial<CampRun> = {}): LateGame => {
  const g = createLateGame(1, NOW);
  return { ...g, run: { ...g.run, flags: ['terminus'], bodyCount: 57, elapsed: 4 * 3600, deepest: 12, ...patch } as LateGame['run'] };
};

describe('the shelf at Late Fees Video', () => {
  it('opens a new game on the shelf, waiting for a tape to be picked', () => {
    expect(newLateGame(1, NOW).shelf).toBe(true);
  });

  it('stocks all four originals: Friday the 12th, A Nightmare on Sycamore Street, Penultimate Destination and Candy Corn Day', () => {
    const originals = TAPES.filter((t) => t.available && !t.crossover).map((t) => t.venue);
    expect(originals).toEqual(['camp', 'clinic', 'insurer', 'asylum']);
    expect(TAPES.length).toBeGreaterThanOrEqual(3);
  });

  it('starts the tape that is picked', () => {
    const g = chooseTape(newLateGame(1, NOW), 'camp', 5);
    expect(g.shelf).toBe(false);
    expect(g.run.venue).toBe('camp');
    expect(g.run.seed).toBe(5);
  });

  it('does not let time pass while the shelf is open', () => {
    const g = newLateGame(1, NOW);
    expect(advance(g, 60).run.elapsed).toBe(0);
  });
});

describe('sequels', () => {
  it('offers the endings once the credits roll: burning it down only after a few sequels', () => {
    expect(availableEndings(createLateGame(1, NOW))).toEqual([]);
    expect(availableEndings(finished())).toEqual(['kill', 'sell']);
    const veteran = { ...finished(), profile: { ...finished().profile, sequels: 3 } };
    expect(availableEndings(veteran)).toContain('burn');
  });

  it('banks the film in the franchise and puts the sequel on the shelf', () => {
    const g = completeRun(finished(), 'kill', 9);
    expect(g.profile.sequels).toBe(1);
    expect(g.profile.boxOffice).toBeGreaterThan(0);
    expect(g.profile.history.at(-1)).toMatchObject({ venue: 'camp', ending: 'kill', bodyCount: 57 });
    expect(g.shelf).toBe(true);
  });

  it('pays more for selling the story than for putting him back in the lake', () => {
    expect(completeRun(finished(), 'sell', 9).profile.boxOffice).toBeGreaterThan(completeRun(finished(), 'kill', 9).profile.boxOffice);
  });

  it('makes each sequel richer and the killer stronger, with the genre\'s titles', () => {
    const after = completeRun(finished(), 'kill', 9).profile;
    const config = runConfigFor(after, 'camp');
    expect(config.part).toBe(2);
    expect(config.productionMultiplier).toBeGreaterThan(1);
    expect(config.pressureBonus).toBeGreaterThan(0);
    expect(sequelTitle('FRIDAY THE 12TH', 1)).toBe('FRIDAY THE 12TH');
    expect(sequelTitle('FRIDAY THE 12TH', 2)).toBe('FRIDAY THE 12TH PART II');
    expect(sequelTitle('FRIDAY THE 12TH', 4)).toBe('FRIDAY THE 12TH: THE FINAL CHAPTER');
  });

  it('ignores an ending that is not on offer', () => {
    const g = createLateGame(1, NOW);
    expect(completeRun(g, 'kill', 9)).toBe(g);
    expect(completeRun(finished(), 'burn', 9)).toEqual(finished());
  });
});

describe('time away', () => {
  it('keeps the camp running while the player is away, capped', () => {
    const g = { ...createLateGame(1, NOW), savedAt: NOW - 600_000 };
    expect(catchUp(g, NOW).run.elapsed).toBeGreaterThan(0);
  });
});

describe('saves', () => {
  it('round-trips through its own storage key', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const g = chooseTape(newLateGame(1, NOW), 'camp', 3);
    lateSaves.saveGame(storage, g, NOW);
    expect(store.has(LATE_SAVE_KEY)).toBe(true);
    expect(lateSaves.loadGame(storage, NOW, 1).game.run.seed).toBe(3);
  });
});

describe('player orders', () => {
  it('routes whistle, hiring, lights, towers, the split, the head counselor and the store', () => {
    let g = { ...createLateGame(1, NOW) };
    g = { ...g, run: { ...g.run, cash: 1e9, lifetimeCash: 1e9 } as LateGame['run'] };
    g = reduce(g, { type: 'whistle' });
    expect(camp(g).zones[0]!.control).toBeGreaterThan(0);
    g = reduce(g, { type: 'hire', id: COUNSELORS[0]!.id });
    expect(camp(g).counselors[COUNSELORS[0]!.id]).toBe(1);
    g = reduce(g, { type: 'buyLight', id: LIGHTS[0]!.id });
    expect(camp(g).lights[LIGHTS[0]!.id]).toBe(1);
    g = reduce(g, { type: 'buyTower' });
    expect(camp(g).towers).toBe(1);
    const share = camp(g).prepShare;
    g = reduce(g, { type: 'shiftSplit', step: -1 });
    expect(camp(g).prepShare).toBe(share - 1);
    const head = CAMP_UPGRADES.find((u) => u.effect.kind === 'headCounselor')!;
    g = reduce(g, { type: 'buyUpgrade', id: head.id });
    expect(camp(g).upgrades).toContain(head.id);
    g = reduce(g, { type: 'toggleHead' });
    expect(camp(g).headOff).toBe(true);
  });
});

describe('clinic orders', () => {
  it('routes readings, beds, staff, the dial, suppressant, automated monitoring and the store', async () => {
    const { BEDS, STAFF } = await import('../../src/late-fees-data/clinic');
    const { CLINIC_UPGRADES } = await import('../../src/late-fees-data/clinic-upgrades');
    type K = import('../../src/late-fees/state').ClinicRun;
    const k = (g: LateGame) => g.run as K;
    let g = chooseTape(newLateGame(1, NOW), 'clinic', 4);
    g = { ...g, run: { ...g.run, cash: 1e9, lifetimeCash: 1e9 } as LateGame['run'] };
    const before = g.run.cash;
    g = reduce(g, { type: 'reading' });
    expect(g.run.cash).toBeGreaterThan(before);
    g = reduce(g, { type: 'buyBed', id: BEDS[0]!.id });
    expect(k(g).beds[BEDS[0]!.id]).toBe(1);
    g = reduce(g, { type: 'hireStaff', id: STAFF[0]!.id });
    expect(k(g).staff[STAFF[0]!.id]).toBe(1);
    const share = k(g).remShare;
    g = reduce(g, { type: 'shiftRem', step: 1 });
    expect(k(g).remShare).toBe(share + 1);
    g = reduce(g, { type: 'buySuppressant' });
    expect(k(g).suppressant).toBe(1);
    const auto = CLINIC_UPGRADES.find((u) => u.effect.kind === 'autoDial')!;
    g = reduce(g, { type: 'buyUpgrade', id: auto.id });
    expect(k(g).upgrades).toContain(auto.id);
    g = reduce(g, { type: 'toggleDial' });
    expect(k(g).dialOff).toBe(true);
  });

  it('ignores camp orders on a clinic tape, and clinic orders at the camp', () => {
    const clinic = chooseTape(newLateGame(1, NOW), 'clinic', 4);
    expect(reduce(clinic, { type: 'whistle' })).toBe(clinic);
    const camp = createLateGame(1, NOW);
    expect(reduce(camp, { type: 'reading' })).toBe(camp);
  });
});

describe('insurer orders', () => {
  it('routes sales, policies, prevention, the appetite dial, the mainframe and the store', async () => {
    const { POLICIES, AGENTS } = await import('../../src/late-fees-data/insurer');
    const { INSURER_UPGRADES } = await import('../../src/late-fees-data/insurer-upgrades');
    type I = import('../../src/late-fees/state').InsurerRun;
    const i = (g: LateGame) => g.run as I;
    let g = chooseTape(newLateGame(1, NOW), 'insurer', 4);
    g = { ...g, run: { ...g.run, cash: 1e9, lifetimeCash: 1e9 } as LateGame['run'] };
    const before = g.run.cash;
    g = reduce(g, { type: 'sell' });
    expect(g.run.cash).toBeGreaterThan(before);
    g = reduce(g, { type: 'buyPolicy', id: POLICIES[0]!.id });
    expect(i(g).policies[POLICIES[0]!.id]).toBe(1);
    g = reduce(g, { type: 'hireAgent', id: AGENTS[0]!.id });
    expect(i(g).agents[AGENTS[0]!.id]).toBe(1);
    const appetite = i(g).appetite;
    g = reduce(g, { type: 'shiftAppetite', step: -1 });
    expect(i(g).appetite).toBe(appetite - 1);
    const mainframe = INSURER_UPGRADES.find((u) => u.effect.kind === 'actuary')!;
    g = reduce(g, { type: 'buyUpgrade', id: mainframe.id });
    expect(i(g).upgrades).toContain(mainframe.id);
    g = reduce(g, { type: 'toggleActuary' });
    expect(i(g).actuaryOff).toBe(true);
  });
});
