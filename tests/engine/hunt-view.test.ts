// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createHunt, type HuntState } from '../../src/engine/hunt';
import { createHuntView, type HuntViewOptions } from '../../src/engine/ui/hunt-view';
import { confirmPause } from '../helpers';

interface Prey {
  name: string;
  taken: number;
  alarm: number;
  log: { id: number; t: number; text: string }[];
}
interface Toy {
  hunting: boolean;
  hunt: HuntState<Prey>;
  bought: Record<string, number>;
  legend: number;
}

const prey = (name: string): Prey => ({ name, taken: 0, alarm: 0.2, log: [{ id: 1, t: 5, text: `Something in the vents of the ${name}.` }] });
const toy = (patch: Partial<HuntState<Prey>> = {}, extra: Partial<Toy> = {}): Toy => {
  const hunt = createHunt([prey('Aurelian Gift'), prey('Calloway Reach')], { strength: 3, hunger: 60 });
  return { hunting: true, hunt: { ...hunt, dread: 40, ...patch }, bought: {}, legend: 0, ...extra };
};
const UPGRADES = [{ id: 'claws', name: 'CLAWS', description: 'Takes more.', cost: 30 }];
let log: string[] = [];

function mount(state = toy(), extra: Partial<HuntViewOptions<Toy, Prey>> = {}) {
  log = [];
  const view = createHuntView<Toy, Prey>({
    className: 'xeno',
    label: 'Special Order 0-77',
    title: 'SPECIAL ORDER 0-77',
    hunt: (g) => (g.hunting ? g.hunt : null),
    legend: (g) => g.legend,
    back: { text: 'RETURN TO CONTRACT', aria: 'Return to the contract', onPress: () => log.push('back') },
    stats: { harvest: 'BIOMASS', notoriety: 'WHISPERS' },
    note: (h, used) => (h.dormant ? 'DORMANT.' : used === 0 ? 'IT WAITS. CHOOSE ONE.' : 'IT IS IN THE WALLS.'),
    rest: { sleep: 'GO DORMANT', wake: 'WAKE', onToggle: () => log.push('sleep') },
    onEnd: () => log.push('end'),
    prey: {
      name: (p) => p.name.toUpperCase(),
      rows: [
        [{ className: 'xeno-title', read: (p) => p.name.toUpperCase() }, { className: 'xeno-taken', read: (p) => `${p.taken} TAKEN`, aria: (n) => `Taken from ${n}` }],
        [{ className: 'xeno-act', read: () => 'WARDEN: ROUTINE' }, { className: 'xeno-suspicion', read: (p) => `SUSPICION ${Math.round(p.alarm * 100)}%`, aria: (n) => `Suspicion aboard ${n}` }],
      ],
      alarm: (p) => p.alarm,
      less: (n) => `Ease off ${n}`,
      more: (n) => `Stalk ${n} harder`,
      onShift: (i, step) => log.push(`shift ${i} ${step}`),
    },
    upgrades: {
      heading: 'WHAT IT BECOMES',
      items: (g) => UPGRADES.map((u) => ({ ...u, bought: g.bought[u.id] ?? 0 })),
      currency: 'BIOMASS',
      verb: 'Evolve',
      onBuy: (id) => log.push(`buy ${id}`),
    },
    feed: { heading: 'WHAT IT TOOK', aria: 'What it took', entries: (h) => h.prey.flatMap((p) => p.log.map((e) => ({ key: `${p.name}:${e.id}`, t: e.t, when: p.name.toUpperCase(), text: e.text }))) },
    ...extra,
  });
  document.body.replaceChildren(view.el);
  view.render(state);
  return { view, user: userEvent.setup() };
}
const region = () => within(screen.getByRole('region', { name: 'Special Order 0-77' }));

beforeEach(() => document.body.replaceChildren());

