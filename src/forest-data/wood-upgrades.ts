export type WoodEffect =
  | { kind: 'strength'; value: number }
  | { kind: 'push'; value: number }
  | { kind: 'patience'; value: number }
  | { kind: 'appetite'; value: number }
  | { kind: 'quiet'; value: number };

export interface WoodUpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Sap for the first purchase; repeatable ones grow by `growth` each time. */
  cost: number;
  growth?: number;
  effect: WoodEffect;
}

/** What the wood grows with the sap of the taken. */
export const WOOD_UPGRADES: readonly WoodUpgradeDef[] = [
  { id: 'wood-grove', name: 'ANOTHER GROVE', description: 'A new grove wakes at the edge of another company\'s map. +1 strength.', cost: 6, growth: 3, effect: { kind: 'strength', value: 1 } },
  { id: 'wood-roots', name: 'DEEPER ROOTS', description: 'The paths close behind the parties. Push x1.3.', cost: 10, growth: 3, effect: { kind: 'push', value: 1.3 } },
  { id: 'wood-seasons', name: 'SLOW SEASONS', description: 'The wood thinks in winters. Hunger spent x0.7.', cost: 18, effect: { kind: 'patience', value: 1 / 0.7 } },
  { id: 'wood-turning', name: 'THE TURNING', description: 'Every hand that walks into the trees feeds you more. Hunger gained x1.5.', cost: 25, effect: { kind: 'appetite', value: 1.5 } },
  { id: 'wood-pact', name: 'THE PACT HOLDS', description: 'The Wold-kin say nothing to the Synod. Notoriety gained x0.66.', cost: 45, effect: { kind: 'quiet', value: 1.5 } },
  { id: 'wood-heartwood', name: 'THE HEARTWOOD STIRS', description: 'The oldest trees lean toward the town. Push x1.5.', cost: 160, effect: { kind: 'push', value: 1.5 } },
  { id: 'wood-patience', name: 'A THOUSAND YEARS', description: 'Hunger spent x0.6.', cost: 350, effect: { kind: 'patience', value: 1 / 0.6 } },
  { id: 'wood-songs', name: 'SONGS IN THE BRANCHES', description: 'The ones who hear them never tell. Notoriety gained x0.5.', cost: 800, effect: { kind: 'quiet', value: 2 } },
];
