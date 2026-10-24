// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/dom';
import { mountGameList } from '../../src/made/list';

describe('the page of games made with the engine', () => {
  it('lists each game by its title and description, linking to where it plays', () => {
    document.body.innerHTML = '<div id="app"></div>';
    mountGameList(document.getElementById('app')!, [
      { id: 'clip-works', title: 'CLIP WORKS', description: 'Bend wire into clips.' },
      { id: 'tiny', title: 'TINY', description: 'A tiny game.' },
    ]);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/made with the engine/i);
    const link = screen.getByRole('link', { name: /clip works/i }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('?game=clip-works');
    expect(screen.getByText('Bend wire into clips.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to the games/i })).toBeTruthy();
  });
});
