import type { GuideRules, GuideStep } from '../shared/guide';
import type { LateGame } from '../late-fees/game';
import type { Run, VenueId } from '../late-fees/state';
import { DEFAULT_PREP_SHARE } from '../late-fees/camp/economy';
import { REM_NEED } from '../late-fees/clinic/economy';
import { DEFAULT_APPETITE } from '../late-fees/insurer/economy';
import { DEFAULT_SEDATION } from '../late-fees/asylum/economy';

/** LATE FEES's walkthrough (docs/ROADMAP.md, item 6b): each tape's levers in the order they matter. */
type Step = GuideStep<LateGame>;
type R = Run & Record<string, unknown>;

const r = (g: LateGame) => g.run as R;
const count = (o: unknown) => Object.values((o ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0);
const playing = (venue: VenueId) => (g: LateGame) => g.mode === 'films' && !g.shelf && g.run.venue === venue;

const ACTION = '.whistle';
const STAFF = '#lf-tab-staff';

const CAMP: Step[] = [
  { id: 'camp-whistle', title: 'BLOW THE WHISTLE', text: 'Tap to get the campers moving. Every zone of the camp you open fills with paying campers.', target: ACTION, show: playing('camp'), done: (g) => g.run.lifetimeCash > 0 || (r(g).zones as { control: number }[]).some((z) => z.control > 0) },
  { id: 'camp-staff', title: 'COUNSELORS AND LIGHTS', text: 'In STAFF, counselors do the work and lights keep the dark back. Open zones need both, or they slip back to the woods.', target: STAFF, show: playing('camp'), done: (g) => count(r(g).counselors) > 0 },
  { id: 'camp-split', title: 'WATCH OR PREP', text: 'Staff either prepare new zones or watch the ones already open. Unwatched campers are where the trouble starts.', target: '[aria-label="Staff split"]', show: (g) => playing('camp')(g) && count(r(g).counselors) > 0, done: (g) => r(g).prepShare !== DEFAULT_PREP_SHARE },
];

const CLINIC: Step[] = [
  { id: 'clinic-reading', title: 'TAKE A READING', text: 'Tap to take readings by hand. The study is paid by the dreaming hour.', target: ACTION, show: playing('clinic'), done: (g) => g.run.lifetimeCash > 0 },
  { id: 'clinic-beds', title: 'BEDS AND NIGHT STAFF', text: 'In STAFF, beds add sleepers and night staff watch them. Deep sleepers nobody is watching are the ones who do not wake up.', target: STAFF, show: playing('clinic'), done: (g) => count(r(g).beds) > 0 },
  { id: 'clinic-dial', title: 'THE DEEP-SLEEP DIAL', text: 'More deep sleep pays more grant money, and builds sleep debt and nightmares. Turn it a tenth at a time.', target: '[aria-label="Deep sleep share"]', show: (g) => playing('clinic')(g) && count(r(g).beds) > 0, done: (g) => r(g).remShare !== Math.round(REM_NEED * 10) },
];

const INSURER: Step[] = [
  { id: 'insurer-sell', title: 'SELL A POLICY', text: 'Tap to sell policies by hand. Premiums pay every second; claims are paid when a policyholder dies.', target: ACTION, show: playing('insurer'), done: (g) => g.run.lifetimeCash > 0 },
  { id: 'insurer-book', title: 'POLICIES AND AGENTS', text: 'In STAFF, policy lines bring premiums and agents sell them. Every survivor of Flight 213 you cover is a claim waiting to happen.', target: STAFF, show: playing('insurer'), done: (g) => count(r(g).policies) > 0 },
  { id: 'insurer-appetite', title: 'RISK APPETITE', text: 'More appetite writes more policies and more claims. Watch the list: the design takes them in order.', target: '[aria-label="Risk appetite dial"]', show: (g) => playing('insurer')(g) && count(r(g).policies) > 0, done: (g) => r(g).appetite !== DEFAULT_APPETITE },
];

const ASYLUM: Step[] = [
  { id: 'asylum-rounds', title: 'WALK THE WARDS', text: 'Tap to walk the wards by hand. Every bed filled is paid by the county.', target: ACTION, show: playing('asylum'), done: (g) => g.run.lifetimeCash > 0 },
  { id: 'asylum-wards', title: 'WARDS AND STAFF', text: 'In STAFF, wards add beds and orderlies keep them calm. Agitated wards are where doors fail.', target: STAFF, show: playing('asylum'), done: (g) => count(r(g).wards) > 0 },
  { id: 'asylum-dose', title: 'THE DOSE', text: 'More sedation calms the wards but costs the hospital\'s rating. Ward Ten stays locked; the doors wear.', target: '[aria-label="Sedation"]', show: (g) => playing('asylum')(g) && count(r(g).wards) > 0, done: (g) => r(g).sedation !== DEFAULT_SEDATION },
];

const SHARED: Step[] = [
  { id: 'flow', title: 'THE LINE', text: 'The three boxes at the top are the business. The highlighted one is what is holding you back.', target: '[aria-label="Production flow"]', show: (g) => g.mode === 'films' && !g.shelf && g.run.elapsed > 60, done: () => false },
  { id: 'store', title: 'THE STORE', text: 'STORE sells one-off improvements, including the staff who do your tapping for you.', target: '#lf-tab-store', show: (g) => g.mode === 'films' && !g.shelf && g.run.upgrades.length === 0 && g.run.lifetimeCash >= 100, done: (g) => g.run.upgrades.length > 0 },
  { id: 'trust', title: 'TRUST', text: 'Every body costs the place some of the public\'s trust, and trust is income. The film ends with the credits; finish it for a sequel.', target: '[aria-label="Status"]', show: (g) => g.mode === 'films' && !g.shelf && g.run.bodyCount > 0, done: () => false },
];

const BY_VENUE: Record<VenueId, Step[]> = { camp: CAMP, clinic: CLINIC, insurer: INSURER, asylum: ASYLUM };

export const lateGuideSteps = (g: LateGame): readonly Step[] => [...BY_VENUE[g.run.venue], ...SHARED];

const RULES: Record<VenueId, GuideRules> = {
  camp: {
    title: 'HOW CAMP BLACKWATER WORKS',
    sections: [
      { heading: 'ZONES', text: 'Open the camp zone by zone. Every open zone fills with paying campers; lights and counselors keep it open.' },
      { heading: 'WATCH OR PREP', text: 'Staff split between preparing new zones and watching open ones. Short of watch, zones slip back to the woods.' },
      { heading: 'NIGHT', text: 'The clock runs from day to night. The dark is when the Drowned Boy walks.' },
    ],
  },
  clinic: {
    title: 'HOW THE SYCAMORE STREET CLINIC WORKS',
    sections: [
      { heading: 'THE STUDY', text: 'Sleepers in beds earn grant money by the dreaming hour. Deep sleep pays most.' },
      { heading: 'THE WATCH', text: 'Night staff watch the deep sleepers. Unwatched, they are the Burned Man\'s.' },
      { heading: 'SLEEP DEBT', text: 'Too much deep sleep builds debt and nightmares. Suppressant buys time.' },
    ],
  },
  insurer: {
    title: 'HOW PROVIDENCE MUTUAL WORKS',
    sections: [
      { heading: 'PREMIUMS', text: 'Policies pay premiums every second. A death costs a payout.' },
      { heading: 'THE LIST', text: 'Death has a list of the survivors of Flight 213 and takes them in order. Omens warn who is next; prevention can cheat it, once.' },
      { heading: 'APPETITE', text: 'The appetite dial sets how much risk the book takes on: more premiums, more claims.' },
    ],
  },
  asylum: {
    title: 'HOW GRAYHAVEN WORKS',
    sections: [
      { heading: 'BEDS', text: 'Fill the wards; the county pays for every bed.' },
      { heading: 'THE DOSE', text: 'Sedation calms agitation but lowers the hospital\'s rating. Agitated wards wear the doors.' },
      { heading: 'WARD TEN', text: 'Keep Ward Ten locked until National Candy Corn Day. Escapees blend into a costumed town.' },
    ],
  },
};

export const lateGuideRules = (g: LateGame): GuideRules => RULES[g.run.venue];
