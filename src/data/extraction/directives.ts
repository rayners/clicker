export type DirectiveGoal =
  | { kind: 'extractOre'; target: number }
  | { kind: 'earnCredits'; target: number }
  | { kind: 'ownGenerators'; generator: string; target: number };

export interface DirectiveDef {
  id: string;
  title: string;
  brief: string;
  /** Light-lag flavour: how long ago HQ sent it. */
  lag: string;
  unlockOre: number;
  goal: DirectiveGoal;
  /** Seconds allowed. */
  duration: number;
  reward: number;
}

export const DIRECTIVES: readonly DirectiveDef[] = [
  {
    id: 'ka-001',
    title: 'ESTABLISH EXTRACTION',
    brief: 'Welcome to Tethys Minor. Demonstrate viable extraction to unlock your operating budget.',
    lag: '2Y 11M',
    unlockOre: 20,
    goal: { kind: 'extractOre', target: 100 },
    duration: 5 * 60,
    reward: 75,
  },
  {
    id: 'ka-002',
    title: 'FLEET DEPLOYMENT',
    brief: 'Deploy a survey drone fleet. Shareholders love a fleet.',
    lag: '2Y 11M',
    unlockOre: 150,
    goal: { kind: 'ownGenerators', generator: 'drone', target: 5 },
    duration: 10 * 60,
    reward: 150,
  },
  {
    id: 'ka-003',
    title: 'REFINERY CERTIFICATION',
    brief: 'Refine product to Combine standard. Certification affects crew shares.',
    lag: '2Y 10M',
    unlockOre: 600,
    goal: { kind: 'earnCredits', target: 1_000 },
    duration: 10 * 60,
    reward: 500,
  },
  {
    id: 'ka-004',
    title: 'AUGER SATURATION',
    brief: 'Field ten auger rigs. Surface yields are ahead of projection. Keep it that way.',
    lag: '2Y 10M',
    unlockOre: 3_000,
    goal: { kind: 'ownGenerators', generator: 'auger', target: 10 },
    duration: 15 * 60,
    reward: 3_000,
  },
  {
    id: 'ka-005',
    title: 'QUARTERLY ACCELERATION',
    brief: 'The quarter closes in fifteen minutes, your time. Extract accordingly.',
    lag: '2Y 9M',
    unlockOre: 20_000,
    goal: { kind: 'extractOre', target: 50_000 },
    duration: 15 * 60,
    reward: 20_000,
  },
  {
    id: 'ka-006',
    title: 'CRAWLER COMMISSIONING',
    brief: 'Commission ten crawlers. Prioritise the northern basin. Do not survey the southern fissure.',
    lag: '2Y 9M',
    unlockOre: 80_000,
    goal: { kind: 'ownGenerators', generator: 'crawler', target: 10 },
    duration: 20 * 60,
    reward: 60_000,
  },
  {
    id: 'ka-007',
    title: 'SEISMIC SURVEY',
    brief: 'Map the deep strata. Forward raw seismic returns to Special Projects only.',
    lag: '2Y 8M',
    unlockOre: 1_000_000,
    goal: { kind: 'ownGenerators', generator: 'seismic', target: 5 },
    duration: 20 * 60,
    reward: 600_000,
  },
  {
    id: 'ka-008',
    title: 'CORE SAMPLE PRIORITY',
    brief: 'Special Projects requests intact core from below 3,000 m. Do not process. Do not discuss with crew.',
    lag: '2Y 8M',
    unlockOre: 10_000_000,
    goal: { kind: 'ownGenerators', generator: 'bore', target: 3 },
    duration: 30 * 60,
    reward: 5_000_000,
  },
];
