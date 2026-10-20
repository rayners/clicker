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

const ACT_2: ForestBeat[] = [
  {
    id: 'marks',
    act: 2,
    when: ({ c }) => sinceBeat(c, 'act-2') >= 60,
    entries: [{ kind: 'hand', text: 'Grey veins under the skin of a veteran\'s wrist, like roots under snow. She keeps her sleeves down now.' }],
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
    id: 'terminus',
    act: 4,
    urgent: true,
    when: ({ c }) => c.act >= 4 && (c.keyFragments >= 7 || sinceBeat(c, 'act-4') >= TERMINUS_AFTER_WAKING),
    entries: [{ kind: 'ledger', text: 'THE CHARTER IS COMING DUE. WHAT THE COMPANY DOES WITH THE KEY IS THE FACTOR\'S TO DECIDE. SEE THE RECKONING.' }],
    effects: [{ kind: 'setFlag', flag: 'terminus' }],
  },
];

export const FOREST_STORY: readonly ForestBeat[] = [...ACT_1, ...ACT_2, ...ACT_3, ...ACT_4];

export function runForestStory(c: Company): Company {
  return runBeats<EntryKind, Company, Args>(c, FOREST_STORY, { c }, { minGap: FOREST_STORY_GAP });
}
