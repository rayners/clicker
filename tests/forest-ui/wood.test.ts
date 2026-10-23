// @vitest-environment jsdom
import { seasoned, confirmPause } from '../helpers';
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createForestGame, type ForestGame } from '../../src/forest/game';
import { startWood } from '../../src/forest/wood';
import { createForestStore, type ForestStore } from '../../src/forest/store';
import { mountForest } from '../../src/forest-ui/app';
import { WOOD_UPGRADES } from '../../src/forest-data/wood-upgrades';

let store: ForestStore;

function setup(game: ForestGame) {
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
  store = createForestStore(game);
  mountForest(document.getElementById('app')!, store);
  return userEvent.setup();
}
const inWood = (patch: Partial<NonNullable<ForestGame['wood']>['hunt']> = {}) => {
  const g = startWood(createForestGame(1, 0), 3);
  return { ...g, wood: { ...g.wood!, hunt: { ...g.wood!.hunt, ...patch } } };
};
const woodView = () => within(screen.getByRole('region', { name: /the wood/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the wood on screen', () => {
  it('is reached from the configuration: listen to the wood', async () => {
    const user = setup(seasoned(createForestGame(1, 0)));
    await user.click(screen.getByRole('button', { name: /^configuration$/i }));
    await user.click(screen.getByRole('button', { name: /listen to the wood/i }));
    expect(store.getState().mode).toBe('wood');
    expect(screen.getByRole('region', { name: /the wood/i })).toBeTruthy();
  });

  it('shows every company under charter, each with its act, its lost hands and its blight', () => {
    setup(inWood());
    const companies = woodView().getAllByRole('group');
    expect(companies).toHaveLength(3);
    expect(within(companies[0]!).getByText(/ASHEN KEY/)).toBeTruthy();
    expect(within(companies[1]!).getByLabelText(/hands lost/i)).toBeTruthy();
    expect(within(companies[2]!).getByLabelText(/blight/i)).toBeTruthy();
  });

  it('leans on a company one step at a time, within the wood\'s strength', async () => {
    const user = setup(inWood());
    const first = woodView().getAllByRole('group')[0]!;
    await user.click(within(first).getByRole('button', { name: /lean harder on/i }));
    expect(store.getState().wood!.hunt.split[0]).toBe(1);
    await user.click(within(first).getByRole('button', { name: /ease off/i }));
    expect(store.getState().wood!.hunt.split[0]).toBe(0);
    expect(woodView().getByLabelText('Strength free').textContent).toBe('3 / 3');
  });

  it('shows sap, hunger and the town\'s fear', () => {
    setup(inWood({ dread: 12, hunger: 40, notoriety: 0.5 }));
    expect(woodView().getByLabelText('Sap').textContent).toBe('12');
    expect(woodView().getByLabelText('Hunger').textContent).toBe('40%');
    expect(woodView().getByLabelText('Fear').textContent).toBe('0.50');
  });

  it('sleeps and wakes', async () => {
    const user = setup(inWood());
    await user.click(woodView().getByRole('button', { name: /^sleep$/i }));
    expect(store.getState().wood!.hunt.dormant).toBe(true);
    await user.click(woodView().getByRole('button', { name: /^wake$/i }));
    expect(store.getState().wood!.hunt.dormant).toBe(false);
  });

  it('grows with sap', async () => {
    const user = setup(inWood({ dread: 1_000 }));
    const first = WOOD_UPGRADES[0]!;
    await user.click(woodView().getByRole('button', { name: new RegExp(`grow ${first.name}`, 'i') }));
    expect(store.getState().wood!.bought[first.id]).toBe(1);
  });

  it('returns to the ledger', async () => {
    const user = setup(inWood());
    await user.click(woodView().getByRole('button', { name: /return to the ledger/i }));
    expect(store.getState().mode).toBe('charter');
  });

  it('ends the hunt for Legend, after a confirming second tap', async () => {
    const user = setup(inWood({ harvest: 400 }));
    await user.click(woodView().getByRole('button', { name: /end the hunt for 4 legend/i }));
    expect(store.getState().wood).not.toBeNull();
    await confirmPause();
    await user.click(woodView().getByRole('button', { name: /confirm/i }));
    expect(store.getState().wood).toBeNull();
    expect(store.getState().profile.legend.wood).toBe(4);
  });
});

describe('closed doors in the configuration', () => {
  it('say how many charters open the Keep, the wood and the dragon', async () => {
    const user = setup(createForestGame(1, 0));
    await user.click(screen.getByRole('button', { name: /^configuration$/i }));
    const keep = screen.getByRole('button', { name: /charter for morrowgate keep/i }) as HTMLButtonElement;
    expect(keep.disabled).toBe(true);
    expect(keep.textContent).toMatch(/AFTER 1 CHARTER$/);
    expect((screen.getByRole('button', { name: /listen to the wood/i }) as HTMLButtonElement).textContent).toMatch(/AFTER 2 CHARTERS/);
    expect((screen.getByRole('button', { name: /wake the dragon/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('has its own guide: it starts by pointing at the first company, and moves on once pushed', async () => {
    const user = setup(inWood());
    const push = woodView().getAllByRole('button', { name: /lean harder on/i })[0]!;
    expect(within(woodView().getByRole('region', { name: /guide/i })).getByText('PUSH')).toBeTruthy();
    expect(push.classList.contains('guide-target')).toBe(true);
    await user.click(push);
    expect(within(woodView().getByRole('region', { name: /guide/i })).getByText('HUNGER')).toBeTruthy();
  });

  it('keeps its rules one tap away in its header', async () => {
    const user = setup(inWood());
    await user.click(woodView().getByRole('button', { name: /how this works/i }));
    expect(screen.getByRole('dialog', { name: /how the wood works/i })).toBeTruthy();
  });
});
