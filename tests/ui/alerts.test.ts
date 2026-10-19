// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { mountApp } from '../../src/ui/app';
import { DIRECTIVES } from '../../src/data/extraction/directives';
import { CRYO_UNLOCK_CREDITS } from '../../src/mission/crew';
import type { ExtractionGameMission } from '../helpers';

let store: Store;
const first = DIRECTIVES[0]!;

function setup(patch: Partial<ExtractionGameMission> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createGame(1, 0);
  store = createStore({ ...g, mission: { ...g.mission, ...patch } as typeof g.mission });
  mountApp(document.getElementById('app')!, store);
  return userEvent.setup();
}

const tab = (name: RegExp) => screen.getByRole('tab', { name });
const alerts = () => screen.getByRole('region', { name: /alerts/i });
const active = { elapsed: 60, lifetimeOre: 37, directive: { id: first.id, issuedAt: 0, baseline: 0 } };
const crewUnlocked = { lifetimeCredits: CRYO_UNLOCK_CREDITS, credits: 1e6 };

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('directive attention', () => {
  it('marks the directives tab while a directive is active', () => {
    setup(active);
    expect(tab(/directives/i).dataset.attention).toBe('active');
    expect(tab(/directives/i).getAttribute('aria-label')).toMatch(/active/i);
  });

  it('clears the mark when no directive is running', () => {
    setup({ directiveResults: { [first.id]: 'completed' }, lastDirectiveAt: 0 });
    expect(tab(/directives/i).dataset.attention).toBeUndefined();
  });

  it('shows the active directive with a progress bar at the top of the screen', () => {
    setup(active);
    const bar = within(alerts()).getByRole('progressbar', { name: /directive/i });
    expect(bar.getAttribute('aria-valuenow')).toBe('37');
    expect(bar.getAttribute('aria-valuemax')).toBe(String(first.goal.target));
    expect(alerts().textContent).toContain(first.id.toUpperCase());
  });

  it('opens the directives panel when the summary is tapped', async () => {
    const user = setup(active);
    await user.click(within(alerts()).getByRole('button', { name: /directive/i }));
    expect(tab(/directives/i).getAttribute('aria-selected')).toBe('true');
  });

  it('shows nothing at the top when there is nothing to report', () => {
    setup();
    expect(screen.queryByRole('region', { name: /alerts/i })).toBeNull();
  });
});

describe('fatigue attention', () => {
  const awake = (fatigue: number) => {
    const g = createGame(1, 0);
    return { ...crewUnlocked, crew: { ...g.mission.crew, sorensen: { status: 'awake' as const, fatigue } } };
  };

  it('marks the crew tab and names exhausted crew at the top', () => {
    setup(awake(100));
    expect(tab(/crew/i).dataset.attention).toBe('alert');
    expect(alerts().textContent).toMatch(/SORENSEN EXHAUSTED/);
  });

  it('warns gently when awake crew are tiring', () => {
    setup(awake(85));
    expect(tab(/crew/i).dataset.attention).toBe('active');
    expect(alerts().textContent).toMatch(/1 CREW TIRING/);
  });

  it('says nothing about rested crew', () => {
    setup(awake(10));
    expect(tab(/crew/i).dataset.attention).toBeUndefined();
  });

  it('opens the crew panel when the fatigue alert is tapped', async () => {
    const user = setup(awake(100));
    await user.click(within(alerts()).getByRole('button', { name: /crew/i }));
    expect(tab(/crew/i).getAttribute('aria-selected')).toBe('true');
  });
});
