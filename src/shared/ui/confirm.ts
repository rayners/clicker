import { h, setAttr, setText } from './dom';

/** A confirming tap this soon after the first is ignored: a double tap (or a phone's doubled click) must not act. */
export const CONFIRM_GAP_MS = 400;

/** Whether a confirming tap at `now` comes long enough after the arming tap at `armedAt`. */
export const confirmedInTime = (armedAt: number, now: number = Date.now()): boolean => now - armedAt >= CONFIRM_GAP_MS;

/** A button for something that cannot be undone: the first tap asks, the second acts, and the ask lapses. */
export function createConfirmButton(options: { className: string; onConfirm(): void; timeoutMs?: number }) {
  const el = h('button', { class: options.className, type: 'button' });
  let aria = '';
  let text = '';
  let pending = false;
  let armedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const show = () => {
    const lower = aria.charAt(0).toLowerCase() + aria.slice(1);
    setText(el, pending ? `CONFIRM: ${text}` : text);
    setAttr(el, 'aria-label', pending ? `Confirm: ${lower}` : aria);
  };
  el.addEventListener('click', () => {
    if (pending && !confirmedInTime(armedAt)) return;
    clearTimeout(timer);
    if (!pending) {
      pending = true;
      armedAt = Date.now();
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
