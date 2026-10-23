// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createFathomGame, type FathomGame } from '../../src/fathom/game';
import { createFathomStore, type FathomStore } from '../../src/fathom/store';
import { mountFathom } from '../../src/fathom-ui/app';
import type { Outfit } from '../../src/fathom/state';
import { ATTRACTIONS, GUARDS } from '../../src/fathom-data/shallows';
import { TRAWLERS } from '../../src/fathom-data/shelf';
import { FATHOM_UPGRADES } from '../../src/fathom-data/upgrades';

let store: FathomStore;

function setup(patch: Partial<Outfit> = {}, profile: Partial<FathomGame['profile']> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = createFathomGame(1, 0);
  store = createFathomStore({ ...g, profile: { ...g.profile, ...profile }, outfit: { ...g.outfit, ...patch } });
  mountFathom(document.getElementById('app')!, store);
  return userEvent.setup();
}
const outfit = () => store.getState().outfit;
const tab = (name: RegExp) => screen.queryByRole('tab', { name });
const panel = (name: RegExp) => within(screen.getByRole('tabpanel', { name }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the deep-water game on screen', () => {
  it('shows the outfit, the season and how deep it has gone', () => {
    setup({ lifetimeCash: 1e5 });
    const banner = within(screen.getByRole('banner'));
    expect(banner.getByText(/HARROW POINT MARINE SAFETY/)).toBeTruthy();
    expect(banner.getByLabelText('Depth').textContent).toMatch(/\d+ M/);
    expect(banner.getByLabelText('Season').textContent).toBe('SEASON 1');
  });

  it('sells beach passes by hand', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /sell a beach pass/i }));
    expect(outfit().cash).toBeGreaterThan(0);
  });

  it('headlines the depth, the swimmers in the water and the money coming in', () => {
    setup();
    const flow = within(screen.getByRole('region', { name: /production flow/i }));
    expect(flow.getByLabelText('Depth')).toBeTruthy();
    expect(flow.getByLabelText('In the water')).toBeTruthy();
    expect(flow.getByLabelText('Income')).toBeTruthy();
  });

  it('warns when swimmers are in the water with nobody watching', () => {
    setup({ attractions: { ...createFathomGame(1, 0).outfit.attractions, umbrellas: 30 }, open: 10 });
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).toBe('beach');
  });

  it('runs the beach: buy attractions, hire guards, open more of the beach', async () => {
    const user = setup({ cash: 1e6 });
    await user.click(tab(/beach/i)!);
    const beach = panel(/beach/i);
    await user.click(beach.getByRole('button', { name: new RegExp(`buy ${ATTRACTIONS[0]!.name}`, 'i') }));
    expect(outfit().attractions[ATTRACTIONS[0]!.id]).toBe(1);
    await user.click(beach.getByRole('button', { name: new RegExp(`hire ${GUARDS[0]!.name}`, 'i') }));
    expect(outfit().guards[GUARDS[0]!.id]).toBe(1);
    const before = outfit().open;
    await user.click(beach.getByRole('button', { name: /open more beach/i }));
    expect(outfit().open).toBe(before + 1);
    expect(beach.getByLabelText('Beach open').textContent).toBe(`${(before + 1) * 10}%`);
  });

  it('adds a tab for each zone as the outfit goes deeper', () => {
    setup();
    expect(tab(/shelf/i)).toBeNull();
    expect(tab(/station/i)).toBeNull();
    expect(tab(/trench/i)).toBeNull();
    expect(tab(/coast/i)).toBeNull();
    setup({ lifetimeCash: 1e13, flags: ['breach'] });
    for (const t of [/shelf/i, /station/i, /trench/i, /coast/i]) expect(tab(t)).toBeTruthy();
  });

  it('works the shelf: buy boats and buoys, send them further out', async () => {
    const user = setup({ cash: 1e9, lifetimeCash: 1e5 });
    await user.click(tab(/shelf/i)!);
    const shelf = panel(/shelf/i);
    await user.click(shelf.getByRole('button', { name: new RegExp(`buy ${TRAWLERS[0]!.name}`, 'i') }));
    expect(outfit().trawlers[TRAWLERS[0]!.id]).toBe(1);
    await user.click(shelf.getByRole('button', { name: /buy sonar buoy/i }));
    expect(outfit().buoys).toBe(1);
    const before = outfit().range;
    await user.click(shelf.getByRole('button', { name: /fish further out/i }));
    expect(outfit().range).toBe(before + 1);
  });

  it('runs the station, the trench and the coast from their own tabs', async () => {
    const user = setup({ cash: 1e15, lifetimeCash: 1e13, flags: ['breach'] });
    await user.click(tab(/station/i)!);
    await user.click(panel(/station/i).getByRole('button', { name: /build pen/i }));
    expect(outfit().pens).toBe(1);
    await user.click(tab(/trench/i)!);
    await user.click(panel(/trench/i).getByRole('button', { name: /add station module/i }));
    expect(outfit().modules).toBe(1);
    await user.click(tab(/coast/i)!);
    await user.click(panel(/coast/i).getByRole('button', { name: /build sea wall/i }));
    expect(outfit().walls).toBe(1);
  });

  it('sells requisitions in the store', async () => {
    const user = setup({ cash: 1e6, lifetimeCash: 1e3 });
    await user.click(tab(/store/i)!);
    await user.click(screen.getByRole('button', { name: new RegExp(FATHOM_UPGRADES[0]!.name, 'i') }));
    expect(outfit().upgrades).toContain(FATHOM_UPGRADES[0]!.id);
  });

  it('ends the season with the outfit\'s choice', async () => {
    const user = setup({ flags: ['terminus'], lifetimeCash: 1e12 });
    await user.click(tab(/season's end/i)!);
    const end = panel(/season's end/i);
    await user.click(end.getByRole('button', { name: /close the breach/i }));
    await user.click(end.getByRole('button', { name: /confirm/i }));
    expect(store.getState().profile.seasons).toBe(1);
    expect(outfit().terms.season).toBe(2);
  });

  it('has a configuration dialog with reduced motion and the save book', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /configuration/i }));
    const dialog = within(screen.getByRole('dialog', { name: /configuration/i }));
    await user.click(dialog.getByRole('checkbox', { name: /reduce motion/i }));
    expect(store.getState().profile.settings.reducedMotion).toBe(true);
    expect(dialog.getByRole('textbox', { name: /save code/i })).toBeTruthy();
  });

  it('says nothing about boats fishing blind before there are any boats', () => {
    setup();
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).not.toBe('shelf');
  });

  it('shows every pilot pair\'s link, which pairs are in a cockpit, and how tired the corps is', async () => {
    const user = setup({ lifetimeCash: 1e13, flags: ['breach'], bulwarks: 1, pilots: 4, temperaments: [0.5, 0.5, 0.1, 0.9], fatigue: 0.4 });
    await user.click(tab(/coast/i)!);
    const pairs = within(panel(/coast/i).getByRole('list', { name: /pilot pairs/i })).getAllByRole('listitem');
    expect(pairs).toHaveLength(2);
    expect(pairs[0]!.textContent).toMatch(/LINK 100%.*CREWED/);
    expect(pairs[1]!.textContent).toMatch(/LINK 30%.*RESERVE/);
    expect(panel(/coast/i).getByLabelText('Pilot fatigue').textContent).toBe('40%');
  });

  it('has a sound switch in the configuration, off until the player turns it on', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /configuration/i }));
    const box = screen.getByRole('checkbox', { name: /sound/i }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    await user.click(box);
    expect(store.getState().profile.settings.sound).toBe(true);
  });
});
