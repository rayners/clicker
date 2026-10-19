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
