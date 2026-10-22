export type DeepEffect =
  | { kind: 'strength'; value: number }
  | { kind: 'push'; value: number }
  | { kind: 'patience'; value: number }
  | { kind: 'appetite'; value: number }
  | { kind: 'quiet'; value: number };

export interface DeepUpgradeDef {
  id: string;
  name: string;
  description: string;
  /** The drowned for the first purchase; repeatable ones grow by `growth` each time. */
  cost: number;
  growth?: number;
  effect: DeepEffect;
}

/** What the Source grows with the drowned. */
export const DEEP_UPGRADES: readonly DeepUpgradeDef[] = [
  { id: 'deep-current', name: 'ANOTHER CURRENT', description: 'A cold current turns toward another town\'s beach. +1 strength.', cost: 6, growth: 3, effect: { kind: 'strength', value: 1 } },
  { id: 'deep-cold', name: 'COLDER WATER', description: 'The thermocline rises and everything below it rises with it. Push x1.3.', cost: 10, growth: 3, effect: { kind: 'push', value: 1.3 } },
  { id: 'deep-dark', name: 'THE LONG DARK', description: 'The Source has waited under the trench floor for a very long time. Hunger spent x0.7.', cost: 18, effect: { kind: 'patience', value: 1 / 0.7 } },
  { id: 'deep-blood', name: 'BLOOD IN THE WATER', description: 'Every swimmer taken draws the next thing in. Hunger gained x1.5.', cost: 25, effect: { kind: 'appetite', value: 1.5 } },
  { id: 'deep-fishermen', name: 'NOBODY BELIEVES THE FISHERMEN', description: 'The sightings go in the papers next to the horoscopes. Notoriety gained x0.66.', cost: 45, effect: { kind: 'quiet', value: 1.5 } },
  { id: 'deep-seam', name: 'THE SEAM WIDENS', description: 'Something bigger fits through now. Push x1.5.', cost: 160, effect: { kind: 'push', value: 1.5 } },
  { id: 'deep-ages', name: 'PRESSURE OF AGES', description: 'Hunger spent x0.6.', cost: 350, effect: { kind: 'patience', value: 1 / 0.6 } },
  { id: 'deep-silence', name: 'SONAR SILENCE', description: 'The buoys hear nothing at all, right up until they do. Notoriety gained x0.5.', cost: 800, effect: { kind: 'quiet', value: 2 } },
];
