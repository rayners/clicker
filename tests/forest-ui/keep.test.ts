// @vitest-environment jsdom
import { seasoned } from '../helpers';
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createForestGame, type ForestGame } from '../../src/forest/game';
import { createForestStore, type ForestStore } from '../../src/forest/store';
import { mountForest } from '../../src/forest-ui/app';
import { createCompany, KEEP, type Company } from '../../src/forest/state';
import { FLOORS } from '../../src/forest-data/keep';
import { oilPerTrip } from '../../src/forest/company';

let store: ForestStore;

function setup(patch: Partial<Company> = {}, site: 'forest' | 'keep' = 'keep', game: Partial<ForestGame> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createForestGame(1, 0);
  store = createForestStore({ ...g, ...game, company: { ...createCompany(1, undefined, site), ...patch } });
  mountForest(document.getElementById('app')!, store);
  return userEvent.setup();
}
const company = () => store.getState().company;
const crew = { blade: 12, mender: 2, scout: 2, mystic: 0, sapper: 0 };
const taken = (n: number) => FLOORS.map((_, i) => ({ control: i < n ? 1 : 0, garrison: 0, secured: i < n }));
const assault = () => within(screen.getByRole('article', { name: /assault/i }));
const floors = () => within(screen.getByRole('region', { name: /floors of the keep/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('Morrowgate Keep on screen', () => {
  it('is reached from the configuration: tear up the charter for one at the Keep, with a confirmation', async () => {
    const user = setup({}, 'forest', { profile: seasoned(createForestGame(1, 0)).profile });
    await user.click(screen.getByRole('button', { name: /configuration/i }));
    const dialog = within(screen.getByRole('dialog', { name: /configuration/i }));
    await user.click(dialog.getByRole('button', { name: /charter for morrowgate keep/i }));
    expect(company().site).toBe('forest');
    await user.click(dialog.getByRole('button', { name: /confirm/i }));
    expect(company().site).toBe('keep');
    expect(dialog.getByRole('button', { name: /charter for the forest/i })).toBeTruthy();
  });

  it('replaces the forest\'s regions with one assault on the frontier floor', () => {
    setup({ hired: crew, floors: taken(1) });
    expect(screen.queryByRole('article', { name: /the eaves/i })).toBeNull();
    expect(assault().getByRole('heading', { name: FLOORS[1]!.name })).toBeTruthy();
    expect(assault().getByLabelText(/cleared/i).textContent).toMatch(/0%/);
  });

  it('buys oil for a trip, and sends the party in', async () => {
    const user = setup({ hired: crew, silver: 500 });
    const need = oilPerTrip(company(), company().orders[KEEP]!);
    expect(assault().getByLabelText(/lamp oil/i).textContent).toMatch(/^0/);
    await user.click(assault().getByRole('button', { name: /buy oil for one trip/i }));
    expect(company().oil).toBeCloseTo(Math.ceil(need));
    await user.click(assault().getByRole('button', { name: /send a party into the keep/i }));
    expect(company().parties).toHaveLength(1);
    expect(company().parties[0]!.dark).toBe(0);
    const board = within(screen.getByRole('region', { name: /operations board/i }));
    expect(board.getByText(FLOORS[0]!.name)).toBeTruthy();
  });

  it('warns when the party would go into the dark', () => {
    setup({ hired: crew });
    expect(assault().getByText(/into the dark/i)).toBeTruthy();
  });

  it('changes the assault party one hand at a time', async () => {
    const user = setup({ hired: crew });
    const before = company().orders[KEEP]!.blade;
    await user.click(assault().getByRole('button', { name: /one more blade for the keep/i }));
    expect(company().orders[KEEP]!.blade).toBe(before + 1);
  });

  it('lists the floors taken, posts blades to hold them and calls them back', async () => {
    const user = setup({ hired: crew, floors: taken(2) });
    expect(floors().getAllByRole('listitem')).toHaveLength(3);
    await user.click(floors().getByRole('button', { name: /post a blade on the gatehouse/i }));
    await user.click(floors().getByRole('button', { name: /post a blade on the gatehouse/i }));
    expect(company().posted[0]).toBe(2);
    expect(floors().getByLabelText(/garrison of the gatehouse/i).textContent).toBe('6 / 8');
    await user.click(floors().getByRole('button', { name: /call a blade back from the gatehouse/i }));
    expect(company().posted[0]).toBe(1);
  });

  it('shows how deep the company holds, in the standing and on the map', () => {
    setup({ floors: taken(3) });
    const standing = within(screen.getByRole('region', { name: /company standing/i }));
    expect(standing.getByLabelText(/^delve$/i).textContent).toBe('3 / 12 FLOORS');
    expect(standing.getByRole('button', { name: /the map/i }).textContent).toMatch(new RegExp(FLOORS[3]!.name));
  });

  it('lets the Factor choose the next charter\'s site at the reckoning', async () => {
    const user = setup({ flags: ['terminus'], keyFragments: 3 }, 'forest');
    await user.click(screen.getByRole('tab', { name: /reckoning/i }));
    const panel = within(screen.getByRole('tabpanel', { name: /reckoning/i }));
    await user.click(panel.getByRole('button', { name: /next charter: morrowgate keep/i }));
    await user.click(panel.getByRole('button', { name: /sell the key/i }));
    await user.click(panel.getByRole('button', { name: /confirm/i }));
    expect(company().site).toBe('keep');
    expect(company().charter.number).toBe(2);
  });

  it('hires sappers for the Keep and sends them with the assault', async () => {
    const user = setup({ silver: 1_000 });
    await user.click(screen.getByRole('tab', { name: /roster/i }));
    await user.click(screen.getByRole('button', { name: /hire a sapper/i }));
    expect(company().hired.sapper).toBe(1);
    await user.click(screen.getByRole('tab', { name: /expeditions/i }));
    await user.click(assault().getByRole('button', { name: /one more sapper/i }));
    expect(company().orders[KEEP]!.sapper).toBe(1);
  });
});
