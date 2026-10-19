// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, type GameState } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { CRYO_UNLOCK_CREDITS, MAX_AWAKE } from '../../src/mission/crew';

let store: Store;

function setup(mission: Partial<GameState['mission']> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createGame(1, 0);
  store = createStore({ ...g, mission: { ...g.mission, ...mission } as typeof g.mission });
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

const crewTab = () => screen.queryByRole('tab', { name: /crew/i });
const card = (name: RegExp) => screen.getByRole('article', { name });

describe('crew panel', () => {
  it('is hidden until the cryo bay is accessible', () => {
    setup();
    expect(crewTab()).toBeNull();
    store.replace({ ...store.getState(), mission: { ...store.getState().mission, lifetimeCredits: CRYO_UNLOCK_CREDITS } });
    expect(crewTab()).not.toBeNull();
  });

  it('shows all seven crew, in cryo', async () => {
    const user = setup({ lifetimeCredits: CRYO_UNLOCK_CREDITS });
    await user.click(crewTab()!);
    expect(screen.getAllByRole('article').length).toBe(7);
    expect(within(card(/sorensen/i)).getByText('CRYO')).toBeTruthy();
    expect(screen.getByText(`AWAKE 0/${MAX_AWAKE}`)).toBeTruthy();
  });

  it('wakes a crew member and can put them back', async () => {
    const user = setup({ lifetimeCredits: CRYO_UNLOCK_CREDITS, credits: 10_000 });
    await user.click(crewTab()!);
    await user.click(screen.getByRole('button', { name: /wake dmitri sorensen/i }));
    expect(within(card(/sorensen/i)).getByText('AWAKE')).toBeTruthy();
    expect(screen.getByText(`AWAKE 1/${MAX_AWAKE}`)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /return dmitri sorensen to cryo/i }));
    expect(within(card(/sorensen/i)).getByText('CRYO')).toBeTruthy();
  });

  it('disables waking when it cannot be afforded', async () => {
    const user = setup({ lifetimeCredits: CRYO_UNLOCK_CREDITS, credits: 0 });
    await user.click(crewTab()!);
    expect((screen.getByRole('button', { name: /wake dmitri sorensen/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows fatigue as a meter', async () => {
    const g = createGame(1, 0);
    const user = setup({
      lifetimeCredits: CRYO_UNLOCK_CREDITS,
      crew: { ...g.mission.crew, sorensen: { status: 'awake', fatigue: 40 } },
    });
    await user.click(crewTab()!);
    const meter = within(card(/sorensen/i)).getByRole('meter', { name: /fatigue/i });
    expect(meter.getAttribute('aria-valuenow')).toBe('40');
  });

  it('marks exhausted crew', async () => {
    const g = createGame(1, 0);
    const user = setup({
      lifetimeCredits: CRYO_UNLOCK_CREDITS,
      crew: { ...g.mission.crew, sorensen: { status: 'awake', fatigue: 100 } },
    });
    await user.click(crewTab()!);
    expect(within(card(/sorensen/i)).getByText('EXHAUSTED')).toBeTruthy();
  });
});
