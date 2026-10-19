// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import type { MissionOf } from '../../src/mission/state';

type MissionState = MissionOf<'extraction', 'organism'>;

let store: Store;
let root: HTMLElement;

function setup(mission: Partial<MissionState> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
  const g = createGame(1, 0);
  store = createStore({ ...g, mission: { ...g.mission, ...mission } });
  mountApp(root, store);
  return userEvent.setup();
}

const tab = (name: RegExp) => screen.queryByRole('tab', { name });
const unlocked = { flags: ['specimens'], credits: 1e12, act: 3 };

const mission = () => store.getState().mission as MissionState;

describe('special projects panel', () => {
  it('is hidden until special projects begins', () => {
    setup();
    expect(tab(/special projects/i)).toBeNull();
  });

  it('commissions recovery rigs and shows specimens held', async () => {
    const user = setup({ ...unlocked, specimens: 3.4 });
    await user.click(tab(/special projects/i)!);
    expect(screen.getByLabelText('Specimens held').textContent).toBe('3');
    await user.click(screen.getByRole('button', { name: /commission recovery rig/i }));
    expect(mission().rigs).toBe(1);
  });

  it('shows containment integrity and reinforces it', async () => {
    const user = setup({ ...unlocked, specimens: 2, integrity: 40 });
    await user.click(tab(/special projects/i)!);
    expect(screen.getByRole('meter', { name: /containment integrity/i }).getAttribute('aria-valuenow')).toBe('40');
    await user.click(screen.getByRole('button', { name: /reinforce containment/i }));
    expect(mission().integrity).toBe(65);
    await user.click(screen.getByRole('button', { name: /upgrade containment/i }));
    expect(mission().containmentLevel).toBe(1);
  });

  it('offers venting only when something is loose, warning about awake crew', async () => {
    const g = createGame(1, 0);
    const user = setup({ ...unlocked, flags: ['specimens', 'tracker'], contacts: 0 });
    await user.click(tab(/special projects/i)!);
    expect(screen.queryByRole('button', { name: /vent decks/i })).toBeNull();
    store.replace({
      ...store.getState(),
      mission: { ...mission(), contacts: 4, crew: { ...g.mission.crew, lam: { status: 'awake', fatigue: 0 } } },
    });
    expect(screen.getByRole('img', { name: /motion tracker: 4 contacts/i })).toBeTruthy();
    expect(screen.getByText(/1 crew awake/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /vent decks/i }));
    expect(mission().vents).toBe(1);
  });
});

describe('archive panel', () => {
  it('appears once a file is available and reveals its contents', async () => {
    const user = setup();
    expect(tab(/archive/i)).toBeNull();
    store.replace({ ...store.getState(), mission: { ...store.getState().mission, act: 2, lifetimeOre: 1e7 } });
    await user.click(tab(/archive/i)!);
    expect(screen.getByText('CREW CONTRACT KA-7781')).toBeTruthy();
    expect(screen.queryByText('SPECIAL ORDER 0-77')).toBeNull();
  });

  it('shows Special Order 0-77 once unsealed', async () => {
    const user = setup({ act: 4, flags: ['archive-0-77'] });
    await user.click(tab(/archive/i)!);
    await user.click(screen.getByText('SPECIAL ORDER 0-77'));
    expect(screen.getByText(/crew survival is not a mission parameter/i)).toBeTruthy();
  });
});

describe('infestation presentation', () => {
  it('shows lost crew as lost, with no way to wake them', async () => {
    const g = createGame(1, 0);
    const user = setup({ lifetimeCredits: 1e6, crew: { ...g.mission.crew, brandt: { status: 'lost', fatigue: 0 } } });
    await user.click(tab(/crew/i)!);
    const card = screen.getByRole('article', { name: /teodor brandt/i });
    expect(within(card).getByText('LOST')).toBeTruthy();
    expect((within(card).getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows unknown contacts in the status area once tracking is enabled', () => {
    setup({ flags: ['tracker'], contacts: 2, act: 4 });
    expect(within(screen.getByRole('region', { name: /ship status/i })).getByLabelText('Unknown contacts').textContent).toBe('2');
    expect(root.dataset.alert).toBe('true');
  });

  it('hides the contacts stat before tracking is enabled', () => {
    setup();
    const stat = within(screen.getByRole('region', { name: /ship status/i })).getByLabelText('Unknown contacts');
    expect(stat.closest('[hidden]')).not.toBeNull();
    expect(root.dataset.alert).toBe('false');
  });
});
