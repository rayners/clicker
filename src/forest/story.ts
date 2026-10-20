import { runBeats, sinceBeat, type Beat } from '../shared/story';
import { REGIONS } from '../forest-data/regions';
import type { Company, EntryKind } from './state';

/** Seconds between non-urgent ledger entries. */
export const FOREST_STORY_GAP = 25;

type Args = { c: Company };
type ForestBeat = Beat<Args, EntryKind>;

const hands = (c: Company) => c.hired.blade + c.hired.mender + c.hired.scout + c.hired.mystic;
const barrows = REGIONS[2]!;

/**
 * Act I: the company finds its feet. Dark from the start (the wood kills, the town profits),
 * but the deeper wrongness (omens, other hands in the ledger) waits for Act II.
 */
/** Later charters: the Factor has kept this book before. */
const CHARTERS: ForestBeat[] = [
  {
    id: 'cycle-margin',
    when: ({ c }) => c.charter.number > 1 && c.lifetimeRelics >= 20,
    entries: [
      { kind: 'ledger', text: 'A NOTE IN THE MARGIN OF THE FIRST PAGE: "DO NOT SELL THE KEY." THE HAND IS THE FACTOR\'S OWN. THE FACTOR DOES NOT REMEMBER WRITING IT.' },
    ],
  },
  {
    id: 'cycle-renown',
    when: ({ c }) => c.charter.renown > 0 && c.lifetimeRelics >= 60,
    entries: [{ kind: 'town', text: 'The Collegium sends its compliments, and an advance. It looks forward to working with the company again. Again.' }],
  },
  {
    id: 'cycle-grace',
    when: ({ c }) => c.charter.grace > 0 && c.lifetimeRelics >= 60,
    entries: [{ kind: 'town', text: 'An antler has been left on the hall\'s doorstep. The wolves no longer come to the palisade.' }],
  },
];

const ACT_1: ForestBeat[] = [
  {
    id: 'first-hand',
    when: ({ c }) => hands(c) > 0,
    entries: [{ kind: 'ledger', text: 'FIRST HAND SIGNED ON. CANNOT WRITE. HER MARK IN THE BOOK IS A KEY, THOUGH NO ONE SHOWED HER OURS.' }],
  },
  {
    id: 'collegium-buyer',
    when: ({ c }) => c.lifetimeRelics >= 100,
    entries: [{ kind: 'town', text: 'A Collegium buyer has taken rooms above the alehouse. She pays in new-struck thalers and weighs every shard twice.' }],
  },
  {
    id: 'first-dead',
    when: ({ c }) => c.lifetimeDead > 0,
    entries: [
      { kind: 'town', text: 'The Synod buries the company\'s dead outside the palisade, face down, as is the custom for those who die in the wood.' },
    ],
  },
  {
    id: 'cold-hands',
    when: ({ c }) => c.blight >= 10,
    entries: [{ kind: 'hand', text: '"My hands have been cold since the Eaves," says a scout. The mender says it is nothing. The mender\'s hands are cold too.' }],
  },
  {
    id: 'carved-arch',
    when: ({ c }) => c.charted >= 1,
    entries: [{ kind: 'ledger', text: 'THE HANDS SPEAK OF A STONE ARCH A MILE IN, CARVED ALL OVER WITH EYES. NOTED FOR THE MAP.' }],
  },
  {
    id: 'quartermaster-signs',
    when: ({ c }) => c.upgrades.includes('quartermaster'),
    entries: [{ kind: 'hand', text: 'THE QUARTERMASTER: "Leave the mustering to me, Factor. You keep the book. The book is the important thing."' }],
  },
  {
    id: 'synod-tithe',
    when: ({ c }) => c.lifetimeSilver >= 1_000,
    entries: [{ kind: 'town', text: 'The Synod reminds the company that its charter was blessed, and that blessings are tithed.' }],
  },
  {
    id: 'wolves-at-palisade',
    when: ({ c }) => c.lifetimeRelics >= 3_000,
    entries: [{ kind: 'town', text: 'Wolves at the palisade three nights running. They do not howl. They watch the company hall.' }],
  },
  {
    id: 'act-2',
    act: 2,
    when: ({ c }) => c.charted >= barrows.opensAt,
    entries: [
      { kind: 'omen', text: 'A PAGE OF THE LEDGER HAS BEEN FILLED IN A HAND THAT IS NOT THE FACTOR\'S. IT LISTS THE COMPANY\'S DEAD.' },
      { kind: 'omen', text: 'IT LISTS TWO WHO ARE NOT DEAD YET.' },
    ],
    effects: [{ kind: 'setAct', act: 2 }],
  },
];

