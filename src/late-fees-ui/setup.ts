import { createSettings } from '../engine/ui/settings';
import { lateSaves } from '../late-fees/save';
import type { LateGame } from '../late-fees/game';
import type { LateStore } from '../late-fees/store';

/** The VCR's SETUP menu: sound, motion, analytics, the save code, and erasing the tape. */
export function createSetup(store: LateStore): { button: HTMLButtonElement; dialog: HTMLElement; render(game: LateGame): void } {
  const settings = createSettings<LateGame>({
    store,
    saves: lateSaves,
    settings: (game) => game.profile.settings,
    setSetting: (key, value) => store.dispatch({ type: 'setSetting', key, value }),
    reset: { text: 'ERASE TAPE', aria: 'Erase the tape', onConfirm: () => store.dispatch({ type: 'hardReset', seed: (Math.random() * 2 ** 31) | 0, now: Date.now() }) },
    downloadName: (date) => `late-fees-${date}.txt`,
    words: {
      button: { text: 'SETUP', aria: 'Setup', className: 'setup-open' },
      title: 'SETUP',
      className: 'setup',
      closeText: 'EJECT ⏏',
      headingClass: 'panel-sub',
      reduceMotion: 'REDUCE MOTION (NO TRACKING NOISE)',
      saveHeading: 'SAVE CODE (KEPT ON THIS DEVICE ONLY)',
      dangerHeading: 'DANGER',
    },
  });
  return { button: settings.button, dialog: settings.dialog, render: settings.render };
}
