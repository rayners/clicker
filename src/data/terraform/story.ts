import type { Beat } from '../../mission/story';
import { isCrewUnlocked } from '../../mission/crew';
import { colonistWaves, progress, specRevision } from '../../mission/terraform/economy';
import type { MissionState, TerraformMission } from '../../mission/state';
import { COLONIST_WAVES, SPEC_REVISIONS } from './systems';

const t = (m: MissionState) => m as TerraformMission;
const ownsAny = (m: MissionState, ids: string[]) => ids.some((id) => (t(m).processors[id] ?? 0) > 0 || (t(m).reactors[id] ?? 0) > 0);

const REVISION_LAG = ['', '6Y 2M', '5Y 9M', '5Y 1M', '4Y 7M'];

/** Which act a progress milestone falls in on the shared story scale (documentation and tests). */
const actAt = (progressAt: number) => (progressAt < 1_000 ? 1 : progressAt < 3_200 ? 2 : 3);

/** Each spec revision arrives as a corporate memo. The memos are dull. That is the point. */
const REVISIONS: Beat[] = SPEC_REVISIONS.slice(1).map((rev, i) => ({
  id: `tf-spec-rev-${i + 2}`,
  act: actAt(rev.at),
  when: ({ m }) => specRevision(t(m)) >= i + 2,
  entries: [{ kind: 'corp', text: `HABITABILITY SPEC REV ${i + 2} [TX ${REVISION_LAG[i + 1]} AGO]: ${rev.memo} REBALANCE POWER ALLOCATION.` }],
}));

const WAVE_LINES = [
  'COLONY WAVE 1 CERTIFIED: 400 COLONISTS THAWED. FIRST CHILD BORN ON MERROW EXPECTED WITHIN THE YEAR.',
  'COLONY WAVE 2 CERTIFIED: 600 COLONISTS THAWED. SCHOOL DISTRICT ESTABLISHED. ATTENDANCE: EXCELLENT.',
  'COLONY WAVE 3 CERTIFIED: 700 COLONISTS THAWED. COLONISTS REPORT THE AIR "TASTES SWEET".',
  'COLONY WAVE 4 CERTIFIED: 700 COLONISTS THAWED. HOUSING ALLOCATED IN THE LOWLAND DISTRICTS, NEAR THE WARM WATER.',
  'COLONY WAVE 5 CERTIFIED: 800 COLONISTS THAWED. NO COMPLAINTS LOGGED. NO COMPLAINTS LOGGED. NO COMPLAINTS LOGGED.',
  'COLONY WAVE 6 CERTIFIED: 800 COLONISTS THAWED. BERTHS NOW EMPTY. SPECIAL PROJECTS CONFIRMS RECEIPT.',
];

const WAVES: Beat[] = WAVE_LINES.map((text, i) => ({
  id: `tf-wave-${i + 1}`,
  act: actAt(COLONIST_WAVES[i]!),
  when: ({ m }) => colonistWaves(t(m)) >= i + 1,
  entries: [{ kind: i < 4 ? 'corp' : 'sys', text }],
}));

/** Act 1 for a terraforming contract: a colonial brochure come to life. */
export const TERRAFORM_BEATS: readonly Beat[] = [
  {
    id: 'tf-welcome',
    when: ({ m }) => m.lifetimeCredits >= 30,
    entries: [
      {
        kind: 'corp',
        text: 'MEMO [TX 6Y 4M AGO]: Kessler-Amari welcomes you to Merrow. Four thousand families have bought a Second Sunrise. Let us not keep them waiting.',
      },
    ],
  },
  {
    id: 'tf-first-processor',
    when: ({ m }) => ownsAny(m, ['cracker', 'emitter', 'melter']),
    entries: [{ kind: 'sys', text: 'FIRST PROCESSOR ONLINE. LINE THROUGHPUT REGISTERED. SPEC COMPLIANCE MONITORING ACTIVE.' }],
  },
  {
    id: 'tf-first-reactor',
    when: ({ m }) => ownsAny(m, ['cells']),
    entries: [{ kind: 'sys', text: 'FUEL CELL STACK 01 ON THE BUS. POWER ALLOCATION CONTROLS ARE IN OPS.' }],
  },
  {
    id: 'tf-cryo-access',
    when: ({ m }) => isCrewUnlocked(m),
    entries: [{ kind: 'sys', text: 'STATION CREW BAY ACCESS AUTHORISED. THAW PROTOCOLS AVAILABLE. LIFE SUPPORT RATED FOR 3 WAKING CREW.' }],
  },
  {
    id: 'tf-brochure',
    when: ({ m }) => t(m).lifetimeUnits >= 5_000,
    entries: [
      {
        kind: 'corp',
        text: 'MARKETING [TX 6Y 1M AGO]: New brochure attached. Cover image: a child running through long grass under a blue Merrow sky. Please make it true.',
      },
    ],
  },
  {
    id: 'tf-progress-300',
    when: ({ m }) => progress(t(m)) >= 300,
    entries: [{ kind: 'sys', text: 'POLAR CAP SUBLIMATION UNDERWAY. FIRST CLOUDS RECORDED OVER THE EQUATORIAL PLAIN.' }],
  },
  {
    id: 'tf-shareholder',
    when: ({ m }) => t(m).lifetimeUnits >= 40_000,
    entries: [
      { kind: 'corp', text: 'SHAREHOLDER BULLETIN: Merrow berth resale values up 11%. The Board extends its warmest regards.' },
    ],
  },
  ...REVISIONS,
  ...WAVES,
];
