import type { GameState } from '../core/game';
import { availableEndings, endingRewards, type Ending } from '../core/prestige';
import type { Store } from '../core/store';
import { h, setAttr, setText } from '../engine/ui/dom';
import { horrorOf, scenarioOf } from '../mission/registry';
import { interpolate } from '../engine/lexicon';

const ENDINGS: Record<Ending, { rewardText: (s: number, c: number) => string }> = {
  deliver: { rewardText: (s) => `+${s} SENIORITY // PERMANENT OUTPUT BONUS` },
  scuttle: { rewardText: (_s, c) => `+${c} CONSCIENCE // MORE CREW CAN WAKE, FEWER INCIDENTS` },
  broadcast: { rewardText: (s, c) => `+${s} SENIORITY // +${c} CONSCIENCE` },
};

/** The horror's wording for an ending, in the scenario's vocabulary. */
function endingWords(game: GameState, ending: Ending): { title: string; text: string } {
  const words = horrorOf(game.mission).endings[ending] ?? { title: ending.toUpperCase(), text: '' };
  const { lexicon } = scenarioOf(game.mission);
  return { title: interpolate(words.title, lexicon), text: interpolate(words.text, lexicon) };
}

const CONFIRM_TIMEOUT_MS = 5000;

export function createTerminusPanel(store: Store): { el: HTMLElement; render(game: GameState): void } {
  let pending: Ending | null = null;
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;

  const stakes = h('p', { class: 'term-stakes' });
  const cards = (Object.keys(ENDINGS) as Ending[]).map((ending) => {
    const title = h('h3', { class: 'term-title' });
    const text = h('p', { class: 'sys-desc' });
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
      { class: `term-card term-${ending}` },
      title,
      text,
      reward,
      button,
    );
    return { ending, el, reward, button, title, text };
  });

  const el = h(
    'section',
    { class: 'panel panel-terminus', role: 'tabpanel', id: 'panel-terminus', 'aria-labelledby': 'tab-terminus' },
    h('h2', { class: 'panel-title' }, 'TERMINUS PROTOCOLS'),
    h('p', { class: 'term-intro' }, 'THE RETURN WINDOW IS OPEN. THIS DECISION ENDS THE CONTRACT.'),
    stakes,
    ...cards.map((c) => c.el),
  );

  function render(game: GameState) {
    const atStake = scenarioOf(game.mission).stakes?.(game.mission) ?? '';
    stakes.hidden = atStake === '';
    setText(stakes, atStake);
    const available = availableEndings(game);
    const rewards = endingRewards(game);
    for (const card of cards) {
      card.el.hidden = !available.includes(card.ending);
      const words = endingWords(game, card.ending);
      setText(card.title, words.title);
      setText(card.text, words.text);
      setAttr(card.el, 'aria-label', words.title);
      const r = rewards[card.ending];
      setText(card.reward, ENDINGS[card.ending].rewardText(r.seniority, r.conscience));
      setText(card.button, pending === card.ending ? 'CONFIRM: END CONTRACT' : 'EXECUTE');
      card.el.classList.toggle('is-pending', pending === card.ending);
    }
  }

  return { el, render };
}
