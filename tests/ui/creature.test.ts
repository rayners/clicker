// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, type GameState } from '../../src/core/game';
import { startCreature } from '../../src/core/creature';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { veteran } from '../helpers';
import { CREATURE_UPGRADES } from '../../src/data/creature/upgrades';

let store: Store;

function setup(game: GameState) {
  document.body.innerHTML = '<div id="app"></div>';
  store = createStore(game);
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}
const hunting = (patch: Partial<NonNullable<GameState['creature']>['hunt']> = {}) => {
  const g = startCreature(createGame(1, 0), 3);
  return { ...g, creature: { ...g.creature!, hunt: { ...g.creature!.hunt, ...patch } } };
};
const view = () => within(screen.getByRole('region', { name: /special order 0-77/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the creature on screen', () => {
  it('is reached from the configuration: accept Special Order 0-77', async () => {
    const user = setup(veteran(createGame(1, 0)));
    await user.click(screen.getByRole('button', { name: /system configuration/i }));
    await user.click(screen.getByRole('button', { name: /accept special order 0-77/i }));
    expect(store.getState().mode).toBe('creature');
    expect(screen.getByRole('region', { name: /special order 0-77/i })).toBeTruthy();
  });

  it('shows every contract it stalks, each with what it has taken and its WARDEN\'s suspicion', () => {
    setup(hunting());
    const ships = view().getAllByRole('group');
    expect(ships).toHaveLength(3);
    expect(within(ships[0]!).getByText(/EXTRACTION/)).toBeTruthy();
    expect(within(ships[1]!).getByLabelText(/taken from/i)).toBeTruthy();
    expect(within(ships[2]!).getByLabelText(/suspicion/i)).toBeTruthy();
  });

  it('stalks a contract one step at a time, within its strength', async () => {
    const user = setup(hunting());
    const first = view().getAllByRole('group')[0]!;
    await user.click(within(first).getByRole('button', { name: /stalk .* harder/i }));
    expect(store.getState().creature!.hunt.split[0]).toBe(1);
    expect(view().getByLabelText('Strength free').textContent).toBe('2 / 3');
    await user.click(within(first).getByRole('button', { name: /ease off/i }));
    expect(store.getState().creature!.hunt.split[0]).toBe(0);
  });

  it('shows biomass, hunger and the whispers about it', () => {
    setup(hunting({ dread: 12, hunger: 40, notoriety: 0.5 }));
    expect(view().getByLabelText('Biomass').textContent).toBe('12');
    expect(view().getByLabelText('Hunger').textContent).toBe('40%');
    expect(view().getByLabelText('Whispers').textContent).toBe('0.50');
  });

  it('goes dormant and wakes', async () => {
    const user = setup(hunting());
    await user.click(view().getByRole('button', { name: /^go dormant$/i }));
    expect(store.getState().creature!.hunt.dormant).toBe(true);
    await user.click(view().getByRole('button', { name: /^wake$/i }));
    expect(store.getState().creature!.hunt.dormant).toBe(false);
  });

  it('evolves with biomass', async () => {
    const user = setup(hunting({ dread: 1_000 }));
    const first = CREATURE_UPGRADES[0]!;
    await user.click(view().getByRole('button', { name: new RegExp(`evolve ${first.name}`, 'i') }));
    expect(store.getState().creature!.bought[first.id]).toBe(1);
  });

  it('returns to the contract', async () => {
    const user = setup(hunting());
    await user.click(view().getByRole('button', { name: /return to the contract/i }));
    expect(store.getState().mode).toBe('mission');
    expect(screen.queryByRole('region', { name: /special order 0-77/i })).toBeNull();
  });

  it('ends the hunt for Legend, after a confirming second tap', async () => {
    const user = setup(hunting({ harvest: 400 }));
    await user.click(view().getByRole('button', { name: /end the hunt for 4 legend/i }));
    expect(store.getState().creature).not.toBeNull();
    await user.click(view().getByRole('button', { name: /^confirm/i }));
    expect(store.getState().creature).toBeNull();
    expect(store.getState().profile.legend.creature).toBe(4);
  });
});
