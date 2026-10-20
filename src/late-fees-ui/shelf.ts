import { h } from '../shared/ui/dom';
import type { LateGame } from '../late-fees/game';
import { runConfigFor, TAPES } from '../late-fees/sequels';
import type { LateStore } from '../late-fees/store';
import type { VenueId } from '../late-fees/state';

/** The horror shelf at Late Fees Video: pick a tape. The sequel replaces the original once a film is finished. */
export function createShelf(store: LateStore): { el: HTMLElement; render(game: LateGame): void } {
  const list = h('ul', { class: 'shelf-list' });
  const el = h(
    'div',
    { class: 'shelf', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'shelf-title', hidden: true },
    h(
      'div',
      { class: 'shelf-box' },
      h('p', { class: 'shelf-sign' }, 'LATE FEES VIDEO'),
      h('h2', { class: 'shelf-title', id: 'shelf-title' }, 'HORROR · NEW RELEASES'),
      list,
      h('p', { class: 'shelf-small' }, 'BE KIND. REWIND. ALL RENTALS DUE BACK BY MIDNIGHT.'),
    ),
  );
  let shown = '';

  function render(game: LateGame) {
    el.hidden = !game.shelf;
    if (!game.shelf) return;
    const key = `${game.profile.sequels}`;
    if (key === shown) return;
    shown = key;
    list.replaceChildren(
      ...TAPES.map((tape) => {
        const title = tape.available ? runConfigFor(game.profile, tape.venue as VenueId).title : tape.title;
        const spine = h('span', { class: 'tape-spine' }, title);
        const blurb = h('p', { class: 'tape-blurb' }, tape.blurb);
        if (!tape.available) {
          return h('li', { class: 'tape', 'data-stock': 'out' }, spine, blurb, h('span', { class: 'tape-out' }, 'OUT OF STOCK'));
        }
        const rent = h('button', { class: 'tape-rent', type: 'button', 'aria-label': `Rent ${title}` }, 'RENT ▶');
        rent.addEventListener('click', () => store.dispatch({ type: 'chooseTape', venue: tape.venue as VenueId, seed: (Math.random() * 2 ** 31) | 0 }));
        return h('li', { class: 'tape', 'data-stock': 'in' }, spine, blurb, rent);
      }),
    );
  }

  return { el, render };
}
