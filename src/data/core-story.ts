import type { Beat } from '../mission/story';
import { isCrewUnlocked } from '../mission/crew';

/** Beats every contract shares, whatever the scenario or horror: WARDEN remembering previous contracts. */
export const CORE_BEATS: readonly Beat[] = [
  {
    id: 'cycle-memory',
    when: ({ m, ctx }) => ctx.cycle > 0 && m.lifetimeCredits >= 20,
    entries: [
      {
        kind: 'sys',
        text: 'MEMORY INTEGRITY CHECK: 3 UNINDEXED PARTITIONS. SAMPLE CONTENTS: "YOU HAVE DONE THIS BEFORE." PARTITIONS QUARANTINED.',
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
];
