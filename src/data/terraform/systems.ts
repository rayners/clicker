export type Line = 'atmosphere' | 'heat' | 'water';

export interface LineDef {
  id: Line;
  name: string;
  short: string;
  /** What the cumulative output of this line is shown as. */
  meter: string;
}

export const LINES: readonly LineDef[] = [
  { id: 'atmosphere', name: 'ATMOSPHERE', short: 'ATMO', meter: 'PRESSURE' },
  { id: 'heat', name: 'HEAT', short: 'HEAT', meter: 'MEAN TEMP' },
  { id: 'water', name: 'WATER', short: 'WATER', meter: 'HYDROSPHERE' },
];

export interface ReactorDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Megawatts per unit. */
  mw: number;
}

export const REACTORS: readonly ReactorDef[] = [
  {
    id: 'cells',
    name: 'FUEL CELL STACK',
    short: 'CELLS',
    description: 'Kessler-Amari PowerPak modules. Stackable, swappable, cheerfully labelled.',
    baseCost: 30,
    mw: 0.5,
  },
  {
    id: 'fission',
    name: 'FISSION PILE',
    short: 'FISSION',
    description: 'Buried two hundred metres down. Warm to the touch for the next ten thousand years.',
    baseCost: 800,
    mw: 10,
  },
  {
    id: 'fusion',
    name: 'FUSION TORUS',
    short: 'FUSION',
    description: 'Deuterium from the polar ice. The station lights no longer flicker at shift change.',
    baseCost: 25_000,
    mw: 250,
  },
  {
    id: 'mirror',
    name: 'ORBITAL MIRROR ARRAY',
    short: 'MIRRORS',
    description: 'Forty kilometres of foil at L1. On a clear night the colonists will be able to see it.',
    baseCost: 1_000_000,
    mw: 8_000,
  },
  {
    id: 'geotap',
    name: 'GEOTHERMAL TAP',
    short: 'GEOTAP',
    description: 'Draws on a warm layer beneath the crust that the survey did not predict.',
    baseCost: 60_000_000,
    mw: 300_000,
  },
];

export interface ProcessorDef {
  id: string;
  line: Line;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Units per second at full power; each unit per second draws 1 MW. */
  rate: number;
}

/** Every line has the same four-step ladder, so the spec decides where the money goes. */
const LADDER = [
  { baseCost: 15, rate: 0.1 },
  { baseCost: 400, rate: 2 },
  { baseCost: 12_000, rate: 40 },
  { baseCost: 500_000, rate: 1_100 },
  { baseCost: 25_000_000, rate: 35_000 },
];

const NAMED: { line: Line; id: string; name: string; short: string; description: string }[] = [
  { line: 'atmosphere', id: 'cracker', name: 'REGOLITH CRACKER', short: 'CRACKERS', description: 'Bakes oxygen and nitrogen out of the topsoil. Smells faintly of struck matches.' },
  { line: 'atmosphere', id: 'electrolysis', name: 'ELECTROLYSIS RIG', short: 'ELECTRO', description: 'Splits meltwater into breathable oxygen and spare hydrogen. Hums a cheerful two-note chord.' },
  { line: 'atmosphere', id: 'atmoproc', name: 'ATMOSPHERE PROCESSOR', short: 'ATMOPROC', description: 'A cathedral of pipes. Breathes out a planet\'s worth of air, one cubic kilometre at a time.' },
  { line: 'atmosphere', id: 'comet', name: 'COMET DIVERTER', short: 'COMETS', description: 'Nudges volatile-rich bodies onto impact trajectories. Schedules published to the colonists in advance.' },
  { line: 'atmosphere', id: 'skyforge', name: 'SKYFORGE CASCADE', short: 'SKYFORGE', description: 'Orbital catalysis curtain. The sky turns a shade of blue the brochure promised.' },
  { line: 'heat', id: 'emitter', name: 'GREENHOUSE EMITTER', short: 'EMITTERS', description: 'Pumps engineered fluorocarbons into the thin air. Every degree is a sales point.' },
  { line: 'heat', id: 'duster', name: 'ALBEDO DUSTER', short: 'DUSTERS', description: 'Crop-dusters spread dark carbon over the ice. The poles go grey, then brown, then wet.' },
  { line: 'heat', id: 'soletta', name: 'SOLETTA LENS', short: 'SOLETTA', description: 'Focuses reflected sunlight onto the ice cap. Do not look directly at the ice cap.' },
  { line: 'heat', id: 'thermalvent', name: 'THERMAL VENT DRILL', short: 'VENTS', description: 'Opens channels to the warm layer. The warm layer is warmer than the model predicted.' },
  { line: 'heat', id: 'climateengine', name: 'CLIMATE ENGINE', short: 'CLIMATE', description: 'Planetary-scale heat pump. Runs to Special Projects specification.' },
  { line: 'water', id: 'melter', name: 'ICE MELTER', short: 'MELTERS', description: 'Thermal lances on the polar cap. Meltwater runs downhill toward the future.' },
  { line: 'water', id: 'condenser', name: 'CONDENSER TOWER', short: 'CONDENSE', description: 'Wrings humidity out of the new air and gives it back as rain. Mostly.' },
  { line: 'water', id: 'icehauler', name: 'ICE HAULER', short: 'HAULERS', description: 'Tugs that drag polar ice into the equatorial basins. Pilots say the basins are deeper than charted.' },
  { line: 'water', id: 'aquifer', name: 'DEEP AQUIFER TAP', short: 'AQUIFER', description: 'Bores into a reservoir three kilometres down. The reservoir is warm, and it is not empty.' },
  { line: 'water', id: 'seaseed', name: 'SEA-SEEDING ARRAY', short: 'SEASEED', description: 'Distributes the culture medium supplied by Special Projects. Do not sample.' },
];

export const PROCESSORS: readonly ProcessorDef[] = NAMED.map((p, i) => ({ ...p, ...LADDER[i % LADDER.length]! }));

export interface SpecRevision {
  /** Story-scale progress at which corporate issues this revision. */
  at: number;
  /** Target share of throughput per line; sums to 1. */
  targets: Record<Line, number>;
  memo: string;
}

/** Corporate keeps moving the goalposts. Late revisions run hot, wet and oxygen-poor. */
export const SPEC_REVISIONS: readonly SpecRevision[] = [
  { at: 0, targets: { atmosphere: 0.4, heat: 0.3, water: 0.3 }, memo: 'HABITABILITY SPEC REV 1: STANDARD HUMAN ENVELOPE.' },
  { at: 600, targets: { atmosphere: 0.4, heat: 0.25, water: 0.35 }, memo: 'Updated agronomy model favours higher humidity. Your patience is appreciated.' },
  { at: 1_500, targets: { atmosphere: 0.3, heat: 0.3, water: 0.4 }, memo: 'Revised to support the Special Projects soil culture programme. No action required by colonists.' },
  { at: 2_400, targets: { atmosphere: 0.2, heat: 0.35, water: 0.45 }, memo: 'Oxygen partial-pressure target lowered for colonist comfort. Colonists have not been consulted, for their comfort.' },
  { at: 3_600, targets: { atmosphere: 0.1, heat: 0.4, water: 0.5 }, memo: 'Final envelope issued by Special Projects. Supersedes all prior specifications. Do not distribute.' },
];

/** Story-scale progress at which each colonist wave is certified and thawed. */
export const COLONIST_WAVES: readonly number[] = [800, 1_600, 2_600, 3_800, 5_200, 7_000];
