// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGame, type GameState } from '../../src/core/game';
import { createStore, type Store } from '../../src/core/store';
import { exportSave, importSave } from '../../src/core/save';
import { mountApp } from '../../src/ui/app';
import { ext } from '../helpers';
import { createOptOut } from '../../src/shared/telemetry';

let store: Store;
let root: HTMLElement;

function setup(patch: (g: GameState) => GameState = (g) => g) {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
  store = createStore(patch(createGame(1, 0)));
  mountApp(root, store);
  return userEvent.setup();
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /system configuration/i }));
  return within(screen.getByRole('dialog', { name: /system configuration/i }));
}

describe('settings dialog', () => {
  it('opens from the masthead and closes again', async () => {
    const user = setup();
    expect(screen.queryByRole('dialog')).toBeNull();
    const dialog = await open(user);
    await user.click(dialog.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('toggles sound', async () => {
    const user = setup();
    const dialog = await open(user);
    await user.click(dialog.getByRole('checkbox', { name: /sound/i }));
    expect(store.getState().profile.settings.sound).toBe(true);
  });

  it('toggles reduced motion, which the stylesheet reads from the shell', async () => {
    const user = setup();
    const dialog = await open(user);
    await user.click(dialog.getByRole('checkbox', { name: /reduce motion/i }));
    expect(store.getState().profile.settings.reducedMotion).toBe(true);
    expect(root.dataset.motion).toBe('reduced');
  });

  it('shares anonymous play data by default, and lets the player opt out and back in', async () => {
    localStorage.clear();
    const user = setup();
    const dialog = await open(user);
    const share = dialog.getByRole('checkbox', { name: /share anonymous play data/i }) as HTMLInputElement;
    expect(share.checked).toBe(true);
    await user.click(share);
    expect(createOptOut(localStorage).sharing()).toBe(false);
    await user.click(share);
    expect(createOptOut(localStorage).sharing()).toBe(true);
  });

  it('exports the save as a code that can be imported elsewhere', async () => {
    const user = setup((g) => ({ ...g, mission: { ...g.mission, ore: 1234 } }));
    const dialog = await open(user);
    await user.click(dialog.getByRole('button', { name: /export/i }));
    const code = (dialog.getByRole('textbox', { name: /save code/i }) as HTMLTextAreaElement).value;
    expect(ext(importSave(code).mission).ore).toBe(1234);
  });

  it('imports a save code, replacing the current game', async () => {
    const user = setup();
    const other = createGame(9, 0);
    const code = exportSave({ ...other, mission: { ...other.mission, ore: 777 } });
    const dialog = await open(user);
    const box = dialog.getByRole('textbox', { name: /save code/i });
    await user.clear(box);
    await user.click(box);
    await user.paste(code);
    await user.click(dialog.getByRole('button', { name: /import/i }));
    expect(ext(store.getState().mission).ore).toBe(777);
  });

  it('reports a bad save code without touching the game', async () => {
    const user = setup((g) => ({ ...g, mission: { ...g.mission, ore: 5 } }));
    const dialog = await open(user);
    await user.type(dialog.getByRole('textbox', { name: /save code/i }), 'garbage');
    await user.click(dialog.getByRole('button', { name: /import/i }));
    expect(dialog.getByRole('status').textContent).toMatch(/invalid/i);
    expect(ext(store.getState().mission).ore).toBe(5);
  });

  it('hard reset needs a second confirmation', async () => {
    const user = setup((g) => ({ ...g, mission: { ...g.mission, ore: 50 } }));
    const dialog = await open(user);
    const reset = dialog.getByRole('button', { name: /hard reset/i });
    await user.click(reset);
    expect(ext(store.getState().mission).ore).toBe(50);
    await user.click(reset);
    expect(ext(store.getState().mission).ore).toBe(0);
  });

  it('says both ways into the hunt while it is closed: contracts, or Legend as the creature', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /configuration/i }));
    expect(screen.getByRole('button', { name: /accept the hunt/i }).textContent).toBe('THE HUNT · AFTER 5 CONTRACTS OR 3 LEGEND');
  });

  it('links to the About page and its tip jar from the settings', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /configuration/i }));
    expect((screen.getByRole('link', { name: /about.*tip jar/i }) as HTMLAnchorElement).getAttribute('href')).toBe('../about/');
  });
});
