import type { DirectiveDef } from './directives';
import type { Lexicon } from '../shared/lexicon';
import type { MissionConfig, MissionState } from './state';
import type { Beat } from './story';

/** What a scenario tells the story about itself. Horrors read only this, never scenario state. */
export interface StorySignals {
  /** Shared story scale: extraction's shaft depth in metres. 1,000 opens act 2; 3,200 the discovery. */
  progress: number;
  /** The scenario's deepest equipment is running, so a discovery is physically possible. */
  deepAccess: boolean;
}

export interface ArchiveFile {
  id: string;
  title: string;
  classification: string;
  body: string[];
  unlock(m: MissionState): boolean;
}

/** One kind of contract: its economy, corporate story and vocabulary. */
export interface ScenarioDef {
  id: string;
  /** Initial scenario-specific state, merged into the mission. */
  fields(config: MissionConfig): object;
  boot(config: MissionConfig): string[];
  tick(m: MissionState, dt: number): MissionState;
  signals(m: MissionState): StorySignals;
  lexicon: Lexicon;
  /** Act 1 corporate content and scenario flavour. */
  beats: readonly Beat[];
  directives: readonly DirectiveDef[];
  /** Directive goal counters by name (e.g. 'ore', 'gen:drone'). */
  metric(m: MissionState, name: string): number;
  archive: readonly ArchiveFile[];
  /** What each crew member's boost does in this scenario, for the crew panel. */
  crewBoostText: Readonly<Record<string, string>>;
  /** A horror incident destroys some equipment; returns null if there is nothing to lose. */
  loseEquipment(m: MissionState, roll: () => number): { m: MissionState; name: string } | null;
  /** The headline output for the contract record and absence summaries. */
  outcome(m: MissionState): { output: number; outputUnit: string };
  /** Who or what is at stake when the terminus choice is made, if the scenario has anyone to name. */
  stakes?(m: MissionState): string;
}

/** Everything a horror may ask of whichever scenario it is running in. */
export interface HorrorHooks {
  loseEquipment: ScenarioDef['loseEquipment'];
}

/** What goes wrong: acts 2-5, their mechanics and their files. Knows scenarios only through signals and the lexicon. */
export interface HorrorDef {
  id: string;
  fields(): object;
  tick(m: MissionState, dt: number, hooks: HorrorHooks): MissionState;
  beats: readonly Beat[];
  /** Optional extra beats for one specific scenario, keyed by scenario id. */
  pairings: Readonly<Record<string, readonly Beat[]>>;
  archive: readonly ArchiveFile[];
  /** Title and text for each ending this horror offers at the terminus (lexicon placeholders allowed). */
  endings: Readonly<Record<string, { title: string; text: string }>>;
  /** Multiplies the scenario's output (e.g. Special Projects funding). */
  productionMultiplier(m: MissionState): number;
  /** How hard the horror pushes back on ground a scenario holds (1 = mundane). Scenarios without ground ignore it. */
  pressure?(m: MissionState): number;
  /** Story effects only this horror understands (e.g. a forced breach). */
  applyEffect(m: MissionState, action: string): MissionState;
}
