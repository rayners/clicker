/**
 * The settings dialog every game shares: sound, reduced motion, the telemetry opt-out, the About page, the save
 * code, sections of the game's own, and a reset that takes two taps.
 * @module
 */
import type { SaveSystem } from '../save';
import type { Store } from '../store';
import { createOptOut } from '../telemetry';
import { createConfirmButton } from './confirm';
import { createDialog } from './dialog';
import { aboutLink, h, setText } from './dom';

/** Settings every game keeps in its profile. */
export interface PlayerSettings {
  sound: boolean;
  reducedMotion: boolean;
}

/** What the dialog says, in the game's own voice. Every field has a plain default. */
export interface SettingsWords {
  button: { text: string; aria: string; className: string };
  title: string;
  /** The dialog's class (its parts are named after it) and the class for its title. */
  className: string;
  titleClass: string;
  /** The class for its section headings. */
  headingClass: string;
  closeText?: string;
  sound: string;
  reduceMotion: string;
  share: string;
  shareNote: string;
  saveHeading: string;
  dangerHeading: string;
  exported: string;
  copied: string;
  copyFailed: string;
  imported: string;
  notASave: string;
}

const DEFAULT_WORDS: SettingsWords = {
  button: { text: '⚙', aria: 'Settings', className: 'cfg-open' },
  title: 'Settings',
  className: 'cfg',
  titleClass: 'panel-title',
  headingClass: 'panel-subtitle',
  sound: 'SOUND',
  reduceMotion: 'REDUCE MOTION',
  share: 'SHARE ANONYMOUS PLAY DATA',
  shareNote: 'MILESTONES AND ERRORS ONLY. NO COOKIES, NO PERSONAL DATA.',
  saveHeading: 'SAVE (KEPT ON THIS DEVICE ONLY)',
  dangerHeading: 'START OVER',
  exported: 'SAVE CODE WRITTEN. KEEP IT SOMEWHERE SAFE.',
  copied: 'COPIED.',
  copyFailed: 'COPY FAILED. SELECT THE CODE AND COPY IT BY HAND.',
  imported: 'SAVE IMPORTED.',
  notASave: 'THAT IS NOT A SAVE CODE. NOTHING CHANGED.',
};

/** How a game fills its settings dialog. */
export interface SettingsOptions<G> {
  store: Store<G, never> | Store<G, any>;
  saves: Pick<SaveSystem<G>, 'exportSave' | 'importSave'>;
  settings(game: G): PlayerSettings;
  setSetting(key: keyof PlayerSettings, value: boolean): void;
  /** The two-tap reset: what it says, and what it does. */
  reset: { text: string; aria: string; onConfirm(): void };
  /** False for a game with no sound. */
  sound?: boolean;
  /** The name the save code is downloaded under (default `save-<date>.txt`). */
  downloadName?(date: string): string;
  /** Sections of the game's own, between the save and the reset (another contract, another site). */
  sections?: readonly { heading: string; content: readonly HTMLElement[] }[];
  /** Where the About link goes and what it says (default: this site's About page and tip jar), or false for none. */
  about?: { href: string; text: string } | false;
  words?: Partial<SettingsWords>;
}

let instances = 0;

/** A settings button for the masthead and the dialog it opens; `render` keeps the switches in step with the game. */
export function createSettings<G extends { savedAt: number }>(
  options: SettingsOptions<G>,
): { button: HTMLButtonElement; dialog: HTMLElement; render(game: G): void; close(): void } {
  const w = { ...DEFAULT_WORDS, ...options.words };
  const id = `settings-${++instances}`;
  const { store, saves } = options;
  const button = h('button', { class: w.button.className, type: 'button', 'aria-label': w.button.aria }, w.button.text);
  const status = h('p', { class: `${w.className}-status`, role: 'status' });
  const dialog = createDialog({ title: w.title, className: w.className, titleClass: w.titleClass, closeText: w.closeText, onClose: () => setText(status, '') });
  button.addEventListener('click', dialog.open);

  const toggle = (key: string, text: string) => {
    const input = h('input', { type: 'checkbox', id: `${id}-${key}` });
    return { input, el: h('label', { class: `${w.className}-toggle`, for: `${id}-${key}` }, input, ` ${text}`) };
  };
  const sound = toggle('sound', w.sound);
  const motion = toggle('motion', w.reduceMotion);
  const share = toggle('share', w.share);
  sound.input.addEventListener('change', () => options.setSetting('sound', sound.input.checked));
  motion.input.addEventListener('change', () => options.setSetting('reducedMotion', motion.input.checked));
  const optOut = createOptOut(window.localStorage);
  share.input.checked = optOut.sharing();
  share.input.addEventListener('change', () => optOut.setSharing(share.input.checked));

  const code = h('textarea', { class: `${w.className}-code`, rows: 4, spellcheck: 'false', 'aria-label': 'Save code' });
  const action = (text: string, run: () => void) => {
    const b = h('button', { class: 'buy', type: 'button' }, text);
    b.addEventListener('click', run);
    return b;
  };
  const exported = () => saves.exportSave(store.getState());
  const buttons = [
    action('EXPORT', () => {
      code.value = exported();
      code.select();
      setText(status, w.exported);
    }),
    action('COPY', () => {
      if (!code.value) code.value = exported();
      navigator.clipboard?.writeText(code.value).then(
        () => setText(status, w.copied),
        () => setText(status, w.copyFailed),
      );
    }),
  ];
  const name = options.downloadName ?? ((date: string) => `save-${date}.txt`);
  buttons.push(
    action('DOWNLOAD', () => {
      const url = URL.createObjectURL(new Blob([exported()], { type: 'text/plain' }));
      h('a', { href: url, download: name(new Date().toISOString().slice(0, 10)) }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }),
    action('IMPORT', () => {
      try {
        store.replace({ ...saves.importSave(code.value), savedAt: Date.now() });
        setText(status, w.imported);
      } catch {
        setText(status, w.notASave);
      }
    }),
  );

  // Starting over is for good, so it takes a second, unhurried tap.
  const reset = createConfirmButton({
    className: `buy ${w.className}-danger`,
    onConfirm: () => {
      options.reset.onConfirm();
      dialog.close();
    },
  });
  reset.label(options.reset.aria, options.reset.text);

  const heading = (text: string) => h('h3', { class: w.headingClass }, text);
  dialog.body.append(
    ...(options.sound === false ? [] : [sound.el]),
    motion.el,
    share.el,
    h('p', { class: `${w.className}-note` }, w.shareNote),
    ...(options.about === false
      ? []
      : [options.about ? h('a', { class: `${w.className}-about`, href: options.about.href }, options.about.text) : aboutLink(`${w.className}-about`)]),
    heading(w.saveHeading),
    code,
    h('div', { class: `${w.className}-row` }, ...buttons),
    status,
    ...(options.sections ?? []).flatMap((s) => [heading(s.heading), ...s.content]),
    heading(w.dangerHeading),
    reset.el,
  );

  return {
    button,
    dialog: dialog.el,
    close: dialog.close,
    render(game) {
      const s = options.settings(game);
      sound.input.checked = s.sound;
      motion.input.checked = s.reducedMotion;
    },
  };
}
