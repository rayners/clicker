import type { Beat } from '../../mission/story';
import { sinceBeat } from '../../mission/story';
import { specRevision } from '../../mission/terraform/economy';
import type { MissionState, OrganismMission, TerraformMission } from '../../mission/state';

/**
 * The nursery: what the organism horror means on a terraforming contract. This pairing file is the one
 * deliberate coupling between a horror and a scenario; it reads only the terraform scenario's public queries.
 */
const t = (m: MissionState) => m as TerraformMission;
const o = (m: MissionState) => m as OrganismMission;

export const NURSERY_BEATS: readonly Beat[] = [
  {
    id: 'nursery-cross-reference',
    act: 3,
    when: ({ m }) => m.act >= 3 && sinceBeat(m, 'a3-entry') >= 90 && specRevision(t(m)) >= 4,
    entries: [
      { kind: 'sys', text: 'CROSS-REFERENCE: HABITABILITY SPEC REV 4 AGAINST VOID ATMOSPHERE BENEATH THE AQUIFER.' },
      { kind: 'anomaly', text: 'TEMPERATURE: CONVERGING. HUMIDITY: CONVERGING. OXYGEN: CONVERGING. CORRELATION 0.992.' },
    ],
  },
  {
    id: 'nursery-final-envelope',
    act: 3,
    when: ({ m }) => m.act >= 3 && specRevision(t(m)) >= 5,
    entries: [
      { kind: 'sys', text: 'FINAL ENVELOPE TARGETS: 304 K. 96% HUMIDITY. OXYGEN 11%.' },
      { kind: 'anomaly', text: 'THESE ARE NOT HUMAN PARAMETERS.' },
    ],
  },
  {
    id: 'nursery-mortality',
    act: 3,
    when: ({ m }) => m.act >= 3 && t(m).colonistsLost >= 50,
    entries: [
      { kind: 'sys', text: 'MORTUARY RECORDS: COLONISTS RECORDED DEAD OF ENVIRONMENTAL CAUSES. BODIES RECOVERED: NONE.' },
      { kind: 'anomaly', text: 'LOWLAND CAMERAS: FIGURES IN THE WARM SHALLOWS AT NIGHT. COUNT MATCHES THE DEAD.' },
    ],
  },
  {
    id: 'nursery-census',
    act: 4,
    when: ({ m }) => m.act >= 4 && t(m).wavesThawed >= 1,
    entries: [
      { kind: 'anomaly', text: 'COLONY CENSUS: LIFE SIGNS ON THE SURFACE EXCEED REGISTERED COLONISTS. THE EXCESS IS GROWING.' },
    ],
  },
  {
    id: 'nursery-comfortable',
    act: 4,
    when: ({ m }) => m.act >= 4 && o(m).contacts > 0 && sinceBeat(m, 'nursery-census') >= 60,
    entries: [
      {
        kind: 'corp',
        text: 'SPECIAL PROJECTS [TX 0D 0H 00M AGO]: Merrow is proceeding to plan. The colonists are comfortable. Do not wake them further.',
      },
    ],
  },
];
