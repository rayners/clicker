import { h, setText } from '../engine/ui/dom';
import { createEndingChooser } from '../engine/ui/endings';
import { interpolate } from '../engine/lexicon';
import type { LateGame } from '../late-fees/game';
import { venueOf } from '../late-fees/registry';
import { availableEndings, endingFor } from '../late-fees/sequels';
import type { Ending } from '../late-fees/kinds';
import type { LateStore } from '../late-fees/store';

const ENDINGS: readonly Ending[] = ['kill', 'sell', 'burn'];

/** Roll credits: who is left, and how this film ends (which decides the sequel). */
export function createCredits(store: LateStore): { el: HTMLElement; render(game: LateGame): void } {
  const stakes = h('p', { class: 'credits-stakes' });
  const chooser = createEndingChooser<LateGame, Ending>({
    endings: ENDINGS,
    available: availableEndings,
    words(game, ending) {
      const r = game.run;
      const e = endingFor(r, ending);
      return { title: e.title, text: interpolate(e.text, { ...venueOf(r).lexicon, nextPart: String(r.config.part + 1) }), reward: '' };
    },
    confirm: 'ROLL THE SEQUEL',
    onChoose: (ending) => store.dispatch({ type: 'completeRun', ending, seed: (Math.random() * 2 ** 31) | 0 }),
    className: 'credits',
    cardClass: 'credits-ending',
    textClass: 'item-desc',
  });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'ROLL CREDITS'), stakes, chooser.el);
  return {
    el,
    render(game) {
      setText(stakes, venueOf(game.run).stakes(game.run));
      chooser.render(game);
    },
  };
}
