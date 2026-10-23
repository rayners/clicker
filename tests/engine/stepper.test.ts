// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createStepper } from '../../src/engine/ui/stepper';

let presses: number[] = [];

function mount(extra: Partial<Parameters<typeof createStepper>[0]> = {}) {
  presses = [];
  const stepper = createStepper({
    value: { aria: 'Torch notch' },
    less: { label: 'Cooler torch', onPress: () => presses.push(-1) },
    more: { label: 'Hotter torch', onPress: () => presses.push(1) },
    ...extra,
  });
  document.body.replaceChildren(stepper.el);
  return { stepper, user: userEvent.setup() };
}

beforeEach(() => document.body.replaceChildren());

describe('a stepper', () => {
  it('steps down and up with two named buttons around its value', async () => {
    const { stepper, user } = mount();
    stepper.render('5');
    expect(screen.getByLabelText('Torch notch').textContent).toBe('5');
    await user.click(screen.getByRole('button', { name: 'Cooler torch' }));
    await user.click(screen.getByRole('button', { name: 'Hotter torch' }));
    expect(presses).toEqual([-1, 1]);
  });

  it('shows − and +', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Cooler torch' }).textContent).toBe('−');
    expect(screen.getByRole('button', { name: 'Hotter torch' }).textContent).toBe('+');
  });

  it('can stop either way at a limit', () => {
    const { stepper } = mount();
    stepper.render('0', { less: false, more: true });
    expect((screen.getByRole('button', { name: 'Cooler torch' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Hotter torch' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('can hide its buttons while something else has the control', () => {
    const { stepper } = mount();
    stepper.render('7', { hidden: true });
    expect(screen.queryByRole('button', { name: 'Cooler torch' })).toBeNull();
    expect(screen.getByLabelText('Torch notch').textContent).toBe('7');
  });

  it('can rename its buttons as what they act on changes (a list of names, for instance)', () => {
    const { stepper } = mount();
    stepper.relabel('Ease off the Aurelian Gift', 'Stalk the Aurelian Gift harder');
    expect(screen.getByRole('button', { name: 'Stalk the Aurelian Gift harder' })).toBeTruthy();
  });

  it('uses the shared class names, with an extra class for the game', () => {
    const { stepper } = mount({ className: 'deep-steps' });
    expect(stepper.el.className).toBe('stepper deep-steps');
    expect(stepper.el.querySelectorAll('button.stepper-step')).toHaveLength(2);
    expect(stepper.el.querySelector('.stepper-value')).not.toBeNull();
  });
});
