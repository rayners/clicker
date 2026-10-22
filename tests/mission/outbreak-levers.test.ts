import { describe, it, expect } from 'vitest';
import { createMission, DEFAULT_MISSION_CONFIG, type MissionState, type OutbreakMission } from '../../src/mission/state';
import { horrorProductionMultiplier } from '../../src/mission/horrors';
import { tickOutbreak } from '../../src/mission/outbreak/spread';
import {
  buyCulture,
  buyScreening,
  buyWard,
  buyWellness,
  cultureCost,
  hireOfficer,
  lockdown,
  OFFICER_COST,
  screeningCost,
  wardCost,
  wellnessCost,
} from '../../src/mission/outbreak/levers';
import type { HorrorHooks } from '../../src/mission/kinds';
import { createGame } from '../../src/core/game';
import { reduce } from '../../src/core/store';

const RICH = 1e12;
const fresh = (patch: Partial<OutbreakMission> = {}): OutbreakMission =>
  ({ ...createMission({ ...DEFAULT_MISSION_CONFIG, horror: 'outbreak' }, 1), credits: RICH, ...patch }) as OutbreakMission;
const noHooks: HorrorHooks = { loseEquipment: () => null };
function run(m: OutbreakMission, seconds: number): OutbreakMission {
  let next = m;
  for (let t = 0; t < seconds; t += 1) next = tickOutbreak(next, 1, noHooks);
  return next;
}
const discovered = { act: 3, flags: ['outbreak'] };

describe('the sick bay levers', () => {
  it('offers the Wellness programme from act two, each level dearer, and it gets the sick back on shift sooner', () => {
    expect(buyWellness(fresh()).wellness).toBe(0);
    const bought = buyWellness(fresh({ act: 2 }));
    expect(bought.wellness).toBe(1);
    expect(bought.credits).toBe(RICH - wellnessCost(fresh()));
    expect(wellnessCost(bought)).toBeGreaterThan(wellnessCost(fresh()));
    const plain = run(fresh({ act: 2, sick: 0.2 }), 300);
    const well = run(fresh({ act: 2, sick: 0.2, wellness: 3 }), 300);
    expect(well.sick).toBeLessThan(plain.sick);
  });

  it('screens only after the discovery, and screening makes each tenth of quarantine work harder', () => {
    expect(buyScreening(fresh({ act: 2 })).screening).toBe(0);
    expect(buyScreening(fresh(discovered)).screening).toBe(1);
    expect(screeningCost(fresh({ screening: 1 }))).toBeGreaterThan(screeningCost(fresh()));
    const blind = run(fresh({ ...discovered, exposed: 0.05, quarantine: 4 }), 900);
    const screened = run(fresh({ ...discovered, exposed: 0.05, quarantine: 4, screening: 2 }), 900);
    expect(screened.exposed + screened.sick).toBeLessThan(blind.exposed + blind.sick);
  });

  it('keeps the sick on ward beds from turning', () => {
    expect(buyWard(fresh({ act: 2 })).wards).toBe(0);
    expect(buyWard(fresh(discovered)).wards).toBe(1);
    expect(wardCost(fresh({ wards: 1 }))).toBeGreaterThan(wardCost(fresh()));
    const open = run(fresh({ act: 4, flags: ['outbreak'], sick: 0.1 }), 300);
    const warded = run(fresh({ act: 4, flags: ['outbreak'], sick: 0.1, wards: 10 }), 300);
    expect(warded.turned).toBeLessThan(open.turned);
  });

  it('grows samples in culture tanks once Bioproducts asks: more money, and a more infectious strain', () => {
    expect(buyCulture(fresh(discovered)).cultures).toBe(0);
    const cultured = buyCulture(fresh({ ...discovered, flags: ['outbreak', 'cultures'] }));
    expect(cultured.cultures).toBe(1);
    expect(cultureCost(cultured)).toBeGreaterThan(cultureCost(fresh()));
    const grown = run(fresh({ act: 3, flags: ['cultures'], cultures: 5 }), 600);
    expect(grown.samples).toBeGreaterThan(0);
    expect(horrorProductionMultiplier(fresh({ samples: 25 }) as MissionState)).toBeGreaterThan(horrorProductionMultiplier(fresh() as MissionState));
    const plain = run(fresh({ act: 3, exposed: 0.05 }), 900);
    const tanks = run(fresh({ act: 3, exposed: 0.05, cultures: 10 }), 900);
    expect(tanks.exposed + tanks.sick).toBeGreaterThan(plain.exposed + plain.sick);
  });

  it('seals a section in act four: half the turned are shut in, and output suffers for a while', () => {
    expect(lockdown(fresh({ act: 3, turned: 0.2 })).turned).toBe(0.2);
    const sealed = lockdown(fresh({ act: 4, turned: 0.2 }));
    expect(sealed.turned).toBeCloseTo(0.1);
    expect(sealed.lockdowns).toBe(1);
    expect(horrorProductionMultiplier(sealed as MissionState)).toBeLessThan(horrorProductionMultiplier({ ...sealed, lockdownFor: 0 } as MissionState));
    expect(run(sealed, 600).lockdownFor).toBe(0);
  });

  it('hires an Infection Control Officer once, who holds the quarantine dial while it is going round and opens it when it is not', () => {
    const hired = hireOfficer(fresh(discovered));
    expect(hired.officer).toBe(true);
    expect(hired.credits).toBe(RICH - OFFICER_COST);
    expect(hireOfficer(hired)).toBe(hired);
    expect(hireOfficer(fresh({ act: 2 })).officer).toBe(false);
    expect(run({ ...hired, sick: 0.2 }, 1).quarantine).toBeGreaterThan(0);
    expect(run({ ...hired, quarantine: 6 }, 1).quarantine).toBe(0);
  });

  it('refuses anything the contract cannot afford', () => {
    const poor = fresh({ ...discovered, credits: 0 });
    expect(buyScreening(poor)).toBe(poor);
    expect(buyWard(poor)).toBe(poor);
    expect(hireOfficer(poor)).toBe(poor);
  });

  it('reaches the levers from the game store, only on an outbreak contract', () => {
    const base = createGame(1, 0);
    const game = { ...base, mission: fresh(discovered) as MissionState };
    expect((reduce(game, { type: 'buyScreening' }).mission as OutbreakMission).screening).toBe(1);
    expect((reduce(game, { type: 'shiftQuarantine', step: 1 }).mission as OutbreakMission).quarantine).toBe(1);
    expect(reduce(base, { type: 'buyScreening' })).toEqual(base);
  });
});
