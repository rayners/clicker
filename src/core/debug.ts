import { GENERATORS } from '../data/extraction/generators';
import { PROCESSORS, REACTORS } from '../data/terraform/systems';
import { createMission } from '../mission/state';
import { missionConfigFor } from './prestige';
import type { MissionOf, MissionState } from '../mission/state';
import type { GameState } from './game';

/** Developer shortcuts (?debug=act3 etc.) for testing pacing and theming without hours of play. */
export const SCENARIOS = ['act2', 'act3', 'act4', 'terminus', 'terraform', 'tf-act2'] as const;

const owned = (upTo: number, count: number) =>
  Object.fromEntries(GENERATORS.map((g, i) => [g.id, i < upTo ? count : 0]));

const PATCHES: Record<string, Partial<MissionOf<'extraction', 'organism'>>> = {
  act2: { act: 2, lifetimeOre: 2.5e6, credits: 5e4, generators: owned(4, 15), refineryLevel: 6 },
  act3: {
    act: 3,
    lifetimeOre: 6e7,
    credits: 2e6,
    refineryLevel: 11,
    generators: owned(6, 15),
    flags: ['specimens'],
    beats: { 'a3-entry': 0, 'a3-special-projects': 0 },
  },
  act4: {
    act: 4,
    lifetimeOre: 3e8,
    credits: 5e7,
    refineryLevel: 12,
    generators: owned(7, 25),
    flags: ['specimens', 'tracker', 'archive-0-77'],
    specimens: 12,
    rigs: 4,
    contacts: 3,
    breaches: 1,
    integrity: 45,
  },
  terminus: {
    act: 4,
    lifetimeOre: 6e8,
    credits: 1e8,
    refineryLevel: 13,
    generators: owned(8, 30),
    flags: ['specimens', 'tracker', 'archive-0-77', 'terminus'],
    specimens: 30,
    specimensRecovered: 34,
    contacts: 5,
    breaches: 2,
  },
};

const lines = (counts: number[]) =>
  Object.fromEntries(['atmosphere', 'heat', 'water'].flatMap((line) => PROCESSORS.filter((p) => p.line === line).map((p, i) => [p.id, counts[i] ?? 0])));

const TERRAFORM_PATCHES: Record<string, Partial<MissionOf<'terraform', 'organism'>>> = {
  terraform: {},
  'tf-act2': {
    act: 2,
    processed: 3e6,
    lifetimeUnits: 4e6,
    lifetimeCredits: 4e6,
    credits: 5e4,
    reactors: Object.fromEntries(REACTORS.map((r, i) => [r.id, i === 0 ? 20 : i === 1 ? 12 : 0])),
    processors: lines([15, 12]),
  },
};

export function applyScenario(game: GameState, name: string): GameState {
  const terraform = TERRAFORM_PATCHES[name];
  if (terraform) {
    const fresh = createMission(missionConfigFor(game.profile, 'terraform'), game.mission.seed);
    return { ...game, mission: { ...fresh, ...terraform } as MissionState };
  }
  const patch = PATCHES[name];
  if (!patch) return game;
  const mission = { ...game.mission, ...patch, beats: { ...game.mission.beats, ...patch.beats } } as MissionState;
  return { ...game, mission };
}
