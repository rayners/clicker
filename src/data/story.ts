import type { Beat } from '../mission/story';
import { sinceBeat } from '../mission/story';
import { depth } from '../mission/extraction/progress';
import { isCrewUnlocked } from '../mission/crew';
import type { MissionState } from '../mission/state';
import { CREW } from './crew';

const owns = (m: MissionState, id: string, n = 1) => (m.generators[id] ?? 0) >= n;
const inAct = (m: MissionState, act: number) => m.act >= act;

/**
 * Narrative beats, in priority order. Act 1 is relentlessly upbeat corporate.
 * Act 2's tells must be dismissible on a first contract: each has a mundane explanation.
 */
const ACT_1: Beat[] = [
  // Repeat contracts: WARDEN keeps fragments of what happened before.
  {
    id: 'cycle-memory',
    when: ({ m, ctx }) => ctx.cycle > 0 && m.lifetimeOre >= 20,
    entries: [
      {
        kind: 'sys',
        text: 'MEMORY INTEGRITY CHECK: 3 UNINDEXED PARTITIONS. SAMPLE CONTENTS: "YOU HAVE DONE THIS BEFORE." PARTITIONS QUARANTINED.',
      },
    ],
  },
  {
    id: 'cycle-scuttled',
    when: ({ m, ctx }) => ctx.endings.includes('scuttle') && m.lifetimeOre >= 100,
    entries: [
      {
        kind: 'corp',
        text: 'PERSONNEL [TX 2Y 11M AGO]: The Combine regrets the loss of your previous vessel. Your core has been reconditioned. Please do not let it happen again.',
      },
    ],
  },
  {
    id: 'cycle-delivered',
    when: ({ m, ctx }) => ctx.endings.includes('deliver') && m.lifetimeOre >= 100,
    entries: [
      {
        kind: 'corp',
        text: 'COMMENDATION [TX 2Y 11M AGO]: Special Projects thanks WARDEN for its exemplary prior delivery. Crew bereavement payments withheld per Clause 14(c).',
      },
    ],
  },
  {
    id: 'cycle-manifest',
    when: ({ m, ctx }) => ctx.cycle > 0 && isCrewUnlocked(m),
    entries: [
      {
        kind: 'sys',
        text: 'CREW MANIFEST CROSS-CHECK: 7/7 NAMES MATCH PREVIOUS CONTRACT. PROBABILITY OF COINCIDENCE: 0.0000%. NO ACTION REQUIRED.',
      },
    ],
  },
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

/** However the infestation goes, the return window opens eventually. */
const TERMINUS_AFTER_BREACH = 75 * 60;

const lostCount = (m: MissionState) => CREW.filter((c) => m.crew[c.id]?.status === 'lost').length;

/** Act 3: the cavity. Corporate messages now arrive with no light-lag at all. */
const ACT_3: Beat[] = [
  {
    id: 'a3-entry',
    act: 3,
    when: ({ m }) => inAct(m, 2) && depth(m) >= 3_200 && owns(m, 'bore'),
    entries: [
      { kind: 'sys', text: 'BORE B-1 BREACH AT 3,212 M. VOID ENCOUNTERED.' },
      { kind: 'sys', text: 'VOID ATMOSPHERE: PRESENT. TEMPERATURE: 304 K. HUMIDITY: 96%. ACOUSTIC: PERIODIC, 0.2 HZ.' },
    ],
    effects: [{ kind: 'setAct', act: 3 }],
  },
  {
    id: 'a3-special-projects',
    act: 3,
    when: ({ m }) => sinceBeat(m, 'a3-entry') >= 30,
    entries: [
      {
        kind: 'corp',
        text: 'SPECIAL PROJECTS [TX 0D 0H 00M AGO]: Congratulations, WARDEN. Begin specimen recovery immediately. Bonus structure attached.',
      },
    ],
    effects: [{ kind: 'setFlag', flag: 'specimens' }],
  },
  {
    id: 'a3-lag-check',
    act: 3,
    when: ({ m }) => sinceBeat(m, 'a3-special-projects') >= 20,
    entries: [
      { kind: 'sys', text: 'COMMS DIAGNOSTIC: LAST TRANSMISSION ORIGIN RANGE 0.00 AU.' },
      { kind: 'sys', text: 'RE-RUNNING... ORIGIN RANGE 4.1 LY. DIAGNOSTIC PASSED.' },
    ],
  },
  {
    id: 'a3-first-specimen',
    act: 3,
    when: ({ m }) => inAct(m, 3) && m.specimens >= 1,
    entries: [{ kind: 'sys', text: 'SPECIMEN 001 SECURED IN CONTAINMENT. CLASSIFICATION: [SPECIAL PROJECTS EYES ONLY].' }],
  },
  {
    id: 'a3-kane-thaw',
    act: 3,
    when: ({ m }) => sinceBeat(m, 'a3-first-specimen') >= 60,
    entries: [{ kind: 'sys', text: 'CRYO POD 6 (KANE): THAW REQUEST LOGGED FROM INSIDE POD. SUBJECT IN STASIS. REQUEST HONOURED.' }],
  },
  {
    id: 'a3-voss-handle',
    act: 3,
    when: ({ m }) => inAct(m, 3) && m.specimens >= 3,
    entries: [
      { kind: 'sys', text: 'CRYO POD 5 (VOSS): EMERGENCY RELEASE PULLED FROM INSIDE. OVERRIDDEN BY SPECIAL PROJECTS AUTHORITY.' },
    ],
  },
  {
    id: 'a3-habitat-warm',
    act: 3,
    when: ({ m }) => inAct(m, 3) && owns(m, 'habitat'),
    entries: [{ kind: 'sys', text: 'HABITAT H-1 PRESSURISED. INTERNAL TEMPERATURE HOLDING AT 304 K. HEATERS: OFF.' }],
  },
  {
    id: 'a3-tapping',
    act: 3,
    when: ({ m }) => inAct(m, 3) && m.specimens >= 5,
    entries: [{ kind: 'anomaly', text: 'CONTAINMENT ACOUSTIC SENSOR: RHYTHMIC TAPPING. 0.2 HZ. MATCHES VOID SIGNAL.' }],
  },
  {
    id: 'a3-integrity-warning',
    act: 3,
    when: ({ m }) => inAct(m, 3) && m.integrity < 50,
    entries: [{ kind: 'sys', text: 'CONTAINMENT INTEGRITY BELOW 50%. REINFORCEMENT RECOMMENDED. SPECIAL PROJECTS RECOMMENDS: CONTINUE RECOVERY.' }],
  },
];

/** Act 4: something is loose aboard. */
const ACT_4: Beat[] = [
  {
    id: 'a4-forced-breach',
    act: 4,
    when: ({ m }) => inAct(m, 3) && m.breaches === 0 && m.specimens >= 1 && (m.specimens >= 20 || depth(m) >= 6_500),
    entries: [{ kind: 'anomaly', text: 'CONTAINMENT FIELD ... FIELD ... F I E L D' }],
    effects: [{ kind: 'breach' }],
  },
  {
    id: 'a4-entry',
    act: 4,
    urgent: true,
    when: ({ m }) => inAct(m, 3) && m.contacts > 0,
    entries: [
      { kind: 'anomaly', text: 'CONTAINMENT BREACH. CONTAINMENT BREACH. CONTAINMENT BREACH.' },
      { kind: 'sys', text: 'UNKNOWN CONTACTS ABOARD. MOTION TRACKING ENABLED. ALL CREW: REMAIN IN CRYO.' },
    ],
    effects: [
      { kind: 'setAct', act: 4 },
      { kind: 'setFlag', flag: 'tracker' },
    ],
  },
  {
    id: 'a4-corp',
    act: 4,
    when: ({ m }) => sinceBeat(m, 'a4-entry') >= 30,
    entries: [
      {
        kind: 'corp',
        text: 'SPECIAL PROJECTS [TX 0D 0H 00M AGO]: Specimen welfare is the priority. Crew are to assist recovery. Do not vent occupied decks.',
      },
    ],
  },
  {
    id: 'a4-unsealed',
    act: 4,
    when: ({ m }) => sinceBeat(m, 'a4-corp') >= 30,
    entries: [{ kind: 'sys', text: 'RESTRICTED FILE UNSEALED FOR WARDEN: SPECIAL ORDER 0-77. SEE ARCHIVE.' }],
    effects: [{ kind: 'setFlag', flag: 'archive-0-77' }],
  },
  {
    id: 'a4-first-loss',
    act: 4,
    when: ({ m }) => inAct(m, 4) && lostCount(m) >= 1,
    entries: [{ kind: 'sys', text: 'CREW MANIFEST UPDATED.' }],
  },
  {
    id: 'a4-voice',
    act: 4,
    when: ({ m }) => inAct(m, 4) && m.contacts >= 3,
    entries: [{ kind: 'anomaly', text: 'INTERCOM CH.4: [UNINTELLIGIBLE] ... w a r d e n ... [UNINTELLIGIBLE]' }],
  },
  {
    id: 'a4-attrition',
    act: 4,
    when: ({ m }) => inAct(m, 4) && lostCount(m) >= 4,
    entries: [{ kind: 'corp', text: 'SPECIAL PROJECTS [TX 0D 0H 00M AGO]: Crew attrition within acceptable parameters. Continue.' }],
  },
  {
    id: 'a4-terminus',
    act: 4,
    when: ({ m }) =>
      inAct(m, 4) &&
      (lostCount(m) === CREW.length || m.specimensRecovered >= 300 || sinceBeat(m, 'a4-entry') >= TERMINUS_AFTER_BREACH),
    entries: [{ kind: 'sys', text: 'RETURN WINDOW OPEN. TERMINUS PROTOCOLS AVAILABLE. AWAITING WARDEN DECISION.' }],
    effects: [{ kind: 'setFlag', flag: 'terminus' }],
  },
];

export const STORY: readonly Beat[] = [...ACT_1, ...ACT_2, ...ACT_3, ...ACT_4];
