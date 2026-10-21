import { createSaveSystem } from '../shared/save';
import { LATE_VERSION, newLateGame, type LateGame } from './game';

export const LATE_SAVE_KEY = 'latefees.save';

export const lateSaves = createSaveSystem<LateGame>({
  key: LATE_SAVE_KEY,
  corruptKey: 'latefees.corrupt',
  version: LATE_VERSION,
  migrations: {
    // v2: crossovers. Each finished film records its killer; before crossovers it was always the place's own.
    2: (save) => {
      const home: Record<string, string> = { camp: 'drowned', clinic: 'burned', insurer: 'design' };
      const profile = save.profile as { history: { venue: string; killer?: string }[] };
      return { ...save, profile: { ...profile, history: profile.history.map((h) => ({ killer: home[h.venue] ?? 'drowned', ...h })) } };
    },
  },
  label: 'LATE FEES',
  required: ['profile', 'run'],
  fresh: newLateGame,
});
