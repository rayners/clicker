import type { UpgradeEffect } from './extraction/upgrades';

export type CrewBoost = UpgradeEffect | { kind: 'fatigueMultiplier'; value: number };

export interface CrewDef {
  id: string;
  name: string;
  /** Short surname used in log lines. */
  callsign: string;
  role: string;
  dossier: string;
  boost: CrewBoost;
  boostText: string;
  thawCost: number;
  wakeLines: string[];
  exhaustedLine: string;
}

export const CREW: readonly CrewDef[] = [
  {
    id: 'okonkwo',
    name: 'Ruth Okonkwo-Hale',
    callsign: 'OKONKWO-HALE',
    role: 'CAPTAIN',
    dossier: 'Nineteen years with the Combine. Two commendations, one formal reprimand (redacted).',
    boost: { kind: 'globalMultiplier', value: 1.2 },
    boostText: 'ALL OUTPUT x1.2',
    thawCost: 500,
    wakeLines: [
      'Morning, WARDEN. Tell me we are ahead of quota.',
      'Coffee first. Then the numbers.',
      'How long was I under? ...Never mind. Don\'t tell me.',
    ],
    exhaustedLine: 'I\'m no good to anyone like this. Put me back under.',
  },
  {
    id: 'sorensen',
    name: 'Dmitri Sorensen',
    callsign: 'SORENSEN',
    role: 'CHIEF ENGINEER',
    dossier: 'Keeps the refinery running on spit and spare parts. Union steward, technically.',
    boost: { kind: 'refineryMultiplier', value: 1.5 },
    boostText: 'REFINERY THROUGHPUT x1.5',
    thawCost: 300,
    wakeLines: [
      'Who touched my catalyst bed? Somebody touched my catalyst bed.',
      'Same shares as last contract? Figures.',
      'Smells like burnt coolant in here. Normal. Probably.',
    ],
    exhaustedLine: 'My hands are shaking. That\'s how people lose fingers. Cryo. Now.',
  },
  {
    id: 'lam',
    name: 'Priya Lam',
    callsign: 'LAM',
    role: 'GEOLOGIST',
    dossier: 'Doctoral thesis on subsurface ice dynamics. Took this contract to pay it off.',
    boost: { kind: 'globalMultiplier', value: 1.15 },
    boostText: 'ALL OUTPUT x1.15',
    thawCost: 400,
    wakeLines: [
      'Show me the seismic logs. All of them, not the summary.',
      'The density profile on this rock is weird. Good weird. Mostly.',
      'Did anyone else dream about the ocean?',
    ],
    exhaustedLine: 'I keep reading the same core log over and over. I need to sleep.',
  },
  {
    id: 'brandt',
    name: 'Teodor Brandt',
    callsign: 'BRANDT',
    role: 'PILOT',
    dossier: 'Ex-military lift pilot. Hand-flies the canister catches when the autopilot balks.',
    boost: { kind: 'generatorMultiplier', generator: 'massdriver', value: 2 },
    boostText: 'MASS DRIVER OUTPUT x2',
    thawCost: 2_000,
    wakeLines: [
      'Let me fly the catches. Your autopilot flinches.',
      'Eleven years home. Eleven. My kid will be in college.',
      'You ever think about how far out we are? Don\'t. It doesn\'t help.',
    ],
    exhaustedLine: 'Nearly clipped a canister. That\'s my cue. Freezer, please.',
  },
  {
    id: 'voss',
    name: 'Halley Voss',
    callsign: 'VOSS',
    role: 'MEDICAL OFFICER',
    dossier: 'Trauma surgeon. Signed on after her licence review. Thorough. Asks too many questions.',
    boost: { kind: 'fatigueMultiplier', value: 0.5 },
    boostText: 'CREW FATIGUE x0.5',
    thawCost: 800,
    wakeLines: [
      'Everybody hydrate. I mean it. Thaw sickness is real.',
      'Your cryo logs have gaps, WARDEN. Want to explain that?',
      'Vitals look fine. Everyone\'s vitals always look fine.',
    ],
    exhaustedLine: 'I\'m making mistakes. Doctors who make mistakes go to sleep.',
  },
  {
    id: 'kane',
    name: 'Dr. Aurelio Kane',
    callsign: 'KANE',
    role: 'SCIENCE OFFICER',
    dossier: 'Assigned by Combine Special Projects two days before departure. Replaced the original science officer.',
    boost: { kind: 'generatorMultiplier', generator: 'bore', value: 2 },
    boostText: 'DEEP-CORE BORE OUTPUT x2',
    thawCost: 50_000,
    wakeLines: [
      'I will supervise the core samples personally.',
      'Excellent progress, WARDEN. The board will be pleased.',
      'Route all deep strata telemetry to my terminal. Thank you.',
    ],
    exhaustedLine: 'Fatigue is a variable. Very well. Cryo.',
  },
  {
    id: 'amari-reyes',
    name: 'Jun Amari-Reyes',
    callsign: 'AMARI-REYES',
    role: 'TECHNICIAN',
    dossier: 'Youngest aboard. Distant relation to the Amari board family; insists it never helped.',
    boost: { kind: 'clickMultiplier', value: 2 },
    boostText: 'DRILL CYCLE YIELD x2',
    thawCost: 200,
    wakeLines: [
      'I can tune the drill head. Give me ten minutes.',
      'First real contract! Is it always this quiet?',
      'Hey WARDEN, do you sleep? Do you, like, dream?',
    ],
    exhaustedLine: 'I just dropped a wrench into the drill housing. Sorry. Sleep time.',
  },
];
