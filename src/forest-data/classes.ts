export type ClassId = 'blade' | 'mender' | 'scout' | 'mystic';

export interface ClassDef {
  id: ClassId;
  name: string;
  plural: string;
  short: string;
  description: string;
  /** Silver for the first hire; each further hire costs more. */
  baseCost: number;
  /** Silver per second, every second, whether in the field or the hall. */
  wage: number;
  /** Contribution to a party's strength against a region's danger. */
  strength: number;
}

export const CLASSES: readonly ClassDef[] = [
  {
    id: 'blade',
    name: 'BLADE',
    plural: 'BLADES',
    short: 'BLD',
    description: 'Sellswords, deserters and younger sons. They hold the line while the others work.',
    baseCost: 20,
    wage: 0.05,
    strength: 3,
  },
  {
    id: 'mender',
    name: 'MENDER',
    plural: 'MENDERS',
    short: 'MND',
    description: 'Herb-wives and failed novices of the Synod. Fewer come home in sacks when one goes along.',
    baseCost: 30,
    wage: 0.06,
    strength: 1,
  },
  {
    id: 'scout',
    name: 'SCOUT',
    plural: 'SCOUTS',
    short: 'SCT',
    description: 'Trappers who know the deer paths. Quicker there, quicker back, and they notice what glints.',
    baseCost: 25,
    wage: 0.05,
    strength: 1.5,
  },
  {
    id: 'mystic',
    name: 'MYSTIC',
    plural: 'MYSTICS',
    short: 'MYS',
    description: 'Hedge-witches and lapsed scholars. They can hold a relic without it holding them. For a while.',
    baseCost: 60,
    wage: 0.1,
    strength: 2,
  },
];

export const CLASS_IDS: readonly ClassId[] = CLASSES.map((c) => c.id);
