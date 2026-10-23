import type { GameState } from '../core/game';
import { availableEndings, endingRewards, type Ending } from '../core/prestige';
import type { Store } from '../core/store';
import { h, setText } from '../engine/ui/dom';
import { createEndingChooser } from '../engine/ui/endings';
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

export function createTerminusPanel(store: Store): { el: HTMLElement; render(game: GameState): void } {
  const stakes = h('p', { class: 'term-stakes' });
  const chooser = createEndingChooser<GameState, Ending>({
    endings: Object.keys(ENDINGS) as Ending[],
    available: availableEndings,
    words(game, ending) {
      const r = endingRewards(game)[ending];
      return { ...endingWords(game, ending), reward: ENDINGS[ending].rewardText(r.seniority, r.conscience) };
    },
    confirm: 'END CONTRACT',
    button: 'EXECUTE',
    onChoose: (ending) => store.dispatch({ type: 'completeContract', ending, seed: (Math.random() * 2 ** 31) | 0 }),
    className: 'term',
    textClass: 'sys-desc',
  });

  const el = h(
    'section',
    { class: 'panel panel-terminus', role: 'tabpanel', id: 'panel-terminus', 'aria-labelledby': 'tab-terminus' },
    h('h2', { class: 'panel-title' }, 'TERMINUS PROTOCOLS'),
    h('p', { class: 'term-intro' }, 'THE RETURN WINDOW IS OPEN. THIS DECISION ENDS THE CONTRACT.'),
    stakes,
    chooser.el,
  );

  function render(game: GameState) {
    const atStake = scenarioOf(game.mission).stakes?.(game.mission) ?? '';
    stakes.hidden = atStake === '';
    setText(stakes, atStake);
    chooser.render(game);
  }

  return { el, render };
}
