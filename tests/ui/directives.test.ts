// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, type GameState } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { DIRECTIVES } from '../../src/data/directives';

let store: Store;
const first = DIRECTIVES[0]!;

function setup(mission: Partial<GameState['mission']> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createGame(1, 0);
  store = createStore({ ...g, mission: { ...g.mission, ...mission } });
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

const tab = () => screen.queryByRole('tab', { name: /directives/i });

describe('directives panel', () => {
  it('is hidden until HQ has issued something', () => {
    setup();
    expect(tab()).toBeNull();
  });

  it('shows the active directive with progress, time left and reward', async () => {
    const user = setup({ elapsed: 60, lifetimeOre: 37, directive: { id: first.id, issuedAt: 0, baseline: 0 } });
    await user.click(tab()!);
    const active = screen.getByRole('region', { name: /active directive/i });
    expect(within(active).getByText(new RegExp(first.title))).toBeTruthy();
    expect(within(active).getByText(first.brief)).toBeTruthy();
    expect(within(active).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('37');
    expect(within(active).getByText(/4m 00s/)).toBeTruthy();
    expect(within(active).getByText(/75 CR/)).toBeTruthy();
  });

  it('lists past directives with their outcome', async () => {
    const user = setup({ directiveResults: { [first.id]: 'completed', [DIRECTIVES[1]!.id]: 'failed' }, lastDirectiveAt: 0 });
    await user.click(tab()!);
    const history = screen.getByRole('list', { name: /directive history/i });
    expect(within(history).getByText(/ESTABLISH EXTRACTION/).closest('li')!.textContent).toMatch(/COMPLETE/);
    expect(within(history).getByText(/FLEET DEPLOYMENT/).closest('li')!.textContent).toMatch(/LAPSED/);
    expect(screen.getByText(/awaiting transmission/i)).toBeTruthy();
  });
});
