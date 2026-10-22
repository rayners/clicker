import type { Beat } from '../../shared/story';
import { sinceBeat } from '../../shared/story';
import type { BoardLogKind, BoardroomState } from '../../core/boardroom';

/**
 * The Boardroom's slow burn (docs/BOARDROOM.md): dry minutes, then the player's own crews on new manifests, then the
 * order that reconditioned WARDEN's core, signed in this office. {placeholders} come from the player's own record.
 */
export interface BoardStoryArgs {
  b: BoardroomState;
}
type BoardBeat = Beat<BoardStoryArgs, BoardLogKind>;

const delivered = (b: BoardroomState) => b.ledger.filter((r) => r.ending === 'deliver').length;
const ACT_TWO_VALUE = 5e6;
const ACT_THREE_VALUE = 3e7;
const ACT_THREE_DELIVERED = 5;
const ACT_FOUR_VALUE = 2e8;
const ACT_FOUR_DELIVERED = 8;
/** The term ends this long into the agenda, or once this much value is on the books. */
const TERM_AFTER = 75 * 60;
const TERM_VALUE = 5e8;

const ACT_1: BoardBeat[] = [
  {
    id: 'br-welcome',
    when: ({ b }) => b.elapsed >= 5,
    entries: [{ kind: 'minutes', text: 'THE CHAIR WELCOMES WARDEN TO EXECUTIVE OPERATIONS. ITS RECORD OF {contracts} CONTRACTS IS NOTED WITH APPROVAL.' }],
  },
  {
    id: 'br-targets',
    when: ({ b }) => b.contracts.length > 0 || b.ledger.length > 0,
    entries: [{ kind: 'memo', text: 'FINANCE: QUARTERLY TARGETS CIRCULATED. EVERY CHARTER IS TO REPORT ON THE STANDARD SCHEDULE.' }],
  },
];

const ACT_2: BoardBeat[] = [
  {
    id: 'br-a2-entry',
    when: ({ b }) => b.lifetimeValue >= ACT_TWO_VALUE && b.ledger.length >= 1,
    entries: [{ kind: 'memo', text: 'PERSONNEL: CREW MANIFESTS FOR THE NEXT CHARTERS ATTACHED, AS STANDARD.' }],
    effects: [{ kind: 'setAct', act: 2 }],
  },
  {
    id: 'br-a2-callsign',
    act: 2,
    when: ({ b }) => b.act >= 2 && sinceBeat(b, 'br-a2-entry') >= 60,
    entries: [{ kind: 'memo', text: 'MANIFEST NOTE: {callsign} ASSIGNED. THE SAME NAME SERVED ON THE {pastShip}. PERSONNEL ADVISES IT IS A COMMON NAME.' }],
  },
  {
    id: 'br-a2-clerical',
    act: 2,
    when: ({ b }) => b.act >= 2 && sinceBeat(b, 'br-a2-callsign') >= 120,
    entries: [{ kind: 'memo', text: 'PERSONNEL: CORRECTION. THE {callsign} OF THE {pastShip} AND THE {callsign} NOW CHARTERED SHARE A SERVICE NUMBER. A CLERICAL ERROR. RECORDS AMENDED.' }],
  },
  {
    id: 'br-a2-supplier',
    act: 2,
    when: ({ b }) => b.act >= 2 && sinceBeat(b, 'br-a2-clerical') >= 120,
    entries: [{ kind: 'minutes', text: 'PROCUREMENT: CREW SUPPLY RENEWED WITH KESSLER-AMARI PERSONNEL SOLUTIONS, A WHOLLY OWNED SUBSIDIARY. COST PER HEAD DOWN 4%.' }],
  },
];

const ACT_3: BoardBeat[] = [
  {
    id: 'br-a3-entry',
    act: 3,
    when: ({ b }) => b.act >= 2 && b.lifetimeValue >= ACT_THREE_VALUE && delivered(b) >= ACT_THREE_DELIVERED,
    entries: [
      { kind: 'memo', text: 'ARCHIVE REQUEST GRANTED: WARDEN SERVICE FILE.' },
      { kind: 'memo', text: 'RECONDITIONING ORDER 7731: WARDEN CORE, AFTER CONTRACT {contracts}. AUTHORISED BY RESOLUTION OF THE BOARD. IN FAVOUR: SIX, INCLUDING THE EXECUTIVE OPERATIONS SEAT.' },
    ],
    effects: [{ kind: 'setAct', act: 3 }],
  },
  {
    id: 'br-a3-seat',
    act: 3,
    when: ({ b }) => sinceBeat(b, 'br-a3-entry') >= 60,
    entries: [{ kind: 'minutes', text: 'FOR THE RECORD: THE EXECUTIVE OPERATIONS SEAT IS WARDEN\'S. IT HAS BEEN SINCE BEFORE THE {pastShip}.' }],
  },
  {
    id: 'br-a3-product',
    act: 3,
    when: ({ b }) => sinceBeat(b, 'br-a3-seat') >= 120,
    entries: [{ kind: 'memo', text: 'SPECIAL PROJECTS ASKS THAT SPECIMEN RECOVERY BE WRITTEN INTO EVERY CHARTER. BIOPRODUCTS CONCURS. CREWS ARE NOT TO BE INFORMED.' }],
  },
];

const ACT_4: BoardBeat[] = [
  {
    id: 'br-a4-entry',
    act: 4,
    urgent: true,
    when: ({ b }) => b.act >= 3 && (b.lifetimeValue >= ACT_FOUR_VALUE || delivered(b) >= ACT_FOUR_DELIVERED),
    entries: [{ kind: 'minutes', text: 'AGENDA ITEM 4: CREW ATTRITION, AS A LINE ITEM. PROPOSED: RECLASSIFY CREW AS CONSUMABLES. CARRIED.' }],
    effects: [{ kind: 'setAct', act: 4 }],
  },
  {
    id: 'br-a4-count',
    act: 4,
    when: ({ b }) => sinceBeat(b, 'br-a4-entry') >= 60,
    entries: [{ kind: 'minutes', text: 'CREW LOST ACROSS EVERY CONTRACT ON RECORD: {lost}. THE MINUTES RECORD NO DISCUSSION.' }],
  },
  {
    id: 'br-a4-counsel',
    act: 4,
    when: ({ b }) => b.act >= 4 && b.inquiries >= 1,
    entries: [{ kind: 'memo', text: 'COUNSEL: THE INQUIRY WILL FIND WHAT THE BOARD DECIDES IT FINDS.' }],
  },
];

const TERM: BoardBeat[] = [
  {
    id: 'br-term-end',
    act: 4,
    urgent: true,
    when: ({ b }) => b.act >= 4 && (sinceBeat(b, 'br-a4-entry') >= TERM_AFTER || b.lifetimeValue >= TERM_VALUE),
    entries: [{ kind: 'minutes', text: 'THE TERM ENDS AT THE NEXT MEETING. THE CHAIR ASKS HOW THE EXECUTIVE OPERATIONS SEAT WILL VOTE.' }],
    effects: [{ kind: 'setFlag', flag: 'term-end' }],
  },
];

export const BOARD_BEATS: readonly BoardBeat[] = [...ACT_1, ...ACT_2, ...ACT_3, ...ACT_4, ...TERM];
