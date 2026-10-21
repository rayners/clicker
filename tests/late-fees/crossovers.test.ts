import { describe, it, expect } from 'vitest';
import { createLateGame, newLateGame, type LateGame } from '../../src/late-fees/game';
import { CROSSOVERS, chooseTape, completeRun, endingFor, runConfigFor, TAPES } from '../../src/late-fees/sequels';
import { KILLERS, VENUES } from '../../src/late-fees/registry';
import { lateSaves } from '../../src/late-fees/save';
import { simulateLate } from '../../src/late-fees/bot';
import { placeholders, interpolate } from '../../src/shared/lexicon';
import type { Ending } from '../../src/late-fees/kinds';
import type { KillerId, VenueId } from '../../src/late-fees/state';

const NOW = 1_000_000;
const HOME: Record<VenueId, KillerId> = { camp: 'drowned', clinic: 'burned', insurer: 'design', asylum: 'patient' };
const venues = Object.keys(VENUES) as VenueId[];
const killers = Object.keys(KILLERS) as KillerId[];

describe('crossover tapes', () => {
  it('put every killer in every other killer\'s place: six crossovers on the shelf', () => {
    expect(CROSSOVERS).toHaveLength(venues.length * (killers.length - 1));
    for (const c of CROSSOVERS) expect(HOME[c.venue]).not.toBe(c.killer);
    expect(new Set(CROSSOVERS.map((c) => `${c.venue}:${c.killer}`)).size).toBe(CROSSOVERS.length);
    expect(CROSSOVERS.every((c) => TAPES.some((t) => t.venue === c.venue && t.killer === c.killer && t.available))).toBe(true);
  });

  it('start the chosen killer in the chosen place', () => {
    const g = chooseTape(newLateGame(1, NOW), 'camp', 5, 'burned');
    expect(g.run.venue).toBe('camp');
    expect(g.run.killer).toBe('burned');
    expect(g.run.config.title).toBe(CROSSOVERS.find((c) => c.venue === 'camp' && c.killer === 'burned')!.title);
  });

  it('give every place a phrase for everything every killer says there', () => {
    for (const k of killers) {
      const texts = KILLERS[k].beats.flatMap((b) => b.entries.map((e) => e.text));
      for (const v of venues) {
        const missing = texts.flatMap(placeholders).filter((p) => p !== 'victim' && !(p in VENUES[v].lexicon));
        expect(missing, `${k} at ${v}`).toEqual([]);
      }
    }
  });

  it('end every pairing in words that fit it: the killer says how it is stopped, the place says how the business ends', () => {
    for (const v of venues) {
      for (const k of killers) {
        const r = chooseTape(newLateGame(1, NOW), v, 1, k).run;
        for (const id of ['kill', 'sell', 'burn'] as Ending[]) {
          const e = endingFor(r, id);
          const text = interpolate(e.text, { ...VENUES[v].lexicon, nextPart: '2' });
          expect(placeholders(text), `${id} for ${k} at ${v}`).toEqual([]);
          expect(e.title.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('number sequels per pairing', () => {
    const g = chooseTape(newLateGame(1, NOW), 'camp', 5, 'burned');
    const done = completeRun({ ...g, run: { ...g.run, flags: ['terminus'] } }, 'kill', 6);
    expect(runConfigFor(done.profile, 'camp', 'burned').part).toBe(2);
    expect(runConfigFor(done.profile, 'camp', 'drowned').part).toBe(1);
  });
});

describe('old saves', () => {
  it('learn which killer each finished film had', () => {
    const g: LateGame = createLateGame(1, NOW);
    const old = JSON.stringify({ ...g, version: 1, profile: { ...g.profile, history: [{ venue: 'clinic', title: 'X', ending: 'kill', bodyCount: 3, duration: 10 }] } });
    const loaded = lateSaves.deserialize(old);
    expect(loaded.profile.history[0]!.killer).toBe('burned');
  });
});

describe('crossover pacing', () => {
  for (const c of CROSSOVERS) {
    it(`paces ${c.title} like the originals`, () => {
      const run = simulateLate({ seed: 7, venue: c.venue, killer: c.killer, maxSeconds: 9 * 3600 });
      const hours = (s: number | undefined) => (s === undefined ? Infinity : s / 3600);
      expect(hours(run.actAt[2])).toBeGreaterThan(35 / 60);
      expect(hours(run.actAt[2])).toBeLessThan(80 / 60);
      expect(hours(run.terminusAt)).toBeGreaterThan(3.75);
      expect(hours(run.terminusAt)).toBeLessThan(6);
    });
  }
});
