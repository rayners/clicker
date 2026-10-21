import type { ActTexts } from '../late-fees/story';
import type { Ending, RunBeat } from '../late-fees/kinds';

/**
 * Death's design. No mask, no glove: a pattern. Written against signals and the venue's words, so it could come
 * for a camp or a clinic as easily ({place}, {victims}, {staff}, {refuge}, {deepPlace}, {finalGirl}).
 */
export const DESIGN_ACTS: ActTexts = {
  opening:
    'THE PREMONITION, AGAIN, AS IT CAME TO THE BOY AT GATE 21: FLIGHT 213 TEARING APART OVER THE BAY. FORTY PEOPLE GOT OFF. THE FIRST OF THEM DIES THIS MORNING, AT {place}\'S EXPENSE.',
  bodyCount: 'THE NEWSPAPERS CONNECT THE DEATHS: "FLIGHT 213 SURVIVORS DYING IN FREAK ACCIDENTS." {place} RAISES ITS PREMIUMS. NOBODY CANCELS.',
  finalGirl:
    '{finalGirl}, ONE OF THE {staff}, WALKS {deepPlace} WITH THE SEATING CHART. "IT\'S NOT RANDOM," SHE SAYS. "IT\'S AN ORDER. IT\'S THE ORDER WE WOULD HAVE DIED IN. AND WHEN YOU SKIP SOMEONE, IT COMES BACK."',
  confrontation: 'EVERY OMEN AT ONCE: LOOSE WIRES, WET FLOORS, FRAYED CABLES, WIND. THE DESIGN HAS STOPPED BEING PATIENT WITH {place}.',
  credits: 'A NEW PREMONITION: A HIGHWAY PILE-UP, A BRIDGE, A ROLLERCOASTER. A NEW LIST. ROLL CREDITS. [THE TAPE IS NOT REWOUND.]',
};

export const DESIGN_KILLS = [
  '{victim} WAS NOT ON ANY LIST. THE DESIGN HAD A GAP TO FILL.',
  'A PLANE ENGINE FELL ONTO THE HOUSE OF {victim} FROM A FLIGHT THAT LANDED SAFELY.',
  '{victim} WAS STANDING IN THE WRONG PLACE AT 2:13.',
];

export const DESIGN_BEATS: readonly RunBeat[] = [
  {
    id: 'design-signs',
    when: ({ r }) => r.elapsed >= 120,
    entries: [{ kind: 'staff', text: 'THE {staff} START NOTICING THINGS: SONGS ON THE RADIO ABOUT FALLING, SHADOWS SHAPED LIKE BLADES, THE NUMBER 213 ON EVERY RECEIPT.' }],
  },
  {
    id: 'design-mortician',
    act: 2,
    when: ({ r }) => r.act >= 2 && r.bodyCount >= 5,
    entries: [{ kind: 'staff', text: 'A TALL MAN FROM THE MORGUE VISITS {place}. "IN DEATH THERE ARE NO ACCIDENTS," HE SAYS, "NO COINCIDENCES, NO MISHAPS, NO ESCAPES." HE SMILES. "I\'LL SEE YOU SOON."' }],
  },
  {
    id: 'design-pattern',
    act: 2,
    when: ({ r }) => r.act >= 2 && r.bodyCount >= 10,
    entries: [{ kind: 'news', text: 'AN FBI AGENT ASKS THE {staff} WHY EVERY DEATH SCENE HAS A PROVIDENCE MUTUAL CLAIMS FORM ON IT. THEY SAY THEY GOT THERE FIRST.' }],
  },
  {
    id: 'design-new-life',
    act: 3,
    when: ({ r }) => r.act >= 3 && r.bodyCount >= 15,
    entries: [{ kind: 'staff', text: '{finalGirl}: "ONLY A NEW LIFE CAN BREAK THE LIST. OR A DEATH THAT DOESN\'T COUNT. OR..." SHE STOPS. "OR NOTHING. IT JUST STARTS AGAIN."' }],
  },
];

export const DESIGN_ENDINGS: Readonly<Record<Ending, { title: string; text: string }>> = {
  kill: {
    title: 'CHEAT IT ONE LAST TIME',
    text: '{finalGirl} holds the last name safe until the design moves past it. The office empties. The survivors scatter to other cities, other insurers. Death keeps a long list. It is in no hurry.',
  },
  sell: {
    title: 'SELL THE BOOK',
    text: 'You sell every policy to a larger insurer for a fortune and do not mention the pattern. The buyer\'s actuaries notice it within a week. By then you are on a plane. You check your seat number twice.',
  },
  burn: {
    title: 'TEAR UP THE LIST',
    text: 'You shred the seating chart, cancel every policy, and close {place} for good. Without a list to follow, the design loses the thread. There will be no Part {nextPart}. Not for you.',
  },
};
