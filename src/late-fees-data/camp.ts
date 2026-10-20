import type { SectionDef } from '../shared/ground';

export interface CounselorDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Staffing each unit brings, to prep work or the watch. */
  force: number;
  /** People per unit, for the credits roll. */
  heads: number;
}

/** Staffing tiers. The ladder matches DEEP CONTRACT's so pacing tools carry over. */
export const COUNSELORS: readonly CounselorDef[] = [
  {
    id: 'junior',
    name: 'JUNIOR COUNSELOR',
    short: 'JUNIORS',
    description: 'Nineteen, a whistle, a lanyard and a plan to sneak off to the boathouse after lights-out.',
    baseCost: 15,
    force: 0.1,
    heads: 1,
  },
  {
    id: 'senior',
    name: 'SENIOR COUNSELOR',
    short: 'SENIORS',
    description: 'Came back for a third summer. Knows the trails. Will not talk about the second summer.',
    baseCost: 400,
    force: 2,
    heads: 1,
  },
  {
    id: 'lifeguard',
    name: 'LIFEGUARD CREW',
    short: 'LIFEGUARD',
    description: 'Red shorts, a tower, a rescue buoy. Nobody swims after dark. Nobody is supposed to.',
    baseCost: 12_000,
    force: 40,
    heads: 3,
  },
  {
    id: 'ranger',
    name: 'PARK RANGERS',
    short: 'RANGERS',
    description: 'Flat hats and a truck. They have heard the stories. They patrol anyway, in pairs.',
    baseCost: 500_000,
    force: 1_100,
    heads: 2,
  },
  {
    id: 'deputies',
    name: "SHERIFF'S DEPUTIES",
    short: 'DEPUTIES',
    description: 'The county finally believes you. Shotguns, spotlights, and a sheriff who keeps saying "a prank".',
    baseCost: 25_000_000,
    force: 35_000,
    heads: 6,
  },
  {
    id: 'troopers',
    name: 'STATE TROOPERS',
    short: 'TROOPERS',
    description: 'A cordon around the whole lake. Helicopters. The news vans arrive an hour later.',
    baseCost: 1_200_000_000,
    force: 1_100_000,
    heads: 40,
  },
];

export interface LightDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Light per second (lumens, nominally). */
  rate: number;
}

/** Light is the brake: dearer faster than staff. The camp needs most of it after dark. */
export const LIGHTS: readonly LightDef[] = [
  { id: 'lanterns', name: 'GAS LANTERNS', short: 'LANTERNS', description: 'Hiss and flicker. Moths love them. So does something else.', baseCost: 30, rate: 0.5 },
  { id: 'generator', name: 'PORTABLE GENERATOR', short: 'GENNY', description: 'Coughs to life on the third pull. Cuts out at the worst moment, every time.', baseCost: 800, rate: 10 },
  { id: 'floodlights', name: 'FLOODLIGHT RIG', short: 'FLOODS', description: 'Sodium lamps on poles. The woods past them look darker than before.', baseCost: 25_000, rate: 250 },
  { id: 'powerline', name: 'COUNTY POWER LINE', short: 'GRID', description: 'Real power, at last, run in along the lake road. One line. One line is easy to cut.', baseCost: 1_000_000, rate: 8_000 },
  { id: 'stadium', name: 'STADIUM LIGHTS', short: 'STADIUM', description: 'Borrowed from the high school. The lake glows white all night. The water still looks black.', baseCost: 60_000_000, rate: 300_000 },
];

export interface ZoneDef extends SectionDef {
  /** Campers staying there: who is lost if it goes dark. */
  campers: number;
  /** The far side of the lake: reaching here gives the final girl somewhere to look. */
  deep?: boolean;
}

/** Each zone needs triple the staff of the last, so the camp grows by orders of magnitude to reach the far shore. */
const STAFF_GROWTH = 3;
const NAMES: { id: string; name: string; campers: number; deep?: boolean }[] = [
  { id: 'gate', name: 'FRONT GATE', campers: 4 },
  { id: 'office', name: "DIRECTOR'S OFFICE", campers: 6 },
  { id: 'mess', name: 'MESS HALL', campers: 12 },
  { id: 'cabin1', name: 'CABINS 1-3', campers: 24 },
  { id: 'cabin4', name: 'CABINS 4-6', campers: 24 },
  { id: 'archery', name: 'ARCHERY RANGE', campers: 16 },
  { id: 'cabin7', name: 'CABINS 7-8', campers: 16 },
  { id: 'boathouse', name: 'THE BOATHOUSE', campers: 10 },
  { id: 'lake', name: 'THE LAKE', campers: 30 },
  { id: 'trail', name: 'THE NORTH TRAIL', campers: 8, deep: true },
  { id: 'camp1958', name: 'THE OLD CAMPSITE', campers: 12, deep: true },
  { id: 'shack', name: "THE GROUNDSKEEPER'S SHACK", campers: 4, deep: true },
  { id: 'farshore', name: 'THE FAR SHORE', campers: 20, deep: true },
  { id: 'drowning', name: 'WHERE HE DROWNED', campers: 1, deep: true },
];

export const ZONES: readonly ZoneDef[] = NAMES.map((n, i) => ({
  ...n,
  threat: STAFF_GROWTH ** i,
  reclaim: n.deep ? 0.01 : 0.003,
}));

/** Enrolment per second per point of a zone's staffing need, while it is open. */
export const FEE_PER_THREAT = 0.75;
/** A booking rush the first time a zone opens, in seconds of its enrolment. */
export const BOOKING_SECONDS = 60;

/** Who the killer takes, in the order the camp's roster lists them. */
export const STAFF_NAMES = [
  'ANNIE', 'BILL', 'MARCIE', 'NED', 'JACK', 'BRENDA', 'ALICE', 'STEVE', 'VICKI', 'PAUL', 'SANDRA', 'TERRY', 'MARK', 'GINNY',
  'JEFF', 'DEBBIE', 'ANDY', 'SHELLY', 'CHUCK', 'CHRIS', 'TINA', 'VINNIE', 'ROBIN', 'EDDIE', 'TOMMY', 'TRISH', 'ROB', 'DOUG',
];
