export type CutEffect =
  /** Another step of strength to split across the places. */
  | { kind: 'strength'; value: number }
  /** Each step pushes this much harder. */
  | { kind: 'push'; value: number }
  /** Hunger spent per step divided by this. */
  | { kind: 'patience'; value: number }
  /** Hunger gained per kill multiplied by this. */
  | { kind: 'appetite'; value: number }
  /** Notoriety per kill divided by this. */
  | { kind: 'quiet'; value: number };

export interface CutUpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Dread for the first purchase; repeatable ones grow by `growth` each time. */
  cost: number;
  /** Repeatable upgrades can be bought again at a higher price. */
  growth?: number;
  effect: CutEffect;
}

/** What the killer buys with dread. Written for any of them: a lake, a dream or a list. */
export const CUT_UPGRADES: readonly CutUpgradeDef[] = [
  { id: 'cut-another-night', name: 'ANOTHER NIGHT', description: 'One more place to be at once. +1 strength.', cost: 15, growth: 3, effect: { kind: 'strength', value: 1 } },
  { id: 'cut-closer', name: 'CLOSER THAN THEY THINK', description: 'Every push lands harder. Push x1.3.', cost: 25, growth: 3, effect: { kind: 'push', value: 1.3 } },
  { id: 'cut-patience', name: 'PATIENCE', description: 'He does not run. He does not need to. Hunger spent x0.7.', cost: 40, effect: { kind: 'patience', value: 1 / 0.7 } },
  { id: 'cut-taste', name: 'A TASTE FOR IT', description: 'Every death feeds more. Hunger gained x1.5.', cost: 60, effect: { kind: 'appetite', value: 1.5 } },
  { id: 'cut-no-witnesses', name: 'NO WITNESSES', description: 'Fewer survivors to tell the story. Notoriety gained x0.66.', cost: 100, effect: { kind: 'quiet', value: 1.5 } },
  { id: 'cut-legend', name: 'THE LEGEND', description: 'They tell stories about you now, and the stories do the work. Push x1.5.', cost: 400, effect: { kind: 'push', value: 1.5 } },
  { id: 'cut-hunger', name: 'IT NEVER ENDS', description: 'Hunger spent x0.6.', cost: 900, effect: { kind: 'patience', value: 1 / 0.6 } },
  { id: 'cut-urban-legend', name: 'URBAN LEGEND', description: 'Nobody who saw you is believed. Notoriety gained x0.5.', cost: 2_000, effect: { kind: 'quiet', value: 2 } },
];
