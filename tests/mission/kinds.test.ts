import { describe, it, expect } from 'vitest';
import { composeMission, createMission, DEFAULT_MISSION_CONFIG, type MissionConfig, type MissionState } from '../../src/mission/state';
import { tickMission, tickWith } from '../../src/mission/tick';
import { SCENARIOS, HORRORS, scenarioOf } from '../../src/mission/registry';
import type { ScenarioDef } from '../../src/mission/kinds';
import { placeholders } from '../../src/shared/lexicon';

const horrorTexts = (h: (typeof HORRORS)[keyof typeof HORRORS]) => [
  ...h.beats.flatMap((b) => b.entries.map((e) => e.text)),
  ...h.archive.flatMap((f) => [f.title, ...f.body]),
  ...Object.values(h.endings).flatMap((e) => [e.title, e.text]),
];

/** A scenario with no economy at all: progress simply rises with time, and every phrase is a marker. */
const stubLexicon = Object.fromEntries(Object.values(HORRORS).flatMap(horrorTexts).flatMap(placeholders).map((k) => [k, `<${k}>`]));

const STUB: ScenarioDef = {
  id: 'stub',
  fields: () => ({ stubProgress: 0 }),
  boot: () => ['STUB ONLINE'],
  tick: (m, dt) => {
    const s = m as MissionState & { stubProgress: number };
    return { ...s, stubProgress: s.stubProgress + dt, credits: s.credits + dt, lifetimeCredits: s.lifetimeCredits + dt };
  },
  signals: (m) => {
    const p = (m as MissionState & { stubProgress: number }).stubProgress;
    return { progress: p, deepAccess: p >= 3000 };
  },
  lexicon: stubLexicon,
  beats: [],
  directives: [],
  metric: () => 0,
  archive: [],
  crewBoostText: {},
  loseEquipment: () => null,
  outcome: () => ({ output: 0, outputUnit: 'STUB' }),
};

const stubConfig = { ...DEFAULT_MISSION_CONFIG, scenario: 'stub' } as unknown as MissionConfig;

function run(m: MissionState, seconds: number, scenario = scenarioOf(m)): MissionState {
  let next = m;
  for (let t = 0; t < seconds; t += 5) next = tickWith(next, 5, { cycle: 0, endings: [] }, scenario, HORRORS[next.horror]);
  return next;
}

describe('scenarios and horrors are independent (no hard coupling)', () => {
  it('runs the organism horror on a scenario it has never heard of, using only signals and the lexicon', () => {
    let m = composeMission(stubConfig, 1, STUB, HORRORS.organism);
    m = run(m, 1_200, STUB);
    expect(m.act).toBe(2);
    const text = m.log.map((e) => e.text).join('\n');
    expect(text).toContain('<actTwoEntry>');
    expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it('lets the organism horror reach its discovery act once the stub scenario reports deep access', () => {
    let m = composeMission(stubConfig, 1, STUB, HORRORS.organism);
    m = run(m, 3_400, STUB);
    expect(m.act).toBe(3);
  });

  it('runs the outbreak on a scenario it has never heard of: a flu in act two, the discovery, the turned, and a terminus', () => {
    let m = composeMission(stubConfig, 1, STUB, HORRORS.outbreak);
    m = run(m, 1_200, STUB);
    expect(m.act).toBe(2);
    m = run(m, 2_400, STUB);
    expect(m.act).toBe(3);
    m = run(m, 3 * 3_600, STUB);
    expect(m.act).toBe(4);
    expect(m.flags).toContain('terminus');
    const text = m.log.map((e) => e.text).join('\n');
    expect(text).toContain('<voidBreach>');
    expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it('runs a scenario under the quiet horror with no story beyond the corporate one', () => {
    let m = createMission({ ...DEFAULT_MISSION_CONFIG, horror: 'quiet' }, 1);
    m = { ...m, lifetimeOre: 1e12 };
    for (let i = 0; i < 200; i++) m = tickMission({ ...m, elapsed: m.elapsed + 30 }, 1);
    expect(m.act).toBe(1);
    expect(m.log.some((e) => e.kind === 'anomaly')).toBe(false);
  });

  it('gives every scenario a phrase for every placeholder the horrors use', () => {
    for (const horror of Object.values(HORRORS)) {
      const needed = new Set(horrorTexts(horror).flatMap(placeholders));
      for (const scenario of Object.values(SCENARIOS)) {
        const missing = [...needed].filter((k) => !(k in scenario.lexicon));
        expect({ scenario: scenario.id, horror: horror.id, missing }).toEqual({ scenario: scenario.id, horror: horror.id, missing: [] });
      }
    }
  });

  it('only uses pairing beats for the scenario they are written for', () => {
    for (const horror of Object.values(HORRORS)) {
      for (const id of Object.keys(horror.pairings)) expect(Object.keys(SCENARIOS)).toContain(id);
    }
  });

  it('keeps horror state out of a quiet contract entirely', () => {
    const m = createMission({ ...DEFAULT_MISSION_CONFIG, horror: 'quiet' }, 1);
    expect('specimens' in m).toBe(false);
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });
});
