import type { Beat } from '../mission/story';
import { sinceBeat } from '../mission/story';
import { depth } from '../mission/progress';
import { isCrewUnlocked } from '../mission/crew';
import type { MissionState } from '../mission/state';

const owns = (m: MissionState, id: string, n = 1) => (m.generators[id] ?? 0) >= n;
const inAct = (m: MissionState, act: number) => m.act >= act;

/**
 * Narrative beats, in priority order. Act 1 is relentlessly upbeat corporate.
 * Act 2's tells must be dismissible on a first contract: each has a mundane explanation.
 */
const ACT_1: Beat[] = [
  {
    id: 'a1-welcome-memo',
    when: ({ m }) => m.lifetimeOre >= 50,
    entries: [
      {
        kind: 'corp',
        text: 'MEMO [TX 2Y 11M AGO]: Kessler-Amari welcomes the crew of the Calloway Reach. Every tonne is a step toward a Better Future, Further Out.',
      },
    ],
  },
  {
    id: 'a1-first-drone',
    when: ({ m }) => owns(m, 'drone'),
    entries: [{ kind: 'sys', text: 'SD-4 UNIT 01 DEPLOYED. TELEMETRY NOMINAL. STATUS LIGHTS: CHEERFUL.' }],
  },
  {
    id: 'a1-cryo-access',
    when: ({ m }) => isCrewUnlocked(m),
    entries: [
      { kind: 'sys', text: 'CRYO BAY ACCESS AUTHORISED. THAW PROTOCOLS AVAILABLE. LIFE SUPPORT RATED FOR 3 WAKING CREW.' },
    ],
  },
  {
    id: 'a1-depth-100',
    when: ({ m }) => depth(m) >= 100,
    entries: [{ kind: 'sys', text: 'SHAFT DEPTH 100 M. REGOLITH GIVING WAY TO ICE-ROCK CONGLOMERATE. EXCELLENT GRADE.' }],
  },
  {
    id: 'a1-first-auger',
    when: ({ m }) => owns(m, 'auger'),
    entries: [{ kind: 'sys', text: 'AUGER RIG A-1 ANCHORED. CRUST RESISTANCE WITHIN TOLERANCE.' }],
  },
  {
    id: 'a1-wellness',
    when: ({ m }) => m.lifetimeOre >= 5_000,
    entries: [
      {
        kind: 'corp',
        text: 'WELLNESS REMINDER: Crew are entitled to one (1) recreational hour per 400 hours worked. Kessler-Amari cares.',
      },
    ],
  },
  {
    id: 'a1-first-crawler',
    when: ({ m }) => owns(m, 'crawler'),
    entries: [{ kind: 'sys', text: 'CRAWLER C-1 ONLINE. STRIP LANES MARKED ACROSS THE NORTHERN BASIN.' }],
  },
  {
    id: 'a1-depth-500',
    when: ({ m }) => depth(m) >= 500,
    entries: [{ kind: 'sys', text: 'SHAFT DEPTH 500 M. GROUND TEMPERATURE RISING 0.3 K PER 100 M. WITHIN GEOLOGICAL NORMS.' }],
  },
  {
    id: 'a1-shareholder',
    when: ({ m }) => m.lifetimeOre >= 40_000,
    entries: [
      {
        kind: 'corp',
        text: 'SHAREHOLDER BULLETIN: Tethys Minor yields exceed projection by 4%. The Board extends its warmest regards.',
      },
    ],
  },
  {
    id: 'a2-entry',
    when: ({ m }) => depth(m) >= 1_000,
    entries: [{ kind: 'sys', text: 'SHAFT DEPTH 1,000 M. ENTERING UNSURVEYED STRATA. PRIOR SURVEY DATA BELOW THIS DEPTH: [NOT ON FILE].' }],
    effects: [{ kind: 'setAct', act: 2 }],
  },
];

const ACT_2: Beat[] = [
  {
    id: 'a2-telemetry-gap',
    act: 2,
    when: ({ m }) => inAct(m, 2) && depth(m) >= 1_100,
    entries: [{ kind: 'sys', text: 'DRONE SD-4/07 TELEMETRY LOST 00:00:03. RECONNECTED. NO FAULT FOUND.' }],
  },
  {
    id: 'a2-log-hole',
    act: 2,
    when: ({ m }) => inAct(m, 2) && depth(m) >= 1_250,
    entries: [{ kind: 'anomaly', text: '--- LOG DISCONTINUITY 3.000 S --- RESUMING ---' }],
  },
  {
    id: 'a2-dream',
    act: 2,
    when: ({ m }) => inAct(m, 2) && depth(m) >= 1_400,
    entries: [{ kind: 'sys', text: 'CRYO POD 3 (LAM): REM ACTIVITY ELEVATED. SUBJECT VOCALISING. WORDS UNCLEAR. FLAGGED FOR MEDICAL.' }],
  },
  {
    id: 'a2-seismic-resonance',
    act: 2,
    when: ({ m }) => inAct(m, 2) && owns(m, 'seismic'),
    entries: [
      {
        kind: 'sys',
        text: 'SEISMIC RETURN: RESONANT CAVITY SIGNATURE AT ~3,200 M. PERIODIC. 0.2 HZ. CLASSIFIED AS SENSOR ARTEFACT.',
      },
    ],
  },
  {
    id: 'a2-hq-samples',
    act: 2,
    when: ({ m }) => inAct(m, 2) && depth(m) >= 1_800,
    entries: [
      {
        kind: 'corp',
        text: 'PRIORITY [TX 2Y 8M AGO]: Special Projects requests all deep core be retained unprocessed. Thank you for your discretion.',
      },
    ],
  },
  {
    id: 'a2-eight-signs',
    act: 2,
    when: ({ m }) => inAct(m, 2) && depth(m) >= 2_200,
    entries: [{ kind: 'sys', text: 'INTERNAL SENSOR SWEEP COMPLETE: 8 LIFE SIGNS.' }],
  },
  {
    id: 'a2-eight-corrected',
    act: 2,
    urgent: true,
    when: ({ m }) => sinceBeat(m, 'a2-eight-signs') >= 4,
    entries: [{ kind: 'sys', text: 'CORRECTION: 7 LIFE SIGNS. SENSOR RECALIBRATED. APOLOGIES FOR THE ERROR.' }],
  },
  {
    id: 'a2-residue',
    act: 2,
    when: ({ m }) => inAct(m, 2) && depth(m) >= 2_600,
    entries: [
      {
        kind: 'sys',
        text: 'SD-4/07 RETURNED WITH UNIDENTIFIED RESIDUE ON INTAKE. UNIT DECONTAMINATED. SAMPLE FORWARDED TO SCIENCE OFFICER PER STANDING ORDER.',
      },
    ],
  },
  {
    id: 'a2-remote-credential',
    act: 2,
    when: ({ m }) => inAct(m, 2) && depth(m) >= 2_900,
    entries: [
      {
        kind: 'sys',
        text: 'MEDICAL FLAG ON CRYO POD 3 CLEARED. AUTHORISATION: SPECIAL PROJECTS REMOTE CREDENTIAL. TIMESTAMP: 00:00:41 AGO.',
      },
    ],
  },
];

export const STORY: readonly Beat[] = [...ACT_1, ...ACT_2];
