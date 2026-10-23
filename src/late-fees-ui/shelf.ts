import { createDialog } from '../engine/ui/dialog';
import { h } from '../engine/ui/dom';
import type { LateGame } from '../late-fees/game';
import { CROSSOVERS, CUT_UNLOCK_FILMS, isCutUnlocked, isTapeStocked, ORIGINALS, runConfigFor, tapeUnlock, type TapeDef } from '../late-fees/sequels';
import type { LateStore } from '../late-fees/store';
import { KILLERS } from '../late-fees/registry';
import type { KillerId } from '../late-fees/state';

/** The horror shelf at Late Fees Video: pick a tape. The sequel replaces the original once a film is finished. */
export function createShelf(store: LateStore): { el: HTMLElement; render(game: LateGame): void } {
  const list = h('ul', { class: 'shelf-list' });
  // Between films the shelf is the only way on: a choice that must be made.
  const dialog = createDialog({ title: 'HORROR · NEW RELEASES', className: 'shelf', closable: false });
  dialog.body.prepend(h('p', { class: 'shelf-sign' }, 'LATE FEES VIDEO'));
  dialog.body.append(list, h('p', { class: 'shelf-small' }, 'BE KIND. REWIND. ALL RENTALS DUE BACK BY MIDNIGHT.'));
  const el = dialog.el;
  let shown = '';

  const tape = (game: LateGame, t: TapeDef) => {
    const title = runConfigFor(game.profile, t.venue, t.killer).title;
    const spine = h('span', { class: 'tape-spine' }, title);
    const blurb = h('p', { class: 'tape-blurb' }, t.blurb);
    if (!isTapeStocked(game.profile, t)) {
      const needed = tapeUnlock(t);
      return h('li', { class: 'tape', 'data-stock': 'out' }, spine, blurb, h('span', { class: 'tape-out' }, `BACK IN STOCK AFTER ${needed} FILM${needed === 1 ? '' : 'S'}`));
    }
    const rent = h('button', { class: 'tape-rent', type: 'button', 'aria-label': `Rent ${title}` }, 'RENT ▶');
    rent.addEventListener('click', () => store.dispatch({ type: 'chooseTape', venue: t.venue, killer: t.killer, seed: (Math.random() * 2 ** 31) | 0 }));
    return h('li', { class: 'tape', 'data-stock': 'in', 'data-crossover': String(Boolean(t.crossover)) }, spine, blurb, rent);
  };

  /** Side B: flip the tape and play the killer, haunting every place at once. */
  const killerTape = (game: LateGame, k: KillerId) => {
    const name = KILLERS[k].name;
    if (!game.cut && !isCutUnlocked(game.profile)) {
      return h('li', { class: 'tape', 'data-stock': 'out', 'data-side': 'b' }, h('span', { class: 'tape-spine' }, name), h('span', { class: 'tape-out' }, `SIDE B · AFTER ${CUT_UNLOCK_FILMS} FILMS`));
    }
    const resuming = game.cut?.killer === k;
    const play = h('button', { class: 'tape-rent', type: 'button', 'aria-label': `Play as ${name}` }, resuming ? 'RESUME ▶' : 'FLIP ▶');
    play.addEventListener('click', () => store.dispatch({ type: 'startCut', killer: k, seed: (Math.random() * 2 ** 31) | 0 }));
    const blurb = resuming ? 'Your cut is waiting where you left it.' : 'Haunt the camp, the clinic and the insurer at once. They run themselves. You decide where it hurts.';
    return h('li', { class: 'tape', 'data-stock': 'in', 'data-side': 'b' }, h('span', { class: 'tape-spine' }, name), h('p', { class: 'tape-blurb' }, blurb), play);
  };

  function render(game: LateGame) {
    dialog.set(game.shelf);
    if (!game.shelf) return;
    const key = `${game.profile.sequels}:${game.profile.history.length}:${game.cut?.killer ?? ''}`;
    if (key === shown) return;
    shown = key;
    list.replaceChildren(
      ...ORIGINALS.map((t) => tape(game, t)),
      h('li', { class: 'shelf-section', 'aria-hidden': 'true' }, 'CROSSOVERS'),
      ...CROSSOVERS.map((t) => tape(game, t)),
      h('li', { class: 'shelf-section shelf-side-b', 'aria-hidden': 'true' }, "SIDE B · THE KILLER'S CUT"),
      ...(Object.keys(KILLERS) as KillerId[]).map((k) => killerTape(game, k)),
    );
  }

  return { el, render };
}
