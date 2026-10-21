import { h, setAttr, setText } from '../shared/ui/dom';
import { availableEndings, endingRewards, type Ending } from '../forest/charter';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';
import type { SiteId } from '../forest/state';

const CONFIRM_TIMEOUT_MS = 5000;

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
  let pending: Ending | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
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

  const cards = (Object.keys(ENDINGS) as Ending[]).map((ending) => {
    const def = ENDINGS[ending];
    const reward = h('p', { class: 'reckon-reward' });
    const button = h('button', { class: 'buy reckon-go', type: 'button' });
    button.addEventListener('click', () => {
      if (pending !== ending) {
        pending = ending;
        clearTimeout(timer);
        timer = setTimeout(() => {
          pending = null;
          render(store.getState());
        }, CONFIRM_TIMEOUT_MS);
        render(store.getState());
        return;
      }
      pending = null;
      clearTimeout(timer);
      store.dispatch({ type: 'completeCharter', ending, seed: (Math.random() * 2 ** 31) | 0, site });
    });
    const el = h(
      'section',
      { class: 'sys-row reckon-card', 'aria-label': def.title },
      h('h3', { class: 'reckon-title' }, def.title),
      h('p', { class: 'sys-desc' }, def.text),
      reward,
      button,
    );
    return { ending, el, reward, button };
  });

  const el = h(
    'div',
    { class: 'panel-body' },
    h('h2', { class: 'panel-title' }, 'The Reckoning'),
    h('p', { class: 'reckon-intro' }, 'THE CHARTER HAS COME DUE. THE COMPANY HOLDS THE KEY, OR WHAT THERE IS OF IT. THIS CHOICE ENDS THE CHARTER.'),
    h('div', { class: 'reckon-site' }, h('span', { class: 'reckon-site-label' }, 'THE NEXT CHARTER DELVES '), ...sites.map((s) => s.button)),
    ...cards.map((c) => c.el),
  );

  function render(game: ForestGame) {
    for (const s of sites) setAttr(s.button, 'aria-pressed', String(s.id === site));
    const offered = availableEndings(game);
    const rewards = endingRewards(game);
    for (const card of cards) {
      card.el.hidden = !offered.includes(card.ending);
      setText(card.reward, ENDINGS[card.ending].reward(rewards[card.ending]));
      const confirming = pending === card.ending;
      setText(card.button, confirming ? 'CONFIRM: END THE CHARTER' : ENDINGS[card.ending].title);
      setAttr(card.button, 'aria-label', confirming ? 'Confirm: end the charter' : ENDINGS[card.ending].title.toLowerCase());
      card.el.classList.toggle('is-pending', confirming);
    }
  }

  return { el, render };
}
