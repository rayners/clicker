// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { within, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createForestGame, type ForestGame } from '../../src/forest/game';
import { createForestStore, type ForestStore } from '../../src/forest/store';
import { mountForest } from '../../src/forest-ui/app';
import type { Company } from '../../src/forest/state';
import { CLASSES } from '../../src/forest-data/classes';
import { chartingPerTrip, hireCost, project } from '../../src/forest/company';
import { REGIONS } from '../../src/forest-data/regions';
import { createOptOut } from '../../src/shared/telemetry';

let store: ForestStore;

function setup(patch: Partial<Company> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const g: ForestGame = createForestGame(1, 0);
  store = createForestStore({ ...g, company: { ...g.company, ...patch } });
  mountForest(document.getElementById('app')!, store);
  return userEvent.setup();
}

const company = () => store.getState().company;
const tab = (name: RegExp) => screen.getByRole('tab', { name });
const eaves = REGIONS[0]!;
const crew = (counts: Partial<Company['hired']>) => ({ ...createForestGame(1, 0).company.hired, ...counts });

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the ledger', () => {
  it("shows the company's name and the day", () => {
    setup();
    const banner = within(screen.getByRole('banner'));
    expect(banner.getByText(/ashen key/i)).toBeTruthy();
    expect(banner.getByText(/DAY 1/)).toBeTruthy();
  });

  it('writes the charter into the ledger', () => {
    setup();
    expect(within(screen.getByRole('log')).getByText(/ROYAL CHARTER RECEIVED/)).toBeTruthy();
  });

  it('forages the eaves on a tap, adding relics to the vault', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /forage the eaves/i }));
    expect(company().relics).toBe(1);
    expect(within(screen.getByRole('region', { name: /company standing/i })).getByLabelText(/vault/i).textContent).toBe('1');
  });

  it('headlines gathering, appraisal and coffers, with blight underneath', () => {
    setup({ blight: 37 });
    const flow = within(screen.getByRole('region', { name: /production flow/i }));
    expect(flow.getByLabelText(/relics gathered/i)).toBeTruthy();
    expect(flow.getByLabelText(/appraisal/i)).toBeTruthy();
    expect(flow.getByLabelText(/net thalers/i)).toBeTruthy();
    expect(flow.getByRole('meter', { name: /blight/i }).getAttribute('aria-valuenow')).toBe('37');
  });

  it('warns when wages outrun income', () => {
    setup({ silver: 100, hired: crew({ blade: 20 }) });
    expect(screen.getByRole('region', { name: /production flow/i }).dataset.bottleneck).toBe('wages');
  });
});

describe('the roster', () => {
  it('hires hands of each class', async () => {
    const user = setup({ silver: 1_000 });
    await user.click(tab(/roster/i));
    const blade = CLASSES[0]!;
    await user.click(screen.getByRole('button', { name: new RegExp(`hire a ${blade.name}`, 'i') }));
    expect(company().hired.blade).toBe(1);
    expect(screen.getByRole('button', { name: new RegExp(`hire a ${blade.name} for ${hireCost(company(), 'blade')}`, 'i') })).toBeTruthy();
  });

  it('shows who is ready, out and wounded, and what they cost in wages', async () => {
    const user = setup({ hired: crew({ blade: 5 }), wounded: { ...crew({}), blade: 2 } });
    await user.click(tab(/roster/i));
    const row = within(screen.getByRole('article', { name: /blades/i }));
    expect(row.getByText(/3 READY/)).toBeTruthy();
    expect(row.getByText(/2 WOUNDED/)).toBeTruthy();
  });
});

