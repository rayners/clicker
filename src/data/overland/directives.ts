import type { DirectiveDef } from '../../mission/directives';

export const OVERLAND_DIRECTIVES: readonly DirectiveDef[] = [
  {
    id: 'land-001',
    title: 'HITCH UP',
    brief: 'Tow three ore skips. An empty rig is an expense, not a haul.',
    lag: '0D 4H',
    unlockCredits: 20,
    goal: { metric: 'car:skip', target: 3, mode: 'level' },
    duration: 5 * 60,
    reward: 60,
  },
  {
    id: 'land-002',
    title: 'ON SCHEDULE',
    brief: 'Make two deliveries inside their windows. The long-haul board is watching.',
    lag: '0D 4H',
    unlockCredits: 120,
    goal: { metric: 'onTime', target: 2, mode: 'since' },
    duration: 10 * 60,
    reward: 150,
  },
  {
    id: 'land-003',
    title: 'MORE PULL',
    brief: 'Fit five turbo-diesel packs. The salt flats are long.',
    lag: '0D 3H',
    unlockCredits: 1_500,
    goal: { metric: 'engine:turbo', target: 5, mode: 'level' },
    duration: 10 * 60,
    reward: 1_500,
  },
];
