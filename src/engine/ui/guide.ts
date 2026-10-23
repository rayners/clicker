/**
 * The one-line walkthrough tip and the rules page.
 * @module
 */
import { nextStep, type GuideRules, type GuideStep, type createGuideProgress } from '../guide';
import { h, setText } from './dom';
import { announce } from '../telemetry';

const TARGET_CLASS = 'guide-target';
/** A page can hold more than one guide (a game and its horror tier); each rules page needs its own title id. */
let views = 0;

/**
 * The walkthrough on screen: one small tip at a time, never blocking play, pointing at the control it describes;
 * and a "how this works" page with the scenario's rules, a tap away at any time.
 */
export function createGuideView<S>(options: {
  steps(s: S): readonly GuideStep<S>[];
  rules(s: S): GuideRules;
  progress: ReturnType<typeof createGuideProgress>;
}): { el: HTMLElement; rulesButton: HTMLButtonElement; rulesDialog: HTMLElement; render(s: S): void } {
  const tipId = `guide-tip-${views + 1}`;
  const title = h('span', { class: 'guide-title', id: `${tipId}-title` });
  const textId = `${tipId}-text`;
  const text = h('span', { class: 'guide-text', id: textId });
  // One line (the title and the start of the tip) until tapped, so it never crowds a phone; tapping opens the rest.
  // Its name never repeats the control it describes (tips are often titled after it); the tip is its description.
  const line = h('button', { class: 'guide-line', type: 'button', 'aria-expanded': 'false', 'aria-label': 'Show the tip', 'aria-describedby': `${tipId}-title ${textId}` }, title, text);
  const ok = h('button', { class: 'guide-ok', type: 'button', 'aria-label': 'Got it' }, 'GOT IT');
  const skip = h('button', { class: 'guide-skip', type: 'button', 'aria-label': 'Skip guide' }, 'SKIP GUIDE');
  const actions = h('div', { class: 'guide-actions', hidden: true }, skip, ok);
  const el = h('section', { class: 'guide', 'aria-label': 'Guide', hidden: true }, line, actions);
  let shownStep = '';
  const expand = (open: boolean) => {
    line.setAttribute('aria-expanded', String(open));
    el.dataset.open = String(open);
    actions.hidden = !open;
  };
  line.addEventListener('click', () => expand(line.getAttribute('aria-expanded') !== 'true'));

  const rulesButton = h('button', { class: 'guide-rules-open', type: 'button', 'aria-label': 'How this works' }, '?');
  const titleId = `guide-rules-title-${++views}`;
  const rulesTitle = h('h2', { class: 'guide-rules-title', id: titleId });
  const rulesBody = h('div', { class: 'guide-rules-body' });
  const close = h('button', { class: 'guide-rules-close', type: 'button', 'aria-label': 'Close' }, '✕');
  const rulesDialog = h(
    'div',
    { class: 'guide-rules', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, hidden: true },
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

  const guide = options.progress.key;
  ok.addEventListener('click', () => {
    if (current) {
      options.progress.see(current.id);
      announce({ name: 'guide_step', props: { guide, step: current.id, how: 'dismissed' } });
    }
    if (last) render(last);
  });
  skip.addEventListener('click', () => {
    options.progress.skip();
    announce({ name: 'guide_skipped', props: { guide, step: current?.id ?? '' } });
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
    if (current && current.done(s) && !options.progress.seen().includes(current.id)) {
      options.progress.see(current.id);
      announce({ name: 'guide_step', props: { guide, step: current.id, how: 'done' } });
    }
    current = options.progress.skipped() ? null : nextStep(options.steps(s), s, options.progress.seen());
    el.hidden = !current;
    mark(current?.target);
    if (!current) return;
    // Each new tip starts as one line.
    if (current.id !== shownStep) {
      shownStep = current.id;
      expand(false);
    }
    setText(title, current.title);
    setText(text, current.text);
  }

  return { el, rulesButton, rulesDialog, render };
}
