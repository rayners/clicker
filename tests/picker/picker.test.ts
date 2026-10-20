// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/dom';
import { GAMES, mountPicker } from '../../src/picker/picker';
import { SAVE_KEY } from '../../src/core/save';
import { FOREST_SAVE_KEY } from '../../src/forest/save';
import { LATE_SAVE_KEY } from '../../src/late-fees/save';

const mount = () => {
  document.body.innerHTML = '<div id="app"></div>';
  mountPicker(document.getElementById('app')!, localStorage);
};
const link = (name: RegExp) => screen.getByRole('link', { name }) as HTMLAnchorElement;

beforeEach(() => localStorage.clear());

describe('the game picker', () => {
  it('offers both games, each linking to its own page', () => {
    mount();
    expect(link(/deep contract/i).getAttribute('href')).toBe('./contract/');
    expect(link(/elderdark/i).getAttribute('href')).toBe('./forest/');
    expect(link(/late fees/i).getAttribute('href')).toBe('./late-fees/');
  });

  it('invites a new player to begin each game', () => {
    mount();
    expect(link(/deep contract/i).textContent).toMatch(/begin/i);
    expect(link(/elderdark/i).textContent).toMatch(/begin/i);
  });

  it('offers to resume a game this device already has a save for', () => {
    localStorage.setItem(SAVE_KEY, '{}');
    mount();
    expect(link(/deep contract/i).textContent).toMatch(/resume/i);
    expect(link(/elderdark/i).textContent).toMatch(/begin/i);
  });

  it("knows each game's save key without importing the games", () => {
    expect(GAMES.map((g) => g.saveKey).sort()).toEqual([SAVE_KEY, FOREST_SAVE_KEY, LATE_SAVE_KEY].sort());
  });

  it('still works when storage cannot be read', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const broken = { getItem: () => { throw new Error('denied'); } } as unknown as Storage;
    mountPicker(document.getElementById('app')!, broken);
    expect(link(/deep contract/i).textContent).toMatch(/begin/i);
  });
});
