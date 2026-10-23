/**
 * A − and + around a value: one step per tap.
 * @module
 */
import { h, setAttr, setText } from './dom';

/** A stepper's two buttons and its value. */
export interface StepperOptions {
  /** The value's accessible name (left out when the value speaks for itself in context). */
  value?: { aria: string };
  less: { label: string; onPress(): void };
  more: { label: string; onPress(): void };
  /** An extra class beside `stepper`, for the game's own look. */
  className?: string;
}

/** How a stepper stands right now: whether each way is open, or the buttons are hidden altogether. */
export interface StepperState {
  less?: boolean;
  more?: boolean;
  /** Something else has the control (an automation): show the value only. */
  hidden?: boolean;
}

/** A stepper; `render` sets its value and which ways it can go. */
export function createStepper(options: StepperOptions): {
  el: HTMLElement;
  render(value: string, state?: StepperState): void;
  /** Rename the buttons (when what they act on changes). */
  relabel(less: string, more: string): void;
} {
  const button = (label: string, text: string, onPress: () => void) => {
    const b = h('button', { class: 'stepper-step', type: 'button', 'aria-label': label }, text);
    b.addEventListener('click', onPress);
    return b;
  };
  const less = button(options.less.label, '−', options.less.onPress);
  const more = button(options.more.label, '+', options.more.onPress);
  const value = h('span', { class: 'stepper-value', ...(options.value ? { 'aria-label': options.value.aria } : {}) });
  const el = h('div', { class: options.className ? `stepper ${options.className}` : 'stepper' }, less, value, more);
  return {
    el,
    render(text, state = {}) {
      setText(value, text);
      less.hidden = !!state.hidden;
      more.hidden = !!state.hidden;
      less.disabled = state.less === false;
      more.disabled = state.more === false;
    },
    relabel(lessLabel, moreLabel) {
      setAttr(less, 'aria-label', lessLabel);
      setAttr(more, 'aria-label', moreLabel);
    },
  };
}
