export type CreatureEffect =
  | { kind: 'strength'; value: number }
  | { kind: 'push'; value: number }
  | { kind: 'patience'; value: number }
  | { kind: 'appetite'; value: number }
  | { kind: 'quiet'; value: number };

export interface CreatureUpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Biomass for the first purchase; repeatable ones grow by `growth` each time. */
  cost: number;
  growth?: number;
  effect: CreatureEffect;
}

/** What the creature becomes, fed on the taken. */
export const CREATURE_UPGRADES: readonly CreatureUpgradeDef[] = [
  { id: 'creature-brood', name: 'ANOTHER BROOD', description: 'Something hatches in another ship\'s cargo. +1 strength.', cost: 5, growth: 3, effect: { kind: 'strength', value: 1 } },
  { id: 'creature-vents', name: 'THE VENTS', description: 'It learns the ducts between the decks. Push x1.3.', cost: 8, growth: 3, effect: { kind: 'push', value: 1.3 } },
  { id: 'creature-torpor', name: 'TORPOR', description: 'It can wait in the walls for weeks. Hunger spent x0.7.', cost: 15, effect: { kind: 'patience', value: 1 / 0.7 } },
  { id: 'creature-host', name: 'THE HOST', description: 'The taken are not wasted. Hunger gained x1.5.', cost: 22, effect: { kind: 'appetite', value: 1.5 } },
  { id: 'creature-acid', name: 'ACID BLOOD', description: 'It leaves nothing behind for the inquiry. Notoriety gained x0.66.', cost: 40, effect: { kind: 'quiet', value: 1.5 } },
  { id: 'creature-perfect', name: 'PERFECT ORGANISM', description: 'Structural perfection matched only by its hostility. Push x1.5.', cost: 150, effect: { kind: 'push', value: 1.5 } },
  { id: 'creature-cold', name: 'COLD SLEEP', description: 'It rides the haul home in the dark. Hunger spent x0.6.', cost: 320, effect: { kind: 'patience', value: 1 / 0.6 } },
  { id: 'creature-classified', name: 'CLASSIFIED', description: 'The Combine buries every report. Notoriety gained x0.5.', cost: 750, effect: { kind: 'quiet', value: 2 } },
];
