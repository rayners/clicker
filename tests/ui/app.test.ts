// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { GENERATORS } from '../../src/data/generators';
import { appendLog } from '../../src/mission/log';
import { depth } from '../../src/mission/progress';
import { creditRate, generatorRate, oreRate, refineryCapacity } from '../../src/mission/economy';
import { formatNumber } from '../../src/core/format';

let store: Store;
let root: HTMLElement;

function setup(mutate: (s: ReturnType<typeof createGame>) => ReturnType<typeof createGame> = (s) => s) {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
  store = createStore(mutate(createGame(1, 0)));
  mountApp(root, store);
  return userEvent.setup();
}

const status = (label: RegExp) => within(screen.getByRole('region', { name: /ship status/i })).getByLabelText(label);

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('status display', () => {
  it('shows the ship and the starting resources', () => {
    setup();
    expect(within(screen.getByRole('banner')).getByText(/MSV CALLOWAY REACH/)).toBeTruthy();
    expect(status(/^ore$/i).textContent).toBe('0');
    expect(status(/credits/i).textContent).toBe('0');
  });

  it('updates as time passes', () => {
    setup((g) => ({ ...g, mission: { ...g.mission, ore: 100 } }));
    store.dispatch({ type: 'tick', dt: 1 });
    expect(status(/credits/i).textContent).toBe('5');
  });
});

describe('drill button', () => {
  it('extracts ore each time it is pressed', async () => {
    const user = setup();
    const button = screen.getByRole('button', { name: /execute drill cycle/i });
    await user.click(button);
    await user.click(button);
    expect(status(/^ore$/i).textContent).toBe('2');
  });

  it('also works from the keyboard', async () => {
    const user = setup();
    screen.getByRole('button', { name: /execute drill cycle/i }).focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(status(/^ore$/i).textContent).toBe('2');
  });
});

describe('systems panel', () => {
  const acquire = (name: string) => screen.getByRole('button', { name: new RegExp(`acquire ${name}`, 'i') });

  it('lists only discovered generators', () => {
    setup();
    expect(acquire(GENERATORS[0]!.name)).toBeTruthy();
    expect(screen.queryByRole('button', { name: new RegExp(`acquire ${GENERATORS[1]!.name}`, 'i') })).toBeNull();
  });

  it('disables purchases the player cannot afford', () => {
    setup();
    expect((acquire(GENERATORS[0]!.name) as HTMLButtonElement).disabled).toBe(true);
  });

  it('buys a generator, showing the new count and revealing the next tier', async () => {
    const user = setup((g) => ({ ...g, mission: { ...g.mission, credits: 100 } }));
    await user.click(acquire(GENERATORS[0]!.name));
    expect(screen.getByLabelText(`${GENERATORS[0]!.name} owned`).textContent).toBe('1');
    expect(status(/credits/i).textContent).toBe(String(100 - GENERATORS[0]!.baseCost));
    expect(acquire(GENERATORS[1]!.name)).toBeTruthy();
  });

  it('upgrades the refinery', async () => {
    const user = setup((g) => ({ ...g, mission: { ...g.mission, credits: 1000 } }));
    await user.click(screen.getByRole('button', { name: /upgrade refinery/i }));
    expect(store.getState().mission.refineryLevel).toBe(1);
  });
});

describe('comms log', () => {
  it('shows the boot sequence', () => {
    setup();
    expect(within(screen.getByRole('log')).getByText(/WARDEN OPERATIONS INTELLIGENCE/)).toBeTruthy();
  });

  it('shows new entries as they arrive, without duplicating old ones', () => {
    setup();
    const before = within(screen.getByRole('log')).getAllByRole('listitem').length;
    store.replace({ ...store.getState(), mission: appendLog(store.getState().mission, 'corp', 'Welcome aboard.') });
    store.dispatch({ type: 'drill' });
    const items = within(screen.getByRole('log')).getAllByRole('listitem');
    expect(items.length).toBe(before + 1);
    expect(items.at(-1)!.textContent).toContain('Welcome aboard.');
  });
});

describe('navigation', () => {
  it('switches panels with the tab bar', async () => {
    const user = setup();
    const systemsTab = screen.getByRole('tab', { name: /systems/i });
    await user.click(systemsTab);
    expect(systemsTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /ops/i }).getAttribute('aria-selected')).toBe('false');
    expect(root.dataset.tab).toBe('systems');
  });
});

describe('story presentation', () => {
  it('shows shaft depth in the status area', () => {
    setup((g) => ({ ...g, mission: { ...g.mission, lifetimeOre: 1e7 } }));
    expect(status(/shaft depth/i).textContent).toBe(`${depth(store.getState().mission).toLocaleString('en-US')} M`);
  });

  it('marks the current act on the shell so the theme can shift', () => {
    setup((g) => ({ ...g, mission: { ...g.mission, act: 2 } }));
    expect(root.dataset.act).toBe('2');
  });
});

