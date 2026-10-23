import { createSaveSystem, hasShape } from '../engine/save';
import { createLateProfile, LATE_VERSION, newLateGame, type LateGame } from './game';
import { createRun } from './state';

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
    // v3: the Killer's Cut. Old saves are playing the films, with no cut started.
    3: (save) => ({ ...save, mode: 'films', cut: null }),
    // v4: Legend, carried out of finished cuts. Nobody has finished one yet.
    4: (save) => ({ ...save, profile: { legend: {}, ...(save.profile as Record<string, unknown>) } }),
  },
  label: 'LATE FEES',
  required: ['profile', 'run'],
  fresh: newLateGame,
  validate: (g) => hasShape(g.profile, createLateProfile()) && hasShape(g.run, createRun(g.run.config as Parameters<typeof createRun>[0], 1)),
});
