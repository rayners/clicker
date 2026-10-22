import { formatNumber } from '../shared/format';
import { h, setAttr, setText } from '../shared/ui/dom';
import { createOptOut } from '../shared/telemetry';
import { FATHOM_UPGRADES } from '../fathom-data/upgrades';
import { availableUpgrades } from '../fathom/upgrades';
import { availableEndings, endingRewards, type Ending } from '../fathom/season';
import { fathomSaves } from '../fathom/save';
import { DEEP_UNLOCK_SEASONS, isDeepUnlocked } from '../fathom/deep';
import type { FathomGame } from '../fathom/game';
import type { Outfit } from '../fathom/state';
import type { FathomStore } from '../fathom/store';

const CONFIRM_TIMEOUT_MS = 5000;
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
  let pending: Ending | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cards = (Object.keys(ENDINGS) as Ending[]).map((ending) => {
    const def = ENDINGS[ending];
    const reward = h('p', { class: 'end-reward' });
    const button = h('button', { class: 'buy end-go', type: 'button' });
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
      store.dispatch({ type: 'completeSeason', ending, seed: seed() });
    });
    const el = h('section', { class: 'item end-card', 'aria-label': def.title }, h('h3', { class: 'end-title' }, def.title), h('p', { class: 'item-desc' }, def.text), reward, button);
    return { ending, el, reward, button };
  });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, "THE SEASON'S END"), h('p', { class: 'zone-desc' }, 'THE SEAM IS STILL OPEN. THIS CHOICE ENDS THE SEASON.'), ...cards.map((c) => c.el));
  function render(game: FathomGame) {
    const offered = availableEndings(game);
    const rewards = endingRewards(game);
    for (const card of cards) {
      card.el.hidden = !offered.includes(card.ending);
      setText(card.reward, ENDINGS[card.ending].reward(rewards[card.ending]));
      const confirming = pending === card.ending;
      setText(card.button, confirming ? 'CONFIRM: END THE SEASON' : ENDINGS[card.ending].title);
      setAttr(card.button, 'aria-label', confirming ? 'Confirm: end the season' : ENDINGS[card.ending].title.toLowerCase());
    }
  }
  return { el, render };
}

/** Settings and the save book. */
export function createConfig(store: FathomStore): { button: HTMLButtonElement; dialog: HTMLElement; render(game: FathomGame): void } {
  const button = h('button', { class: 'cfg-open', type: 'button', 'aria-label': 'Configuration' }, 'CFG');
  const motion = h('input', { type: 'checkbox', id: 'fa-motion' });
  const share = h('input', { type: 'checkbox', id: 'fa-share' });
  const code = h('textarea', { class: 'cfg-code', rows: 4, spellcheck: 'false', 'aria-label': 'Save code' });
  const status = h('p', { class: 'cfg-status', role: 'status' });
  const exportButton = h('button', { class: 'buy', type: 'button' }, 'EXPORT');
  const importButton = h('button', { class: 'buy', type: 'button' }, 'IMPORT');
  const reset = h('button', { class: 'buy cfg-danger', type: 'button', 'aria-label': 'Start a new season from scratch' }, 'START OVER');
  const close = h('button', { class: 'cfg-close', type: 'button', 'aria-label': 'Close' }, '✕');
  // Play as the Source: the sonar turned around (docs/HORROR-TIER.md).
  const answer = h('button', { class: 'buy', type: 'button', 'aria-label': 'Answer the Source' }, 'ANSWER THE SOURCE');
  const dialog = h(
    'div',
    { class: 'cfg', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'fa-cfg-title', hidden: true },
    h(
      'div',
      { class: 'cfg-box' },
      h('div', { class: 'cfg-head' }, h('h2', { class: 'panel-title', id: 'fa-cfg-title' }, 'Configuration'), close),
      h('label', { class: 'cfg-toggle', for: 'fa-motion' }, motion, ' REDUCE MOTION'),
      h('label', { class: 'cfg-toggle', for: 'fa-share' }, share, ' SHARE ANONYMOUS PLAY DATA'),
      h('p', { class: 'cfg-note' }, 'MILESTONES AND ERRORS ONLY. NO COOKIES, NO PERSONAL DATA.'),
      h('h3', { class: 'panel-sub' }, 'THE SAVE BOOK (KEPT ON THIS DEVICE ONLY)'),
      code,
      h('div', { class: 'cfg-row' }, exportButton, importButton),
      status,
      h('h3', { class: 'panel-sub' }, 'THE SOURCE'),
      answer,
      h('h3', { class: 'panel-sub' }, 'START OVER'),
      reset,
    ),
  );
  const show = (open: boolean) => {
    dialog.hidden = !open;
    setText(status, '');
    if (open) close.focus();
  };
  button.addEventListener('click', () => show(true));
  close.addEventListener('click', () => show(false));
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') show(false);
  });
  const optOut = createOptOut(window.localStorage);
  share.checked = optOut.sharing();
  share.addEventListener('change', () => optOut.setSharing(share.checked));
  motion.addEventListener('change', () => store.dispatch({ type: 'setSetting', key: 'reducedMotion', value: motion.checked }));
  exportButton.addEventListener('click', () => {
    code.value = fathomSaves.exportSave(store.getState());
    code.select();
    setText(status, 'SAVE CODE WRITTEN. KEEP IT SOMEWHERE SAFE.');
  });
  importButton.addEventListener('click', () => {
    try {
      store.replace({ ...fathomSaves.importSave(code.value), savedAt: Date.now() });
      setText(status, 'SAVE IMPORTED.');
    } catch {
      setText(status, 'THAT IS NOT A SAVE CODE. NOTHING CHANGED.');
    }
  });
  answer.addEventListener('click', () => {
    store.dispatch({ type: 'startDeep', seed: seed() });
    show(false);
  });
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  reset.addEventListener('click', () => {
    if (!pending) {
      pending = true;
      setText(reset, 'CONFIRM: START OVER');
      reset.setAttribute('aria-label', 'Confirm: start over, losing every season');
      timer = setTimeout(() => {
        pending = false;
        setText(reset, 'START OVER');
        reset.setAttribute('aria-label', 'Start a new season from scratch');
      }, CONFIRM_TIMEOUT_MS);
      return;
    }
    pending = false;
    clearTimeout(timer);
    store.dispatch({ type: 'hardReset', seed: seed(), now: Date.now() });
    show(false);
  });
  return {
    button,
    dialog,
    render(game) {
      motion.checked = game.profile.settings.reducedMotion;
      // A closed door says what opens it.
      const open = !!game.deep || isDeepUnlocked(game.profile);
      answer.disabled = !open;
      setText(answer, open ? 'ANSWER THE SOURCE' : `ANSWER THE SOURCE · AFTER ${DEEP_UNLOCK_SEASONS} SEASONS`);
    },
  };
}
