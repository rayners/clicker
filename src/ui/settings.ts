import type { GameState } from '../core/game';
import { exportSave, importSave } from '../core/save';
import type { Store } from '../core/store';
import { h, setText } from '../shared/ui/dom';
import { createOptOut } from '../shared/telemetry';

const CONFIRM_TIMEOUT_MS = 5000;

export function createSettings(store: Store): { button: HTMLButtonElement; dialog: HTMLElement; render(game: GameState): void } {
  const button = h('button', { class: 'cfg-open', type: 'button', 'aria-label': 'System configuration' }, 'CFG');

  const sound = h('input', { type: 'checkbox', id: 'cfg-sound' });
  const motion = h('input', { type: 'checkbox', id: 'cfg-motion' });
  const share = h('input', { type: 'checkbox', id: 'cfg-share' });
  const code = h('textarea', { class: 'cfg-code', id: 'cfg-code', rows: 4, spellcheck: 'false', 'aria-label': 'Save code' });
  const status = h('p', { class: 'cfg-status', role: 'status' });
  const exportButton = h('button', { class: 'buy', type: 'button' }, 'EXPORT');
  const copyButton = h('button', { class: 'buy', type: 'button' }, 'COPY');
  const downloadButton = h('button', { class: 'buy', type: 'button' }, 'DOWNLOAD');
  const importButton = h('button', { class: 'buy', type: 'button' }, 'IMPORT');
  const resetButton = h('button', { class: 'buy cfg-danger', type: 'button' }, 'HARD RESET');
  const reassignButton = h('button', { class: 'buy', type: 'button' }, 'REQUEST REASSIGNMENT');
  const close = h('button', { class: 'cfg-close', type: 'button', 'aria-label': 'Close' }, 'X');
  // Play as the creature (docs/HORROR-TIER.md).
  const specialOrder = h('button', { class: 'buy cfg-danger', type: 'button', 'aria-label': 'Accept Special Order 0-77' }, 'SPECIAL ORDER 0-77: ACCEPT');

  const dialog = h(
    'div',
    { class: 'cfg', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cfg-title', hidden: true },
    h(
      'div',
      { class: 'cfg-box' },
      h('div', { class: 'cfg-head' }, h('h2', { class: 'panel-title', id: 'cfg-title' }, 'SYSTEM CONFIGURATION'), close),
      h('label', { class: 'cfg-toggle', for: 'cfg-sound' }, sound, ' SOUND'),
      h('label', { class: 'cfg-toggle', for: 'cfg-motion' }, motion, ' REDUCE MOTION'),
      h('label', { class: 'cfg-toggle', for: 'cfg-share' }, share, ' SHARE ANONYMOUS PLAY DATA'),
      h('p', { class: 'cfg-note' }, 'MILESTONES AND ERRORS ONLY. NO COOKIES, NO PERSONAL DATA.'),
      h('h3', { class: 'panel-subtitle' }, 'SAVE DATA (STORED ON THIS DEVICE ONLY)'),
      code,
      h('div', { class: 'cfg-row' }, exportButton, copyButton, downloadButton, importButton),
      status,
      h('h3', { class: 'panel-subtitle' }, 'CONTRACT'),
      reassignButton,
      h('h3', { class: 'panel-subtitle' }, 'RESTRICTED'),
      specialOrder,
      h('h3', { class: 'panel-subtitle' }, 'DANGER'),
      resetButton,
    ),
  );

  let resetPending = false;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  let reassignPending = false;
  let reassignTimer: ReturnType<typeof setTimeout> | undefined;

  const show = (open: boolean) => {
    dialog.hidden = !open;
    setText(status, '');
    if (open) close.focus();
  };
  button.addEventListener('click', () => show(true));
  close.addEventListener('click', () => show(false));
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') show(false);
  });

  const optOut = createOptOut(window.localStorage);
  share.checked = optOut.sharing();
  share.addEventListener('change', () => optOut.setSharing(share.checked));
  sound.addEventListener('change', () => store.dispatch({ type: 'setSetting', key: 'sound', value: sound.checked }));
  motion.addEventListener('change', () => store.dispatch({ type: 'setSetting', key: 'reducedMotion', value: motion.checked }));

  exportButton.addEventListener('click', () => {
    code.value = exportSave(store.getState());
    code.select();
    setText(status, 'SAVE CODE GENERATED. KEEP IT SOMEWHERE SAFE.');
  });
  copyButton.addEventListener('click', () => {
    if (!code.value) code.value = exportSave(store.getState());
    navigator.clipboard?.writeText(code.value).then(
      () => setText(status, 'COPIED TO CLIPBOARD.'),
      () => setText(status, 'COPY FAILED. SELECT THE CODE AND COPY MANUALLY.'),
    );
  });
  downloadButton.addEventListener('click', () => {
    const text = exportSave(store.getState());
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = h('a', { href: url, download: `deep-contract-${new Date().toISOString().slice(0, 10)}.txt` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  importButton.addEventListener('click', () => {
    try {
      store.replace({ ...importSave(code.value), savedAt: Date.now() });
      setText(status, 'SAVE IMPORTED.');
    } catch {
      setText(status, 'INVALID SAVE CODE. NOTHING CHANGED.');
    }
  });
  resetButton.addEventListener('click', () => {
    if (!resetPending) {
      resetPending = true;
      setText(resetButton, 'CONFIRM: ERASE EVERYTHING');
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        resetPending = false;
        setText(resetButton, 'HARD RESET');
      }, CONFIRM_TIMEOUT_MS);
      return;
    }
    resetPending = false;
    clearTimeout(resetTimer);
    setText(resetButton, 'HARD RESET');
    store.dispatch({ type: 'hardReset', seed: (Math.random() * 2 ** 31) | 0, now: Date.now() });
    show(false);
  });

  reassignButton.addEventListener('click', () => {
    if (!reassignPending) {
      reassignPending = true;
      setText(reassignButton, 'CONFIRM: ABANDON THIS CONTRACT?');
      clearTimeout(reassignTimer);
      reassignTimer = setTimeout(() => {
        reassignPending = false;
        setText(reassignButton, 'REQUEST REASSIGNMENT');
      }, CONFIRM_TIMEOUT_MS);
      return;
    }
    reassignPending = false;
    clearTimeout(reassignTimer);
    setText(reassignButton, 'REQUEST REASSIGNMENT');
    store.dispatch({ type: 'requestReassignment' });
    show(false);
  });

  specialOrder.addEventListener('click', () => {
    store.dispatch({ type: 'startCreature', seed: (Math.random() * 2 ** 31) | 0 });
    show(false);
  });

  function render(game: GameState) {
    setText(specialOrder, game.creature ? 'SPECIAL ORDER 0-77: RESUME' : 'SPECIAL ORDER 0-77: ACCEPT');
    sound.checked = game.profile.settings.sound;
    motion.checked = game.profile.settings.reducedMotion;
  }

  return { button, dialog, render };
}
