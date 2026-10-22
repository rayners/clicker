import type { MissionState } from './state';
import type { HorrorDef, ScenarioDef } from './kinds';
import { tickCrew } from './crew';
import { tickDirectives } from './directives';
import { runBeats, type Beat, type MissionContext, type StoryEnv } from './story';
import { horrorOf, scenarioOf } from './registry';
import { CORE_BEATS } from '../data/core-story';

const NO_HISTORY: MissionContext = { cycle: 0, endings: [] };

const beatTables = new Map<string, readonly Beat[]>();

/** Story beats for a scenario x horror pair, in priority order. */
export function storyBeats(scenario: ScenarioDef, horror: HorrorDef): readonly Beat[] {
  const key = `${scenario.id}x${horror.id}`;
  let beats = beatTables.get(key);
  if (!beats) {
    beats = [...CORE_BEATS, ...scenario.beats, ...horror.beats, ...(horror.pairings[scenario.id] ?? [])];
    beatTables.set(key, beats);
  }
  return beats;
}

export function storyEnv(m: MissionState, scenario: ScenarioDef, horror: HorrorDef): StoryEnv {
  return { signals: scenario.signals(m), lexicon: scenario.lexicon, applyHorrorEffect: horror.applyEffect };
}

/** Runs one story step with the mission's own scenario and horror (tests and tools). */
export function runStory<M extends MissionState>(m: M, ctx: MissionContext = NO_HISTORY): M {
  const scenario = scenarioOf(m);
  const horror = horrorOf(m);
  return runBeats(m, storyBeats(scenario, horror), ctx, storyEnv(m, scenario, horror)) as M;
}

/** One tick of a mission with explicit definitions: scenario economy, crew, horror, directives, story. */
/** Scenario and horror never change mid-mission, so the result has the same shape as the input. */
export function tickWith<M extends MissionState>(m: M, dt: number, ctx: MissionContext, scenario: ScenarioDef, horror: HorrorDef): M {
  let next = scenario.tick({ ...m, elapsed: m.elapsed + dt }, dt);
  next = tickCrew(next, dt, scenario.watchStrain);
  next = horror.tick(next, dt, { loseEquipment: scenario.loseEquipment });
  next = tickDirectives(next, scenario);
  return runBeats(next, storyBeats(scenario, horror), ctx, storyEnv(next, scenario, horror)) as M;
}

export function tickMission<M extends MissionState>(m: M, dt: number, ctx: MissionContext = NO_HISTORY): M {
  return tickWith(m, dt, ctx, scenarioOf(m), horrorOf(m));
}
