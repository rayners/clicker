import type { ActTexts } from '../late-fees/story';
import type { EndingText, RunBeat } from '../late-fees/kinds';

/**
 * Patient 10-30: a white mask, no voice, never runs. Written against signals and the venue's words, so he can walk
 * out of any place ({place}, {victims}, {staff}, {refuge}, {deepPlace}, {finalGirl}).
 */
export const PATIENT_ACTS: ActTexts = {
  opening: 'FIRST NIGHT AT {place}. A LIGHT GOES OUT IN {refuge}. IN THE MORNING THERE IS A KITCHEN KNIFE MISSING, AND A WINDOW LATCHED FROM THE OUTSIDE.',
  bodyCount: 'THE COUNTY PAPER RUNS THE NAMES ON PAGE FOUR. THE SHERIFF CALLS IT A RUN OF BAD LUCK. {place} STAYS OPEN. SOMEONE HAS BEEN STANDING AT THE END OF THE STREET ALL WEEK.',
  finalGirl:
    '{finalGirl}, ONE OF THE {staff}, GOES DOWN TO {deepPlace} AND FINDS HIS FILE: ADMITTED AGE SIX, ON CANDY CORN DAY, FOR A KILLING NOBODY EXPLAINED. "HE ISN\'T ANGRY," SHE SAYS. "HE\'S JUST COMING HOME."',
  confrontation: 'NIGHT FALLS ON CANDY CORN DAY. EVERY DOOR AT {place} IS LOCKED. HE WALKS IN ANYWAY, SLOWLY, AND HE DOES NOT STOP.',
  credits: 'MORNING. WHERE HE FELL THERE IS ONLY A SHAPE IN THE LEAVES. ROLL CREDITS. [THE TAPE IS NOT REWOUND.]',
};

export const PATIENT_KILLS = [
  '{victim} SAW A WHITE FACE AT THE END OF THE CORRIDOR. THEY LOOKED AWAY FOR A SECOND.',
  '{victim} WAS FOUND IN A LOCKED ROOM. THE KEY WAS STILL IN THE INSIDE OF THE DOOR.',
  'THE {staff} HEARD NOTHING. {victim} WAS PINNED TO THE DOOR OF THE {refuge} WITH A KITCHEN KNIFE.',
  '{victim} RAN. HE WALKED. HE WAS THERE FIRST.',
  '{victim} THOUGHT THE MAN IN THE MASK WAS IN COSTUME. IT WAS CANDY CORN DAY, AFTER ALL.',
];

export const PATIENT_BEATS: readonly RunBeat[] = [
  {
    id: 'patient-mask',
    when: ({ r }) => r.elapsed >= 120,
    entries: [{ kind: 'staff', text: 'THE {staff} AT {place} KEEP SEEING SOMEONE STANDING VERY STILL WHERE NOBODY SHOULD BE. A WHITE FACE. WHEN THEY LOOK AGAIN, THE SPOT IS EMPTY.' }],
  },
  {
    id: 'patient-walk',
    act: 2,
    when: ({ r }) => r.act >= 2 && r.bodyCount >= 10,
    entries: [{ kind: 'staff', text: 'EVERY SURVIVOR SAYS THE SAME THING: HE NEVER RAN. NOT ONCE. THEY RAN, AND HE WAS STILL THERE WHEN THEY STOPPED.' }],
  },
  {
    id: 'patient-doctor',
    act: 2,
    when: ({ r }) => r.act >= 2 && r.bodyCount >= 25,
    entries: [{ kind: 'news', text: 'A DOCTOR FROM THE STATE HOSPITAL ARRIVES AT {place} WITH A REVOLVER AND A FILE. "I SPENT FIFTEEN YEARS TRYING TO REACH HIM," HE SAYS. "THERE IS NOBODY THERE TO REACH."' }],
  },
  {
    id: 'patient-sister',
    act: 3,
    when: ({ r }) => r.act >= 3 && r.bodyCount >= 40,
    entries: [{ kind: 'staff', text: '{finalGirl}: "HE MISSED ME ONCE. HE WON\'T STOP UNTIL HE DOESN\'T. LOCK EVERYTHING, AND THEN DON\'T TRUST THE LOCKS."' }],
  },
];

export const PATIENT_ENDINGS: Readonly<Record<'kill', EndingText>> = {
  kill: {
    title: 'PUT HIM DOWN',
    text: '{finalGirl} empties the revolver into him and he goes over the railing into the dark. She does not look down. When the deputies do, there is nobody there.',
  },
};
