import { h } from '../engine/ui/dom';

/** A game on the list: what it is called, what it is, and where it plays. */
export interface ListedGame {
  id: string;
  title: string;
  description?: string;
}

/** The page of games made with the engine, each a JSON definition. */
export function mountGameList(root: HTMLElement, games: readonly ListedGame[]): void {
  root.classList.add('data-shell', 'made-list');
  root.replaceChildren(
    h(
      'main',
      { class: 'made' },
      h('h1', { class: 'mast-name' }, 'Made with the engine'),
      h('p', {}, 'Games written as data: a JSON file each, played by the engine behind DEEP CONTRACT and the rest.'),
      h('ul', { class: 'made-games' }, ...games.map((g) => h('li', {}, h('a', { href: `?game=${encodeURIComponent(g.id)}` }, g.title), h('p', {}, g.description ?? '')))),
      h('p', {}, h('a', { href: '../' }, '← Back to the games')),
    ),
  );
}
