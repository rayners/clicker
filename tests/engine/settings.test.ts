// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createSettings, type SettingsOptions } from '../../src/engine/ui/settings';
import { createReducerStore, type Store } from '../../src/engine/store';
import { createOptOut } from '../../src/engine/telemetry';
import { h } from '../../src/engine/ui/dom';
import { confirmPause } from '../helpers';

interface Toy {
  savedAt: number;
  coins: number;
  settings: { sound: boolean; reducedMotion: boolean };
}
type ToyAction = { type: 'setSetting'; key: 'sound' | 'reducedMotion'; value: boolean } | { type: 'reset' };

const fresh = (): Toy => ({ savedAt: 0, coins: 0, settings: { sound: false, reducedMotion: false } });
let store: Store<Toy, ToyAction>;

function mount(overrides: Partial<SettingsOptions<Toy>> = {}) {
  localStorage.clear();
  document.body.replaceChildren();
  store = createReducerStore<Toy, ToyAction>({ ...fresh(), coins: 7 }, (g, a) =>
    a.type === 'reset' ? fresh() : { ...g, settings: { ...g.settings, [a.key]: a.value } },
  );
  const settings = createSettings<Toy>({
    store,
    saves: {
      exportSave: (g) => btoa(JSON.stringify(g)),
      importSave: (code) => {
        const g = JSON.parse(atob(code)) as Toy;
        if (typeof g.coins !== 'number') throw new Error('not a save');
        return g;
      },
    },
    settings: (g) => g.settings,
    setSetting: (key, value) => store.dispatch({ type: 'setSetting', key, value }),
    reset: { text: 'HARD RESET', aria: 'Hard reset', onConfirm: () => store.dispatch({ type: 'reset' }) },
    ...overrides,
  });
  document.body.append(settings.button, settings.dialog);
  store.subscribe(settings.render);
  settings.render(store.getState());
  return { settings, user: userEvent.setup() };
}

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  return within(screen.getByRole('dialog', { name: 'Settings' }));
};

beforeEach(() => document.body.replaceChildren());

describe('the settings dialog', () => {
  it('opens from its button and closes again', async () => {
    const { user } = mount();
    const dialog = await open(user);
    await user.click(dialog.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches sound and reduced motion in the game', async () => {
    const { user } = mount();
    const dialog = await open(user);
    await user.click(dialog.getByRole('checkbox', { name: /sound/i }));
    await user.click(dialog.getByRole('checkbox', { name: /reduce motion/i }));
    expect(store.getState().settings).toEqual({ sound: true, reducedMotion: true });
  });

  it('leaves out the sound switch for a game with no sound', async () => {
    const { user } = mount({ sound: false });
    const dialog = await open(user);
    expect(dialog.queryByRole('checkbox', { name: /sound/i })).toBeNull();
  });

  it('lets the player stop sharing anonymous play data, for every game on the device', async () => {
    const { user } = mount();
    const dialog = await open(user);
    await user.click(dialog.getByRole('checkbox', { name: /share anonymous play data/i }));
    expect(createOptOut(localStorage).sharing()).toBe(false);
  });

  it('links to the About page', async () => {
    const { user } = mount();
    const dialog = await open(user);
    expect(dialog.getByRole('link', { name: /about/i })).toBeTruthy();
  });

  it('can point its About link elsewhere, or leave it out, for a game hosted somewhere else', async () => {
    const { user } = mount({ about: { href: 'https://example.com/about', text: 'ABOUT THIS GAME' } });
    const dialog = await open(user);
    expect(dialog.getByRole('link', { name: 'ABOUT THIS GAME' }).getAttribute('href')).toBe('https://example.com/about');
    document.body.replaceChildren();
    const none = mount({ about: false });
    const bare = await open(none.user);
    expect(bare.queryByRole('link')).toBeNull();
  });

  it('exports a save code, copies it, and imports one, replacing the game', async () => {
    const { user } = mount();
    const dialog = await open(user);
    await user.click(dialog.getByRole('button', { name: /export/i }));
    const box = dialog.getByRole('textbox', { name: /save code/i }) as HTMLTextAreaElement;
    expect(JSON.parse(atob(box.value)).coins).toBe(7);
    expect(dialog.getByRole('button', { name: /copy/i })).toBeTruthy();
    expect(dialog.getByRole('button', { name: /download/i })).toBeTruthy();
    box.value = btoa(JSON.stringify({ ...fresh(), coins: 99 }));
    await user.click(dialog.getByRole('button', { name: /import/i }));
    expect(store.getState().coins).toBe(99);
    expect(dialog.getByRole('status').textContent).toMatch(/imported/i);
  });

  it('says so when a code is not a save, and changes nothing', async () => {
    const { user } = mount();
    const dialog = await open(user);
    await user.type(dialog.getByRole('textbox', { name: /save code/i }), 'garbage');
    await user.click(dialog.getByRole('button', { name: /import/i }));
    expect(store.getState().coins).toBe(7);
    expect(dialog.getByRole('status').textContent).toMatch(/not a save code/i);
  });

  it('resets only on a second, unhurried tap, and closes', async () => {
    const { user } = mount();
    const dialog = await open(user);
    await user.dblClick(dialog.getByRole('button', { name: /hard reset/i }));
    expect(store.getState().coins).toBe(7);
    await confirmPause();
    await user.click(dialog.getByRole('button', { name: /confirm: hard reset/i }));
    expect(store.getState().coins).toBe(0);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('speaks in the game\'s own words: its button, title, headings and messages', async () => {
    const { user } = mount({
      words: { button: { text: '⚙', aria: 'Configuration', className: 'cfg-open' }, title: 'Configuration', saveHeading: 'THE SAVE BOOK', notASave: 'THAT IS NOT A SAVE CODE.' },
    });
    await user.click(screen.getByRole('button', { name: 'Configuration' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Configuration' }));
    expect(dialog.getByRole('heading', { name: 'THE SAVE BOOK' })).toBeTruthy();
  });

  it('carries sections of the game\'s own between the save and the reset', async () => {
    const { user } = mount({ sections: [{ heading: 'THE CHARTER', content: [h('button', { type: 'button' }, 'WRITE A NEW CHARTER')] }] });
    const dialog = await open(user);
    expect(dialog.getByRole('heading', { name: 'THE CHARTER' })).toBeTruthy();
    expect(dialog.getByRole('button', { name: 'WRITE A NEW CHARTER' })).toBeTruthy();
  });
});
