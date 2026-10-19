import type { Beat } from '../../mission/story';
import { depth } from '../../mission/extraction/progress';
import { isCrewUnlocked } from '../../mission/crew';
import type { ExtractionMission, MissionState } from '../../mission/state';

const x = (m: MissionState) => m as ExtractionMission;
const owns = (m: MissionState, id: string, n = 1) => (x(m).generators[id] ?? 0) >= n;

/** Act 1 for an extraction contract: relentlessly upbeat corporate. */
export const EXTRACTION_BEATS: readonly Beat[] = [
  {
    id: 'a1-welcome-memo',
    when: ({ m }) => x(m).lifetimeOre >= 50,
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
    when: ({ m }) => depth(x(m)) >= 100,
    entries: [{ kind: 'sys', text: 'SHAFT DEPTH 100 M. REGOLITH GIVING WAY TO ICE-ROCK CONGLOMERATE. EXCELLENT GRADE.' }],
  },
  {
    id: 'a1-first-auger',
    when: ({ m }) => owns(m, 'auger'),
    entries: [{ kind: 'sys', text: 'AUGER RIG A-1 ANCHORED. CRUST RESISTANCE WITHIN TOLERANCE.' }],
  },
  {
    id: 'a1-wellness',
    when: ({ m }) => x(m).lifetimeOre >= 5_000,
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
    when: ({ m }) => depth(x(m)) >= 500,
    entries: [{ kind: 'sys', text: 'SHAFT DEPTH 500 M. GROUND TEMPERATURE RISING 0.3 K PER 100 M. WITHIN GEOLOGICAL NORMS.' }],
  },
  {
    id: 'a1-shareholder',
    when: ({ m }) => x(m).lifetimeOre >= 40_000,
    entries: [
      {
        kind: 'corp',
        text: 'SHAREHOLDER BULLETIN: Tethys Minor yields exceed projection by 4%. The Board extends its warmest regards.',
      },
    ],
  },
];
