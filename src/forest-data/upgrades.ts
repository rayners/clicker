import type { ClassId } from './classes';

export type ForestEffect =
  | { kind: 'classStrength'; id: ClassId; value: number }
  | { kind: 'haulMultiplier'; value: number }
  | { kind: 'woundMultiplier'; value: number }
  | { kind: 'blightMultiplier'; value: number }
  | { kind: 'wageMultiplier'; value: number }
  | { kind: 'chartMultiplier'; value: number }
  | { kind: 'forageMultiplier'; value: number }
  /** Forages per second done for the company by others. */
  | { kind: 'autoForage'; value: number }
  /** Regions whose standing orders send themselves. */
  | { kind: 'quartermaster'; value: number };

export interface ForestUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: { relics?: number; delve?: number };
  effect: ForestEffect;
}

/** Requisitions, roughly in the order a company can afford them. */
export const FOREST_UPGRADES: readonly ForestUpgrade[] = [
  {
    id: 'gleaners',
    name: 'GLEANERS',
    description: 'Town children paid in bread to comb the Eaves at dawn. One shard a second. Some come back.',
    cost: 60,
    unlock: { relics: 30 },
    effect: { kind: 'autoForage', value: 1 },
  },
  {
    id: 'whetstones',
    name: 'WHETSTONES AND OIL',
    description: 'Blades that hold an edge through bone. Blades fight half again as hard.',
    cost: 150,
    unlock: { relics: 100 },
    effect: { kind: 'classStrength', id: 'blade', value: 1.5 },
  },
  {
    id: 'quartermaster',
    name: 'THE QUARTERMASTER',
    description: 'A one-eyed veteran who musters parties without being told. One region\'s standing order now sends itself.',
    cost: 400,
    unlock: { relics: 250 },
    effect: { kind: 'quartermaster', value: 1 },
  },
  {
    id: 'forage-baskets',
    name: 'WILLOW BASKETS',
    description: 'Foragers carry more back from the treeline. Each forage yields twice as much.',
    cost: 500,
    unlock: { relics: 400 },
    effect: { kind: 'forageMultiplier', value: 2 },
  },
  {
    id: 'hooded-lanterns',
    name: 'HOODED LANTERNS',
    description: 'Synod-blessed flames that keep the worst of the dark off the skin. Blight taken in the wood x0.8.',
    cost: 800,
    unlock: { delve: 1 },
    effect: { kind: 'blightMultiplier', value: 0.8 },
  },
  {
    id: 'moss-poultices',
    name: 'MOSS POULTICES',
    description: 'Grey moss from the Eaves stops bleeding. Nobody asks why it grows on graves. Wounds x0.75.',
    cost: 1_500,
    unlock: { delve: 1.5 },
    effect: { kind: 'woundMultiplier', value: 0.75 },
  },
  {
    id: 'pack-mules',
    name: 'PACK MULES',
    description: 'Mules carry what hands cannot. They do not like the wood, and say so. Haul x1.5.',
    cost: 3_000,
    unlock: { delve: 2 },
    effect: { kind: 'haulMultiplier', value: 1.5 },
  },
  {
    id: 'gleaner-gangs',
    name: 'GLEANER GANGS',
    description: 'More children, more bread, fewer questions. Three more shards a second.',
    cost: 4_000,
    unlock: { relics: 3_000 },
    effect: { kind: 'autoForage', value: 3 },
  },
  {
    id: 'quartermasters-clerk',
    name: 'QUARTERMASTER\'S CLERK',
    description: 'The Quartermaster takes on a clerk who can count. Another region\'s standing order sends itself.',
    cost: 8_000,
    unlock: { delve: 3 },
    effect: { kind: 'quartermaster', value: 1 },
  },
  {
    id: 'survey-copies',
    name: 'COPIED SURVEY MAPS',
    description: 'Bought from a Collegium scribe. The handwriting in the margins is not the scribe\'s. Charting x1.5.',
    cost: 12_000,
    unlock: { delve: 3.5 },
    effect: { kind: 'chartMultiplier', value: 1.5 },
  },
  {
    id: 'ysmarch-steel',
    name: 'YSMARCH STEEL',
    description: 'Swords from the barrows, still sharp after a thousand years. They are cold to hold. Blades x2.',
    cost: 20_000,
    unlock: { delve: 4.5 },
    effect: { kind: 'classStrength', id: 'blade', value: 2 },
  },
  {
    id: 'hedge-wards',
    name: 'HEDGE WARDS',
    description: 'Knotted charms that mystics hang on every pack. Mystics fight half again as hard.',
    cost: 40_000,
    unlock: { delve: 5.5 },
    effect: { kind: 'classStrength', id: 'mystic', value: 1.5 },
  },
  {
    id: 'company-colours',
    name: 'COMPANY COLOURS',
    description: 'Ash-grey cloaks with the Key in silver thread. Hands sign on for less, for the pride of it. Wages x0.8.',
    cost: 60_000,
    unlock: { delve: 6.5 },
    effect: { kind: 'wageMultiplier', value: 0.8 },
  },
  {
    id: 'field-quartermasters',
    name: 'FIELD QUARTERMASTERS',
    description: 'Veterans posted at the forest camps. Two more regions\' standing orders send themselves.',
    cost: 150_000,
    unlock: { delve: 8 },
    effect: { kind: 'quartermaster', value: 2 },
  },
  {
    id: 'grave-wardens',
    name: 'GRAVE-WARDENS',
    description: 'Menders who have seen what the barrows do. They work fast and do not talk. Wounds x0.7.',
    cost: 500_000,
    unlock: { delve: 10 },
    effect: { kind: 'woundMultiplier', value: 0.7 },
  },
  {
    id: 'collegium-contract',
    name: 'COLLEGIUM CONTRACT',
    description: 'The Collegium pays in advance for whatever comes out of the Undercity, unsorted. Haul x2.',
    cost: 5_000_000,
    unlock: { delve: 14 },
    effect: { kind: 'haulMultiplier', value: 2 },
  },
  {
    id: 'standing-army',
    name: 'A STANDING COMPANY',
    description: 'The company no longer needs a Factor to send it. Every region\'s standing order sends itself.',
    cost: 2_000_000,
    unlock: { delve: 12 },
    effect: { kind: 'quartermaster', value: 2 },
  },
];
