import type { GameState } from '../../core/game';
import type { Action } from '../../core/store';
import type { MissionState } from '../../mission/state';
import type { FlowSpec as SharedFlowSpec } from '../../engine/ui/flow';
import type { MonitorRow as SharedMonitorRow } from '../../engine/ui/monitor';

/** Flow readout and monitor shapes are shared engine types, specialised to a mission here. */
export type FlowSpec = SharedFlowSpec<MissionState>;
export type MonitorRow = SharedMonitorRow<MissionState>;
export type { FlowCell, FlowReading } from '../../engine/ui/flow';

export interface StatSpec {
  label: string;
  aria: string;
  read(m: MissionState): string;
}

/** The big manual button at the bottom (drill, surge, ...). */
export interface ActionSpec {
  label: string;
  aria: string;
  action: Action;
  perPress(m: MissionState): number;
  /** Automatic presses per second, and what each yields, for the self-pressing animation. */
  autoRate(m: MissionState): number;
  autoYieldPerSecond(m: MissionState): number;
}

export interface Component {
  el: HTMLElement;
  render(m: MissionState): void;
}

/** Everything the shell needs from a scenario to show it. */
export interface ScenarioUi {
  flow: FlowSpec;
  monitor: MonitorRow[];
  stats: StatSpec[];
  action: ActionSpec;
  systems: Component;
  upgrades: Component & { hasAny(m: MissionState): boolean };
  /** Optional controls under the flow readout (e.g. power allocation). */
  controls?: Component;
  /** The pixel accents: the vessel in the masthead, the target in the status area, the action button's sprite. Ship, moonlet and drill if not given. */
  sprites?: { vessel: string; target: string; action: string };
  /** Called with the full game when needed (kept for symmetry with panels). */
  visible?(game: GameState): boolean;
}
