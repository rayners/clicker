import { createSettings } from '../engine/ui/settings';
import { createEndingChooser } from '../engine/ui/endings';
import { formatNumber } from '../engine/format';
import { h } from '../engine/ui/dom';
import { FATHOM_UPGRADES } from '../fathom-data/upgrades';
import { availableUpgrades } from '../fathom/upgrades';
import { availableEndings, endingRewards, type Ending } from '../fathom/season';
import { fathomSaves } from '../fathom/save';
import { DEEP_UNLOCK_SEASONS, isDeepUnlocked } from '../fathom/deep';
import { createDoors } from '../engine/ui/doors';
import type { FathomGame } from '../fathom/game';
import type { Outfit } from '../fathom/state';
import type { FathomStore } from '../fathom/store';

const seed = () => (Math.random() * 2 ** 31) | 0;

/** Requisitions: what can be bought now, and what has been. */
export function createStorePanel(store: FathomStore): { el: HTMLElement; render(o: Outfit): void; hasAffordable(o: Outfit): boolean } {
  const list = h('ul', { class: 'item-list' });
  const owned = h('ul', { class: 'store-owned' });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'REQUISITIONS'), list, h('h3', { class: 'panel-sub' }, 'BOUGHT'), owned);
  let shown = '';
  return {
    el,
    hasAffordable: (o) => availableUpgrades(o).some((u) => u.cost <= o.cash),
    render(o) {
      const items = availableUpgrades(o);
      const key = `${items.map((u) => u.id).join(',')}|${o.upgrades.length}`;
      if (key !== shown) {
        shown = key;
        list.replaceChildren(
          ...items.map((u) => {
            const buy = h('button', { class: 'buy', type: 'button', 'data-cost': u.cost, 'aria-label': `Buy ${u.name} for $${formatNumber(u.cost)}` }, `BUY $${formatNumber(u.cost)}`);
            buy.addEventListener('click', () => store.dispatch({ type: 'buyUpgrade', id: u.id }));
            return h('li', { class: 'item' }, h('div', { class: 'item-head' }, h('span', { class: 'item-name' }, u.name)), h('p', { class: 'item-desc' }, u.description), h('div', { class: 'item-foot' }, buy));
          }),
        );
        owned.replaceChildren(...FATHOM_UPGRADES.filter((u) => o.upgrades.includes(u.id)).map((u) => h('li', {}, u.name)));
      }
      for (const b of list.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = o.cash < Number(b.dataset.cost);
    },
  };
}

const ENDINGS: Record<Ending, { title: string; text: string; reward(r: { standing: number; notes: number }): string }> = {
  close: {
    title: 'CLOSE THE BREACH',
    text: 'Send the Bulwarks down the trench wall with everything the station has, and bring the seam down on whatever is behind it. The research is lost with it.',
    reward: (r) => `+${r.notes} FIELD NOTES · EVERY GUARD WATCHES FURTHER NEXT SEASON`,
  },
  study: {
    title: 'LET THE COMPANY STUDY IT',
    text: 'Seal the coast, leave the seam open, and hand the station to the parent company\'s scientists. The money will be extraordinary. So will next season.',
    reward: (r) => `+${r.standing} STANDING · EVERY ZONE PAYS MORE NEXT SEASON`,
  },
  through: {
    title: 'GO THROUGH IT',
    text: 'You have closed it before, and studied it before, and it always opens again. This time, take a Bulwark through the seam and see what is on the other side.',
    reward: (r) => `+${r.standing} STANDING · +${r.notes} FIELD NOTES`,
  },
};

/** The season's end: what the outfit does with the seam. */
export function createEndPanel(store: FathomStore): { el: HTMLElement; render(game: FathomGame): void } {
  const chooser = createEndingChooser<FathomGame, Ending>({
    endings: Object.keys(ENDINGS) as Ending[],
    available: availableEndings,
    words: (game, ending) => ({ title: ENDINGS[ending].title, text: ENDINGS[ending].text, reward: ENDINGS[ending].reward(endingRewards(game)[ending]) }),
    confirm: 'END THE SEASON',
    onChoose: (ending) => store.dispatch({ type: 'completeSeason', ending, seed: seed() }),
    className: 'end',
    cardClass: 'item',
    textClass: 'item-desc',
  });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, "THE SEASON'S END"), h('p', { class: 'zone-desc' }, 'THE SEAM IS STILL OPEN. THIS CHOICE ENDS THE SEASON.'), chooser.el);
  return { el, render: chooser.render };
}

/** The seam: playing as the Source, behind its own door rather than in the configuration. */
export function createSeam(store: FathomStore) {
  return createDoors<FathomGame>({
    button: { text: '◉', aria: 'The seam', className: 'cfg-open seam-open' },
    title: 'THE SEAM',
    doors: [
      {
        describe: 'Something at the bottom of the trench has been listening to the towns. Answer it.',
        render: (g) => {
          const open = !!g.deep || isDeepUnlocked(g.profile);
          const text = g.deep ? 'RETURN TO THE SOURCE' : open ? 'ANSWER THE SOURCE' : `ANSWER THE SOURCE · AFTER ${DEEP_UNLOCK_SEASONS} SEASONS`;
          return { text, aria: 'Answer the Source', disabled: !open };
        },
        onOpen: () => store.dispatch({ type: 'startDeep', seed: seed() }),
      },
    ],
  });
}

/** Settings and the save book: sound, reduce motion, export/import, and starting over. */
export function createConfig(store: FathomStore): { button: HTMLButtonElement; dialog: HTMLElement; render(game: FathomGame): void } {
  const settings = createSettings<FathomGame>({
    store,
    saves: fathomSaves,
    settings: (game) => game.profile.settings,
    setSetting: (key, value) => store.dispatch({ type: 'setSetting', key, value }),
    reset: { text: 'START OVER', aria: 'Start a new season from scratch', onConfirm: () => store.dispatch({ type: 'hardReset', seed: seed(), now: Date.now() }) },
    downloadName: (date) => `down-there-${date}.txt`,
    words: {
      button: { text: 'CFG', aria: 'Configuration', className: 'cfg-open' },
      title: 'Configuration',
      headingClass: 'panel-sub',
      saveHeading: 'THE SAVE BOOK (KEPT ON THIS DEVICE ONLY)',
    },
  });
  return { button: settings.button, dialog: settings.dialog, render: settings.render };
}
