import { h, setText } from '../shared/ui/dom';
import { interpolate } from '../shared/lexicon';
import type { LateGame } from '../late-fees/game';
import { killerOf, venueOf } from '../late-fees/registry';
import { availableEndings } from '../late-fees/sequels';
import type { LateStore } from '../late-fees/store';

/** Roll credits: who is left, and how this film ends (which decides the sequel). */
export function createCredits(store: LateStore): { el: HTMLElement; render(game: LateGame): void } {
  const stakes = h('p', { class: 'credits-stakes' });
  const list = h('div', { class: 'credits-endings' });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'ROLL CREDITS'), stakes, list);
  let shown = '';
  return {
    el,
    render(game) {
      const r = game.run;
      setText(stakes, venueOf(r).stakes(r));
      const endings = availableEndings(game);
      const key = `${r.seed}:${endings.join(',')}`;
      if (key === shown) return;
      shown = key;
      const words = { ...venueOf(r).lexicon, nextPart: String(r.config.part + 1) };
      list.replaceChildren(
        ...endings.map((id) => {
          const e = killerOf(r).endings[id];
          const go = h('button', { class: 'buy credits-go', type: 'button', 'aria-label': e.title }, e.title);
          go.addEventListener('click', () => store.dispatch({ type: 'completeRun', ending: id, seed: (Math.random() * 2 ** 31) | 0 }));
          return h('section', { class: 'credits-ending' }, h('p', { class: 'item-desc' }, interpolate(e.text, words)), go);
        }),
      );
    },
  };
}
