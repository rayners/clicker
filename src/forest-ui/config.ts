import { createConfirmButton } from '../engine/ui/confirm';
import { createSettings } from '../engine/ui/settings';
import { isKeepUnlocked, KEEP_UNLOCK_CHARTERS } from '../forest/charter';
import { forestSaves } from '../forest/save';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';

/** Settings and the save book: sound, reduce motion, export/import, the charter's site, and a fresh charter. */
export function createConfig(store: ForestStore): { button: HTMLButtonElement; dialog: HTMLElement; render(game: ForestGame): void } {
  const elsewhere = (game: ForestGame) => (game.company.site === 'keep' ? 'forest' : 'keep');
  // Morrowgate Keep instead of the forest (docs/MISSIONS.md): tears up the charter in hand, earning nothing for it.
  const rewrite = createConfirmButton({
    className: 'buy',
    onConfirm: () => store.dispatch({ type: 'rewriteCharter', site: elsewhere(store.getState()), seed: (Math.random() * 2 ** 31) | 0 }),
  });
  const settings = createSettings<ForestGame>({
    store,
    saves: forestSaves,
    settings: (game) => game.profile.settings,
    setSetting: (key, value) => store.dispatch({ type: 'setSetting', key, value }),
    reset: { text: 'START A NEW CHARTER', aria: 'Start a new charter', onConfirm: () => store.dispatch({ type: 'hardReset', seed: (Math.random() * 2 ** 31) | 0, now: Date.now() }) },
    downloadName: (date) => `elderdark-${date}.txt`,
    sections: [{ heading: 'THE CHARTER', content: [rewrite.el] }],
    words: {
      button: { text: '⚙', aria: 'Configuration', className: 'cfg-open' },
      title: 'Configuration',
      saveHeading: 'THE SAVE BOOK (KEPT ON THIS DEVICE ONLY)',
      dangerHeading: 'BURN THE LEDGER',
      copyFailed: 'COPY FAILED. SELECT THE CODE AND COPY BY HAND.',
    },
  });
  return {
    button: settings.button,
    dialog: settings.dialog,
    render(game) {
      settings.render(game);
      const place = elsewhere(game) === 'keep' ? 'Morrowgate Keep' : 'the forest';
      // Closed sites say what opens them.
      const closed = elsewhere(game) === 'keep' && !isKeepUnlocked(game.profile);
      rewrite.el.disabled = closed;
      const after = closed ? ` · AFTER ${KEEP_UNLOCK_CHARTERS} CHARTER${KEEP_UNLOCK_CHARTERS === 1 ? '' : 'S'}` : '';
      rewrite.label(`Write a charter for ${place}`, `WRITE A CHARTER FOR ${place.toUpperCase()}${after}`);
    },
  };
}
