import type { SectionDef } from '../../engine/ground';

export interface TrooperDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Force each unit brings, to the assault or the line. */
  force: number;
  /** Bodies per unit, for the terminus head count (vehicles and fire support have none on the ground). */
  heads: number;
}

/** Force tiers, the security detachment's generators. Each draws one round per second per point of force in the assault. */
export const TROOPERS: readonly TrooperDef[] = [
  {
    id: 'rifles',
    name: 'RIFLEMAN',
    short: 'RIFLES',
    description: 'A Combine Security trooper with a pulse rifle and a two-day briefing. Bored already.',
    baseCost: 15,
    force: 0.1,
    heads: 1,
  },
  {
    id: 'smartgun',
    name: 'SMARTGUN TEAM',
    short: 'SMARTGUN',
    description: 'A harness-mounted autocannon and the two people who argue over carrying it.',
    baseCost: 400,
    force: 2,
    heads: 2,
  },
  {
    id: 'breach',
    name: 'BREACHING TEAM',
    short: 'BREACH',
    description: 'Cutting torches, shaped charges and a welding rig. Doors stop being a problem.',
    baseCost: 12_000,
    force: 40,
    heads: 4,
  },
  {
    id: 'apc',
    name: 'ARMOURED CARRIER',
    short: 'APC',
    description: 'Six wheels, twin turrets, room for a squad. Fits through the colony streets with paint to spare.',
    baseCost: 500_000,
    force: 1_100,
    heads: 2,
  },
  {
    id: 'gunship',
    name: 'DROPSHIP GUNSHIP',
    short: 'GUNSHIP',
    description: 'Flies cover over the colony on a racetrack pattern. The pilot calls the atmosphere processor "the cathedral".',
    baseCost: 25_000_000,
    force: 35_000,
    heads: 2,
  },
  {
    id: 'orbital',
    name: 'ORBITAL FIRE SUPPORT',
    short: 'ORBITAL',
    description: 'The transport\'s mass driver, retasked. Accurate to within a building. The Combine would prefer it was not used on buildings.',
    baseCost: 1_200_000_000,
    force: 1_100_000,
    heads: 0,
  },
];

export interface FabricatorDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Rounds per second. */
  rate: number;
}

/** Ammunition supply, the detachment's power: dearer much faster than troopers, so it is the brake. */
export const FABRICATORS: readonly FabricatorDef[] = [
  {
    id: 'fieldfab',
    name: 'FIELD FABRICATOR',
    short: 'FIELDFAB',
    description: 'Prints caseless rounds from feedstock pellets. The pellets come in cheerful corporate colours.',
    baseCost: 30,
    rate: 0.5,
  },
  {
    id: 'armoury',
    name: 'MUNITIONS PRINTER',
    short: 'MUNITIONS',
    description: 'A shipboard printer bolted into the colony\'s motor pool. Smells of hot polymer.',
    baseCost: 800,
    rate: 10,
  },
  {
    id: 'resupply',
    name: 'ORBITAL RESUPPLY RUN',
    short: 'RESUPPLY',
    description: 'The transport drops pallets on the landing pad every twenty minutes. The pallets are mostly paperwork.',
    baseCost: 25_000,
    rate: 250,
  },
  {
    id: 'foundry',
    name: 'AUTOFAB FOUNDRY',
    short: 'FOUNDRY',
    description: 'The colony\'s own fabrication plant, restarted and retooled. It was making mining equipment before the outage.',
    baseCost: 1_000_000,
    rate: 8_000,
  },
  {
    id: 'arsenal',
    name: 'COMBINE ARSENAL SHIP',
    short: 'ARSENAL',
    description: 'A second transport in orbit, holds full of ordnance. It arrived faster than the paperwork says it could have.',
    baseCost: 60_000_000,
    rate: 300_000,
  },
];

export interface ColonySection extends SectionDef {
  /** In the sub-levels: reaching here gives the story deep access. */
  deep?: boolean;
}

/** Threat quadruples with each sector, so the force has to grow by orders of magnitude to reach the bottom. */
const THREAT_GROWTH = 3;
const NAMES: { id: string; name: string; deep?: boolean }[] = [
  { id: 'pad', name: 'LANDING PAD' },
  { id: 'ops', name: 'OPERATIONS BLOCK' },
  { id: 'hydro', name: 'HYDROPONICS' },
  { id: 'mess', name: 'MESS HALL' },
  { id: 'dorms', name: 'DORMITORIES' },
  { id: 'school', name: 'SCHOOLHOUSE' },
  { id: 'medlab', name: 'MEDLAB' },
  { id: 'motorpool', name: 'MOTOR POOL' },
  { id: 'annexe', name: 'PROCESSING ANNEXE' },
  { id: 'sub1', name: 'SUB-LEVEL 1: SERVICE TUNNELS', deep: true },
  { id: 'sub2', name: 'SUB-LEVEL 2: COOLANT GALLERIES', deep: true },
  { id: 'sub3', name: 'SUB-LEVEL 3: THE WARM DECKS', deep: true },
  { id: 'sub4', name: 'SUB-LEVEL 4: PROCESSOR FOUNDATIONS', deep: true },
  { id: 'processor', name: 'THE ATMOSPHERE PROCESSOR', deep: true },
];

export const SECTIONS: readonly ColonySection[] = NAMES.map((n, i) => ({
  ...n,
  threat: THREAT_GROWTH ** i,
  // Shallow sectors stay put for a while unguarded; the deep ones go quickly.
  reclaim: n.deep ? 0.01 : 0.003,
}));

/** Credits per second per point of a secured sector's threat: the colony back on the Combine's books. */
export const RETAINER_PER_THREAT = 0.75;
/** One-off credits for securing a sector the first time, in seconds of its retainer. */
export const BOUNTY_SECONDS = 60;
