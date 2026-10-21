import type { ActTexts } from '../late-fees/story';
import type { EndingText, RunBeat } from '../late-fees/kinds';

/**
 * The Burned Man. Written against signals and the venue's words, so he could walk a camp's dreams as easily as a
 * clinic's ({place}, {victims}, {staff}, {refuge}, {deepPlace}, {finalGirl}).
 */
export const BURNED_ACTS: ActTexts = {
  opening: 'FIRST NIGHT AT {place}. SOMEONE SCREAMS IN THEIR SLEEP AT 3:12 AM. IN THE MORNING THERE ARE FOUR LONG CUTS IN THE MATTRESS.',
  bodyCount: 'THE COUNTY CORONER CALLS IT "SUDDEN NOCTURNAL DEATH". THE NEWSPAPER CALLS IT A CURSE. {place} STAYS OPEN. THE BEDS STAY FULL.',
  finalGirl:
    '{finalGirl}, ONE OF THE {staff}, GOES DOWN TO {deepPlace} AND FINDS A HAT, A SWEATER, A GLOVE WITH BLADES WHERE THE FINGERS SHOULD BE. "HE ONLY HAS POWER IF YOU\'RE AFRAID," SHE SAYS. "AND EVERYBODY HERE IS AFRAID."',
  confrontation: 'NOBODY AT {place} CAN STAY AWAKE TONIGHT. THE CLOCKS STOP AT 3:12. HE IS IN EVERY DREAM AT ONCE.',
  credits: 'MORNING. A SKIPPING RHYME FROM THE STREET OUTSIDE: ONE, TWO, HE\'S COMING FOR YOU. ROLL CREDITS. [THE TAPE IS NOT REWOUND.]',
};

export const BURNED_KILLS = [
  '{victim} TALKED IN THEIR SLEEP ABOUT A MAN WITH A BURNED FACE. THEN THEY STOPPED TALKING.',
  '{victim} WOKE UP SCREAMING, AND THEN THEY DIDN\'T WAKE UP.',
  'THE MONITOR IN THE {refuge} SHOWED {victim} SMILING IN THEIR SLEEP. THEN FOUR CUTS APPEARED ON THEIR ARM.',
  '{victim} WAS DRAGGED ACROSS THE CEILING BY SOMETHING NOBODY ELSE COULD SEE.',
  '{victim} DREAMED OF A BOILER ROOM. THEY WERE FOUND COLD, THEIR PILLOW SCORCHED.',
];

export const BURNED_BEATS: readonly RunBeat[] = [
  {
    id: 'burned-rhyme',
    when: ({ r }) => r.elapsed >= 120,
    entries: [{ kind: 'staff', text: 'CHILDREN SKIP ROPE OUTSIDE {place}: "ONE, TWO, HE\'S COMING FOR YOU." THE {victims} ALL KNOW THE WORDS. NONE OF THEM REMEMBER LEARNING THEM.' }],
  },
  {
    id: 'burned-sweater',
    act: 2,
    when: ({ r }) => r.act >= 2 && r.bodyCount >= 10,
    entries: [{ kind: 'staff', text: 'EVERY SURVIVOR DESCRIBES HIM THE SAME: A RED AND GREEN SWEATER, A BATTERED HAT, A FACE LIKE MELTED WAX, AND A GLOVE OF KNIVES.' }],
  },
  {
    id: 'burned-parents',
    act: 2,
    when: ({ r }) => r.act >= 2 && r.bodyCount >= 25,
    entries: [{ kind: 'news', text: 'A POLICE LIEUTENANT VISITS {place}. HE ASKS WHO SENT THE {victims} HERE. HE ASKS IT LIKE HE ALREADY KNOWS.' }],
  },
  {
    id: 'burned-coffee',
    act: 3,
    when: ({ r }) => r.act >= 3 && r.bodyCount >= 40,
    entries: [{ kind: 'staff', text: '{finalGirl}: "STAY AWAKE. WHATEVER HAPPENS, WHATEVER HE SAYS, STAY AWAKE." SHE HAS NOT SLEPT IN SEVENTY HOURS.' }],
  },
];

export const BURNED_ENDINGS: Readonly<Record<'kill', EndingText>> = {
  kill: {
    title: 'PULL HIM OUT OF THE DREAM',
    text: '{finalGirl} falls asleep on purpose, grabs him by the sweater, and wakes up holding on. Out here he burns like anything else. The ashes are swept up. Somebody keeps the hat.',
  },
};
