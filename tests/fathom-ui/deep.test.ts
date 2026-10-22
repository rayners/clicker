// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createFathomGame, type FathomGame } from '../../src/fathom/game';
import { DEEP_TOWNS, startDeep } from '../../src/fathom/deep';
import { createFathomStore, type FathomStore } from '../../src/fathom/store';
import { mountFathom } from '../../src/fathom-ui/app';
import { applyFathomScenario } from '../../src/fathom/debug';
import { DEEP_UPGRADES } from '../../src/fathom-data/deep-upgrades';

let store: FathomStore;

function setup(game: FathomGame) {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  store = createFathomStore(game);
  mountFathom(document.getElementById('app')!, store);
  return userEvent.setup();
}
const inDeep = (patch: Partial<NonNullable<FathomGame['deep']>['hunt']> = {}) => {
  const g = startDeep(createFathomGame(1, 0), 3);
  return { ...g, deep: { ...g.deep!, hunt: { ...g.deep!.hunt, ...patch } } };
};
const source = () => within(screen.getByRole('region', { name: /the source/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the Source on screen', () => {
  it('is reached from the configuration: answer the Source', async () => {
    const user = setup(applyFathomScenario(createFathomGame(1, 0), 'veteran'));
    await user.click(screen.getByRole('button', { name: /^configuration$/i }));
    await user.click(screen.getByRole('button', { name: /answer the source/i }));
    expect(store.getState().mode).toBe('deep');
    expect(screen.getByRole('region', { name: /the source/i })).toBeTruthy();
  });

  it('shows every town, each with its season, its act and its drowned', () => {
    setup(inDeep());
    const towns = source().getAllByRole('group');
    expect(towns).toHaveLength(DEEP_TOWNS.length);
    expect(within(towns[0]!).getByText(new RegExp(DEEP_TOWNS[0]))).toBeTruthy();
    expect(within(towns[1]!).getByLabelText(/drowned at/i)).toBeTruthy();
    expect(within(towns[2]!).getByText(/SEASON 1/)).toBeTruthy();
  });

  it('pushes on a town one step at a time, within the Source\'s strength', async () => {
    const user = setup(inDeep());
    const first = source().getAllByRole('group')[0]!;
    await user.click(within(first).getByRole('button', { name: /rise under/i }));
    expect(store.getState().deep!.hunt.split[0]).toBe(1);
    await user.click(within(first).getByRole('button', { name: /sink away from/i }));
    expect(store.getState().deep!.hunt.split[0]).toBe(0);
    expect(source().getByLabelText('Strength free').textContent).toBe('3 / 3');
  });

  it('shows the drowned, hunger and the sightings', () => {
    setup(inDeep({ dread: 12, hunger: 40, notoriety: 0.5 }));
    expect(source().getByLabelText('The drowned').textContent).toBe('12');
    expect(source().getByLabelText('Hunger').textContent).toBe('40%');
    expect(source().getByLabelText('Sightings').textContent).toBe('0.50');
  });

  it('sinks into the dark and rises again', async () => {
    const user = setup(inDeep());
    await user.click(source().getByRole('button', { name: /^sink$/i }));
    expect(store.getState().deep!.hunt.dormant).toBe(true);
    await user.click(source().getByRole('button', { name: /^rise$/i }));
    expect(store.getState().deep!.hunt.dormant).toBe(false);
  });

  it('grows with the drowned', async () => {
    const user = setup(inDeep({ dread: 1_000 }));
    const first = DEEP_UPGRADES[0]!;
    await user.click(source().getByRole('button', { name: new RegExp(`grow ${first.name}`, 'i') }));
    expect(store.getState().deep!.bought[first.id]).toBe(1);
  });

  it('returns to the season', async () => {
    const user = setup(inDeep());
    await user.click(source().getByRole('button', { name: /return to the surface/i }));
    expect(store.getState().mode).toBe('season');
  });

  it('ends the hunt for Legend, after a confirming second tap', async () => {
    const user = setup(inDeep({ harvest: 400 }));
    const end = source().getByRole('button', { name: /end the hunt for 4 legend/i });
    await user.click(end);
    expect(store.getState().deep).not.toBeNull();
    await user.click(source().getByRole('button', { name: /confirm/i }));
    expect(store.getState().deep).toBeNull();
    expect(store.getState().profile.legend.deep).toBe(4);
  });

  it('says how many seasons open the Source before then', async () => {
    const user = setup(createFathomGame(1, 0));
    await user.click(screen.getByRole('button', { name: /^configuration$/i }));
    const answer = screen.getByRole('button', { name: /answer the source/i }) as HTMLButtonElement;
    expect(answer.disabled).toBe(true);
    expect(answer.textContent).toMatch(/AFTER 2 SEASONS/);
  });

  it('has its own guide: it starts by pointing at the first town, and moves on once pushed', async () => {
    const user = setup(inDeep());
    const push = source().getAllByRole('button', { name: /^rise under/i })[0]!;
    expect(within(source().getByRole('region', { name: /guide/i })).getByText('PUSH')).toBeTruthy();
    expect(push.classList.contains('guide-target')).toBe(true);
    await user.click(push);
    expect(within(source().getByRole('region', { name: /guide/i })).getByText('HUNGER')).toBeTruthy();
  });

  it('keeps its rules one tap away in its header', async () => {
    const user = setup(inDeep());
    await user.click(source().getByRole('button', { name: /how this works/i }));
    expect(screen.getByRole('dialog', { name: /how the source works/i })).toBeTruthy();
  });
});
