import { member } from '../helpers';
import { describe, it, expect } from 'vitest';
import { advance, createLateGame, newLateGame, type LateGame } from '../../src/late-fees/game';
import {
  buyCutUpgrade,
  cutRules,
  cutUpgradeCost,
  leaveCut,
  startCut,
  CUT_ADAPTER,
  CUT_VENUES,
} from '../../src/late-fees/cut';
import { CUT_UPGRADES } from '../../src/late-fees-data/cut-upgrades';
import { reduce } from '../../src/late-fees/store';
import { lateSaves } from '../../src/late-fees/save';
import { simulateCut } from '../../src/late-fees/bot';
import { shiftPush, pushOn } from '../../src/engine/hunt';

const NOW = 1_000_000;
const cut = (killer: 'drowned' | 'burned' | 'design' = 'drowned') => startCut(newLateGame(1, NOW), killer, 7);
const run = (g: LateGame, seconds: number) => {
  let next = g;
  for (let t = 0; t < seconds; t++) next = advance(next, 1);
  return next;
};
const bodies = (g: LateGame, i: number) => g.cut!.hunt.prey[i]!.run.bodyCount;

describe("the Killer's Cut", () => {
  it('flips the tape: the chosen killer haunts the camp, the clinic and the insurer at once', () => {
    const g = cut('burned');
    expect(g.mode).toBe('cut');
    expect(g.cut!.killer).toBe('burned');
    expect(g.cut!.hunt.prey.map((p) => p.run.venue)).toEqual(CUT_VENUES);
    expect(g.cut!.hunt.prey.every((p) => p.run.killer === 'burned')).toBe(true);
  });

  it('lets every place run itself: defenders take readings, buy beds and hire staff without the player', () => {
    const g = run(cut(), 600);
    for (const p of g.cut!.hunt.prey) expect(p.run.lifetimeCash).toBeGreaterThan(0);
  });

  it('takes far more from a place the killer pushes than from one it leaves alone', () => {
    let g = cut();
    g = { ...g, cut: { ...g.cut!, hunt: shiftPush(shiftPush(shiftPush(g.cut!.hunt, 0, 1), 0, 1), 0, 1) } };
    const later = run(g, 1_500);
    expect(bodies(later, 0)).toBeGreaterThan(bodies(later, 1) + 2);
    expect(later.cut!.hunt.dread).toBeGreaterThan(0);
  });

  it('makes the places richer, and so better defended, the more notorious the killer is', () => {
    const p = cut().cut!.hunt.prey[0]!;
    const quiet = CUT_ADAPTER.step(p, 1, 1, 0);
    const infamous = CUT_ADAPTER.step(p, 1, 1, 5);
    expect(infamous.run.config.productionMultiplier).toBeGreaterThan(quiet.run.config.productionMultiplier);
  });

  it('spends dread on the killer: another night of strength, and more', () => {
    const g = cut();
    const extra = CUT_UPGRADES.find((u) => u.effect.kind === 'strength')!;
    const rich = { ...g, cut: { ...g.cut!, hunt: { ...g.cut!.hunt, dread: 1e6 } } };
    const bought = buyCutUpgrade(rich, extra.id);
    expect(bought.cut!.hunt.strength).toBe(g.cut!.hunt.strength + 1);
    expect(bought.cut!.hunt.dread).toBe(1e6 - cutUpgradeCost(rich.cut!, extra.id));
    expect(buyCutUpgrade(g, extra.id)).toBe(g);
    const sharper = CUT_UPGRADES.find((u) => u.effect.kind === 'push')!;
    const pushed = buyCutUpgrade(rich, sharper.id);
    expect(cutRules(pushed.cut!).pushPerStep).toBeGreaterThan(cutRules(rich.cut!).pushPerStep);
  });

  it('is put down when a place rolls credits: that place reopens as the next sequel, and the killer lies low', () => {
    const g = cut();
    const prey = g.cut!.hunt.prey.map((p, i) => (i === 0 ? { ...p, run: { ...p.run, flags: ['terminus'] } } : p));
    const ended = advance({ ...g, cut: { ...g.cut!, hunt: { ...g.cut!.hunt, prey } } }, 1);
    expect(ended.cut!.hunt.beaten).toBe(1);
    expect(ended.cut!.hunt.prey[0]!.run.config.part).toBe(2);
    expect(pushOn(ended.cut!.hunt, 0, cutRules(ended.cut!))).toBe(0);
  });

  it('only runs the side of the tape that is playing', () => {
    const g = cut();
    const later = run(g, 60);
    expect(later.run.elapsed).toBe(g.run.elapsed);
    const back = leaveCut(later);
    expect(back.mode).toBe('films');
    expect(run(back, 30).cut!.hunt.prey[0]!.run.elapsed).toBe(later.cut!.hunt.prey[0]!.run.elapsed);
  });

  it('takes orders: start, push, sleep, buy, and rewind', () => {
    let g = reduce(member(newLateGame(1, NOW)), { type: 'startCut', killer: 'design', seed: 3 });
    expect(g.cut!.killer).toBe('design');
    g = reduce(g, { type: 'shiftCutPush', index: 2, step: 1 });
    expect(g.cut!.hunt.split[2]).toBe(1);
    g = reduce(g, { type: 'toggleCutDormant' });
    expect(g.cut!.hunt.dormant).toBe(true);
    g = reduce(g, { type: 'leaveCut' });
    expect(g.mode).toBe('films');
  });

  it('survives a save and reload', () => {
    const g = run(cut(), 30);
    const back = lateSaves.deserialize(lateSaves.serialize(g));
    expect(back.cut!.hunt.prey[1]!.run.elapsed).toBe(g.cut!.hunt.prey[1]!.run.elapsed);
    expect(back.mode).toBe('cut');
  });

  it('loads saves from before the Killer\'s Cut as films', () => {
    const g = createLateGame(1, NOW);
    const old = JSON.stringify({ ...g, version: 2, mode: undefined, cut: undefined });
    const loaded = lateSaves.deserialize(old);
    expect(loaded.mode).toBe('films');
    expect(loaded.cut).toBeNull();
  });
});

describe("the Killer's Cut, played through", () => {
  it('lets a sensible killer out-harvest one who never pushes, and grow stronger doing it', { timeout: 60_000 }, () => {
    const played = simulateCut({ seed: 7, killer: 'drowned', maxSeconds: 2 * 3600 });
    const idle = simulateCut({ seed: 7, killer: 'drowned', maxSeconds: 2 * 3600, passive: true });
    expect(played.harvest).toBeGreaterThan(idle.harvest * 5);
    expect(played.upgrades).toBeGreaterThan(3);
    expect(played.final.cut!.hunt.strength).toBeGreaterThan(3);
  });
});

describe('switching killers', () => {
  it('banks the paused cut\'s Legend before starting another killer\'s, so nothing earned is lost', () => {
    const g = startCut(newLateGame(1, 0), 'drowned', 3);
    const earned = { ...g, cut: { ...g.cut!, hunt: { ...g.cut!.hunt, harvest: 400 } } };
    const switched = startCut({ ...earned, mode: 'films', shelf: true }, 'burned', 4);
    expect(switched.cut!.killer).toBe('burned');
    expect(switched.profile.legend.drowned).toBe(4);
  });
});