describe('production flow readout (extraction -> refinery -> income)', () => {
  const flow = () => within(screen.getByRole('region', { name: /production flow/i }));
  const withDrones = (n: number, patch = {}) => (g: ReturnType<typeof createGame>) => ({
    ...g,
    mission: { ...g.mission, generators: { ...g.mission.generators, [GENERATORS[0]!.id]: n }, ...patch },
  });

  it('headlines ore per second, refinery throughput and income', () => {
    setup(withDrones(10));
    const m = store.getState().mission;
    expect(flow().getByLabelText(/ore per second/i).textContent).toBe(formatNumber(oreRate(m)));
    expect(flow().getByLabelText(/refinery throughput/i).textContent).toBe(formatNumber(refineryCapacity(m)));
    expect(flow().getByLabelText(/income/i).textContent).toBe(formatNumber(creditRate(m)));
  });

  it('shows how much refinery capacity is spare while extraction is the limit', () => {
    setup(withDrones(10));
    expect(flow().getByRole('meter', { name: /refinery load/i }).getAttribute('aria-valuenow')).toBe('20');
    expect(flow().getByText(/80% SPARE CAPACITY/i)).toBeTruthy();
  });

  it('warns that ore is backing up when the refinery is the bottleneck', () => {
    setup(withDrones(200));
    expect(flow().getByRole('meter', { name: /refinery load/i }).getAttribute('aria-valuenow')).toBe('100');
    expect(flow().getByText(/REFINERY AT CAPACITY/i)).toBeTruthy();
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).toBe('refinery');
  });

  it('calls out the gain when a purchase raises ore per second', async () => {
    const user = setup((g) => ({ ...g, mission: { ...g.mission, credits: 100 } }));
    await user.click(screen.getByRole('tab', { name: /systems/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`acquire ${GENERATORS[0]!.name}`, 'i') }));
    expect(root.querySelector('.rate-delta')?.textContent).toBe(`+${formatNumber(GENERATORS[0]!.baseRate)} ORE/S`);
  });

  it('does not call out changes on the first render', () => {
    setup(withDrones(10));
    expect(root.querySelector('.rate-delta')).toBeNull();
  });
});

describe('operations monitor (automation at a glance)', () => {
  const monitor = () => screen.getByRole('region', { name: /operations monitor/i });

  it('says no automation is running at the start', () => {
    setup();
    expect(monitor().textContent).toMatch(/NO AUTOMATED SYSTEMS/);
  });

  it('lists each owned extraction system with its count and output', () => {
    setup((g) => ({ ...g, mission: { ...g.mission, generators: { ...g.mission.generators, drone: 12, auger: 3 } } }));
    const rows = within(monitor()).getAllByRole('listitem');
    expect(rows.map((r) => r.dataset.system)).toEqual(['drone', 'auger']);
    const m = store.getState().mission;
    expect(rows[0]!.textContent).toContain('×12');
    expect(rows[0]!.textContent).toContain(`${formatNumber(12 * generatorRate(m, GENERATORS[0]!))}/S`);
  });

  it("shows WARDEN's autocycle once installed", () => {
    setup((g) => ({ ...g, mission: { ...g.mission, upgrades: ['warden-autocycle'] } }));
    const row = within(monitor()).getAllByRole('listitem')[0]!;
    expect(row.dataset.system).toBe('autocycle');
    expect(row.textContent).toContain('1/S');
  });
});

describe('autocycle feedback on the drill', () => {
  it('marks the drill as automated and fires visible cycles as time passes', () => {
    setup((g) => ({ ...g, mission: { ...g.mission, upgrades: ['warden-autocycle'] } }));
    const drill = screen.getByRole('button', { name: /execute drill cycle/i });
    expect(drill.dataset.auto).toBe('on');
    store.dispatch({ type: 'tick', dt: 1.1 });
    expect(drill.querySelector('.drill-tick')).toBeTruthy();
  });

  it('is manual-only before the upgrade', () => {
    setup();
    expect(screen.getByRole('button', { name: /execute drill cycle/i }).dataset.auto).toBe('off');
  });
});

describe('drill press feedback', () => {
  it('shows how much ore each press actually extracted', async () => {
    const user = setup((g) => ({ ...g, mission: { ...g.mission, upgrades: ['tungsten-bits'] } }));
    await user.click(screen.getByRole('button', { name: /execute drill cycle/i }));
    expect(root.querySelector('.drill-tick')?.textContent).toBe('+2');
  });
});
