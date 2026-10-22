import { nextStep, type GuideRules, type GuideStep, type createGuideProgress } from '../guide';
import { h, setText } from './dom';

const TARGET_CLASS = 'guide-target';

/**
 * The walkthrough on screen: one small tip at a time, never blocking play, pointing at the control it describes;
 * and a "how this works" page with the scenario's rules, a tap away at any time.
 */
export function createGuideView<S>(options: {
  steps(s: S): readonly GuideStep<S>[];
  rules(s: S): GuideRules;
  progress: ReturnType<typeof createGuideProgress>;
}): { el: HTMLElement; rulesButton: HTMLButtonElement; rulesDialog: HTMLElement; render(s: S): void } {
  const title = h('h3', { class: 'guide-title' });
  const text = h('p', { class: 'guide-text' });
  const ok = h('button', { class: 'guide-ok', type: 'button', 'aria-label': 'Got it' }, 'GOT IT');
  const skip = h('button', { class: 'guide-skip', type: 'button', 'aria-label': 'Skip guide' }, 'SKIP GUIDE');
  // Laid out as a small grid (title and skip on top, the text and "got it" side by side) so it stays short on a phone.
  const el = h('section', { class: 'guide', 'aria-label': 'Guide', hidden: true }, title, skip, text, ok);

  const rulesButton = h('button', { class: 'guide-rules-open', type: 'button', 'aria-label': 'How this works' }, '?');
  const rulesTitle = h('h2', { class: 'guide-rules-title', id: 'guide-rules-title' });
  const rulesBody = h('div', { class: 'guide-rules-body' });
  const close = h('button', { class: 'guide-rules-close', type: 'button', 'aria-label': 'Close' }, '✕');
  const rulesDialog = h(
    'div',
    { class: 'guide-rules', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'guide-rules-title', hidden: true },
    h('div', { class: 'guide-rules-box' }, h('div', { class: 'guide-rules-head' }, rulesTitle, close), rulesBody),
  );

  let current: GuideStep<S> | null = null;
  let last: S | null = null;
  let marked: Element | null = null;
  const mark = (selector?: string) => {
    const next = selector ? document.querySelector(selector) : null;
    if (next === marked) return;
    marked?.classList.remove(TARGET_CLASS);
    next?.classList.add(TARGET_CLASS);
    marked = next;
  };

  ok.addEventListener('click', () => {
    if (current) options.progress.see(current.id);
    if (last) render(last);
  });
  skip.addEventListener('click', () => {
    options.progress.skip();
    if (last) render(last);
  });
  let shownRules = '';
  rulesButton.addEventListener('click', () => {
    rulesDialog.hidden = false;
    close.focus();
  });
  close.addEventListener('click', () => (rulesDialog.hidden = true));
  rulesDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') rulesDialog.hidden = true;
  });

  function render(s: S) {
    last = s;
    const rules = options.rules(s);
    if (rules.title !== shownRules) {
      shownRules = rules.title;
      setText(rulesTitle, rules.title);
      rulesBody.replaceChildren(...rules.sections.flatMap((x) => [h('h3', { class: 'guide-rules-heading' }, x.heading), h('p', { class: 'guide-rules-text' }, x.text)]));
    }
    // A step the player has just done counts as seen, so it never comes back.
    if (current && current.done(s)) options.progress.see(current.id);
    current = options.progress.skipped() ? null : nextStep(options.steps(s), s, options.progress.seen());
    el.hidden = !current;
    mark(current?.target);
    if (!current) return;
    setText(title, current.title);
    setText(text, current.text);
  }

  return { el, rulesButton, rulesDialog, render };
}
