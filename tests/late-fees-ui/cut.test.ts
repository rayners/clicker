// @vitest-environment jsdom
import { member, confirmPause } from '../helpers';
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { newLateGame, type LateGame } from '../../src/late-fees/game';
import { startCut } from '../../src/late-fees/cut';
import { createLateStore, type LateStore } from '../../src/late-fees/store';
import { mountLate } from '../../src/late-fees-ui/app';
import { CUT_UPGRADES } from '../../src/late-fees-data/cut-upgrades';

let store: LateStore;

function setup(game: LateGame) {
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
  store = createLateStore(game);
  mountLate(document.getElementById('app')!, store);
  return userEvent.setup();
}
const inCut = (patch: Partial<NonNullable<LateGame['cut']>['hunt']> = {}) => {
  const g = startCut(newLateGame(1, 0), 'drowned', 3);
  return { ...g, cut: { ...g.cut!, hunt: { ...g.cut!.hunt, ...patch } } };
};
const cutView = () => within(screen.getByRole('region', { name: /the killer's cut/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe("the Killer's Cut on screen", () => {
  it('is on side B of the shelf: pick a killer to flip the tape', async () => {
    const user = setup(member(newLateGame(1, 0)));
    const shelf = within(screen.getByRole('dialog', { name: /horror/i }));
    await user.click(shelf.getByRole('button', { name: /play as the burned man/i }));
    expect(store.getState().mode).toBe('cut');
    expect(store.getState().cut!.killer).toBe('burned');
    expect(screen.getByRole('region', { name: /the killer's cut/i })).toBeTruthy();
  });

  it('shows every place being haunted, each with its film, act, alarm and dead', () => {
    setup(inCut());
    const places = cutView().getAllByRole('group');
    expect(places).toHaveLength(3);
    expect(within(places[0]!).getByText('FRIDAY THE 12TH')).toBeTruthy();
    expect(within(places[1]!).getByText(/CHECKED IN/)).toBeTruthy();
    expect(within(places[2]!).getByLabelText(/dead at/i)).toBeTruthy();
  });

  it('pushes a place one step at a time, within the killer\'s strength', async () => {
    const user = setup(inCut());
    const camp = cutView().getAllByRole('group')[0]!;
    await user.click(within(camp).getByRole('button', { name: /push harder at friday the 12th/i }));
    expect(store.getState().cut!.hunt.split[0]).toBe(1);
    await user.click(within(camp).getByRole('button', { name: /ease off friday the 12th/i }));
    expect(store.getState().cut!.hunt.split[0]).toBe(0);
    expect(cutView().getByLabelText('Strength free').textContent).toBe('3 / 3');
  });

  it('shows dread, hunger and notoriety', () => {
    setup(inCut({ dread: 42, hunger: 55, notoriety: 1.25 }));
    expect(cutView().getByLabelText('Dread').textContent).toBe('42');
    expect(cutView().getByLabelText('Hunger').textContent).toBe('55%');
    expect(cutView().getByLabelText('Notoriety').textContent).toBe('1.25');
  });

  it('goes to ground and wakes again', async () => {
    const user = setup(inCut());
    await user.click(cutView().getByRole('button', { name: /go to ground/i }));
    expect(store.getState().cut!.hunt.dormant).toBe(true);
    await user.click(cutView().getByRole('button', { name: /wake/i }));
    expect(store.getState().cut!.hunt.dormant).toBe(false);
  });

  it('buys upgrades with dread', async () => {
    const user = setup(inCut({ dread: 1_000 }));
    const first = CUT_UPGRADES[0]!;
    await user.click(cutView().getByRole('button', { name: new RegExp(`buy ${first.name}`, 'i') }));
    expect(store.getState().cut!.bought[first.id]).toBe(1);
  });

  it('says when the killer has been put down and is lying low', () => {
    setup(inCut({ beatenFor: 300 }));
    expect(cutView().getByText(/LYING LOW/)).toBeTruthy();
  });

  it('ejects back to the shelf', async () => {
    const user = setup(inCut());
    await user.click(cutView().getByRole('button', { name: /eject/i }));
    expect(store.getState().mode).toBe('films');
    expect(screen.getByRole('dialog', { name: /horror/i })).toBeTruthy();
  });

  it('ends the cut for Legend, after a confirming second tap', async () => {
    const user = setup(inCut({ harvest: 400 }));
    await user.click(cutView().getByRole('button', { name: /end the cut for 4 legend/i }));
    expect(store.getState().cut).not.toBeNull();
    await confirmPause();
    await user.click(cutView().getByRole('button', { name: /^confirm/i }));
    expect(store.getState().cut).toBeNull();
    expect(store.getState().profile.legend.drowned).toBe(4);
  });

  it('has its own guide: it starts by pointing at the first place to push, and moves on once the killer pushes', async () => {
    const user = setup(inCut());
    const guide = within(cutView().getByRole('region', { name: /guide/i }));
    expect(guide.getByText('PUSH')).toBeTruthy();
    const push = cutView().getAllByRole('button', { name: /push harder at/i })[0]!;
    expect(push.classList.contains('guide-target')).toBe(true);
    await user.click(push);
    expect(within(cutView().getByRole('region', { name: /guide/i })).getByText('HUNGER')).toBeTruthy();
  });

  it("keeps the cut's rules one tap away in its header", async () => {
    const user = setup(inCut());
    await user.click(cutView().getByRole('button', { name: /how this works/i }));
    expect(screen.getByRole('dialog', { name: /how the killer's cut works/i })).toBeTruthy();
  });
});
