// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, type GameState } from '../../src/core/game';
import { startHunter } from '../../src/core/hunter';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { veteran, confirmPause } from '../helpers';
import { HUNTER_UPGRADES } from '../../src/data/hunter/upgrades';

let store: Store;

function setup(game: GameState) {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  store = createStore(game);
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}
const hunting = (patch: Partial<NonNullable<GameState['hunter']>['hunt']> = {}) => {
  const g = startHunter(createGame(1, 0), 3);
  return { ...g, hunter: { ...g.hunter!, hunt: { ...g.hunter!.hunt, ...patch } } };
};
const view = () => within(screen.getByRole('region', { name: /the hunt/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the hunter on screen', () => {
  it('is reached from the restricted files in the masthead: accept the hunt', async () => {
    const user = setup(veteran(createGame(1, 0)));
    await user.click(screen.getByRole('button', { name: /restricted files/i }));
    await user.click(screen.getByRole('button', { name: /accept the hunt/i }));
    expect(store.getState().mode).toBe('hunter');
    expect(screen.getByRole('region', { name: /the hunt/i })).toBeTruthy();
  });

  it('shows every crew it stalks, with their trophies taken and how alert they are', () => {
    setup(hunting());
    const ships = view().getAllByRole('group');
    expect(ships).toHaveLength(3);
    expect(within(ships[0]!).getByLabelText(/trophies from/i)).toBeTruthy();
    expect(within(ships[1]!).getByLabelText(/alert aboard/i)).toBeTruthy();
    expect(within(ships[0]!).getByText(/UNAWARE/)).toBeTruthy();
  });

  it('stalks a crew one step at a time, within its strength', async () => {
    const user = setup(hunting());
    const first = view().getAllByRole('group')[0]!;
    await user.click(within(first).getByRole('button', { name: /stalk .* closer/i }));
    expect(store.getState().hunter!.hunt.split[0]).toBe(1);
    await user.click(within(first).getByRole('button', { name: /fall back from/i }));
    expect(store.getState().hunter!.hunt.split[0]).toBe(0);
    expect(view().getByLabelText('Strength free').textContent).toBe('3 / 3');
  });

  it('shows trophies, hunger and the stories the crews tell', () => {
    setup(hunting({ dread: 9, hunger: 55, notoriety: 1.25 }));
    expect(view().getByLabelText('Trophies').textContent).toBe('9');
    expect(view().getByLabelText('Hunger').textContent).toBe('55%');
    expect(view().getByLabelText('Stories').textContent).toBe('1.25');
  });

  it('withdraws and returns, grows with trophies, and goes back to the contract', async () => {
    const user = setup(hunting({ dread: 1_000 }));
    await user.click(view().getByRole('button', { name: /^withdraw$/i }));
    expect(store.getState().hunter!.hunt.dormant).toBe(true);
    await user.click(view().getByRole('button', { name: /^return to the hunt$/i }));
    expect(store.getState().hunter!.hunt.dormant).toBe(false);
    const first = HUNTER_UPGRADES[0]!;
    await user.click(view().getByRole('button', { name: new RegExp(`take ${first.name}`, 'i') }));
    expect(store.getState().hunter!.bought[first.id]).toBe(1);
    await user.click(view().getByRole('button', { name: /return to the contract/i }));
    expect(store.getState().mode).toBe('mission');
  });

  it('ends the hunt for Legend, after a confirming second tap', async () => {
    const user = setup(hunting({ harvest: 400 }));
    await user.click(view().getByRole('button', { name: /end the hunt for 4 legend/i }));
    expect(store.getState().hunter).not.toBeNull();
    await confirmPause();
    await user.click(view().getByRole('button', { name: /^confirm/i }));
    expect(store.getState().hunter).toBeNull();
    expect(store.getState().profile.legend.hunter).toBe(4);
  });

  it('says how many contracts unlock the restricted orders before they open, once the first contract is done', async () => {
    const g = createGame(1, 0);
    const user = setup({ ...g, profile: { ...g.profile, contractsCompleted: 1 } });
    await user.click(screen.getByRole('button', { name: /restricted files/i }));
    const hunt = screen.getByRole('button', { name: /accept the hunt/i }) as HTMLButtonElement;
    expect(hunt.disabled).toBe(true);
    expect(hunt.textContent).toMatch(/AFTER 5 CONTRACTS/);
    expect((screen.getByRole('button', { name: /accept special order 0-77/i }) as HTMLButtonElement).textContent).toMatch(/AFTER 3 CONTRACTS/);
  });

  it('has its own guide: it starts by pointing at the first ship, and moves on once pushed', async () => {
    const user = setup(hunting());
    const push = view().getAllByRole('button', { name: /^stalk .* closer$/i })[0]!;
    expect(within(view().getByRole('region', { name: /guide/i })).getByText('PUSH')).toBeTruthy();
    expect(push.classList.contains('guide-target')).toBe(true);
    await user.click(push);
    expect(within(view().getByRole('region', { name: /guide/i })).getByText('HUNGER')).toBeTruthy();
  });

  it('keeps its rules one tap away in its header', async () => {
    const user = setup(hunting());
    await user.click(view().getByRole('button', { name: /how this works/i }));
    expect(screen.getByRole('dialog', { name: /how the hunt works/i })).toBeTruthy();
  });
});
