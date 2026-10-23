import { aboutLink, h, setText } from '../shared/ui/dom';
import { createOptOut } from '../shared/telemetry';
import { lateSaves } from '../late-fees/save';
import type { LateGame } from '../late-fees/game';
import type { LateStore } from '../late-fees/store';

const CONFIRM_TIMEOUT_MS = 5000;

/** The VCR's SETUP menu: sound, motion, analytics, the save code, and erasing the tape. */
export function createSetup(store: LateStore): { button: HTMLButtonElement; dialog: HTMLElement; render(game: LateGame): void } {
  const button = h('button', { class: 'setup-open', type: 'button', 'aria-label': 'Setup' }, 'SETUP');
  const sound = h('input', { type: 'checkbox', id: 'lf-sound' });
  const motion = h('input', { type: 'checkbox', id: 'lf-motion' });
  const share = h('input', { type: 'checkbox', id: 'lf-share' });
  const code = h('textarea', { class: 'setup-code', rows: 4, spellcheck: 'false', 'aria-label': 'Save code' });
  const status = h('p', { class: 'setup-status', role: 'status' });
  const exportButton = h('button', { class: 'buy', type: 'button' }, 'EXPORT');
  const importButton = h('button', { class: 'buy', type: 'button' }, 'IMPORT');
  const erase = h('button', { class: 'buy setup-danger', type: 'button', 'aria-label': 'Erase the tape' }, 'ERASE TAPE');
  const close = h('button', { class: 'setup-close', type: 'button', 'aria-label': 'Close' }, 'EJECT ⏏');
  const dialog = h(
    'div',
    { class: 'setup', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lf-setup-title', hidden: true },
    h(
      'div',
      { class: 'setup-box' },
      h('div', { class: 'setup-head' }, h('h2', { class: 'panel-title', id: 'lf-setup-title' }, 'SETUP'), close),
      h('label', { class: 'setup-toggle', for: 'lf-sound' }, sound, ' SOUND'),
      h('label', { class: 'setup-toggle', for: 'lf-motion' }, motion, ' REDUCE MOTION (NO TRACKING NOISE)'),
      h('label', { class: 'setup-toggle', for: 'lf-share' }, share, ' SHARE ANONYMOUS PLAY DATA'),
      h('p', { class: 'setup-note' }, 'MILESTONES AND ERRORS ONLY. NO COOKIES, NO PERSONAL DATA.'),
      aboutLink('setup-about'),
      h('h3', { class: 'panel-sub' }, 'SAVE CODE (KEPT ON THIS DEVICE ONLY)'),
      code,
      h('div', { class: 'setup-row' }, exportButton, importButton),
      status,
      h('h3', { class: 'panel-sub' }, 'DANGER'),
      erase,
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
  motion.addEventListener('change', () => store.dispatch({ type: 'setSetting', key: 'reducedMotion', value: motion.checked }));
  sound.addEventListener('change', () => store.dispatch({ type: 'setSetting', key: 'sound', value: sound.checked }));
  exportButton.addEventListener('click', () => {
    code.value = lateSaves.exportSave(store.getState());
    code.select();
    setText(status, 'SAVE CODE WRITTEN. KEEP IT SOMEWHERE SAFE.');
  });
  importButton.addEventListener('click', () => {
    try {
      store.replace({ ...lateSaves.importSave(code.value), savedAt: Date.now() });
      setText(status, 'SAVE IMPORTED.');
    } catch {
      setText(status, 'THAT IS NOT A SAVE CODE. NOTHING CHANGED.');
    }
  });
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  erase.addEventListener('click', () => {
    if (!pending) {
      pending = true;
      setText(erase, 'CONFIRM: ERASE EVERYTHING');
      erase.setAttribute('aria-label', 'Confirm: erase the tape and the whole franchise');
      timer = setTimeout(() => {
        pending = false;
        setText(erase, 'ERASE TAPE');
        erase.setAttribute('aria-label', 'Erase the tape');
      }, CONFIRM_TIMEOUT_MS);
      return;
    }
    pending = false;
    clearTimeout(timer);
    setText(erase, 'ERASE TAPE');
    store.dispatch({ type: 'hardReset', seed: (Math.random() * 2 ** 31) | 0, now: Date.now() });
    show(false);
  });
  return {
    button,
    dialog,
    render(game) {
      motion.checked = game.profile.settings.reducedMotion;
      sound.checked = game.profile.settings.sound;
    },
  };
}
