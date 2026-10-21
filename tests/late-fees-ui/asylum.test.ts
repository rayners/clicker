// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { newLateGame, type LateGame } from '../../src/late-fees/game';
import { chooseTape } from '../../src/late-fees/sequels';
import { createLateStore, type LateStore } from '../../src/late-fees/store';
import { mountLate } from '../../src/late-fees-ui/app';
import { ASYLUM_STAFF, WARDS } from '../../src/late-fees-data/asylum';
import { ASYLUM_UPGRADES } from '../../src/late-fees-data/asylum-upgrades';
import type { AsylumRun } from '../../src/late-fees/state';

let store: LateStore;
const blank = () => chooseTape(newLateGame(1, 0), 'asylum', 1).run as AsylumRun;

function setup(patch: Partial<AsylumRun> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = chooseTape(newLateGame(1, 0), 'asylum', 1);
  store = createLateStore({ ...g, run: { ...g.run, ...patch } as LateGame['run'] });
  mountLate(document.getElementById('app')!, store);
  return userEvent.setup();
}
const run = () => store.getState().run as AsylumRun;
const beds = (n: number) => ({ ...blank().wards, [WARDS[0]!.id]: n });
const dial = () => within(screen.getByRole('region', { name: /sedation dial/i }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('Grayhaven on tape', () => {
  it('shows the tape title and walks the wards instead of blowing a whistle', async () => {
    const user = setup();
    expect(within(screen.getByRole('banner')).getByText('CANDY CORN DAY')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /walk the wards/i }));
    expect(run().cash).toBeGreaterThan(0);
  });

  it('headlines the calm, the patients and the state funding', () => {
    setup();
    const flow = within(screen.getByRole('region', { name: /production flow/i }));
    expect(flow.getByLabelText('Calm')).toBeTruthy();
    expect(flow.getByLabelText('Patients')).toBeTruthy();
    expect(flow.getByLabelText('State funding')).toBeTruthy();
  });

  it('warns when the wards are boiling over', () => {
    setup({ wards: beds(30), agitation: 0.8 });
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).toBe('calm');
  });

  it('counts down to Candy Corn Day, and then counts the escapees still loose in town', () => {
    setup();
    expect(screen.getByLabelText(/candy corn day/i).textContent).toMatch(/DAYS/);
    setup({ act: 3, loose: 4 });
    expect(screen.getByLabelText(/candy corn day/i).textContent).toMatch(/4 LOOSE/);
  });

  it('moves the sedation dial a notch per tap, and shows the agitation and the inspector', async () => {
    const user = setup({ wards: beds(10), agitation: 0.4, rating: 0.75 });
    const before = run().sedation;
    await user.click(dial().getByRole('button', { name: /more sedation/i }));
    expect(run().sedation).toBe(before + 1);
    await user.click(dial().getByRole('button', { name: /less sedation/i }));
    expect(run().sedation).toBe(before);
    expect(dial().getByLabelText('Agitation').textContent).toBe('40%');
    expect(dial().getByLabelText("Inspector's rating").textContent).toBe('75%');
  });

  it('hands the dial to the pharmacy once installed, and takes it back on request', async () => {
    const pharmacy = ASYLUM_UPGRADES.find((u) => u.effect.kind === 'autoSedation')!;
    const user = setup({ upgrades: [pharmacy.id] });
    expect(dial().queryByRole('button', { name: /more sedation/i })).toBeNull();
    await user.click(dial().getByRole('button', { name: /take the dial back/i }));
    expect(run().dialOff).toBe(true);
  });

  it('fills beds, hires staff and fits security doors on the wards tab', async () => {
    const user = setup({ cash: 1e6 });
    await user.click(screen.getByRole('tab', { name: /wards/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`fill ${WARDS[0]!.name}`, 'i') }));
    expect(run().wards[WARDS[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: new RegExp(`hire ${ASYLUM_STAFF[0]!.name}`, 'i') }));
    expect(run().staff[ASYLUM_STAFF[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: /fit security door/i }));
    expect(run().doors).toBe(1);
  });

  it('sells hospital supplies in the store', async () => {
    const user = setup({ cash: 1e6, lifetimeCash: 1e3 });
    await user.click(screen.getByRole('tab', { name: /store/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(ASYLUM_UPGRADES[0]!.name, 'i') }));
    expect(run().upgrades).toContain(ASYLUM_UPGRADES[0]!.id);
  });
});
