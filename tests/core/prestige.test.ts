import { describe, it, expect } from 'vitest';
import { createGame, type GameState } from '../../src/core/game';
import {
  availableEndings,
  endingRewards,
  completeContract,
  isBoardroomUnlocked,
  BOARDROOM_UNLOCK_CONTRACTS,
  missionConfigFor,
} from '../../src/core/prestige';
import { oreRate } from '../../src/mission/extraction/economy';
import { maxAwake } from '../../src/mission/crew';
import { CREW } from '../../src/data/crew';

const NOW = 5_000;

const atTerminus = (patch: Partial<GameState['mission']> = {}, profile: Partial<GameState['profile']> = {}): GameState => {
  const g = createGame(1, NOW);
  return {
    ...g,
    profile: { ...g.profile, ...profile },
    mission: { ...g.mission, act: 4, flags: ['terminus'], lifetimeOre: 5e10, specimens: 12.5, ...patch } as typeof g.mission,
  };
};

describe('available endings', () => {
  it('none before the terminus', () => {
    expect(availableEndings(createGame(1, NOW))).toEqual([]);
  });

  it('deliver or scuttle at the terminus', () => {
    expect(availableEndings(atTerminus())).toEqual(['deliver', 'scuttle']);
  });

  it('a third way opens for a WARDEN with enough conscience and history', () => {
    expect(availableEndings(atTerminus({}, { contractsCompleted: 3, conscience: 3 }))).toEqual(['deliver', 'scuttle', 'broadcast']);
    expect(availableEndings(atTerminus({}, { contractsCompleted: 3, conscience: 2 }))).not.toContain('broadcast');
    expect(availableEndings(atTerminus({}, { contractsCompleted: 2, conscience: 9 }))).not.toContain('broadcast');
  });
});

describe('rewards', () => {
  it('delivering pays seniority for the specimens aboard', () => {
    expect(endingRewards(atTerminus({ specimens: 12.5 })).deliver).toEqual({ seniority: 3, conscience: 0 });
    expect(endingRewards(atTerminus({ specimens: 0 })).deliver).toEqual({ seniority: 1, conscience: 0 });
  });

  it('scuttling pays conscience for every crew member still alive', () => {
    const g = atTerminus();
    const lostTwo = { ...g.mission.crew, lam: { status: 'lost' as const, fatigue: 0 }, kane: { status: 'lost' as const, fatigue: 0 } };
    expect(endingRewards(atTerminus({ crew: lostTwo })).scuttle).toEqual({ seniority: 0, conscience: 1 + CREW.length - 2 });
  });

  it('broadcasting pays both', () => {
    const r = endingRewards(atTerminus()).broadcast;
    expect(r.seniority).toBeGreaterThan(0);
    expect(r.conscience).toBeGreaterThan(0);
  });
});

describe('completing a contract', () => {
  it('is refused before the terminus or for an unavailable ending', () => {
    const early = createGame(1, NOW);
    expect(completeContract(early, 'deliver', 2)).toBe(early);
    const g = atTerminus();
    expect(completeContract(g, 'broadcast', 2)).toBe(g);
  });

  it('banks the reward and records the contract', () => {
    const g = completeContract(atTerminus(), 'deliver', 2);
    expect(g.profile.contractsCompleted).toBe(1);
    expect(g.profile.deliveries).toBe(1);
    expect(g.profile.seniority).toBe(3);
    expect(g.profile.endingsSeen).toEqual(['deliver']);
    expect(g.profile.history).toHaveLength(1);
    expect(g.profile.history[0]).toMatchObject({ shipName: 'MSV Calloway Reach', ending: 'deliver', specimens: 12 });
  });

  it('only counts deliveries for delivering', () => {
    expect(completeContract(atTerminus(), 'scuttle', 2).profile.deliveries).toBe(0);
  });

  it('starts a fresh mission aboard a new ship', () => {
    const g = completeContract(atTerminus(), 'scuttle', 2);
    expect(g.mission.elapsed).toBe(0);
    expect(g.mission.act).toBe(1);
    expect(g.mission.credits).toBe(0);
    expect(g.mission.config.shipName).not.toBe('MSV Calloway Reach');
  });

  it('remembers each ending only once', () => {
    let g = completeContract(atTerminus(), 'deliver', 2);
    g = completeContract({ ...g, mission: { ...g.mission, flags: ['terminus'] } }, 'deliver', 3);
    expect(g.profile.endingsSeen).toEqual(['deliver']);
    expect(g.profile.contractsCompleted).toBe(2);
  });
});

describe('what carries over', () => {
  it('seniority multiplies production on later contracts', () => {
    const veteran = createGame(1, NOW);
    const config = missionConfigFor({ ...veteran.profile, seniority: 4 });
    const gens = { ...veteran.mission.generators, drone: 10 };
    const plain = { ...veteran.mission, generators: gens };
    const boosted = { ...plain, config };
    expect(oreRate(boosted)).toBeCloseTo(oreRate(plain) * 2);
  });

  it('conscience adds life support for waking crew, up to the whole crew', () => {
    const p = createGame(1, NOW).profile;
    const m = createGame(1, NOW).mission;
    expect(maxAwake({ ...m, config: missionConfigFor({ ...p, conscience: 2 }) })).toBe(5);
    expect(maxAwake({ ...m, config: missionConfigFor({ ...p, conscience: 50 }) })).toBe(CREW.length);
  });

  it('conscience makes incidents rarer', () => {
    const p = createGame(1, NOW).profile;
    expect(missionConfigFor({ ...p, conscience: 3 }).incidentMultiplier).toBeLessThan(1);
  });
});

describe('the Boardroom (future layer)', () => {
  it(`unlocks after ${BOARDROOM_UNLOCK_CONTRACTS} completed contracts`, () => {
    const p = createGame(1, NOW).profile;
    expect(isBoardroomUnlocked({ ...p, contractsCompleted: BOARDROOM_UNLOCK_CONTRACTS - 1 })).toBe(false);
    expect(isBoardroomUnlocked({ ...p, contractsCompleted: BOARDROOM_UNLOCK_CONTRACTS })).toBe(true);
  });
});
