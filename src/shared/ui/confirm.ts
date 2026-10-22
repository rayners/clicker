import { h, setAttr, setText } from './dom';

/** A button for something that cannot be undone: the first tap asks, the second acts, and the ask lapses. */
export function createConfirmButton(options: { className: string; onConfirm(): void; timeoutMs?: number }) {
  const el = h('button', { class: options.className, type: 'button' });
  let aria = '';
  let text = '';
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const show = () => {
    const lower = aria.charAt(0).toLowerCase() + aria.slice(1);
    setText(el, pending ? `CONFIRM: ${text}` : text);
    setAttr(el, 'aria-label', pending ? `Confirm: ${lower}` : aria);
  };
  el.addEventListener('click', () => {
    clearTimeout(timer);
    if (!pending) {
      pending = true;
      timer = setTimeout(() => {
        pending = false;
        show();
      }, options.timeoutMs ?? 5000);
      show();
      return;
    }
    pending = false;
    show();
    options.onConfirm();
  });
  return {
    el,
    /** Set what it says; kept while a confirmation is pending. */
    label(nextAria: string, nextText: string) {
      aria = nextAria;
      text = nextText;
      show();
    },
  };
}
