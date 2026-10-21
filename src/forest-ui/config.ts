import { h, setText } from '../shared/ui/dom';
import { createOptOut } from '../shared/telemetry';
import { forestSaves } from '../forest/save';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';

const CONFIRM_TIMEOUT_MS = 5000;

/** Settings and the save book: reduce motion, export/import, and a fresh charter. */
export function createConfig(store: ForestStore): { button: HTMLButtonElement; dialog: HTMLElement; render(game: ForestGame): void } {
  const button = h('button', { class: 'cfg-open', type: 'button', 'aria-label': 'Configuration' }, '⚙');
  const motion = h('input', { type: 'checkbox', id: 'ed-motion' });
  const share = h('input', { type: 'checkbox', id: 'ed-share' });
  const code = h('textarea', { class: 'cfg-code', rows: 4, spellcheck: 'false', 'aria-label': 'Save code' });
  const status = h('p', { class: 'cfg-status', role: 'status' });
  const exportButton = h('button', { class: 'buy', type: 'button' }, 'EXPORT');
  const copyButton = h('button', { class: 'buy', type: 'button' }, 'COPY');
  const importButton = h('button', { class: 'buy', type: 'button' }, 'IMPORT');
  const reset = h('button', { class: 'buy cfg-danger', type: 'button', 'aria-label': 'Start a new charter' }, 'START A NEW CHARTER');
  const close = h('button', { class: 'cfg-close', type: 'button', 'aria-label': 'Close' }, '✕');
  // Play as the forest: the ledger turned over (docs/HORROR-TIER.md).
  const listen = h('button', { class: 'buy', type: 'button', 'aria-label': 'Listen to the wood' }, 'LISTEN TO THE WOOD');
  const dialog = h(
    'div',
    { class: 'cfg', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ed-cfg-title', hidden: true },
    h(
      'div',
      { class: 'cfg-box' },
      h('div', { class: 'cfg-head' }, h('h2', { class: 'panel-title', id: 'ed-cfg-title' }, 'Configuration'), close),
      h('label', { class: 'cfg-toggle', for: 'ed-motion' }, motion, ' REDUCE MOTION'),
      h('label', { class: 'cfg-toggle', for: 'ed-share' }, share, ' SHARE ANONYMOUS PLAY DATA'),
      h('p', { class: 'cfg-note' }, 'MILESTONES AND ERRORS ONLY. NO COOKIES, NO PERSONAL DATA.'),
      h('h3', { class: 'panel-subtitle' }, 'THE SAVE BOOK (KEPT ON THIS DEVICE ONLY)'),
      code,
      h('div', { class: 'cfg-row' }, exportButton, copyButton, importButton),
      status,
      h('h3', { class: 'panel-subtitle' }, 'THE WOOD'),
      listen,
      h('h3', { class: 'panel-subtitle' }, 'BURN THE LEDGER'),
      reset,
    ),
  );

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
  listen.addEventListener('click', () => {
    store.dispatch({ type: 'startWood', seed: (Math.random() * 2 ** 31) | 0 });
    show(false);
  });
  motion.addEventListener('change', () => store.dispatch({ type: 'setSetting', key: 'reducedMotion', value: motion.checked }));
  exportButton.addEventListener('click', () => {
    code.value = forestSaves.exportSave(store.getState());
    code.select();
    setText(status, 'SAVE CODE WRITTEN. KEEP IT SOMEWHERE SAFE.');
  });
  copyButton.addEventListener('click', () => {
    if (!code.value) code.value = forestSaves.exportSave(store.getState());
    navigator.clipboard?.writeText(code.value).then(
      () => setText(status, 'COPIED.'),
      () => setText(status, 'COPY FAILED. SELECT THE CODE AND COPY BY HAND.'),
    );
  });
  importButton.addEventListener('click', () => {
    try {
      store.replace({ ...forestSaves.importSave(code.value), savedAt: Date.now() });
      setText(status, 'SAVE IMPORTED.');
    } catch {
      setText(status, 'THAT IS NOT A SAVE CODE. NOTHING CHANGED.');
    }
  });

  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  reset.addEventListener('click', () => {
    if (!pending) {
      pending = true;
      setText(reset, 'CONFIRM: BURN IT ALL');
      reset.setAttribute('aria-label', 'Confirm: start a new charter, losing this one');
      timer = setTimeout(() => {
        pending = false;
        setText(reset, 'START A NEW CHARTER');
        reset.setAttribute('aria-label', 'Start a new charter');
      }, CONFIRM_TIMEOUT_MS);
      return;
    }
    pending = false;
    clearTimeout(timer);
    setText(reset, 'START A NEW CHARTER');
    reset.setAttribute('aria-label', 'Start a new charter');
    store.dispatch({ type: 'hardReset', seed: (Math.random() * 2 ** 31) | 0, now: Date.now() });
    show(false);
  });

  return {
    button,
    dialog,
    render(game) {
      motion.checked = game.profile.settings.reducedMotion;
    },
  };
}
