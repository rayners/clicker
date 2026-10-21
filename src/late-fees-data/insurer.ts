export interface PolicyDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Premium per second. */
  rate: number;
  /** Underwriting the crash itself: owning one gives the final girl somewhere to look. */
  deep?: boolean;
}

/** Policies: the premium ladder, matching DEEP CONTRACT's mining tiers, whose pacing is proven. */
export const POLICIES: readonly PolicyDef[] = [
  { id: 'term', name: 'TERM LIFE POLICY', short: 'TERM', description: 'Ten years, ten thousand dollars. Sold to every survivor the morning after, by phone.', baseCost: 15, rate: 0.1 },
  { id: 'whole', name: 'WHOLE LIFE POLICY', short: 'WHOLE', description: 'For life, however long that turns out to be. Premiums due on the first of the month.', baseCost: 120, rate: 0.7 },
  { id: 'family', name: 'FAMILY PLAN', short: 'FAMILY', description: 'The survivors\' parents, siblings, roommates. Everyone near them, at a discount.', baseCost: 1_100, rate: 5 },
  { id: 'group', name: 'GROUP POLICY', short: 'GROUP', description: 'The whole senior class. The school board signed before anyone read the small print.', baseCost: 12_000, rate: 40 },
  { id: 'keyperson', name: 'KEY-PERSON COVER', short: 'KEYPERSON', description: 'Businesses insuring the employees they cannot afford to lose. They will lose some.', baseCost: 130_000, rate: 260 },
  { id: 'aviation', name: 'AVIATION LIABILITY', short: 'AVIATION', description: 'You now underwrite the airline. The investigators let you walk the crash site.', baseCost: 1_400_000, rate: 1_400, deep: true },
  { id: 'catbonds', name: 'CATASTROPHE BONDS', short: 'CATBONDS', description: 'Investors bet against disaster. Disaster has inside information.', baseCost: 20_000_000, rate: 7_800, deep: true },
  { id: 'engine', name: 'THE ACTUARIAL ENGINE', short: 'ENGINE', description: 'A mainframe that prints who will die next, and when. It has never been wrong. Its premiums are very competitive.', baseCost: 330_000_000, rate: 44_000, deep: true },
];

export interface AgentDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Omens per second broken. */
  power: number;
}

/** Prevention: the brake. Dearer faster than policies. */
export const AGENTS: readonly AgentDef[] = [
  { id: 'inspector', name: 'SAFETY INSPECTOR', short: 'INSPECT', description: 'Checks the gas, the wiring, the loose shelf above the bed. Writes it all down. Misses the one thing.', baseCost: 30, power: 0.005 },
  { id: 'investigator', name: 'CLAIMS INVESTIGATOR', short: 'INVESTIG', description: 'Follows a survivor for a day and takes the knives out of the dishwasher. Bills by the hour.', baseCost: 800, power: 0.1 },
  { id: 'bodyguards', name: 'BODYGUARD DETAIL', short: 'GUARDS', description: 'Two large men who stand between a survivor and anything with a moving part.', baseCost: 25_000, power: 2.5 },
  { id: 'analysts', name: 'RISK ANALYSTS', short: 'ANALYSTS', description: 'A floor of actuaries mapping coincidences. Their charts all point the same way.', baseCost: 1_000_000, power: 80 },
  { id: 'mortician', name: 'THE MORTICIAN', short: 'MORTICIAN', description: 'He knows how it works. He has always known. He charges a great deal, and he enjoys his work.', baseCost: 60_000_000, power: 3_000 },
];

/** Who walked off Flight 213, in the order the design will come for them. */
export const SURVIVORS = [
  'TOD', 'TERRY', 'BILLY', 'VALERIE', 'CARTER', 'ALEX', 'KAT', 'RORY', 'EUGENE', 'TIM', 'NORA', 'EVAN', 'KIMBERLY', 'THOMAS',
  'IAN', 'ERIN', 'FRANKIE', 'ASHLEY', 'ASHLYN', 'LEWIS', 'KEVIN', 'JULIE', 'PERRY', 'NADIA', 'HUNT', 'JANET', 'GEORGE', 'ANDY',
  'SAM', 'MOLLY', 'PETER', 'CANDICE', 'OLIVIA', 'NATHAN', 'ISAAC', 'DENNIS', 'ROY', 'MARGARET', 'LEON', 'WENDY',
];

/** How Death's design arranges an accident. {victim} is the name crossed off. */
export const ACCIDENTS = [
  '{victim} SLIPPED ON WATER FROM A CRACKED MUG, IN A KITCHEN WHERE THE KNIFE BLOCK SAT AT THE EDGE OF THE COUNTER.',
  'A LOOSE SCREW, A FAN, A SPARK, A GAS LEAK. {victim} NEVER SMELLED IT.',
  'THE BUS THAT HIT {victim} WAS RUNNING EIGHT SECONDS LATE. IT IS NEVER LATE.',
  'A TANNING BED, A SHELF, A SODA CAN, A SPILLED DRINK ON THE THERMOSTAT. {victim}.',
  '{victim} WAS CAREFUL ON THE ESCALATOR. THE ESCALATOR WAS NOT CAREFUL.',
  'A SIGN FELL FROM A BUILDING ON A WINDLESS DAY. {victim} HAD STOPPED TO TIE A SHOE.',
  'THE LOG TRUCK\'S CHAIN WAS FRAYED IN ONE LINK. {victim} WAS DRIVING BEHIND IT.',
];
