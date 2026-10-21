import { GENERATORS } from '../data/extraction/generators';
import { PROCESSORS, REACTORS } from '../data/terraform/systems';
import { FABRICATORS, SECTIONS, TROOPERS } from '../data/security/systems';
import { CARS, ENGINES } from '../data/haulage/systems';
import { createMission } from '../mission/state';
import { missionConfigFor } from './prestige';
import type { MissionOf, MissionState } from '../mission/state';
import type { GameState } from './game';

/** Developer shortcuts (?debug=act3 etc.) for testing pacing and theming without hours of play. */
export const SCENARIOS = ['act2', 'act3', 'act4', 'terminus', 'terraform', 'tf-act2', 'security', 'sec-act2', 'haulage', 'haul-act2'] as const;

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

const SECURED = 7;
const SECURITY_PATCHES: Record<string, Partial<MissionOf<'security', 'organism'>>> = {
  security: {},
  'sec-act2': {
    act: 2,
    recovered: 3e6,
    lifetimeCredits: 3e6,
    credits: 5e4,
    deepest: SECURED,
    ground: SECTIONS.map((_, i) => ({ control: i < SECURED ? 1 : 0, garrison: 0, secured: i < SECURED })),
    troopers: Object.fromEntries(TROOPERS.map((t, i) => [t.id, i === 0 ? 40 : i === 1 ? 30 : i === 2 ? 15 : 0])),
    fabricators: Object.fromEntries(FABRICATORS.map((f, i) => [f.id, i === 0 ? 20 : i === 1 ? 20 : i === 2 ? 5 : 0])),
    sentries: 4,
  },
};

const HAULAGE_PATCHES: Record<string, Partial<MissionOf<'haulage', 'organism'>>> = {
  haulage: {},
  'haul-act2': {
    act: 2,
    delivered: 1.2e6,
    lifetimeCredits: 1.2e6,
    credits: 5e4,
    leg: 12,
    fuel: 200_000,
    engines: Object.fromEntries(ENGINES.map((e, i) => [e.id, i === 0 ? 50 : i === 1 ? 30 : i === 2 ? 5 : 0])),
    cars: Object.fromEntries(CARS.map((c, i) => [c.id, i === 0 ? 40 : 0])),
  },
};

export function applyScenario(game: GameState, name: string): GameState {
  const haulage = HAULAGE_PATCHES[name];
  if (haulage) {
    const fresh = createMission(missionConfigFor(game.profile, 'haulage'), game.mission.seed);
    return { ...game, assigning: false, mission: { ...fresh, ...haulage } as MissionState };
  }
  const terraform = TERRAFORM_PATCHES[name];
  if (terraform) {
    const fresh = createMission(missionConfigFor(game.profile, 'terraform'), game.mission.seed);
    return { ...game, assigning: false, mission: { ...fresh, ...terraform } as MissionState };
  }
  const security = SECURITY_PATCHES[name];
  if (security) {
    const fresh = createMission(missionConfigFor(game.profile, 'security'), game.mission.seed);
    return { ...game, assigning: false, mission: { ...fresh, ...security } as MissionState };
  }
  const patch = PATCHES[name];
  if (!patch) return game;
  const mission = { ...game.mission, ...patch, beats: { ...game.mission.beats, ...patch.beats } } as MissionState;
  return { ...game, assigning: false, mission };
}
