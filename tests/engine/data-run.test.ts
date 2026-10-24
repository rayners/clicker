// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runDataGame } from '../../src/engine/data/run';

const def = JSON.parse(readFileSync(resolve(__dirname, '../../games/clip-works.json'), 'utf8'));
let stop: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
});
afterEach(() => {
  stop?.();
  vi.useRealTimers();
});

describe('running a game made of data', () => {
  it('plays a definition in the page with one call: its screen, its clock and its save', () => {
    const run = runDataGame(def, { dev: false, prod: false });
    stop = run.stop;
    expect(screen.getByRole('heading', { name: 'CLIP WORKS', level: 1 })).toBeTruthy();
    vi.advanceTimersByTime(10_000);
    expect(localStorage.getItem('data.clip-works.save')).not.toBeNull();
    expect(run.store.getState().run.elapsed).toBeGreaterThan(9);
  });
});
