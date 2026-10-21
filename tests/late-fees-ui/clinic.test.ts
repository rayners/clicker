// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { newLateGame, type LateGame } from '../../src/late-fees/game';
import { chooseTape } from '../../src/late-fees/sequels';
import { createLateStore, type LateStore } from '../../src/late-fees/store';
import { mountLate } from '../../src/late-fees-ui/app';
import { BEDS, STAFF } from '../../src/late-fees-data/clinic';
import { CLINIC_UPGRADES } from '../../src/late-fees-data/clinic-upgrades';
import type { ClinicRun } from '../../src/late-fees/state';

let store: LateStore;

function setup(patch: Partial<ClinicRun> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g = chooseTape(newLateGame(1, 0), 'clinic', 1);
  store = createLateStore({ ...g, run: { ...g.run, ...patch } as LateGame['run'] });
  mountLate(document.getElementById('app')!, store);
  return userEvent.setup();
}
const run = () => store.getState().run as ClinicRun;
const ward = (n: number) => ({ ...chooseTape(newLateGame(1, 0), 'clinic', 1).run, beds: { ...(chooseTape(newLateGame(1, 0), 'clinic', 1).run as ClinicRun).beds, [BEDS[0]!.id]: n } }) as ClinicRun;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the sleep clinic on tape', () => {
  it('shows the tape title and takes readings instead of blowing a whistle', async () => {
    const user = setup();
    expect(within(screen.getByRole('banner')).getByText('A NIGHTMARE ON SYCAMORE STREET')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /blow the whistle/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: /take a reading/i }));
    expect(run().cash).toBeGreaterThan(0);
  });

  it('headlines the watch, deep sleep and grant money', () => {
    setup();
    const flow = within(screen.getByRole('region', { name: /production flow/i }));
    expect(flow.getByLabelText('Watch')).toBeTruthy();
    expect(flow.getByLabelText('Deep sleepers')).toBeTruthy();
    expect(flow.getByLabelText('Grant money')).toBeTruthy();
  });

  it('warns when deep sleepers are left unwatched', () => {
    setup({ beds: ward(30).beds, remShare: 8 });
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).toBe('watch');
  });

  it('moves the deep-sleep dial a tenth per tap, and shows sleep debt', async () => {
    const user = setup({ beds: ward(10).beds, debt: 1.4 });
    const dial = within(screen.getByRole('region', { name: /deep-sleep dial/i }));
    const before = run().remShare;
    await user.click(dial.getByRole('button', { name: /more deep sleep/i }));
    expect(run().remShare).toBe(before + 1);
    await user.click(dial.getByRole('button', { name: /less deep sleep/i }));
    expect(run().remShare).toBe(before);
    expect(dial.getByLabelText('Sleep debt').textContent).toMatch(/140%/);
  });

  it('hands the dial to automated monitoring once installed, and takes it back on request', async () => {
    const auto = CLINIC_UPGRADES.find((u) => u.effect.kind === 'autoDial')!;
    const user = setup({ upgrades: [auto.id] });
    const dial = within(screen.getByRole('region', { name: /deep-sleep dial/i }));
    expect(dial.queryByRole('button', { name: /more deep sleep/i })).toBeNull();
    await user.click(dial.getByRole('button', { name: /take the dial back/i }));
    expect(run().dialOff).toBe(true);
  });

  it('sells beds, hires night staff and requests suppressant on the ward tab', async () => {
    const user = setup({ cash: 1e6 });
    await user.click(screen.getByRole('tab', { name: /ward/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(`buy ${BEDS[0]!.name}`, 'i') }));
    expect(run().beds[BEDS[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: new RegExp(`hire ${STAFF[0]!.name}`, 'i') }));
    expect(run().staff[STAFF[0]!.id]).toBe(1);
    await user.click(screen.getByRole('button', { name: /request suppressant/i }));
    expect(run().suppressant).toBe(1);
  });

  it('sells clinic supplies in the store', async () => {
    const user = setup({ cash: 1e6, lifetimeCash: 1e3 });
    await user.click(screen.getByRole('tab', { name: /store/i }));
    await user.click(screen.getByRole('button', { name: new RegExp(CLINIC_UPGRADES[0]!.name, 'i') }));
    expect(run().upgrades).toContain(CLINIC_UPGRADES[0]!.id);
  });

  it('switches back to the camp cleanly when the camp tape is rented next', async () => {
    const user = setup({ flags: ['terminus'] });
    await user.click(screen.getByRole('tab', { name: /credits/i }));
    await user.click(within(screen.getByRole('tabpanel', { name: /credits/i })).getByRole('button', { name: /pull him out of the dream/i }));
    await user.click(within(screen.getByRole('dialog', { name: /horror/i })).getByRole('button', { name: /^rent friday the 12th$/i }));
    expect(screen.getByRole('button', { name: /blow the whistle/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /take a reading/i })).toBeNull();
    expect(screen.getAllByRole('region', { name: /camp zones/i })).toHaveLength(1);
  });
});
