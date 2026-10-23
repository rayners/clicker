// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createBuyList, createBuyPanel, type BuyItem, type BuyListOptions } from '../../src/engine/ui/buy-list';

interface Toy {
  funds: number;
  drills: number;
  bought: string[];
  made: number;
}
const toy = (patch: Partial<Toy> = {}): Toy => ({ funds: 100, drills: 2, bought: [], made: 0, ...patch });
let log: string[] = [];

const CREDITS = { text: (n: number) => `${n} CR`, spoken: (n: number) => `${n} credits` };

const drill: BuyItem<Toy> = {
  id: 'drill',
  name: 'AUGER RIG',
  description: 'Bolts straight into the crust.',
  verb: 'ACQUIRE',
  owned: (s) => String(s.drills),
  ownedAria: 'Auger rigs owned',
  notes: [{ read: (s) => `+${s.drills} ORE/S`, aria: 'Auger output' }],
  price: (s) => 10 * (s.drills + 1),
  onBuy: () => log.push('drill'),
};

function mount(extra: Partial<BuyListOptions<Toy>> = {}, state = toy()) {
  log = [];
  const list = createBuyList<Toy>({ items: [drill], funds: (s) => s.funds, currency: CREDITS, ...extra });
  document.body.replaceChildren(list.el);
  list.render(state);
  return { list, user: userEvent.setup() };
}

beforeEach(() => document.body.replaceChildren());

describe('a list of things to buy', () => {
  it('shows each item: its name, how many are owned, what it does, and its price', () => {
    mount();
    const row = within(screen.getByRole('listitem'));
    expect(row.getByText('AUGER RIG')).toBeTruthy();
    expect(row.getByLabelText('Auger rigs owned').textContent).toBe('2');
    expect(row.getByText('Bolts straight into the crust.')).toBeTruthy();
    expect(row.getByLabelText('Auger output').textContent).toBe('+2 ORE/S');
    expect(row.getByRole('button').textContent).toBe('ACQUIRE 30 CR');
  });

  it('names the purchase for a screen reader, and buys on a tap', async () => {
    const { user } = mount();
    await user.click(screen.getByRole('button', { name: 'Acquire AUGER RIG for 30 credits' }));
    expect(log).toEqual(['drill']);
  });

  it('cannot be bought until it can be afforded', () => {
    mount({}, toy({ funds: 5 }));
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('hides an item until it is revealed, and its button when there is nothing to buy', () => {
    const { list } = mount({ items: [{ ...drill, shown: (s) => s.made > 10 }] });
    expect(screen.queryByRole('listitem')).toBeNull();
    list.render(toy({ made: 20 }));
    expect(screen.getByRole('listitem')).toBeTruthy();
    const maxed = mount({ items: [{ ...drill, price: () => null }] });
    void maxed;
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('can change what is on offer as the game goes on, keeping the rows it already has', () => {
    const jingle: BuyItem<Toy> = { id: 'jingle', name: 'A JINGLE', description: 'More customers.', price: () => 50, onBuy: () => log.push('jingle') };
    const { list } = mount({ items: (s) => (s.bought.includes('jingle') ? [drill] : [drill, jingle]) });
    const first = screen.getAllByRole('listitem')[0];
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    list.render(toy({ bought: ['jingle'] }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getAllByRole('listitem')[0]).toBe(first);
  });

  it('says whether anything on offer can be afforded, to light its tab', () => {
    const { list } = mount();
    expect(list.hasAffordable(toy())).toBe(true);
    expect(list.hasAffordable(toy({ funds: 0 }))).toBe(false);
  });

  it('puts the price after a separator of the game\'s choosing, and the name in its own case', () => {
    mount({ currency: { ...CREDITS, separator: ' · ' }, items: [{ ...drill, verb: 'BUILD', ariaName: 'auger rig' }] });
    expect(screen.getByRole('button', { name: 'Build auger rig for 30 credits' }).textContent).toBe('BUILD · 30 CR');
  });

  it('lets a note wear its own class and mark itself wasted, e.g. income that the refinery would swallow', () => {
    const { list } = mount({ items: [{ ...drill, notes: [{ read: () => '+0 CR/S', className: 'sys-gain', wasted: () => true }] }] });
    const note = list.el.querySelector('.sys-gain') as HTMLElement;
    expect(note.dataset.wasted).toBe('true');
  });

  it('can carry a line of detail under the description, and name each row after its item', () => {
    mount({ named: true, items: [{ ...drill, detail: (s) => `${s.drills} READY · 0 WOUNDED` }] });
    const row = within(screen.getByRole('listitem', { name: 'AUGER RIG' }));
    expect(row.getByText('2 READY · 0 WOUNDED')).toBeTruthy();
  });

  it('names its parts after the class it is given, with an optional class for the row', () => {
    const { list } = mount({ className: 'item', rowClass: 'item' });
    expect(list.el.className).toBe('item-list');
    expect(list.el.querySelector('li.item .item-head .item-name')).not.toBeNull();
    expect(list.el.querySelector('.item-foot button.buy')).not.toBeNull();
  });
});

describe('a panel of buy lists', () => {
  it('has a title and a section per list, each heading with a running total, and buys from any of them', async () => {
    log = [];
    const panel = createBuyPanel<Toy>({
      title: 'STAFF & SUPPLIES',
      funds: (s) => s.funds,
      currency: CREDITS,
      sections: [
        { heading: 'DRILLS', total: (s) => `${s.drills} RUNNING`, items: [drill] },
        { heading: 'THE WATCH', items: [{ ...drill, id: 'tower', name: 'WATCHTOWER', onBuy: () => log.push('tower') }] },
      ],
    });
    document.body.replaceChildren(panel.el);
    panel.render(toy());
    expect(screen.getByRole('heading', { name: 'STAFF & SUPPLIES' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'DRILLS 2 RUNNING' })).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: /watchtower/i }));
    expect(log).toEqual(['tower']);
    expect(panel.hasAffordable(toy())).toBe(true);
  });
});
