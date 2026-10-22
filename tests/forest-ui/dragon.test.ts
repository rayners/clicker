// @vitest-environment jsdom
import { seasoned } from '../helpers';
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createForestGame, type ForestGame } from '../../src/forest/game';
import { wakeDragon } from '../../src/forest/dragon';
import { createForestStore, type ForestStore } from '../../src/forest/store';
import { mountForest } from '../../src/forest-ui/app';
import { DRAGON_UPGRADES } from '../../src/forest-data/dragon-upgrades';

let store: ForestStore;

function setup(game: ForestGame) {
  document.body.innerHTML = '<div id="app"></div>';
  store = createForestStore(game);
  mountForest(document.getElementById('app')!, store);
  return userEvent.setup();
}
const awake = (patch: Partial<NonNullable<ForestGame['dragon']>['hunt']> = {}) => {
  const g = wakeDragon(createForestGame(1, 0), 3);
  return { ...g, dragon: { ...g.dragon!, hunt: { ...g.dragon!.hunt, ...patch } } };
};
const lair = () => within(screen.getByRole('region', { name: /the hoard/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the dragon on screen', () => {
  it('is woken from the configuration', async () => {
    const user = setup(seasoned(createForestGame(1, 0)));
    await user.click(screen.getByRole('button', { name: /^configuration$/i }));
    await user.click(screen.getByRole('button', { name: /wake the dragon/i }));
    expect(store.getState().mode).toBe('dragon');
    expect(screen.getByRole('region', { name: /the hoard/i })).toBeTruthy();
  });

  it('shows every company it watches, each with its vault and how often it has been raided', () => {
    setup(awake());
    const companies = lair().getAllByRole('group');
    expect(companies).toHaveLength(3);
    expect(within(companies[0]!).getByText(/ASHEN KEY/)).toBeTruthy();
    expect(within(companies[1]!).getByLabelText(/vault of/i)).toBeTruthy();
    expect(within(companies[2]!).getByLabelText(/raids on/i).textContent).toMatch(/0 RAIDS/);
  });

  it('turns its wings on a company one step at a time, within its strength', async () => {
    const user = setup(awake());
    const first = lair().getAllByRole('group')[0]!;
    await user.click(within(first).getByRole('button', { name: /circle closer over/i }));
    expect(store.getState().dragon!.hunt.split[0]).toBe(1);
    await user.click(within(first).getByRole('button', { name: /turn away from/i }));
    expect(store.getState().dragon!.hunt.split[0]).toBe(0);
    expect(lair().getByLabelText('Strength free').textContent).toBe('3 / 3');
  });

  it('shows the hoard, hunger and the slayers gathering', () => {
    setup(awake({ dread: 14.6, hunger: 30, notoriety: 2 }));
    expect(lair().getByLabelText('Hoard').textContent).toBe('14');
    expect(lair().getByLabelText('Hunger').textContent).toBe('30%');
    expect(lair().getByLabelText('Slayers').textContent).toBe('2.00');
  });

  it('sleeps on the hoard and wakes, grows, and returns to the ledger', async () => {
    const user = setup(awake({ dread: 1_000 }));
    await user.click(lair().getByRole('button', { name: /^sleep on the hoard$/i }));
    expect(store.getState().dragon!.hunt.dormant).toBe(true);
    await user.click(lair().getByRole('button', { name: /^wake$/i }));
    expect(store.getState().dragon!.hunt.dormant).toBe(false);
    const first = DRAGON_UPGRADES[0]!;
    await user.click(lair().getByRole('button', { name: new RegExp(`grow ${first.name}`, 'i') }));
    expect(store.getState().dragon!.bought[first.id]).toBe(1);
    await user.click(lair().getByRole('button', { name: /return to the ledger/i }));
    expect(store.getState().mode).toBe('charter');
  });

  it('ends the hunt for Legend, after a confirming second tap', async () => {
    const user = setup(awake({ harvest: 400 }));
    await user.click(lair().getByRole('button', { name: /end the hunt for 4 legend/i }));
    expect(store.getState().dragon).not.toBeNull();
    await user.click(lair().getByRole('button', { name: /confirm/i }));
    expect(store.getState().dragon).toBeNull();
    expect(store.getState().profile.legend.dragon).toBe(4);
  });
});
