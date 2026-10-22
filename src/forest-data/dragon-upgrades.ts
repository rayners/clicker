export type DragonEffect =
  | { kind: 'strength'; value: number }
  | { kind: 'push'; value: number }
  | { kind: 'patience'; value: number }
  | { kind: 'appetite'; value: number }
  | { kind: 'quiet'; value: number };

export interface DragonUpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Hoard for the first purchase; repeatable ones grow by `growth` each time. */
  cost: number;
  growth?: number;
  effect: DragonEffect;
}

/** What the dragon becomes, lying on what it took. */
export const DRAGON_UPGRADES: readonly DragonUpgradeDef[] = [
  { id: 'dragon-wing', name: 'ANOTHER WINGBEAT', description: 'Its shadow reaches another company\'s road. +1 strength.', cost: 6, growth: 3, effect: { kind: 'strength', value: 1 } },
  { id: 'dragon-fire', name: 'HOTTER FIRE', description: 'Vault doors run like wax. Push x1.3.', cost: 10, growth: 3, effect: { kind: 'push', value: 1.3 } },
  { id: 'dragon-sleep', name: 'THE LONG SLEEP', description: 'A hundred years is a nap. Hunger spent x0.7.', cost: 18, effect: { kind: 'patience', value: 1 / 0.7 } },
  { id: 'dragon-greed', name: 'DRAGON GREED', description: 'Every coin counted, every coin remembered. Hunger gained x1.5.', cost: 25, effect: { kind: 'appetite', value: 1.5 } },
  { id: 'dragon-smoke', name: 'SMOKE ON THE HILLS', description: 'The burned roads are blamed on brigands. Notoriety gained x0.66.', cost: 45, effect: { kind: 'quiet', value: 1.5 } },
  { id: 'dragon-scales', name: 'SCALES OF OLD GOLD', description: 'The hoard grows into its hide. Push x1.5.', cost: 160, effect: { kind: 'push', value: 1.5 } },
  { id: 'dragon-ages', name: 'AGES UNDER THE HEARTWOOD', description: 'Hunger spent x0.6.', cost: 350, effect: { kind: 'patience', value: 1 / 0.6 } },
  { id: 'dragon-myth', name: 'ONLY A STORY', description: 'Nobody in Thistlegate believes in dragons. Notoriety gained x0.5.', cost: 800, effect: { kind: 'quiet', value: 2 } },
];