describe('expeditions', () => {
  it('lists only the regions the company dares enter', async () => {
    const user = setup();
    await user.click(tab(/expeditions/i));
    expect(screen.getByRole('article', { name: /the eaves/i })).toBeTruthy();
    expect(screen.queryByRole('article', { name: /briar hollows/i })).toBeNull();
  });

  it('adjusts the standing order one hand at a time and projects the outcome', async () => {
    const user = setup();
    await user.click(tab(/expeditions/i));
    const card = within(screen.getByRole('article', { name: /the eaves/i }));
    await user.click(card.getByRole('button', { name: /one more blade for the eaves/i }));
    expect(company().orders.eaves!.blade).toBe(3);
    const p = project(company(), eaves, company().orders.eaves!);
    expect(card.getByLabelText(/strength against danger/i).textContent).toBe(`${p.strength} / ${p.danger}`);
  });

  it('sends a party when there are hands for it, and lists it on the operations board', async () => {
    const user = setup({ hired: crew({ blade: 2, scout: 1 }), silver: 1_000 });
    await user.click(tab(/expeditions/i));
    await user.click(screen.getByRole('button', { name: /send a party to the eaves/i }));
    expect(company().parties).toHaveLength(1);
    await user.click(tab(/ledger/i));
    const board = within(screen.getByRole('region', { name: /operations board/i }));
    expect(board.getByText(/THE EAVES/)).toBeTruthy();
  });

  it('cannot send a party without the hands for it', async () => {
    const user = setup();
    await user.click(tab(/expeditions/i));
    expect((screen.getByRole('button', { name: /send a party to the eaves/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('the hall', () => {
  it('builds hall improvements and pays for penance', async () => {
    const user = setup({ silver: 1e6, blight: 30 });
    await user.click(tab(/hall/i));
    await user.click(screen.getByRole('button', { name: /build appraisal house/i }));
    expect(company().buildings.appraisal).toBe(1);
    await user.click(screen.getByRole('button', { name: /pay penance/i }));
    expect(company().blight).toBe(20);
  });
});

describe('the map (what leads deeper)', () => {
  it('shows how far the way to the next region is charted, always on screen', () => {
    setup({ charted: 1 });
    const map = within(screen.getByRole('button', { name: /the map/i }));
    expect(map.getByText(/BRIAR HOLLOWS/)).toBeTruthy();
    expect(map.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(map.getByText(/1\.0 \/ 2 LEAGUES/)).toBeTruthy();
  });

  it('opens the expeditions panel when tapped', async () => {
    const user = setup({ charted: 1 });
    await user.click(screen.getByRole('button', { name: /the map/i }));
    expect(tab(/expeditions/i).getAttribute('aria-selected')).toBe('true');
  });

  it('says on each region card how far a trip there charts the way on', async () => {
    const user = setup({ hired: crew({ blade: 2, scout: 1 }) });
    await user.click(tab(/expeditions/i));
    const per = chartingPerTrip(company(), eaves, company().orders.eaves!).toFixed(2);
    expect(within(screen.getByRole('article', { name: /the eaves/i })).getByText(new RegExp(`CHARTS \\+${per} LEAGUES TOWARD BRIAR HOLLOWS`))).toBeTruthy();
  });

  it('says when a region has nothing left to teach about the way on', async () => {
    const user = setup({ charted: 2 });
    await user.click(tab(/expeditions/i));
    expect(within(screen.getByRole('article', { name: /the eaves/i })).getByText(/WAY ONWARD ALREADY CHARTED/)).toBeTruthy();
  });
});

describe('requisitions', () => {
  it('lists unlocked requisitions in the hall and buys them', async () => {
    const user = setup({ silver: 1e6, lifetimeRelics: 300 });
    await user.click(tab(/hall/i));
    await user.click(screen.getByRole('button', { name: /requisition the quartermaster/i }));
    expect(company().upgrades).toContain('quartermaster');
  });

  it('marks the hall tab when a requisition is affordable', () => {
    setup({ silver: 1e6, lifetimeRelics: 300 });
    expect(tab(/hall/i).dataset.attention).toBe('active');
  });
});

describe('standing orders that send themselves', () => {
  it('offers the toggle only once the Quartermaster is hired', async () => {
    const user = setup();
    await user.click(tab(/expeditions/i));
    expect(screen.queryByRole('button', { name: /sends itself/i })).toBeNull();
  });

  it('toggles a region to send itself, and shows it on the card', async () => {
    const user = setup({ upgrades: ['quartermaster'] });
    await user.click(tab(/expeditions/i));
    const toggle = screen.getByRole('button', { name: /the eaves order sends itself/i });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await user.click(toggle);
    expect(company().standing).toEqual(['eaves']);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('configuration', () => {
  it('exports a save code, and a hard reset needs a second tap', async () => {
    const user = setup({ silver: 777 });
    await user.click(screen.getByRole('button', { name: /configuration/i }));
    const dialog = within(screen.getByRole('dialog', { name: /configuration/i }));
    await user.click(dialog.getByRole('button', { name: /export/i }));
    expect((dialog.getByRole('textbox', { name: /save code/i }) as HTMLTextAreaElement).value.length).toBeGreaterThan(50);
    await user.click(dialog.getByRole('button', { name: /start a new charter/i }));
    expect(company().silver).toBe(777);
    await user.click(dialog.getByRole('button', { name: /confirm/i }));
    expect(company().silver).not.toBe(777);
  });

  it('imports a save code', async () => {
    const user = setup({ silver: 5 });
    const code = (await import('../../src/forest/save')).forestSaves.exportSave({ ...store.getState(), company: { ...company(), silver: 4242 } });
    await user.click(screen.getByRole('button', { name: /configuration/i }));
    const dialog = within(screen.getByRole('dialog', { name: /configuration/i }));
    await user.type(dialog.getByRole('textbox', { name: /save code/i }), code);
    await user.click(dialog.getByRole('button', { name: /import/i }));
    expect(company().silver).toBe(4242);
  });
});

describe('the darkness on screen', () => {
  it('counts fragments of the Key and turned hands once there are any', () => {
    setup();
    const standing = within(screen.getByRole('region', { name: /company standing/i }));
    expect(standing.getByLabelText(/key fragments/i).closest('.stat')!.hasAttribute('hidden')).toBe(true);
    setup({ keyFragments: 2, turned: 3 });
    const later = within(screen.getByRole('region', { name: /company standing/i }));
    expect(later.getByLabelText(/key fragments/i).textContent).toBe('2 / 7');
    expect(later.getByLabelText(/turned/i).textContent).toBe('3');
  });
});

describe('the reckoning', () => {
  it('has no tab until the charter comes due', () => {
    setup();
    expect(screen.queryByRole('tab', { name: /reckoning/i })).toBeNull();
  });

  it('offers the endings, and closes the charter on a confirming second tap', async () => {
    const user = setup({ flags: ['terminus'], keyFragments: 4, elapsed: 9_000 });
    await user.click(tab(/reckoning/i));
    expect(screen.getByRole('region', { name: /return the key/i })).toBeTruthy();
    const sell = screen.getByRole('region', { name: /sell the key/i });
    const go = within(sell).getByRole('button', { name: /sell the key/i });
    await user.click(go);
    expect(store.getState().profile.chartersCompleted).toBe(0);
    await user.click(within(sell).getByRole('button', { name: /confirm/i }));
    expect(store.getState().profile.chartersCompleted).toBe(1);
    expect(company().charter.number).toBe(2);
    expect(screen.queryByRole('tab', { name: /reckoning/i })).toBeNull();
  });
});

describe('configuration', () => {
  it('shares anonymous play data by default, and lets the player opt out', async () => {
    localStorage.clear();
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^configuration$/i }));
    const dialog = within(screen.getByRole('dialog', { name: /configuration/i }));
    const share = dialog.getByRole('checkbox', { name: /share anonymous play data/i }) as HTMLInputElement;
    expect(share.checked).toBe(true);
    await user.click(share);
    expect(createOptOut(localStorage).sharing()).toBe(false);
  });
});
