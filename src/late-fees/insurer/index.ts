import { AGENTS, POLICIES, SURVIVORS } from '../../late-fees-data/insurer';
import { INSURER_BEATS, INSURER_ENDINGS, INSURER_LEXICON } from '../../late-fees-data/insurer-story';
import type { VenueDef } from '../kinds';
import type { InsurerRun, Run, RunConfig } from '../state';
import { DEFAULT_APPETITE, DUE_SECONDS, insurerSignals, payClaim, tickInsurer } from './economy';
import type { InsurerFields } from './state';

const i = (r: Run) => r as InsurerRun;
const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));

export const INSURER: VenueDef = {
  id: 'insurer',
  fields: (): InsurerFields => ({
    venue: 'insurer',
    policies: zeroes(POLICIES),
    agents: zeroes(AGENTS),
    appetite: DEFAULT_APPETITE,
    list: [...SURVIVORS],
    omens: 0,
    dueIn: DUE_SECONDS,
    cheats: 0,
    payouts: 0,
    actuaryOff: false,
  }),
  boot: (config: RunConfig) => [
    'PLAY ▶',
    config.title,
    'PROVIDENCE MUTUAL LIFE, CLAIMS DEPARTMENT. THE MORNING AFTER FLIGHT 213.',
    'FORTY PEOPLE WALKED OFF THAT PLANE BEFORE IT FELL. ALL FORTY ARE ON YOUR DESK.',
  ],
  tick: (r, dt) => tickInsurer(i(r), dt),
  signals: (r) => insurerSignals(i(r)),
  lexicon: INSURER_LEXICON,
  beats: INSURER_BEATS,
  endings: INSURER_ENDINGS,
  claim: (r, roll) => {
    const ins = i(r);
    if (!POLICIES.some((p) => (ins.policies[p.id] ?? 0) > 0)) return null;
    // A freak accident away from the list: a policyholder, and a claim like any other.
    const name = SURVIVORS[Math.floor(roll() * SURVIVORS.length)]!;
    return { r: payClaim(ins), victim: `A POLICYHOLDER NAMED ${name}` };
  },
  outcome: (r) => ({ output: SURVIVORS.length - i(r).list.length, unit: 'NAMES CROSSED OFF' }),
  stakes: (r) => {
    const ins = i(r);
    return `PROVIDENCE MUTUAL: ${ins.list.length} NAMES STILL ON THE LIST. ${ins.bodyCount.toLocaleString('en-US')} CLAIMS PAID IN BLOOD. THE DESIGN HAS BEEN CHEATED ${ins.cheats} TIMES. IT REMEMBERS EVERY ONE.`;
  },
};
