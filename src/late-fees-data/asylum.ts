export interface WardDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** State funding per second for each bed filled here. */
  rate: number;
  /** The old buildings: owning one gives the final girl somewhere to look. */
  deep?: boolean;
}

/** Beds the state pays for. The ladder matches DEEP CONTRACT's mining tiers, whose pacing is proven. */
export const WARDS: readonly WardDef[] = [
  { id: 'open', name: 'OPEN WARD BED', short: 'OPEN', description: 'A bed by a barred window. Day passes to the garden, and a radio that only gets one station.', baseCost: 15, rate: 0.1 },
  { id: 'dayroom', name: 'DAY ROOM PLACE', short: 'DAY ROOM', description: 'Checkers, a television bolted high on the wall, and a nurse who has seen everything twice.', baseCost: 120, rate: 0.7 },
  { id: 'locked', name: 'LOCKED WARD BED', short: 'LOCKED', description: 'Doors that open only from one side. The state pays more for the ones it would rather not see.', baseCost: 1_100, rate: 5 },
  { id: 'disturbed', name: 'DISTURBED WARD BED', short: 'DISTURBED', description: 'Padded walls, a slot in the door. Someone in here hums the same four notes all night.', baseCost: 12_000, rate: 40 },
  { id: 'secure', name: 'SECURE WING BED', short: 'SECURE', description: 'Court referrals. The county sheriff signs them in and does not stay for coffee.', baseCost: 130_000, rate: 260 },
  { id: 'infirmary', name: 'THE OLD INFIRMARY', short: 'INFIRMARY', description: 'The first building on the hill, reopened to save money. The records room was never cleared out.', baseCost: 1_400_000, rate: 1_400, deep: true },
  { id: 'hydro', name: 'HYDROTHERAPY BASEMENT', short: 'HYDRO', description: 'Tiled tubs and canvas covers with holes for the head. The drains still run, slowly, in the wrong direction.', baseCost: 20_000_000, rate: 7_800, deep: true },
  { id: 'ward10', name: 'WARD TEN', short: 'WARD 10', description: 'One corridor, thirty doors, one patient who has not spoken in fifteen years. Bed thirty is always made.', baseCost: 330_000_000, rate: 44_000, deep: true },
];

export interface StaffDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Patients each keeps calm, unsedated. */
  calms: number;
}

/** Ward staff: the brake. Dearer faster than beds. */
export const ASYLUM_STAFF: readonly StaffDef[] = [
  { id: 'attendant', name: 'WARD ATTENDANT', short: 'ATTENDANT', description: 'Keys on a belt, soft-soled shoes. Knows which door sticks.', baseCost: 30, calms: 2 },
  { id: 'nurse', name: 'CHARGE NURSE', short: 'NURSES', description: 'Runs a ward like a ship. The patients call her by her first name, and nobody else does.', baseCost: 400, calms: 8 },
  { id: 'doctor', name: 'STAFF PSYCHIATRIST', short: 'DOCTORS', description: 'Rounds twice a day and a notebook nobody else may read. One of them has been here longer than the building.', baseCost: 6_000, calms: 40 },
  { id: 'gallery', name: 'OBSERVATION GALLERY', short: 'GALLERY', description: 'One-way glass over every day room. The staff behind it take shifts, and notes.', baseCost: 90_000, calms: 250 },
  { id: 'residents', name: 'RESIDENCY PROGRAMME', short: 'RESIDENTS', description: 'A dozen young doctors from the university, keen and underslept. The patients love them.', baseCost: 1_500_000, calms: 2_000 },
];

export const PATIENT_NAMES_ASYLUM = [
  'ARLO', 'BEA', 'CLEM', 'DORIS', 'EZRA', 'FAY', 'GUS', 'HAZEL', 'IKE', 'JUNE', 'KIT', 'LOIS', 'MERLE', 'NED', 'OPAL', 'PERCY',
  'QUINN', 'RUTH', 'SAUL', 'TESS', 'URSA', 'VERN', 'WILMA', 'XAVIER', 'YVETTE', 'ZEKE', 'BOBBY', 'CARLA',
];

/** Millbrook residents, out trick-or-treating on Candy Corn Day. */
export const TOWN_NAMES = ['A TEENAGER IN A SHEET', 'THE BABYSITTER ON ELM', 'A BOY DRESSED AS AN ASTRONAUT', 'THE HARDWARE STORE OWNER', 'A NURSE ON HER WAY HOME', 'THE DEPUTY ON NIGHT PATROL'];
