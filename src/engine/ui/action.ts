/**
 * The big action button: drill, forage, sell. It acts on the press itself so rapid taps on a phone all count.
 * @module
 */
import { h } from './dom';

const TICK_MS = 700;

/** The button and what a press does. */
export interface ActionButtonOptions {
  /** Names its parts: `<class>` for the button, `<class>-tick` for what floats off it. */
  className: string;
  label: string;
  /** What is inside (a sprite, a label); default the label in capitals. */
  content?: readonly (Node | string)[];
  /** Act on a press; return what it earned to float off the button, or nothing. */
  onPress(): string | void;
}

/** The action button; `tick` floats text off it (e.g. for an automation pressing it on its own). */
export function createActionButton(options: ActionButtonOptions): {
  el: HTMLButtonElement;
  tick(text: string, className?: string): void;
  /** Change what it says (a `<class>-label` inside, if there is one) and its accessible name. */
  setLabel(label: string, text: string): void;
} {
  const el = h('button', { class: options.className, type: 'button', 'aria-label': options.label }, ...(options.content ?? [options.label.toUpperCase()]));
  const tick = (text: string, className = `${options.className}-tick`) => {
    const t = h('span', { class: className, 'aria-hidden': 'true', style: `--x:${Math.round(Math.random() * 60 - 30)}px` }, text);
    el.append(t);
    setTimeout(() => t.remove(), TICK_MS);
  };
  const press = () => {
    const earned = options.onPress();
    if (earned) tick(earned);
  };
  // pointerdown fires immediately on touch (no click delay), so rapid tapping on phones feels right.
  el.addEventListener('pointerdown', (e) => {
    if (e.button === 0) press();
  });
  // Keyboard activation produces a click with detail 0; pointer clicks were already handled above.
  el.addEventListener('click', (e) => {
    if (e.detail === 0) press();
  });
  return {
    el,
    tick,
    setLabel(label, text) {
      el.setAttribute('aria-label', label);
      const inner = el.querySelector(`.${options.className}-label`);
      if (inner) inner.textContent = text;
      else el.textContent = text;
    },
  };
}
