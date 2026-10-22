export type HunterEffect =
  | { kind: 'strength'; value: number }
  | { kind: 'push'; value: number }
  | { kind: 'patience'; value: number }
  | { kind: 'appetite'; value: number }
  | { kind: 'quiet'; value: number };

export interface HunterUpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Trophies for the first purchase; repeatable ones grow by `growth` each time. */
  cost: number;
  growth?: number;
  effect: HunterEffect;
}

/** What the hunter brings to the next hunt, paid for in trophies. */
export const HUNTER_UPGRADES: readonly HunterUpgradeDef[] = [
  { id: 'hunter-pack', name: 'ANOTHER OF THE CLAN', description: 'A second ship drops out of the dark beside the first. +1 strength.', cost: 5, growth: 3, effect: { kind: 'strength', value: 1 } },
  { id: 'hunter-blades', name: 'WRIST BLADES', description: 'Closer, quieter, surer. Push x1.3.', cost: 8, growth: 3, effect: { kind: 'push', value: 1.3 } },
  { id: 'hunter-patience', name: 'THE LONG STALK', description: 'It can watch a crew for days without moving. Hunger spent x0.7.', cost: 15, effect: { kind: 'patience', value: 1 / 0.7 } },
  { id: 'hunter-worthy', name: 'WORTHY PREY', description: 'The best fighters make the best trophies. Hunger gained x1.5.', cost: 22, effect: { kind: 'appetite', value: 1.5 } },
  { id: 'hunter-cloak', name: 'THE CLOAK', description: 'A ripple against the bulkhead, nothing more. Notoriety gained x0.66.', cost: 40, effect: { kind: 'quiet', value: 1.5 } },
  { id: 'hunter-spear', name: 'THE SPEAR', description: 'It reaches across a cargo bay. Push x1.5.', cost: 150, effect: { kind: 'push', value: 1.5 } },
  { id: 'hunter-season', name: 'A HUNTING SEASON', description: 'It comes back every few years, when the stars are hot. Hunger spent x0.6.', cost: 320, effect: { kind: 'patience', value: 1 / 0.6 } },
  { id: 'hunter-legend', name: 'NOBODY CAME BACK TO TELL IT', description: 'The survivors are not believed. Notoriety gained x0.5.', cost: 750, effect: { kind: 'quiet', value: 2 } },
];
