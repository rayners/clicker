/**
 * Modal dialogs: labelled, closed by a button or Escape, with focus moved in on opening and back on closing.
 * @module
 */
import { h, setText } from './dom';

let dialogs = 0;

/** What a dialog is called and how it closes. */
export interface DialogOptions {
  title: string;
  /** Names its parts: `<class>`, `<class>-box`, `<class>-head`, `<class>-title` and `<class>-close`. */
  className: string;
  /** A class for the title in place of `<class>-title` (a game's shared heading style). */
  titleClass?: string;
  /** The close button's text, in the game's own words; its accessible name stays "Close". */
  closeText?: string;
  /** False for a choice that must be made: no close button, and Escape does nothing. */
  closable?: boolean;
  /** Called whenever it closes. */
  onClose?(): void;
}

/** A modal dialog. Put its content in `body`, and add `el` to the page once. */
export function createDialog(options: DialogOptions): {
  el: HTMLElement;
  body: HTMLElement;
  open(): void;
  close(): void;
  /** Open or close it to match the game's state (a dialog the game, not the player, opens). */
  set(open: boolean): void;
  isOpen(): boolean;
  setTitle(title: string): void;
} {
  const cls = options.className;
  const closable = options.closable ?? true;
  const titleId = `dialog-title-${++dialogs}`;
  const close = h('button', { class: `${cls}-close`, type: 'button', 'aria-label': 'Close' }, options.closeText ?? '✕');
  const title = h('h2', { class: options.titleClass ?? `${cls}-title`, id: titleId }, options.title);
  const head = h('div', { class: `${cls}-head` }, title);
  if (closable) head.append(close);
  const body = h('div', { class: `${cls}-box` }, head);
  const el = h('div', { class: cls, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, hidden: true }, body);
  let opener: Element | null = null;

  const open = () => {
    if (!el.hidden) return;
    opener = document.activeElement;
    el.hidden = false;
    if (closable) close.focus();
  };
  const shut = () => {
    if (el.hidden) return;
    el.hidden = true;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    opener = null;
    options.onClose?.();
  };
  close.addEventListener('click', shut);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && closable) shut();
  });

  return { el, body, open, close: shut, set: (o) => (o ? open() : shut()), isOpen: () => !el.hidden, setTitle: (text) => setText(title, text) };
}
