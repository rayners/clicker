import type { GameState } from '../../core/game';
import type { Action } from '../../core/store';
import type { MissionState } from '../../mission/state';

export interface FlowCell {
  label: string;
  /** Accessible name of the value. */
  aria: string;
  unit: string;
}

export interface FlowReading {
  values: [number, number, number];
  /** 0-100 for the meter under the cells. */
  meter: number;
  /** What is holding production back; exposed as data-bottleneck for styling and tests. */
  limit: string;
  /** Which cell to highlight as the constraint, if any. */
  highlight: number | null;
  /** Inverted highlight: the constraint is saturated. */
  severe: boolean;
  note: string;
  /** The headline rate whose changes get a call-out. */
  rate: number;
}

export interface FlowSpec {
  cells: [FlowCell, FlowCell, FlowCell];
  meterLabel: string;
  rateUnit: string;
  read(m: MissionState): FlowReading;
}

export interface MonitorRow {
  id: string;
  label: string;
  /** Seconds per visual work cycle. */
  period: number;
  running(m: MissionState): boolean;
  count(m: MissionState): string;
  output(m: MissionState): string;
}

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
  /** Called with the full game when needed (kept for symmetry with panels). */
  visible?(game: GameState): boolean;
}
