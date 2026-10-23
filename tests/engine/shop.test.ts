// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createShop, type ShopOptions } from '../../src/engine/ui/shop';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
}
interface Toy {
  funds: number;
  upgrades: string[];
}

const ALL: Upgrade[] = [
  { id: 'dies', name: 'SHARPER DIES', description: 'Faster clippers.', cost: 50 },
  { id: 'jingle', name: 'A JINGLE', description: 'More customers.', cost: 500 },
  { id: 'mega', name: 'MEGACLIPPERS', description: 'Much faster clippers.', cost: 5000 },
];
let bought: string[] = [];

function mount(extra: Partial<ShopOptions<Toy, Upgrade>> = {}, state: Toy = { funds: 100, upgrades: [] }) {
  bought = [];
  const shop = createShop<Toy, Upgrade>({
    title: 'REQUISITIONS',
    all: ALL,
    available: (s) => ALL.filter((u) => u.id !== 'mega' && !s.upgrades.includes(u.id)),
    owned: (s) => s.upgrades,
    funds: (s) => s.funds,
    currency: { text: (n) => `$${n}`, spoken: (n) => `$${n}` },
    onBuy: (id) => bought.push(id),
    ...extra,
  });
  document.body.replaceChildren(shop.el);
  shop.render(state);
  return { shop, user: userEvent.setup() };
}

beforeEach(() => document.body.replaceChildren());

describe('a shop of one-off upgrades', () => {
  it('offers what is on offer now, each with its price, and buys on a tap', async () => {
    const { user } = mount();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Buy SHARPER DIES for $50' }));
    expect(bought).toEqual(['dies']);
    expect((screen.getByRole('button', { name: 'Buy A JINGLE for $500' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('lists what has been bought under its own heading', () => {
    mount({}, { funds: 0, upgrades: ['dies'] });
    const bought = within(screen.getByRole('list', { name: 'Bought' }));
    expect(bought.getByText('SHARPER DIES')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /sharper dies/i })).toBeNull();
  });

  it('says whether there is anything to see, and whether anything can be afforded', () => {
    const { shop } = mount();
    expect(shop.hasAny({ funds: 0, upgrades: [] })).toBe(true);
    expect(shop.hasAny({ funds: 0, upgrades: ['dies', 'jingle'] })).toBe(true);
    expect(shop.hasAffordable({ funds: 100, upgrades: [] })).toBe(true);
    expect(shop.hasAffordable({ funds: 10, upgrades: [] })).toBe(false);
  });

  it('speaks in the game\'s words: its verbs, its headings, and how the bought list counts', () => {
    mount({ verb: 'REQUISITION', ariaVerb: 'Purchase', boughtHeading: (n) => `INSTALLED (${n})` }, { funds: 100, upgrades: ['jingle'] });
    expect(screen.getByRole('button', { name: 'Purchase SHARPER DIES for $50' }).textContent).toBe('REQUISITION $50');
    expect(screen.getByRole('heading', { name: 'INSTALLED (1)' })).toBeTruthy();
  });
});
