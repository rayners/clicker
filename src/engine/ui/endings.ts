/**
 * Choosing how a run ends: a card for each ending on offer, each ended by its own two-tap button.
 * @module
 */
import { createConfirmButton } from './confirm';
import { h, setAttr, setText } from './dom';

/** How a game offers its endings. */
export interface EndingChooserOptions<G, E extends string> {
  /** Every ending, in the order the cards appear. */
  endings: readonly E[];
  available(game: G): readonly E[];
  /** A card's words: its title (also its accessible name), what it means, and what it earns. */
  words(game: G, ending: E): { title: string; text: string; reward: string };
  /** What the button says while waiting for the confirming tap, after "CONFIRM: " (e.g. END THE SEASON). */
  confirm: string;
  onChoose(ending: E, game: G): void;
  /** Names its parts: `<class>-card`, `<class>-<ending>`, `<class>-title`, `<class>-reward`, `<class>-go`. */
  className: string;
  /** More classes for each card, from the game's own styles (e.g. its list rows). */
  cardClass?: string;
  /** The class for a card's text (default `<class>-text`). */
  textClass?: string;
  /** The button's word, the same on every card (default: the ending's title). */
  button?: string;
}

/** The cards for a run's end; `render` shows the endings on offer and their current rewards. */
export function createEndingChooser<G, E extends string>(options: EndingChooserOptions<G, E>): { el: HTMLElement; render(game: G): void } {
  const cls = options.className;
  let last: G | null = null;
  const cards = options.endings.map((ending) => {
    const title = h('h3', { class: `${cls}-title` });
    const text = h('p', { class: options.textClass ?? `${cls}-text` });
    const reward = h('p', { class: `${cls}-reward` });
    const el = h('section', { class: [options.cardClass, `${cls}-card`, `${cls}-${ending}`].filter(Boolean).join(' ') }, title, text, reward);
    // Ending a run is for good, so it takes a second, unhurried tap.
    const go = createConfirmButton({
      className: `buy ${cls}-go`,
      onConfirm: () => last && options.onChoose(ending, last),
      onArm: (armed) => el.classList.toggle('is-pending', armed),
    });
    el.append(go.el);
    return { ending, el, title, text, reward, go };
  });
  const el = h('div', { class: `${cls}-cards` }, ...cards.map((c) => c.el));

  return {
    el,
    render(game) {
      last = game;
      const offered = options.available(game);
      for (const card of cards) {
        card.el.hidden = !offered.includes(card.ending);
        if (card.el.hidden) continue;
        const words = options.words(game, card.ending);
        setText(card.title, words.title);
        setText(card.text, words.text);
        setText(card.reward, words.reward);
        card.reward.hidden = words.reward === '';
        setAttr(card.el, 'aria-label', words.title);
        card.go.label(words.title, options.button ?? words.title, options.confirm);
      }
    },
  };
}
