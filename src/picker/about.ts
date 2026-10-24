import { h } from '../engine/ui/dom';
import { announce } from '../engine/telemetry';

export const TIP_JAR = 'https://ko-fi.com/rayners';
export const REPOSITORY = 'https://github.com/rayners/clicker';

/** The About page: who made the games and how, what they do with your data, and the tip jar. */
export function mountAbout(root: HTMLElement): void {
  const tip = h('a', { class: 'about-tip', href: TIP_JAR, target: '_blank', rel: 'noopener noreferrer' }, 'Leave a tip in the tip jar on Ko-fi');
  tip.addEventListener('click', () => announce({ name: 'tip_jar_opened', props: { from: 'about' } }));
  root.replaceChildren(
    h(
      'main',
      { class: 'about' },
      h('h1', { class: 'about-title' }, 'About these games'),
      h('p', {}, 'DEEP CONTRACT, Charter of the Elderdark, LATE FEES and DOWN THERE are made by David Raynes.'),
      // These two facts belong together, so a player can weigh one against the other.
      h(
        'p',
        { class: 'about-trust' },
        'I have been writing software for 30 years, and I built all four of these games with Claude, Anthropic’s AI: I set the direction and play the games as they grow, and Claude writes the code with me, a test at a time.',
      ),
      h('p', {}, 'Every line is public: ', h('a', { href: REPOSITORY, target: '_blank', rel: 'noopener noreferrer' }, 'read the source code on GitHub'), ', with the design notes and the history of how it was built.'),
      h(
        'p',
        {},
        'You may reuse it. The code is under the ',
        h('a', { href: `${REPOSITORY}/blob/main/LICENSE`, target: '_blank', rel: 'noopener noreferrer' }, 'MIT'),
        ' license, and the writing and art under ',
        h('a', { href: 'https://creativecommons.org/licenses/by/4.0/', target: '_blank', rel: 'noopener noreferrer' }, 'CC BY 4.0'),
        '. Either way, keep a credit to David Raynes with it.',
      ),
      h('p', {}, 'The engine under them can also play games written entirely as data: see the ', h('a', { href: '../made/' }, 'games made with the engine'), '.'),
      h('h2', { class: 'about-sub' }, 'Your data'),
      h(
        'p',
        {},
        'Everything runs in your browser. The games save on this device, with no accounts and no sign-up; moving to another device is a save code you copy across. The only thing that ever leaves is optional anonymous play data (milestones and errors, no cookies), and each game’s settings turn it off.',
      ),
      h('h2', { class: 'about-sub' }, 'Tip jar'),
      h('p', {}, 'The games are free and will stay that way. If you have enjoyed them, a tip helps. It unlocks nothing, and nothing is held back without one.'),
      h('p', {}, tip),
      h('p', { class: 'about-back' }, h('a', { href: '../' }, '← Back to the games')),
    ),
  );
}
