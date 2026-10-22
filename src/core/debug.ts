import { GENERATORS } from '../data/extraction/generators';
import { PROCESSORS, REACTORS } from '../data/terraform/systems';
import { FABRICATORS, SECTIONS, TROOPERS } from '../data/security/systems';
import { CARS, ENGINES } from '../data/haulage/systems';
import { COMPARTMENTS, CUTTERS, SHORING } from '../data/salvage/systems';
import { createMission } from '../mission/state';
import { missionConfigFor } from './prestige';
import type { MissionOf, MissionState } from '../mission/state';
import type { GameState } from './game';

/** Developer shortcuts (?debug=act3 etc.) for testing pacing and theming without hours of play. */
export const SCENARIOS = ['act2', 'act3', 'act4', 'terminus', 'terraform', 'tf-act2', 'security', 'sec-act2', 'haulage', 'haul-act2', 'overland', 'salvage', 'sal-act2'] as const;

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

const OPENED = 7;
const SALVAGE_PATCHES: Record<string, Partial<MissionOf<'salvage', 'organism'>>> = {
  salvage: {},
  'sal-act2': {
    act: 2,
    recovered: 3e6,
    lifetimeCredits: 3e6,
    credits: 5e4,
    deepest: OPENED,
    ground: COMPARTMENTS.map((_, i) => ({ control: i < OPENED ? 1 : 0, garrison: 0, secured: i < OPENED })),
    cutters: Object.fromEntries(CUTTERS.map((c, i) => [c.id, i === 0 ? 40 : i === 1 ? 30 : i === 2 ? 10 : 0])),
    shoring: Object.fromEntries(SHORING.map((x, i) => [x.id, i === 0 ? 30 : i === 1 ? 20 : i === 2 ? 14 : 0])),
  },
};

export function applyScenario(game: GameState, name: string): GameState {
  const jumped = jump(game, name);
  return jumped === game ? game : { ...jumped, mode: 'mission' };
}

function jump(game: GameState, name: string): GameState {
  if (name === 'overland') return { ...game, assigning: false, mission: createMission(missionConfigFor(game.profile, 'overland'), game.mission.seed) };
  const haulage = HAULAGE_PATCHES[name];
  if (haulage) {
    const fresh = createMission(missionConfigFor(game.profile, 'haulage'), game.mission.seed);
    return { ...game, assigning: false, mission: { ...fresh, ...haulage } as MissionState };
  }
  const salvage = SALVAGE_PATCHES[name];
  if (salvage) {
    const fresh = createMission(missionConfigFor(game.profile, 'salvage'), game.mission.seed);
    return { ...game, assigning: false, mission: { ...fresh, ...salvage } as MissionState };
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
  // The act jumps are extraction states: start one if another kind of contract is running.
  const base = game.mission.scenario === 'extraction' ? game.mission : createMission(missionConfigFor(game.profile, 'extraction'), game.mission.seed);
  const mission = { ...base, ...patch, beats: { ...base.beats, ...patch.beats } } as MissionState;
  return { ...game, assigning: false, mission };
}

const MAX_SPEED = 100;

/** `?speed=N` runs the clock N times faster (1 to 100). */
export function debugSpeed(search: string): number {
  const speed = Number(new URLSearchParams(search).get('speed'));
  return Number.isFinite(speed) && speed > 1 ? Math.min(MAX_SPEED, speed) : 1;
}

/** `?grant=N` hands the running contract N credits, without counting them as earned. */
export function grantCredits(game: GameState, amount: number): GameState {
  if (!Number.isFinite(amount) || amount <= 0) return game;
  return { ...game, mission: { ...game.mission, credits: game.mission.credits + amount } };
}

const RECENT_BEATS = 6;

/** `?flags`: the story so far, for the overlay. */
export function storySummary(game: GameState): string[] {
  const m = game.mission;
  const beats = Object.entries(m.beats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, RECENT_BEATS)
    .map(([id, t]) => `${id} @${Math.round(t)}s`);
  return [`ACT ${m.act} · ${m.scenario}/${m.horror} · ${Math.round(m.elapsed)}s`, `FLAGS ${m.flags.join(', ') || '-'}`, ...beats];
}
