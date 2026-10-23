import type { GameState } from '../core/game';
import { exportSave, importSave } from '../core/save';
import type { Store } from '../core/store';
import { createConfirmButton } from '../engine/ui/confirm';
import { createSettings as createEngineSettings } from '../engine/ui/settings';

export function createSettings(store: Store): { button: HTMLButtonElement; dialog: HTMLElement; render(game: GameState): void } {
  // Giving up the contract in hand earns nothing, so it takes a second tap.
  const reassign = createConfirmButton({
    className: 'buy',
    onConfirm: () => {
      store.dispatch({ type: 'requestReassignment' });
      settings.close();
    },
  });
  reassign.label('Request reassignment', 'REQUEST REASSIGNMENT');
  const settings = createEngineSettings<GameState>({
    store,
    saves: { exportSave, importSave },
    settings: (game) => game.profile.settings,
    setSetting: (key, value) => store.dispatch({ type: 'setSetting', key, value }),
    reset: { text: 'HARD RESET', aria: 'Hard reset', onConfirm: () => store.dispatch({ type: 'hardReset', seed: (Math.random() * 2 ** 31) | 0, now: Date.now() }) },
    downloadName: (date) => `deep-contract-${date}.txt`,
    sections: [{ heading: 'CONTRACT', content: [reassign.el] }],
    words: {
      button: { text: 'CFG', aria: 'System configuration', className: 'cfg-open' },
      title: 'SYSTEM CONFIGURATION',
      closeText: 'X',
      saveHeading: 'SAVE DATA (STORED ON THIS DEVICE ONLY)',
      dangerHeading: 'DANGER',
      exported: 'SAVE CODE GENERATED. KEEP IT SOMEWHERE SAFE.',
      copied: 'COPIED TO CLIPBOARD.',
      copyFailed: 'COPY FAILED. SELECT THE CODE AND COPY MANUALLY.',
      notASave: 'INVALID SAVE CODE. NOTHING CHANGED.',
    },
  });
  return {
    button: settings.button,
    dialog: settings.dialog,
    render(game) {
      settings.render(game);
      reassign.el.disabled = !!game.assigning;
    },
  };
}
