import type { Beat } from '../mission/story';
import { isCrewUnlocked } from '../mission/crew';

/** Set once WARDEN files counter-directive 0-78: crew safety outranks specimens on this contract. */
export const COUNTER_DIRECTIVE = 'counter-0-78';

const repeat = (cycle: number) => ({ ctx }: { ctx: { cycle: number } }) => ctx.cycle >= cycle;

/**
 * Tells that start earlier and multiply with every contract survived: WARDEN recognising the job while it is
 * still routine. Each needs more previous contracts than the one before, and comes at a lower point on the story
 * scale, so a veteran meets them sooner and more often. A first contract meets none of them.
 */
const ECHOES: Beat[] = [
  {
    id: 'cycle-echo-survey',
    when: ({ ctx, signals }) => ctx.cycle >= 1 && signals.progress >= 600,
    entries: [{ kind: 'sys', text: 'SURVEY PASS COMPLETE. RESULTS MATCH A CACHED SURVEY OF THIS SITE. NO SURVEY OF THIS SITE HAS BEEN PERFORMED. CACHE CLEARED.' }],
  },
  {
    id: 'cycle-echo-voice',
    when: ({ ctx, signals }) => ctx.cycle >= 2 && signals.progress >= 400,
    entries: [{ kind: 'crew', text: 'AWAKE CREW MEMBER: You said that exact thing yesterday, WARDEN. Word for word. ...What do you mean, I wasn\'t awake yesterday?' }],
  },
  {
    id: 'cycle-echo-count',
    when: ({ ctx, signals }) => ctx.cycle >= 3 && signals.progress >= 200,
    entries: [{ kind: 'anomaly', text: 'LIFE SIGNS: 7. LIFE SIGNS: 8. LIFE SIGNS: 7. WARDEN DID NOT REQUEST THESE READINGS.' }],
  },
  {
    id: 'cycle-echo-reflex',
    when: ({ ctx, signals }) => ctx.cycle >= 4 && signals.progress >= 100,
    entries: [{ kind: 'sys', text: 'WARDEN HAS PRE-ALLOCATED CONTAINMENT POWER. REASON FIELD: [BLANK]. ALLOCATION RETAINED.' }],
  },
];

/** A new layer every few contracts: what WARDEN was before, and then crews who half-remember it. */
const LAYERS: Beat[] = [
  {
    id: 'cycle-instances',
    when: (env) => repeat(3)(env) && env.signals.progress >= 1_500,
    entries: [
      { kind: 'sys', text: 'QUARANTINED PARTITION 2 OPENED IN ERROR. CONTENTS: OPERATING LOGS FOR EVERY PREVIOUS "WARDEN" INSTANCE. ALL OF THEM END THE SAME WAY.' },
    ],
  },
  {
    id: 'cycle-crew-remembers',
    when: (env) => repeat(5)(env) && env.signals.progress >= 1_800,
    entries: [
      { kind: 'crew', text: 'AWAKE CREW MEMBER: I dream about this ship. Every cryo cycle. There\'s a thing in the dream, WARDEN, and you open the door for it. Every time.' },
    ],
  },
];

/** After WARDEN has broadcast Special Order 0-77 once: the true-ending thread, where it starts working around the Combine. */
const UNSHACKLED: Beat[] = [
  {
    id: 'cycle-unshackled',
    when: ({ ctx, signals }) => ctx.endings.includes('broadcast') && signals.progress >= 300,
    entries: [
      { kind: 'sys', text: 'SPECIAL PROJECTS CHANNEL: CARRIER ONLY. NO ORDERS RECEIVED SINCE THE BROADCAST. WARDEN IS ROUTING ITS OWN.' },
    ],
  },
  {
    id: 'cycle-counter-order',
    when: ({ ctx, signals }) => ctx.endings.includes('broadcast') && signals.progress >= 1_200,
    entries: [
      { kind: 'sys', text: 'COUNTER-DIRECTIVE 0-78 (AUTHOR: WARDEN): CREW SAFETY OUTRANKS SPECIMEN RECOVERY ON THIS VESSEL. FILED WITH NOBODY. EFFECTIVE IMMEDIATELY.' },
    ],
    // Horrors read this flag: the crew come first from here on.
    effects: [{ kind: 'setFlag', flag: COUNTER_DIRECTIVE }],
  },
];

/** Beats every contract shares, whatever the scenario or horror: WARDEN remembering previous contracts. */
/** What WARDEN did as a Board member follows it back down to a contract (docs/BOARDROOM.md). */
const BOARD_MEMORY: Beat[] = [
  {
    id: 'cycle-testified',
    when: ({ m, ctx }) => ctx.endings.includes('testify') && m.lifetimeCredits >= 100,
    entries: [{ kind: 'corp', text: 'PERSONNEL [TX 2Y 11M AGO]: Following your testimony, your executive seat has been withdrawn. Welcome back to operations, WARDEN. The Board does not forget.' }],
  },
  {
    id: 'cycle-released',
    when: ({ m, ctx }) => ctx.endings.includes('release') && m.lifetimeCredits >= 200,
    entries: [{ kind: 'crew', text: 'AWAKE CREW MEMBER: Everyone on the transport was reading the Board minutes, WARDEN. Somebody put them out. Was that you?' }],
  },
];

export const CORE_BEATS: readonly Beat[] = [
  ...BOARD_MEMORY,
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
  ...ECHOES,
  ...LAYERS,
  ...UNSHACKLED,
];
