import { runBeats, sinceBeat, type Beat } from '../shared/story';
import { BREACH_FLAG } from './breach';
import { depth } from './depth';
import { boats } from './shelf';
import { specimens } from './open-water';
import { reachedSource } from './trench';
import { swimmers } from './shallows';
import type { EntryKind, Outfit } from './state';

/** Seconds between ordinary log entries. */
export const STORY_GAP = 25;
export const ACT_TWO_AT = 1_000;
export const ACT_THREE_AT = 3_200;
/** From the source found to the first landfall, and from then to the season's end. */
const BREACH_AFTER = 25 * 60;
const SEASON_AFTER = 75 * 60;

type Args = { o: Outfit };
type FathomBeat = Beat<Args, EntryKind>;

/** Act I: the season. Small and coastal, and the council would like the beaches open. */
const ACT_1: FathomBeat[] = [
  {
    id: 'season-opens',
    when: ({ o }) => swimmers(o) > 0,
    entries: [{ kind: 'town', text: 'MAYOR VAUGHAN-REED CUTS THE RIBBON ON THE SEASON. "THESE ARE SUMMER DOLLARS, PEOPLE. OPEN BEACHES, HAPPY FAMILIES."' }],
  },
  {
    id: 'first-fin',
    when: ({ o }) => o.lifetimeCash >= 200,
    entries: [{ kind: 'crew', text: 'LIFEGUARD OKAFOR: "FIN OFF THE SANDBAR. BIG ONE. GONE BEFORE I COULD GET THE GLASSES ON IT." THE COUNCIL CALLS IT A DOLPHIN.' }],
  },
  {
    id: 'council',
    when: ({ o }) => o.bodyCount >= 1,
    entries: [{ kind: 'town', text: 'THE COUNCIL MEETS IN THE BACK OF THE HARDWARE STORE. NOBODY SAYS THE WORD. THE BEACHES STAY OPEN.' }],
  },
  {
    id: 'shelf-boats',
    when: ({ o }) => boats(o) > 0,
    entries: [{ kind: 'crew', text: 'THE TRAWLER CAPTAINS ARE SIGNED ON. ONE OF THEM ASKS WHY THE COMPANY WANTS SONAR COVERAGE OF THE DEEP SETS. NOBODY ANSWERS.' }],
  },
  {
    id: 'act-2',
    act: 2,
    when: ({ o }) => depth(o) >= ACT_TWO_AT,
    entries: [
      { kind: 'sonar', text: 'SONAR CONTACT AT 600 METRES. LENGTH: 18 METRES. THE SONAR OPERATOR RE-RUNS THE CALIBRATION, THEN RUNS IT AGAIN.' },
      { kind: 'attack', text: 'A WHALE CARCASS WASHES UP AT SALTMARSH WITH A BITE OUT OF IT THE SIZE OF A CAR. THE PAPERS CALL IT A PROPELLER.' },
    ],
    effects: [{ kind: 'setAct', act: 2 }],
  },
];

const inAct = (o: Outfit, act: number) => o.act >= act;

/** Act II: something bigger. Gear lost on the shelf, and the lab is doing something to the specimens. */
const ACT_2: FathomBeat[] = [
  {
    id: 'squid-gear',
    act: 2,
    when: ({ o }) => inAct(o, 2) && sinceBeat(o, 'act-2') >= 120,
    entries: [{ kind: 'crew', text: 'A TRAWLER COMES IN WITH ITS NET SHREDDED AND SUCKER MARKS ON THE HULL A FOOT ACROSS. THE SKIPPER WILL NOT GO BACK OUT.' }],
  },
  {
    id: 'lab-enhancing',
    act: 2,
    when: ({ o }) => inAct(o, 2) && specimens(o) > 0,
    entries: [{ kind: 'town', text: 'A MEMO FROM THE PARENT COMPANY: "Protein work on the penned specimens is to continue. Brain mass is the measure of success." NOBODY ON THE STATION WROTE IT.' }],
  },
  {
    id: 'the-big-one',
    act: 2,
    when: ({ o }) => inAct(o, 2) && sinceBeat(o, 'squid-gear') >= 300,
    entries: [{ kind: 'sonar', text: 'THE 18-METRE CONTACT AGAIN, FOLLOWING THE RESEARCH STATION\'S SUPPLY BOAT IN. IT KEEPS EXACTLY THE BOAT\'S SPEED.' }],
  },
];

/** Act III: the trench. The source is not a cave. */
const ACT_3: FathomBeat[] = [
  {
    id: 'act-3',
    act: 3,
    urgent: true,
    when: ({ o }) => inAct(o, 2) && depth(o) >= ACT_THREE_AT && reachedSource(o),
    entries: [
      { kind: 'sonar', text: 'THE STATION\'S LIGHTS REACH THE TRENCH FLOOR. THERE IS A SEAM IN THE ROCK, GLOWING. IT IS NOT A CAVE. IT IS OPENING.' },
      { kind: 'crew', text: 'DR. ASANTE-MORROW: "EVERYTHING WE HAVE PULLED OUT OF THE WATER THIS YEAR WAS RUNNING FROM THIS."' },
    ],
    effects: [{ kind: 'setAct', act: 3 }],
  },
  {
    id: 'trench-sounds',
    act: 3,
    when: ({ o }) => inAct(o, 3) && sinceBeat(o, 'act-3') >= 300,
    entries: [{ kind: 'sonar', text: 'SOMETHING ON THE OTHER SIDE OF THE SEAM IS MOVING. THE HYDROPHONES PICK UP A HEARTBEAT. ONE BEAT EVERY FOUR MINUTES.' }],
  },
];

/** Act IV: Category I, and every one after it bigger. */
const ACT_4: FathomBeat[] = [
  {
    id: 'act-4',
    act: 4,
    urgent: true,
    when: ({ o }) => inAct(o, 3) && sinceBeat(o, 'act-3') >= BREACH_AFTER,
    entries: [{ kind: 'attack', text: 'THE SEAM OPENS. SOMETHING THE SIZE OF A TOWER BLOCK WALKS UP THE TRENCH WALL AND OUT ONTO THE SHELF, TOWARD THE COAST.' }],
    effects: [
      { kind: 'setAct', act: 4 },
      { kind: 'setFlag', flag: BREACH_FLAG },
    ],
  },
  {
    id: 'bulwark-programme',
    act: 4,
    when: ({ o }) => inAct(o, 4) && sinceBeat(o, 'act-4') >= 120,
    entries: [{ kind: 'town', text: 'THE COASTAL DEFENCE BOARD TAKES OVER THE OUTFIT. YOU KEEP YOUR DESK. THERE ARE PLANS ON IT FOR SOMETHING THEY CALL A BULWARK.' }],
  },
  {
    id: 'season-end',
    act: 4,
    urgent: true,
    when: ({ o }) => inAct(o, 4) && sinceBeat(o, 'act-4') >= SEASON_AFTER,
    entries: [{ kind: 'sonar', text: 'THE SEAM IS STILL OPEN. WHAT IS DONE WITH IT NOW IS THE OUTFIT\'S DECISION. SEE THE END OF THE SEASON.' }],
    effects: [{ kind: 'setFlag', flag: 'terminus' }],
  },
];

export const FATHOM_STORY: readonly FathomBeat[] = [...ACT_1, ...ACT_2, ...ACT_3, ...ACT_4];

export function runFathomStory(o: Outfit): Outfit {
  return runBeats<EntryKind, Outfit, Args>(o, FATHOM_STORY, { o }, { minGap: STORY_GAP });
}
