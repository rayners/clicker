export interface BedDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Grant money per second a patient here earns in light sleep. */
  rate: number;
  /** The basement: owning one gives the final girl somewhere to look. */
  deep?: boolean;
}

/** Beds earn the study's data. The ladder matches DEEP CONTRACT's mining tiers, whose pacing is proven. */
export const BEDS: readonly BedDef[] = [
  { id: 'cot', name: 'WARD COT', short: 'COTS', description: 'A folding cot, a pillow, a clipboard. Volunteers paid in cash and coffee.', baseCost: 15, rate: 0.1 },
  { id: 'monitored', name: 'MONITORED BED', short: 'MONITORED', description: 'Electrodes on the scalp, a pen recorder by the bed. The needle twitches all night.', baseCost: 120, rate: 0.7 },
  { id: 'polysomnography', name: 'POLYSOMNOGRAPHY SUITE', short: 'PSG', description: 'Eye movement, breathing, heart. Everything is written down. Nobody reads the screaming.', baseCost: 1_100, rate: 5 },
  { id: 'tank', name: 'ISOLATION TANK', short: 'TANKS', description: 'Salt water at body heat. Patients say they can hear someone humming in there.', baseCost: 12_000, rate: 40 },
  { id: 'eeg', name: 'EEG ARRAY ROOM', short: 'EEG', description: 'Sixty-four channels. The grant-holder wants the dreams themselves, not just the waves.', baseCost: 130_000, rate: 260 },
  { id: 'basement', name: 'THE BASEMENT WARD', short: 'BASEMENT', description: 'Under the old house. Warm all year. The pipes knock in a rhythm, like footsteps.', baseCost: 1_400_000, rate: 1_400, deep: true },
  { id: 'recorder', name: 'DREAM RECORDER', short: 'RECORDER', description: 'A prototype from the grant-holder. It prints what the sleeper sees. Mostly it prints a corridor.', baseCost: 20_000_000, rate: 7_800, deep: true },
  { id: 'boiler', name: 'THE BOILER ROOM', short: 'BOILER', description: 'Someone set beds up down here. Nobody remembers approving it. The patients sleep very deeply.', baseCost: 330_000_000, rate: 44_000, deep: true },
];

export interface StaffDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Deep sleepers each can watch at once. */
  watches: number;
}

/** Night staff: the brake. Dearer faster than beds. */
export const STAFF: readonly StaffDef[] = [
  { id: 'orderly', name: 'NIGHT ORDERLY', short: 'ORDERLY', description: 'Walks the ward with a flashlight and a thermos. Shakes anyone who starts to moan.', baseCost: 30, watches: 2 },
  { id: 'nurse', name: 'NIGHT NURSE', short: 'NURSES', description: 'Reads the pen recorders like sheet music. Knows the shape of a bad dream before it starts.', baseCost: 400, watches: 8 },
  { id: 'station', name: 'MONITORING STATION', short: 'STATION', description: 'A desk of oscilloscopes and a buzzer to every bed. One technician, one pot of coffee.', baseCost: 6_000, watches: 40 },
  { id: 'cctv', name: 'CCTV WARD', short: 'CCTV', description: 'Infrared cameras over every bed. The tapes are kept. Some of them show things.', baseCost: 90_000, watches: 250 },
  { id: 'techs', name: 'SLEEP-TECH TEAM', short: 'TECHS', description: 'Graduate students on rotation, paid in course credit and caffeine pills. Nobody sleeps on their watch.', baseCost: 1_500_000, watches: 2_000 },
];

/** Deep sleep earns this many times light sleep, while someone is watching. */
export const REM_MULTIPLIER = 1.8;

export const PATIENT_NAMES = [
  'GLEN', 'TINA', 'ROD', 'PHILLIP', 'KINCAID', 'JENNIFER', 'TAREK', 'JOEY', 'SHEILA', 'DEBBIE', 'GRETA', 'MARK', 'YVONNE', 'DAN',
  'LORI', 'JESSE', 'GRADY', 'RON', 'CARLOS', 'SPENCER', 'TRACY', 'LISA', 'KERRY', 'MARGE', 'WILL', 'TAYLOR', 'KAY', 'ELAINE',
];
