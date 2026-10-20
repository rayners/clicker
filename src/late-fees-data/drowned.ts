import type { ActTexts } from '../late-fees/story';
import type { Ending, RunBeat } from '../late-fees/kinds';

/**
 * The Drowned Boy. Written against signals and the venue's words, so the same killer could stalk a clinic or
 * an office one day ({place}, {victims}, {staff}, {refuge}, {deepPlace}, {finalGirl}).
 */
export const DROWNED_ACTS: ActTexts = {
  opening: 'FIRST NIGHT AT {place}. ONE OF THE {staff} WENT DOWN TO THE WATER FOR A SMOKE. THE LIGHTER IS STILL ON THE DOCK.',
  bodyCount: 'THE COUNTY PAPER RUNS IT ON PAGE ONE: "{place}: THE CURSE RETURNS?" THE OWNERS CALL IT A RUN OF BAD LUCK. BOOKINGS ARE UP.',
  finalGirl:
    '{finalGirl}, ONE OF THE {staff}, FINDS A PHOTOGRAPH AT {deepPlace}: A BOY IN THE WATER, 1958. "HE NEVER LEFT," SHE SAYS. "HE NEVER LEFT AND HE IS NEVER GOING TO."',
  confrontation: 'THE POWER IS OUT. THE PHONE IS DEAD. HE IS COMING FOR EVERYONE AT {place} TONIGHT, AND HE IS NOT IN A HURRY.',
  credits: 'DAWN. A CANOE DRIFTS ON THE STILL WATER. ROLL CREDITS. [THE TAPE IS NOT REWOUND.]',
};

/** Lines for each person he takes; {victim} is who the venue gave up. */
export const DROWNED_KILLS = [
  '{victim} WENT TO CHECK THE GENERATOR. THE GENERATOR IS STILL RUNNING.',
  '{victim} HEARD SOMEONE CALLING FROM THE WATER. NOBODY ELSE HEARD ANYTHING.',
  '{victim} SAID THEY WOULD BE RIGHT BACK.',
  '{victim} WAS LAST SEEN WALKING TOWARD THE TREELINE, NOT RUNNING.',
  'A WET FOOTPRINT ON THE FLOOR OF THE {refuge}. {victim} IS MISSING FROM ROLL CALL.',
  '{victim} LOCKED THE CABIN DOOR. THE WINDOW WAS OPEN.',
];

export const DROWNED_BEATS: readonly RunBeat[] = [
  {
    id: 'drowned-legend',
    when: ({ r }) => r.elapsed >= 120,
    entries: [{ kind: 'staff', text: 'AROUND THE CAMPFIRE, THE OLD COOK TELLS THE {victims} ABOUT THE BOY WHO DROWNED IN 1958. EVERYONE LAUGHS. MOST OF THEM.' }],
  },
  {
    id: 'drowned-mask',
    act: 2,
    when: ({ r }) => r.act >= 2 && r.bodyCount >= 10,
    entries: [{ kind: 'staff', text: 'SOMEONE SAW HIM AT THE EDGE OF THE LIGHT: A BIG MAN IN A WELDER\'S MASK, STANDING VERY STILL.' }],
  },
  {
    id: 'drowned-police',
    act: 2,
    when: ({ r }) => r.act >= 2 && r.bodyCount >= 25,
    entries: [{ kind: 'news', text: 'THE SHERIFF VISITS {place}. HE SAYS RUNAWAYS. HE SAYS BEARS. HE DOES NOT GET OUT OF THE CAR.' }],
  },
  {
    id: 'drowned-mother',
    act: 3,
    when: ({ r }) => r.act >= 3 && r.bodyCount >= 40,
    entries: [{ kind: 'staff', text: '{finalGirl}: "IT WAS HIS MOTHER, THE FIRST TIME. AND NOW IT\'S HIM. IT\'S ALWAYS GOING TO BE HIM."' }],
  },
];

export const DROWNED_ENDINGS: Readonly<Record<Ending, { title: string; text: string }>> = {
  kill: {
    title: 'PUT HIM BACK IN THE LAKE',
    text: '{finalGirl} and whoever is left drive him into the water at dawn. He sinks. The camp closes for the season. The lake does not freeze over this winter.',
  },
  sell: {
    title: 'SELL THE STORY',
    text: 'The studio pays for the rights and the real location. You reopen next summer with a gift shop. Nobody goes near the far shore. He is still out there.',
  },
  burn: {
    title: 'BURN THE CAMP',
    text: 'Every cabin, the boathouse, the dock. You burn {place} to the waterline and salt the trail. There will be no Part {nextPart}. Not here.',
  },
};
