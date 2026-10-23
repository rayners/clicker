/**
 * Walkthrough steps and a rules page for any hunt, in the game's own words.
 * @module
 */
import type { GuideRules, GuideStep } from './guide';
import { legendEarned, type HuntState } from './hunt';

/** How one play-as-the-horror tier names the hunt engine's parts, so a single guide serves all of them. */
export interface HuntWords {
  /** The tier's name, as in "HOW THE WOOD WORKS". */
  title: string;
  /** One of the runs being hunted, lower case: "place", "charter", "ship". */
  prey: string;
  /** The harvest (what the horror takes and spends), upper case as on screen. */
  harvest: string;
  /** Notoriety, upper case as on screen. */
  notoriety: string;
  /** A selector for the tier's view, so targets never land on another tier's controls on the same page. */
  root: string;
  /** A selector, inside the view, for the first prey's "push harder" control. */
  push: string;
  /** The rest button's label, upper case: "SLEEP", "GO TO GROUND". */
  rest: string;
  /** The heading over what the harvest buys, as on screen: "WHAT THE WOOD BECOMES". */
  growth: string;
}

/** The hunt guide: steps and a rules page for any tier on the shared hunt engine (docs/ROADMAP.md, item 6b). */
export function huntGuide<S>(hunt: (s: S) => HuntState<unknown> | null, w: HuntWords) {
  const on = (test: (h: HuntState<unknown>) => boolean) => (s: S) => {
    const h = hunt(s);
    return h !== null && test(h);
  };
  const pushing = (h: HuntState<unknown>) => h.split.some((n) => n > 0);
  const steps: GuideStep<S>[] = [
    {
      id: 'hunt-push',
      title: 'PUSH',
      text: `Every ${w.prey} runs itself and defends itself. Put strength on one with + to push harder there.`,
      target: `${w.root} ${w.push}`,
      show: on(() => true),
      done: on(pushing),
    },
    {
      id: 'hunt-hunger',
      title: 'HUNGER',
      text: `Pushing spends hunger; what you take feeds it. At zero, the hunt stalls: ${w.rest} to recover.`,
      target: `${w.root} [aria-label="Hunger"]`,
      show: on(pushing),
      done: () => false,
    },
    {
      id: 'hunt-harvest',
      title: w.harvest,
      text: `What you take is ${w.harvest}. Spend it under ${w.growth}.`,
      show: on((h) => h.dread > 0),
      done: () => false,
    },
    {
      id: 'hunt-notoriety',
      title: w.notoriety,
      text: `${w.notoriety} rises with every taking and makes every ${w.prey} defend harder. It fades, faster while you ${w.rest.toLowerCase()} (${w.rest}).`,
      show: on((h) => h.notoriety > 0.5),
      done: () => false,
    },
    {
      id: 'hunt-legend',
      title: 'LEGEND',
      text: `End the hunt to carry LEGEND into the next one: more strength, and ${w.harvest} in hand from the start.`,
      show: on((h) => legendEarned(h.harvest) > 0),
      done: () => false,
    },
  ];
  const rules: GuideRules = {
    title: `HOW ${w.title} WORKS`,
    sections: [
      { heading: 'STRENGTH', text: `Split your strength across the ${w.prey}s with − and +. Each step pushes harder there.` },
      { heading: 'HUNGER', text: `Every step pushed spends hunger each second; what you take feeds it back. Starving, the hunt stalls; resting (${w.rest}) slowly restores it.` },
      { heading: w.harvest, text: `Everything you take, to spend under ${w.growth}. All of it counts toward Legend, spent or not.` },
      { heading: w.notoriety, text: `Grows with every taking and makes every ${w.prey} defend harder. It fades with time, faster while you ${w.rest.toLowerCase()}.` },
      { heading: `THE END OF A ${w.prey.toUpperCase()}`, text: `Each ${w.prey} runs its own story and slowly works you out. One that reaches its end beats you back: you lie low for a while, and a fresh ${w.prey} takes its place.` },
      { heading: 'LEGEND', text: `Ending the hunt turns everything taken into Legend, kept for the next hunt by the same horror: a step of strength for every 2, and ${w.harvest} in hand for each.` },
    ],
  };
  return { steps: (_s: S): readonly GuideStep<S>[] => steps, rules: (_s: S): GuideRules => rules };
}
