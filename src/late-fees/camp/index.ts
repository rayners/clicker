import { COUNSELORS, LIGHTS, STAFF_NAMES, ZONES } from '../../late-fees-data/camp';
import { CAMP_BEATS, CAMP_ENDINGS, CAMP_LEXICON } from '../../late-fees-data/camp-story';
import { createGround, held } from '../../shared/ground';
import type { VenueDef } from '../kinds';
import type { CampRun, RunConfig, Run } from '../state';
import { campSignals, DEFAULT_PREP_SHARE, tickCamp } from './economy';
import type { CampFields } from './state';

const c = (r: Run) => r as CampRun;
const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));
const heads = (r: CampRun) => COUNSELORS.reduce((n, x) => n + (r.counselors[x.id] ?? 0) * x.heads, 0);

export const CAMP: VenueDef = {
  id: 'camp',
  fields: (): CampFields => ({
    venue: 'camp',
    counselors: zeroes(COUNSELORS),
    lights: zeroes(LIGHTS),
    zones: createGround(ZONES),
    prepShare: DEFAULT_PREP_SHARE,
    towers: 0,
    headOff: false,
    deepest: 0,
  }),
  boot: (config: RunConfig) => [
    'PLAY ▶',
    config.part > 1 ? `${config.title}: PART ${config.part}` : config.title,
    'CAMP BLACKWATER LAKE. REOPENING DAY, TWENTY YEARS AFTER THE DROWNING.',
    'THE GATE IS CHAINED. THE BUNKS ARE BARE. THE LAKE IS VERY STILL.',
  ],
  tick: (r, dt) => tickCamp(c(r), dt),
  signals: (r) => campSignals(c(r)),
  lexicon: CAMP_LEXICON,
  beats: CAMP_BEATS,
  endings: CAMP_ENDINGS,
  claim: (r, roll) => {
    const camp = c(r);
    const tier = COUNSELORS.find((x) => (camp.counselors[x.id] ?? 0) > 0);
    const name = STAFF_NAMES[Math.floor(roll() * STAFF_NAMES.length)]!;
    if (tier) {
      return { r: { ...camp, counselors: { ...camp.counselors, [tier.id]: camp.counselors[tier.id]! - 1 } }, victim: `COUNSELOR ${name}` };
    }
    return held(camp.zones) > 0 ? { r: camp, victim: `A CAMPER NAMED ${name}` } : null;
  },
  outcome: (r) => ({ output: c(r).deepest, unit: 'ZONES' }),
  stakes: (r) => {
    const camp = c(r);
    return `CAMP BLACKWATER: ${heads(camp).toLocaleString('en-US')} STAFF STILL STANDING. ${camp.bodyCount.toLocaleString('en-US')} DEAD THIS SUMMER.`;
  },
};
