import { h, setAttr } from '../engine/ui/dom';
import { createEndingChooser } from '../engine/ui/endings';
import { availableEndings, endingRewards, type Ending } from '../forest/charter';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';
import type { SiteId } from '../forest/state';

const ENDINGS: Record<Ending, { title: string; text: string; reward(r: { renown: number; grace: number }): string }> = {
  sell: {
    title: 'SELL THE KEY TO THE COLLEGIUM',
    text: 'They have waited a long time, and they pay at once. The company will be rich and famous. Somewhere, something will be opened.',
    reward: (r) => `+${r.renown} RENOWN · LARGER HAULS ON EVERY CHARTER TO COME`,
  },
  return: {
    title: 'RETURN THE KEY TO THE WOLD-KIN',
    text: 'Carry the fragments back into the Heartwood and lay them where they were taken from. The Wold-kin will not thank you. Few who carry them come back.',
    reward: (r) => `+${r.grace} GRACE · LESS BLIGHT AND FASTER MENDING FROM NOW ON`,
  },
  burn: {
    title: 'BURN THE LEDGER',
    text: 'The Factor has kept this book before, and the one before it. Burn them all, the Key with them, and stop pretending not to remember.',
    reward: (r) => `+${r.renown} RENOWN · +${r.grace} GRACE`,
  },
};

/** The end of a charter: what the Factor does with the Key. */
export function createReckoning(store: ForestStore): { el: HTMLElement; render(game: ForestGame): void } {
  let site: SiteId = 'forest';
  const sites = (['forest', 'keep'] as const).map((id) => {
    const label = id === 'keep' ? 'Morrowgate Keep' : 'the forest';
    const button = h('button', { class: 'standing', type: 'button', 'aria-label': `Next charter: ${label}`, 'aria-pressed': 'false' }, label.toUpperCase());
    button.addEventListener('click', () => {
      site = id;
      render(store.getState());
    });
    return { id, button };
  });
  const chooser = createEndingChooser<ForestGame, Ending>({
    endings: Object.keys(ENDINGS) as Ending[],
    available: availableEndings,
    words: (game, ending) => ({ title: ENDINGS[ending].title, text: ENDINGS[ending].text, reward: ENDINGS[ending].reward(endingRewards(game)[ending]) }),
    confirm: 'END THE CHARTER',
    onChoose: (ending) => store.dispatch({ type: 'completeCharter', ending, seed: (Math.random() * 2 ** 31) | 0, site }),
    className: 'reckon',
    cardClass: 'sys-row',
    textClass: 'sys-desc',
  });

  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'The Reckoning'),
    h('p', { class: 'reckon-intro' }, 'THE CHARTER HAS COME DUE. THE COMPANY HOLDS THE KEY, OR WHAT THERE IS OF IT. THIS CHOICE ENDS THE CHARTER.'),
    h('div', { class: 'reckon-site' }, h('span', { class: 'reckon-site-label' }, 'THE NEXT CHARTER DELVES '), ...sites.map((s) => s.button)),
    chooser.el,
  );

  function render(game: ForestGame) {
    for (const s of sites) setAttr(s.button, 'aria-pressed', String(s.id === site));
    chooser.render(game);
  }

  return { el, render };
}
