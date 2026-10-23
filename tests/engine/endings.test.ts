// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createEndingChooser } from '../../src/engine/ui/endings';
import { confirmPause } from '../helpers';

type Ending = 'sell' | 'burn' | 'secret';
interface Toy {
  offered: Ending[];
  renown: number;
}

let chosen: Ending[] = [];

function mount(game: Toy, extra: Partial<Parameters<typeof createEndingChooser<Toy, Ending>>[0]> = {}) {
  chosen = [];
  const chooser = createEndingChooser<Toy, Ending>({
    endings: ['sell', 'burn', 'secret'],
    available: (g) => g.offered,
    words: (g, e) => ({ title: e.toUpperCase(), text: `The ${e} ending.`, reward: `+${g.renown} RENOWN` }),
    confirm: 'END THE CHARTER',
    onChoose: (e) => chosen.push(e),
    className: 'reckon',
    ...extra,
  });
  document.body.replaceChildren(chooser.el);
  chooser.render(game);
  return { chooser, user: userEvent.setup() };
}

beforeEach(() => document.body.replaceChildren());

describe('choosing how a run ends', () => {
  it('shows only the endings on offer, each a named card with its words and what it earns', () => {
    mount({ offered: ['sell', 'burn'], renown: 3 });
    const sell = within(screen.getByRole('region', { name: 'SELL' }));
    expect(sell.getByText('The sell ending.')).toBeTruthy();
    expect(sell.getByText('+3 RENOWN')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'SECRET' })).toBeNull();
  });

  it('ends the run only on a second, unhurried tap', async () => {
    const { user } = mount({ offered: ['sell', 'burn'], renown: 3 });
    const sell = within(screen.getByRole('region', { name: 'SELL' }));
    await user.dblClick(sell.getByRole('button'));
    expect(chosen).toEqual([]);
    expect(sell.getByRole('button').textContent).toBe('CONFIRM: END THE CHARTER');
    await confirmPause();
    await user.click(sell.getByRole('button'));
    expect(chosen).toEqual(['sell']);
  });

  it('marks the card waiting for its second tap', async () => {
    const { user } = mount({ offered: ['sell'], renown: 0 });
    const card = screen.getByRole('region', { name: 'SELL' });
    await user.click(within(card).getByRole('button'));
    expect(card.classList.contains('is-pending')).toBe(true);
  });

  it('labels the button with the ending by default, or with the game\'s own word', () => {
    mount({ offered: ['sell'], renown: 0 });
    expect(screen.getByRole('button', { name: 'SELL' }).textContent).toBe('SELL');
    mount({ offered: ['sell'], renown: 0 }, { button: 'EXECUTE' });
    expect(screen.getByRole('button', { name: 'SELL' }).textContent).toBe('EXECUTE');
  });

  it('names its parts after the class it is given', () => {
    const { chooser } = mount({ offered: ['sell'], renown: 0 });
    expect(chooser.el.querySelector('.reckon-card.reckon-sell .reckon-title')).not.toBeNull();
    expect(chooser.el.querySelector('.reckon-reward')).not.toBeNull();
    expect(chooser.el.querySelector('button.buy.reckon-go')).not.toBeNull();
  });
});
