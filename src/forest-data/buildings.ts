export type BuildingId = 'appraisal' | 'armoury' | 'hospice' | 'chapel';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  baseCost: number;
  /** Each level costs this much more than the last. */
  costGrowth: number;
}

export const BUILDINGS: readonly BuildingDef[] = [
  {
    id: 'appraisal',
    name: 'APPRAISAL HOUSE',
    description: 'A back room where Collegium buyers weigh and price what the parties bring. Each level doubles throughput.',
    baseCost: 40,
    costGrowth: 2.2,
  },
  {
    id: 'armoury',
    name: 'ARMOURY',
    description: 'Mail, crossbows, boar-spears and the smiths to mend them. Every hand fights half again as hard at each level.',
    baseCost: 300,
    costGrowth: 2,
  },
  {
    id: 'hospice',
    name: 'HOSPICE',
    description: 'Cots, clean linen and a mender who stays behind. The wounded mend faster at each level.',
    baseCost: 120,
    costGrowth: 2.4,
  },
  {
    id: 'chapel',
    name: 'LANTERN CHAPEL',
    description: 'A Synod lamp kept burning in the hall. Blight eases a little every hour it burns.',
    baseCost: 400,
    costGrowth: 2.6,
  },
];