const inAct = (c: Company, act: number) => c.act >= act;
const thornmaze = REGIONS[3]!;
const undercity = REGIONS[4]!;

/** Act II: marks. Everything here could still be explained away, and the town is eager to. */
const ACT_2: ForestBeat[] = [
  {
    id: 'marks',
    act: 2,
    when: ({ c }) => sinceBeat(c, 'act-2') >= 60,
    entries: [{ kind: 'hand', text: 'Grey veins under the skin of a veteran\'s wrist, like roots under snow. She keeps her sleeves down now.' }],
  },
  {
    id: 'vault-hum',
    act: 2,
    when: ({ c }) => inAct(c, 2) && c.relics >= 500,
    entries: [{ kind: 'ledger', text: 'THE NIGHT WATCH REPORTS A SOUND FROM THE VAULT: A LOW NOTE, LIKE A FINGER ON THE RIM OF A GLASS. IT STOPS WHEN THE DOOR OPENS.' }],
  },
  {
    id: 'unsorted',
    act: 2,
    when: ({ c }) => sinceBeat(c, 'marks') >= 120,
    entries: [
      { kind: 'town', text: 'The Collegium buyer asks that anything from the barrows bearing a key-mark be set aside, unsorted, unwashed, and not discussed with the hands.' },
    ],
  },
  {
    id: 'returned',
    act: 2,
    when: ({ c }) => inAct(c, 2) && c.lifetimeDead >= 5 && sinceBeat(c, 'unsorted') >= 90,
    entries: [
      { kind: 'ledger', text: 'A SCOUT REPORTED DEAD AT THE BARROWS WALKED IN AT DUSK, ASKED FOR HIS WAGES, AND WAS PAID.' },
      { kind: 'ledger', text: 'HE HAS NOT SLEPT SINCE. NEITHER HAS ANYONE WHO SHARES HIS BARRACK.' },
    ],
  },
  {
    id: 'synod-questions',
    act: 2,
    when: ({ c }) => inAct(c, 2) && c.blight >= 25,
    entries: [{ kind: 'town', text: 'A Synod inquisitor has begun taking her meals at the alehouse. She is very interested in the company\'s wage rolls.' }],
  },
  {
    id: 'thornmaze-antlers',
    act: 2,
    when: ({ c }) => c.charted >= thornmaze.opensAt,
    entries: [
      { kind: 'ledger', text: 'ANTLERS NAILED TO EVERY TREE AT THE THORNMAZE\'S EDGE. THE WOLD-KIN\'S BORDER. THE HANDS GO PAST THEM ANYWAY. THE FACTOR SENDS THEM.' },
    ],
  },
];

const ACT_3: ForestBeat[] = [
  {
    id: 'act-3',
    act: 3,
    urgent: true,
    when: ({ c }) => c.keyFragments >= 1,
    entries: [
      { kind: 'ledger', text: 'THE COMPANY OF THE ASHEN KEY HOLDS A PIECE OF AN ASHEN KEY.' },
      { kind: 'ledger', text: 'THE FACTOR NOTES THAT THE NAME WAS CHOSEN BEFORE THE FIND. THE FACTOR DOES NOT REMEMBER CHOOSING IT.' },
    ],
    effects: [{ kind: 'setAct', act: 3 }],
  },
];

