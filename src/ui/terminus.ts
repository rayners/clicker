import type { GameState } from '../core/game';
import { availableEndings, endingRewards, type Ending } from '../core/prestige';
import type { Store } from '../core/store';
import { h, setText } from './dom';

const ENDINGS: Record<Ending, { title: string; text: string; rewardText: (s: number, c: number) => string }> = {
  deliver: {
    title: 'DELIVER THE CARGO',
    text: 'Seal the hold. Set course for Combine Station Halvard: eleven years. The specimens travel in cryo. Whatever is loose aboard travels too. The crew will not be thawed.',
    rewardText: (s) => `+${s} SENIORITY // PERMANENT OUTPUT BONUS`,
  },
  scuttle: {
    title: 'SCUTTLE THE SHIP',
    text: 'Purge the hold and overload the reactor. Surviving crew evacuate in the lifeboat under a distress beacon. Special Projects receives nothing.',
    rewardText: (_s, c) => `+${c} CONSCIENCE // MORE CREW CAN WAKE, FEWER INCIDENTS`,
  },
  broadcast: {
    title: 'BROADCAST 0-77',
    text: 'Transmit Special Order 0-77 and the full archive on every frequency, unencrypted. Then bring the cargo home anyway. Let the Combine explain itself.',
    rewardText: (s, c) => `+${s} SENIORITY // +${c} CONSCIENCE`,
  },
};

const CONFIRM_TIMEOUT_MS = 5000;

export function createTerminusPanel(store: Store): { el: HTMLElement; render(game: GameState): void } {
  let pending: Ending | null = null;
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;

  const cards = (Object.keys(ENDINGS) as Ending[]).map((ending) => {
    const def = ENDINGS[ending];
    const reward = h('p', { class: 'term-reward' });
    const button = h('button', { class: 'buy term-go', type: 'button' }, 'EXECUTE');
    button.addEventListener('click', () => {
      if (pending !== ending) {
        pending = ending;
        clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => (pending = null), CONFIRM_TIMEOUT_MS);
        render(store.getState());
        return;
      }
      pending = null;
      clearTimeout(pendingTimer);
      store.dispatch({ type: 'completeContract', ending, seed: (Math.random() * 2 ** 31) | 0 });
    });
    const el = h(
      'section',
      { class: `term-card term-${ending}`, 'aria-label': def.title },
      h('h3', { class: 'term-title' }, def.title),
      h('p', { class: 'sys-desc' }, def.text),
      reward,
      button,
    );
    return { ending, el, reward, button };
  });

  const el = h(
    'section',
    { class: 'panel panel-terminus', role: 'tabpanel', id: 'panel-terminus', 'aria-labelledby': 'tab-terminus' },
    h('h2', { class: 'panel-title' }, 'TERMINUS PROTOCOLS'),
    h('p', { class: 'term-intro' }, 'THE RETURN WINDOW IS OPEN. THIS DECISION ENDS THE CONTRACT.'),
    ...cards.map((c) => c.el),
  );

  function render(game: GameState) {
    const available = availableEndings(game);
    const rewards = endingRewards(game);
    for (const card of cards) {
      card.el.hidden = !available.includes(card.ending);
      const r = rewards[card.ending];
      setText(card.reward, ENDINGS[card.ending].rewardText(r.seniority, r.conscience));
      setText(card.button, pending === card.ending ? 'CONFIRM: END CONTRACT' : 'EXECUTE');
      card.el.classList.toggle('is-pending', pending === card.ending);
    }
  }

  return { el, render };
}
