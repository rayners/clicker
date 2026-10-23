/**
 * A masthead button opening a dialog of doors to a game's other tiers.
 * @module
 */
import { createDialog } from './dialog';
import { h, setAttr, setText } from './dom';

/** One door: a play-as-the-horror tier or another side of a game, with what it says now and what it opens. */
export interface Door<S> {
  /** A line under the door, in the game's own voice. */
  describe: string;
  /** `secret`: say nothing about what is behind it, not even its line. */
  render(s: S): { text: string; aria: string; disabled: boolean; secret?: boolean };
  onOpen(s: S): void;
}

/**
 * The doors to a game's other sides, behind their own masthead button rather than in the settings beside hard reset.
 * A closed door says what opens it.
 */
export function createDoors<S>(options: {
  button: { text: string; aria: string; className: string };
  title: string;
  doors: readonly Door<S>[];
}): { button: HTMLButtonElement; dialog: HTMLElement; render(s: S): void } {
  const button = h('button', { class: options.button.className, type: 'button', 'aria-label': options.button.aria }, options.button.text) as HTMLButtonElement;
  const dialog = createDialog({ title: options.title, className: 'doors' });
  let last: S | null = null;
  const rows = options.doors.map((door) => {
    const b = h('button', { class: 'doors-door', type: 'button' }) as HTMLButtonElement;
    b.addEventListener('click', () => {
      if (!last) return;
      dialog.close();
      door.onOpen(last);
    });
    const desc = h('p', { class: 'doors-desc' }, door.describe);
    return { door, b, desc, el: h('li', { class: 'doors-row' }, b, desc) };
  });
  dialog.body.append(h('ul', { class: 'doors-list' }, ...rows.map((r) => r.el)));
  button.addEventListener('click', dialog.open);

  function render(s: S) {
    last = s;
    for (const r of rows) {
      const view = r.door.render(s);
      setText(r.b, view.text);
      setAttr(r.b, 'aria-label', view.aria);
      r.b.disabled = view.disabled;
      r.desc.hidden = !!view.secret;
    }
  }

  return { button, dialog: dialog.el, render };
}