/** Act III: the Key, and what the company is for. */
const ACT_3_MORE: ForestBeat[] = [
  {
    id: 'collegium-delight',
    act: 3,
    when: ({ c }) => sinceBeat(c, 'act-3') >= 60,
    entries: [
      { kind: 'town', text: 'The Collegium buyer weeps when she sees the fragment. She offers a sum that would buy Thistlegate twice over. She calls it "the beginning of the lock".' },
    ],
  },
  {
    id: 'old-ledgers',
    act: 3,
    when: ({ c }) => sinceBeat(c, 'collegium-delight') >= 120,
    entries: [
      { kind: 'ledger', text: 'IN THE STRONGROOM, BENEATH THE CHARTER CHEST: OLDER LEDGERS. THE SAME COMPANY. THE SAME HALL. THE SAME FACTOR\'S HAND, DOWN TO THE CROSSED SEVENS.' },
      { kind: 'ledger', text: 'THE OLDEST IS DATED BEFORE AUREST CROSSED THE MOUNTAINS.' },
    ],
  },
  {
    id: 'homeland',
    act: 3,
    when: ({ c }) => sinceBeat(c, 'old-ledgers') >= 120,
    entries: [
      { kind: 'hand', text: 'An old blade, drunk: "The homeland went grey the same way. Grey veins first. Then the trees came up through the floors. Then the Key turned."' },
    ],
  },
  {
    id: 'undercity-hours',
    act: 3,
    when: ({ c }) => inAct(c, 3) && c.charted >= undercity.opensAt + 1,
    entries: [{ kind: 'omen', text: 'PARTIES IN THE UNDERCITY HEAR A BELL BELOW THEM, STRIKING HOURS THAT DO NOT EXIST.' }],
  },
];

/** However the reckoning comes, it comes this long after the wood wakes. */
const TERMINUS_AFTER_WAKING = 75 * 60;

const ACT_4: ForestBeat[] = [
  {
    id: 'act-4',
    act: 4,
    urgent: true,
    when: ({ c }) => c.act >= 3 && c.keyFragments >= 3,
    entries: [
      { kind: 'omen', text: 'THE WOOD IS AWAKE. THE TREES AT THE EAVES STAND A HUNDRED PACES NEARER THE PALISADE THAN THEY DID LAST NIGHT.' },
    ],
    effects: [
      { kind: 'setAct', act: 4 },
      { kind: 'setFlag', flag: 'awake' },
    ],
  },
  {
    id: 'palisade',
    act: 4,
    when: ({ c }) => sinceBeat(c, 'act-4') >= 60,
    entries: [
      { kind: 'omen', text: 'SOMETHING CAME TO THE PALISADE IN THE NIGHT WEARING A COMPANY CLOAK. IT KNEW THE WATCHWORD. IT KNEW THE FACTOR\'S NAME.' },
    ],
  },
  {
    id: 'wold-warning',
    act: 4,
    when: ({ c }) => sinceBeat(c, 'palisade') >= 120,
    entries: [
      { kind: 'town', text: 'A Wold-kin stood at the gate at dawn, unarmed, and spoke one sentence in the old tongue. The Synod translated it: "Bring it back, or we come for it."' },
    ],
  },
  {
    id: 'audit',
    act: 4,
    when: ({ c }) => sinceBeat(c, 'wold-warning') >= 180,
    entries: [
      { kind: 'town', text: 'The inquisitor audits the roster. She burns three hands at noon. The company is fined for the cost of the wood.' },
    ],
  },
  {
    id: 'ledger-writes',
    act: 4,
    when: ({ c }) => sinceBeat(c, 'audit') >= 180,
    entries: [{ kind: 'omen', text: 'THE LEDGER WRITES TODAY\'S ENTRY BEFORE THE FACTOR DOES. IT IS ACCURATE. IT ENDS MID-SENTENCE.' }],
  },
  {
    id: 'terminus',
    act: 4,
    urgent: true,
    when: ({ c }) => c.act >= 4 && (c.keyFragments >= 7 || sinceBeat(c, 'act-4') >= TERMINUS_AFTER_WAKING),
    entries: [{ kind: 'ledger', text: 'THE CHARTER IS COMING DUE. WHAT THE COMPANY DOES WITH THE KEY IS THE FACTOR\'S TO DECIDE. SEE THE RECKONING.' }],
    effects: [{ kind: 'setFlag', flag: 'terminus' }],
  },
];

export const FOREST_STORY: readonly ForestBeat[] = [...CHARTERS, ...ACT_1, ...ACT_2, ...ACT_3, ...ACT_3_MORE, ...ACT_4];

export function runForestStory(c: Company): Company {
  return runBeats<EntryKind, Company, Args>(c, FOREST_STORY, { c }, { minGap: FOREST_STORY_GAP });
}
