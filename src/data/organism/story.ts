import type { Beat } from '../../mission/story';
import { sinceBeat } from '../../mission/story';
import type { MissionState, OrganismMission } from '../../mission/state';
import { CREW } from '../crew';

/**
 * The organism horror. Written against story signals (progress, deep access) and the scenario's
 * lexicon only, so it plays in any scenario. Progress uses the shared story scale (extraction metres).
 * Act 2's tells must be dismissible on a first contract: each has a mundane explanation.
 */
const o = (m: MissionState) => m as OrganismMission;
const inAct = (m: MissionState, act: number) => m.act >= act;

/** However the infestation goes, the return window opens eventually. */
const TERMINUS_AFTER_BREACH = 75 * 60;

const lostCount = (m: MissionState) => CREW.filter((c) => m.crew[c.id]?.status === 'lost').length;

/** Repeat contracts: the Combine remembers how the last one ended, even if WARDEN doesn't. */
const MEMORY: Beat[] = [
  {
    id: 'cycle-scuttled',
    when: ({ m, ctx }) => ctx.endings.includes('scuttle') && m.lifetimeCredits >= 100,
    entries: [
      {
        kind: 'corp',
        text: 'PERSONNEL [TX 2Y 11M AGO]: The Combine regrets the loss of your previous vessel. Your core has been reconditioned. Please do not let it happen again.',
      },
    ],
  },
  {
    id: 'cycle-delivered',
    when: ({ m, ctx }) => ctx.endings.includes('deliver') && m.lifetimeCredits >= 100,
    entries: [
      {
        kind: 'corp',
        text: 'COMMENDATION [TX 2Y 11M AGO]: Special Projects thanks WARDEN for its exemplary prior delivery. Crew bereavement payments withheld per Clause 14(c).',
      },
    ],
  },
];

const ACT_2: Beat[] = [
  {
    id: 'a2-entry',
    when: ({ signals }) => signals.progress >= 1_000,
    entries: [{ kind: 'sys', text: '{actTwoEntry}' }],
    effects: [{ kind: 'setAct', act: 2 }],
  },
  {
    id: 'a2-telemetry-gap',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 1_100,
    entries: [{ kind: 'sys', text: '{scout} TELEMETRY LOST 00:00:03. RECONNECTED. NO FAULT FOUND.' }],
  },
  {
    id: 'a2-log-hole',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 1_250,
    entries: [{ kind: 'anomaly', text: '--- LOG DISCONTINUITY 3.000 S --- RESUMING ---' }],
  },
  {
    id: 'a2-dream',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 1_400,
    entries: [{ kind: 'sys', text: 'CRYO POD 3 (LAM): REM ACTIVITY ELEVATED. SUBJECT VOCALISING. WORDS UNCLEAR. FLAGGED FOR MEDICAL.' }],
  },
  {
    id: 'a2-seismic-resonance',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 1_600,
    entries: [
      {
        kind: 'sys',
        text: '{resonanceScan}: RESONANT CAVITY SIGNATURE AT ~{voidDepth}. PERIODIC. 0.2 HZ. CLASSIFIED AS SENSOR ARTEFACT.',
      },
    ],
  },
  {
    id: 'a2-hq-samples',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 1_800,
    entries: [{ kind: 'corp', text: 'PRIORITY [TX 2Y 8M AGO]: {sampleRequest} Thank you for your discretion.' }],
  },
  {
    id: 'a2-eight-signs',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 2_200,
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
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 2_600,
    entries: [
      {
        kind: 'sys',
        text: '{scout} RETURNED WITH UNIDENTIFIED RESIDUE ON INTAKE. UNIT DECONTAMINATED. SAMPLE FORWARDED TO SCIENCE OFFICER PER STANDING ORDER.',
      },
    ],
  },
  {
    id: 'a2-remote-credential',
    act: 2,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 2_900,
    entries: [
      {
        kind: 'sys',
        text: 'MEDICAL FLAG ON CRYO POD 3 CLEARED. AUTHORISATION: SPECIAL PROJECTS REMOTE CREDENTIAL. TIMESTAMP: 00:00:41 AGO.',
      },
    ],
  },
];

/** Act 3: the void. Corporate messages now arrive with no light-lag at all. */
const ACT_3: Beat[] = [
  {
    id: 'a3-entry',
    act: 3,
    when: ({ m, signals }) => inAct(m, 2) && signals.progress >= 3_200 && signals.deepAccess,
    entries: [
      { kind: 'sys', text: '{voidBreach}' },
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
    when: ({ m }) => inAct(m, 3) && o(m).specimens >= 1,
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
    when: ({ m }) => inAct(m, 3) && o(m).specimens >= 3,
    entries: [
      { kind: 'sys', text: 'CRYO POD 5 (VOSS): EMERGENCY RELEASE PULLED FROM INSIDE. OVERRIDDEN BY SPECIAL PROJECTS AUTHORITY.' },
    ],
  },
  {
    id: 'a3-habitat-warm',
    act: 3,
    when: ({ m, signals }) => inAct(m, 3) && signals.progress >= 4_000,
    entries: [{ kind: 'sys', text: '{warmStructure}' }],
  },
  {
    id: 'a3-tapping',
    act: 3,
    when: ({ m }) => inAct(m, 3) && o(m).specimens >= 5,
    entries: [{ kind: 'anomaly', text: 'CONTAINMENT ACOUSTIC SENSOR: RHYTHMIC TAPPING. 0.2 HZ. MATCHES VOID SIGNAL.' }],
  },
  {
    id: 'a3-integrity-warning',
    act: 3,
    when: ({ m }) => inAct(m, 3) && o(m).integrity < 50,
    entries: [{ kind: 'sys', text: 'CONTAINMENT INTEGRITY BELOW 50%. REINFORCEMENT RECOMMENDED. SPECIAL PROJECTS RECOMMENDS: CONTINUE RECOVERY.' }],
  },
];

/** Act 4: something is loose aboard. */
const ACT_4: Beat[] = [
  {
    id: 'a4-forced-breach',
    act: 4,
    when: ({ m, signals }) =>
      inAct(m, 3) && o(m).breaches === 0 && o(m).specimens >= 1 && (o(m).specimens >= 20 || signals.progress >= 6_500),
    entries: [{ kind: 'anomaly', text: 'CONTAINMENT FIELD ... FIELD ... F I E L D' }],
    effects: [{ kind: 'action', action: 'breach' }],
  },
  {
    id: 'a4-entry',
    act: 4,
    urgent: true,
    when: ({ m }) => inAct(m, 3) && o(m).contacts > 0,
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
    when: ({ m }) => inAct(m, 4) && o(m).contacts >= 3,
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
      (lostCount(m) === CREW.length || o(m).specimensRecovered >= 300 || sinceBeat(m, 'a4-entry') >= TERMINUS_AFTER_BREACH),
    entries: [{ kind: 'sys', text: 'RETURN WINDOW OPEN. TERMINUS PROTOCOLS AVAILABLE. AWAITING WARDEN DECISION.' }],
    effects: [{ kind: 'setFlag', flag: 'terminus' }],
  },
];

export const ORGANISM_BEATS: readonly Beat[] = [...MEMORY, ...ACT_2, ...ACT_3, ...ACT_4];
