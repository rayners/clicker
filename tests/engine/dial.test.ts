// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createDial, type DialOptions } from '../../src/engine/ui/dial';

interface Toy {
  share: number;
  auto: boolean;
  owned: boolean;
  debt: number;
}
const toy = (patch: Partial<Toy> = {}): Toy => ({ share: 3, auto: false, owned: false, debt: 0.4, ...patch });
let log: string[] = [];

function mount(extra: Partial<DialOptions<Toy>> = {}, state = toy()) {
  log = [];
  const dial = createDial<Toy>({
    label: 'Force split',
    value: { aria: 'Assault share', read: (s) => `${s.share * 10}%` },
    less: { label: 'More to the line', onPress: () => log.push('less') },
    more: { label: 'More to the assault', onPress: () => log.push('more') },
    sides: [
      { name: 'ASSAULT', read: (s) => String(s.share) },
      { name: 'LINE', read: (s) => String(10 - s.share), aria: 'On the line' },
    ],
    automation: {
      text: 'WARDEN HAS THE SPLIT',
      active: (s) => s.auto,
      handover: { available: (s) => s.owned, onToggle: () => log.push('toggle'), take: 'Take control from WARDEN', give: 'Return control to WARDEN' },
    },
    ...extra,
  });
  document.body.replaceChildren(dial.el);
  dial.render(state);
  return { dial, user: userEvent.setup() };
}

const region = () => within(screen.getByRole('region', { name: 'Force split' }));

beforeEach(() => document.body.replaceChildren());

describe('a dial', () => {
  it('is a named region with its value between two named steps', async () => {
    const { user } = mount();
    expect(region().getByLabelText('Assault share').textContent).toBe('30%');
    await user.click(region().getByRole('button', { name: 'More to the line' }));
    await user.click(region().getByRole('button', { name: 'More to the assault' }));
    expect(log).toEqual(['less', 'more']);
  });

  it('shows what each side of the split comes to', () => {
    mount();
    expect(region().getByText('ASSAULT')).toBeTruthy();
    expect(region().getByLabelText('On the line').textContent).toBe('7');
  });

  it('or a single name above its steps, with a line of detail', () => {
    mount({ sides: undefined, name: 'BEACH OPEN', detail: (s) => `${s.share} SWIMMERS` });
    expect(region().getByText('BEACH OPEN')).toBeTruthy();
    expect(region().getByText('3 SWIMMERS')).toBeTruthy();
  });

  it('hands over to its automation once bought: the steps give way to what it is doing', async () => {
    const { dial, user } = mount({}, toy({ owned: true }));
    await user.click(region().getByRole('button', { name: 'Return control to WARDEN' }));
    expect(log).toEqual(['toggle']);
    dial.render(toy({ owned: true, auto: true }));
    expect(region().getByText('WARDEN HAS THE SPLIT')).toBeTruthy();
    expect(region().queryByRole('button', { name: 'More to the line' })).toBeNull();
    expect(region().getByRole('button', { name: 'Take control from WARDEN' })).toBeTruthy();
  });

  it('offers no handover before the automation is bought', () => {
    mount();
    expect(region().queryByRole('button', { name: /warden/i })).toBeNull();
    expect(region().getByText('WARDEN HAS THE SPLIT').hidden).toBe(true);
  });

  it('can carry a meter: a named reading and a bar', () => {
    const { dial } = mount({ meter: { name: 'SLEEP DEBT', aria: 'Sleep debt', read: (s) => s.debt } });
    expect(region().getByLabelText('Sleep debt').textContent).toBe('40%');
    expect((dial.el.querySelector('.dial-fill') as HTMLElement).style.width).toBe('40%');
  });

  it('can let a meter\'s reading say more than its bar, e.g. sleep debt past 100%', () => {
    const { dial } = mount({ meter: { name: 'SLEEP DEBT', aria: 'Sleep debt', read: (s) => s.debt / 2, text: (s) => `${Math.round(s.debt * 100)}%` } }, toy({ debt: 1.5 }));
    expect(region().getByLabelText('Sleep debt').textContent).toBe('150%');
    expect((dial.el.querySelector('.dial-fill') as HTMLElement).style.width).toBe('75%');
  });

  it('carries controls of the game\'s own under the steps, e.g. a refuel button', () => {
    const extra = document.createElement('button');
    extra.textContent = 'REFUEL';
    mount({ extra: [extra] });
    expect(region().getByRole('button', { name: 'REFUEL' })).toBeTruthy();
  });

  it('marks itself for the stylesheet, e.g. stretched or in danger', () => {
    const { dial } = mount({ flags: (s) => ({ stretched: s.share > 2, debt: 'high' }) });
    expect(dial.el.dataset.stretched).toBe('true');
    expect(dial.el.dataset.debt).toBe('high');
  });

  it('uses the shared class names, with an extra class for the game', () => {
    const { dial } = mount({ className: 'torch' });
    expect(dial.el.className).toBe('dial torch');
    expect(dial.el.querySelectorAll('.dial-side')).toHaveLength(2);
    expect(dial.el.querySelector('.dial-row .stepper')).not.toBeNull();
  });
});
