// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, type GameState } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { GENERATORS } from '../../src/data/extraction/generators';
import { ext } from '../helpers';

let store: Store;

function setup(mission: Partial<GameState['mission']> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createGame(1, 0);
  store = createStore({ ...g, mission: { ...g.mission, ...mission } as typeof g.mission });
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

const upgradesTab = () => screen.queryByRole('tab', { name: /upgrades/i });

describe('upgrades tab', () => {
  it('is hidden until the first upgrade becomes available', () => {
    setup();
    expect(upgradesTab()).toBeNull();
    store.replace({ ...store.getState(), mission: { ...ext(store.getState().mission), lifetimeOre: 30 } });
    expect(upgradesTab()).not.toBeNull();
  });

  it('lists available upgrades and buys them', async () => {
    const user = setup({ lifetimeOre: 30, credits: 60 });
    await user.click(upgradesTab()!);
    const buy = screen.getByRole('button', { name: /purchase tungsten-carbide bits/i }) as HTMLButtonElement;
    expect(buy.disabled).toBe(false);
    await user.click(buy);
    expect(store.getState().mission.upgrades).toContain('tungsten-bits');
    expect(screen.queryByRole('button', { name: /purchase tungsten-carbide bits/i })).toBeNull();
    expect(screen.getByText(/TUNGSTEN-CARBIDE BITS/)).toBeTruthy(); // still shown as installed
  });

  it('disables upgrades the player cannot afford', async () => {
    const user = setup({ lifetimeOre: 30, credits: 10 });
    await user.click(upgradesTab()!);
    expect((screen.getByRole('button', { name: /purchase tungsten-carbide bits/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('systems panel with upgrades', () => {
  it('shows per-unit output including upgrade multipliers', () => {
    setup({ upgrades: ['drone-10'], generators: { ...createGame(1, 0).mission.generators, drone: 10 } });
    expect(screen.getByText(`+${GENERATORS[0]!.baseRate * 2} ORE/S EA`)).toBeTruthy();
  });
});
