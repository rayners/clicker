import { describe, it, expect } from 'vitest';
import { LINES, PROCESSORS, REACTORS, SPEC_REVISIONS, COLONIST_WAVES } from '../../src/data/terraform/systems';
import { TERRAFORM_UPGRADES } from '../../src/data/terraform/upgrades';
import { TERRAFORM_DIRECTIVES } from '../../src/data/terraform/directives';
import { TERRAFORM_CREW_BOOSTS } from '../../src/data/terraform/crew-boosts';
import { createMission, TERRAFORM_MISSION_CONFIG, type MissionOf } from '../../src/mission/state';
import { runStory, storyBeats } from '../../src/mission/tick';
import { HORRORS, SCENARIOS } from '../../src/mission/registry';
import { STORY_MIN_GAP } from '../../src/mission/story';

type T = MissionOf<'terraform', 'organism'>;

describe('terraform tables', () => {
  it('have unique ids across reactors, processors and upgrades', () => {
    const ids = [...REACTORS, ...PROCESSORS].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(TERRAFORM_UPGRADES.map((u) => u.id)).size).toBe(TERRAFORM_UPGRADES.length);
  });

  it('give every line a ladder of processors that get dearer and stronger', () => {
    for (const line of LINES) {
      const ladder = PROCESSORS.filter((p) => p.line === line.id);
      expect(ladder.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < ladder.length; i++) {
        expect(ladder[i]!.baseCost).toBeGreaterThan(ladder[i - 1]!.baseCost);
        expect(ladder[i]!.rate).toBeGreaterThan(ladder[i - 1]!.rate);
      }
    }
  });

  it('make reactors dearer and stronger by tier', () => {
    for (let i = 1; i < REACTORS.length; i++) {
      expect(REACTORS[i]!.baseCost).toBeGreaterThan(REACTORS[i - 1]!.baseCost);
      expect(REACTORS[i]!.mw).toBeGreaterThan(REACTORS[i - 1]!.mw);
    }
  });

  it('issue spec revisions and colonist waves in order of progress', () => {
    for (let i = 1; i < SPEC_REVISIONS.length; i++) expect(SPEC_REVISIONS[i]!.at).toBeGreaterThan(SPEC_REVISIONS[i - 1]!.at);
    for (let i = 1; i < COLONIST_WAVES.length; i++) expect(COLONIST_WAVES[i]!).toBeGreaterThan(COLONIST_WAVES[i - 1]!);
  });

  it('only target processors and lines that exist', () => {
    const procs = new Set(PROCESSORS.map((p) => p.id));
    const lines = new Set(LINES.map((l) => l.id));
    for (const u of TERRAFORM_UPGRADES) {
      if (u.effect.kind === 'processorMultiplier') expect(procs.has(u.effect.processor)).toBe(true);
      if (u.effect.kind === 'lineMultiplier') expect(lines.has(u.effect.line)).toBe(true);
      if (u.unlock.processor) expect(procs.has(u.unlock.processor.id)).toBe(true);
      expect(u.cost).toBeGreaterThan(0);
    }
    for (const b of Object.values(TERRAFORM_CREW_BOOSTS)) if (b.effect.kind === 'lineMultiplier') expect(lines.has(b.effect.line)).toBe(true);
  });

  it('only set directive goals the scenario can count', () => {
    const procs = new Set(PROCESSORS.map((p) => p.id));
    for (let i = 1; i < TERRAFORM_DIRECTIVES.length; i++) {
      expect(TERRAFORM_DIRECTIVES[i]!.unlockCredits).toBeGreaterThan(TERRAFORM_DIRECTIVES[i - 1]!.unlockCredits);
    }
    for (const d of TERRAFORM_DIRECTIVES) {
      const { metric } = d.goal;
      expect(['units', 'match', 'credits'].includes(metric) || (metric.startsWith('proc:') && procs.has(metric.slice(5)))).toBe(true);
    }
  });
});

describe('terraform story', () => {
  const beats = storyBeats(SCENARIOS.terraform, HORRORS.organism);

  it('reaches every act 1 and act 2 beat by playing deep into act 2', () => {
    let m: T = {
      ...createMission(TERRAFORM_MISSION_CONFIG, 1),
      lifetimeCredits: 1e9,
      lifetimeUnits: 1e9,
      processed: 3e8,
      processors: Object.fromEntries(PROCESSORS.map((p) => [p.id, 1])),
      reactors: Object.fromEntries(REACTORS.map((r) => [r.id, 1])),
    };
    const early = beats.filter((b) => (b.act ?? 1) <= 2 && !b.id.startsWith('cycle-'));
    for (let i = 0; i < early.length * 3; i++) m = runStory({ ...m, elapsed: m.elapsed + STORY_MIN_GAP + 1 });
    expect(early.filter((b) => m.beats[b.id] === undefined).map((b) => b.id)).toEqual([]);
  });

  it('keeps act 1 free of anything overtly sinister', () => {
    for (const b of beats.filter((x) => (x.act ?? 1) === 1)) for (const e of b.entries) expect(e.kind).not.toBe('anomaly');
  });
});

describe('the nursery (organism x terraform pairing)', () => {
  const pairing = HORRORS.organism.pairings.terraform ?? [];

  it('exists only for terraforming contracts', () => {
    expect(pairing.length).toBeGreaterThan(0);
    const extractionIds = new Set(storyBeats(SCENARIOS.extraction, HORRORS.organism).map((b) => b.id));
    for (const b of pairing) expect(extractionIds.has(b.id)).toBe(false);
  });

  it('only reveals what the spec has become after the discovery', () => {
    for (const b of pairing) expect(b.act ?? 1).toBeGreaterThanOrEqual(3);
  });

  it('can be reached by playing a terraforming contract deep into the infestation', () => {
    let m: T = {
      ...createMission(TERRAFORM_MISSION_CONFIG, 1),
      act: 4,
      lifetimeCredits: 1e12,
      lifetimeUnits: 1e12,
      processed: 1e12,
      flags: ['specimens', 'tracker'],
      beats: { 'a3-entry': 0, 'a4-entry': 0 },
      contacts: 3,
      wavesThawed: 2,
      colonists: 900,
      colonistsLost: 100,
      processors: Object.fromEntries(PROCESSORS.map((p) => [p.id, 1])),
    };
    for (let i = 0; i < 80; i++) m = runStory({ ...m, elapsed: m.elapsed + STORY_MIN_GAP + 61 });
    expect(pairing.filter((b) => m.beats[b.id] === undefined).map((b) => b.id)).toEqual([]);
  });
});