describe('the hunt on screen', () => {
  it('stays hidden until the horror is hunting', () => {
    mount(toy({}, { hunting: false }));
    expect(screen.queryByRole('region', { name: 'Special Order 0-77' })).toBeNull();
  });

  it('shows what it has taken, its hunger, its notoriety and its strength free, in the game\'s words', () => {
    mount(toy({ dread: 12, hunger: 40, notoriety: 0.5 }));
    expect(region().getByLabelText('Biomass').textContent).toBe('12');
    expect(region().getByLabelText('Hunger').textContent).toBe('40%');
    expect(region().getByLabelText('Whispers').textContent).toBe('0.50');
    expect(region().getByLabelText('Strength free').textContent).toBe('3 / 3');
  });

  it('shows every prey as a named group with its lines and a stepper to push on it', async () => {
    const { user } = mount();
    const ships = region().getAllByRole('group');
    expect(ships).toHaveLength(2);
    expect(within(ships[0]!).getByLabelText('Taken from AURELIAN GIFT').textContent).toBe('0 TAKEN');
    await user.click(within(ships[1]!).getByRole('button', { name: 'Stalk CALLOWAY REACH harder' }));
    await user.click(within(ships[1]!).getByRole('button', { name: 'Ease off CALLOWAY REACH' }));
    expect(log).toEqual(['shift 1 1', 'shift 1 -1']);
  });

  it('says how the hunt stands, sleeps and wakes, and goes back', async () => {
    const { view, user } = mount();
    expect(region().getByText('IT WAITS. CHOOSE ONE.')).toBeTruthy();
    await user.click(region().getByRole('button', { name: 'Go dormant' }));
    view.render(toy({ dormant: true }));
    expect(region().getByRole('button', { name: 'Wake' })).toBeTruthy();
    await user.click(region().getByRole('button', { name: 'Return to the contract' }));
    expect(log).toEqual(['sleep', 'back']);
  });

  it('ends the hunt for Legend only on a second, unhurried tap, and titles itself with what is carried', async () => {
    const { user } = mount(toy({ harvest: 400 }, { legend: 2 }));
    expect(region().getByRole('heading', { name: 'SPECIAL ORDER 0-77 · LEGEND 2' })).toBeTruthy();
    await user.dblClick(region().getByRole('button', { name: 'End the hunt for 4 Legend' }));
    expect(log).toEqual([]);
    await confirmPause();
    await user.click(region().getByRole('button', { name: /^confirm/i }));
    expect(log).toEqual(['end']);
  });

  it('grows with what it takes', async () => {
    const { user } = mount();
    await user.click(region().getByRole('button', { name: 'Evolve CLAWS for 30 biomass' }));
    expect(log).toEqual(['buy claws']);
    mount(toy({ dread: 10 }));
    expect((region().getByRole('button', { name: /evolve claws/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('lists what it took, newest first', () => {
    mount();
    const feed = within(region().getByRole('list', { name: 'What it took' }));
    expect(feed.getAllByRole('listitem')).toHaveLength(2);
  });

  it('can wear a variant class, the game\'s own classes for stats and headings, and its own Legend wording', () => {
    const { view } = mount(toy({}, { legend: 2 }), {
      variant: 'dragon',
      title: 'The Hoard',
      legendText: (n) => `Legend ${n}`,
      classes: { stats: 'stats', stat: 'stat', value: 'stat-value', label: 'stat-label', sub: 'panel-subtitle' },
    });
    expect(view.el.className).toBe('hunt xeno dragon');
    expect(region().getByRole('heading', { name: 'The Hoard · Legend 2' })).toBeTruthy();
    expect(view.el.querySelector('dl.stats .stat .stat-value')).not.toBeNull();
    expect(view.el.querySelector('.stat dt.stat-label')).not.toBeNull();
    expect(view.el.querySelector('h3.panel-subtitle')).not.toBeNull();
  });

  it('can take its own header, title, end wording and classes for the feed and the upgrades', async () => {
    const counter = document.createElement('span');
    const { view } = mount(toy({ harvest: 400 }), {
      title: () => "THE KILLER'S CUT · THE DROWNED BOY",
      header: (title, rules, back) => {
        const head = document.createElement('header');
        head.className = 'osd';
        head.append(title, counter, ...(rules ? [rules] : []), back);
        return head;
      },
      onRender: () => (counter.textContent = '0:01:00'),
      endNoun: 'cut',
      classes: { feed: 'log cut-feed', entry: 'log-entry log-kill', when: 'log-time', text: 'log-text', upgradeList: 'item', upgradeRow: 'item' },
      extra: [Object.assign(document.createElement('div'), { className: 'vhs-noise' })],
    });
    expect(region().getByText("THE KILLER'S CUT · THE DROWNED BOY")).toBeTruthy();
    expect(view.el.querySelector('header.osd')!.textContent).toContain('0:01:00');
    expect(region().getByRole('button', { name: 'End the cut for 4 Legend' }).textContent).toBe('END THE CUT · +4 LEGEND');
    expect(view.el.querySelector('ol.log.cut-feed li.log-entry.log-kill .log-time + .log-text, ol.log.cut-feed li.log-entry.log-kill .log-text')).not.toBeNull();
    expect(view.el.querySelector('ul.item-list li.item .item-desc')).not.toBeNull();
    expect(view.el.querySelector('.vhs-noise')).not.toBeNull();
  });

  it('names its parts after the class it is given, beside the shared ones', () => {
    const { view } = mount();
    expect(view.el.className).toBe('hunt xeno');
    expect(view.el.querySelector('.xeno-prey .xeno-steps.stepper')).not.toBeNull();
  });
});
