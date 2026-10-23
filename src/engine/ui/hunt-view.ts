/**
 * The play-as-the-horror screen for any hunt: what the horror has, how it stands, every prey with a stepper to push
 * on it, sleep and wake, ending the hunt for Legend, what it can become, and a feed of what it took.
 * @module
 */
import { formatNumber } from '../format';
import { legendEarned, type HuntState } from '../hunt';
import { createBuyList } from './buy-list';
import { createConfirmButton } from './confirm';
import { h, setAttr, setText } from './dom';
import { createStepper } from './stepper';

/** One line of a prey's strip, read off the prey; `aria` names it after the prey. */
export interface PreyCell<P> {
  className: string;
  read(prey: P, index: number): string;
  aria?(name: string): string;
}

/** How a game shows its hunt, in its own words. */
export interface HuntViewOptions<G, P> {
  /** Names its parts: `<class>-head`, `-name`, `-back`, `-body`, `-col`, `-stats`, `-stat`, `-value`, `-note`, `-prey`, `-row`, `-alarm`, `-steps`, `-sleep`, `-end`, `-sub`, `-feed`, `-entry`, `-when`, `-upgrade`. */
  className: string;
  /** The region's accessible name. */
  label: string;
  /** The heading; " · LEGEND n" is added while Legend is carried. A function gives the whole heading itself. */
  title: string | ((g: G) => string);
  /** The hunt while the horror is hunting, or null (the view hides). */
  hunt(g: G): HuntState<P> | null;
  /** Legend carried from earlier hunts, for the title (not needed when the title is a function). */
  legend?(g: G): number;
  back: { text: string; aria: string; onPress(): void };
  /** What the harvest and notoriety are called. */
  stats: { harvest: string; notoriety: string };
  /** A line on how the hunt stands, given how many steps are pushed. */
  note(hunt: HuntState<P>, used: number): string;
  rest: { sleep: string; wake: string; onToggle(): void };
  onEnd(): void;
  prey: {
    name(prey: P, index: number): string;
    /** Lines of the strip, each a row of cells. */
    rows: readonly (readonly PreyCell<P>[])[];
    /** 0..1: how much the prey has worked out. */
    alarm(prey: P): number;
    less(name: string): string;
    more(name: string): string;
    onShift(index: number, step: 1 | -1): void;
  };
  upgrades: {
    heading: string;
    /** What is on offer now, with how many times each has been bought. */
    items(g: G): readonly { id: string; name: string; description: string; cost: number; bought: number }[];
    /** The harvest's name on a price (e.g. BIOMASS). */
    currency: string;
    /** The verb a screen reader hears (e.g. Evolve). */
    verb: string;
    onBuy(id: string): void;
  };
  feed: {
    heading: string;
    aria: string;
    entries(hunt: HuntState<P>): readonly { key: string; t: number; when: string; text: string }[];
    /** How many to show (default 8). */
    length?: number;
  };
  /** The guide, if the hunt has one: its tip goes above the stats and its rules button in the header. */
  guide?: { el: HTMLElement; rulesButton: HTMLElement; rulesDialog: HTMLElement; render(g: G): void };
  /** More attributes on the region (e.g. which horror, when two share a style). */
  attrs?: Record<string, string>;
  /** Another class on the region, for a variant of a shared style. */
  variant?: string;
  /** How carried Legend reads after the title (default `LEGEND n`). */
  legendText?(legend: number): string;
  /** The game's own classes for the stats and the section headings, in place of the prefixed ones. */
  classes?: {
    stats?: string;
    stat?: string;
    value?: string;
    label?: string;
    sub?: string;
    feed?: string;
    entry?: string;
    when?: string;
    text?: string;
    /** The upgrade list's class prefix (see `createBuyList`) and row class. */
    upgradeList?: string;
    upgradeRow?: string;
  };
  /** Builds the header from the title, the rules button (if any) and the back button. */
  header?(title: HTMLElement, rules: HTMLElement | null, back: HTMLElement): HTMLElement;
  /** What ending is called: "End the <noun> for n Legend" (default hunt). */
  endNoun?: string;
  /** More elements inside the region (e.g. a screen-noise overlay). */
  extra?: readonly HTMLElement[];
  /** Called on every render while hunting, for the game's own parts (e.g. a clock in its header). */
  onRender?(g: G): void;
}

const WARY = 0.75;

/** The hunt screen; `render` shows it while the horror hunts and hides it otherwise. */
export function createHuntView<G, P>(options: HuntViewOptions<G, P>): { el: HTMLElement; render(g: G): void } {
  const cls = options.className;
  const names = {
    stats: `${cls}-stats`,
    stat: `${cls}-stat`,
    value: `${cls}-value`,
    label: undefined as string | undefined,
    sub: `${cls}-sub`,
    feed: `${cls}-feed`,
    entry: `${cls}-entry`,
    when: `${cls}-when`,
    text: `${cls}-text`,
    upgradeList: `${cls}-up`,
    upgradeRow: `${cls}-upgrade`,
    ...options.classes,
  };
  const noun = options.endNoun ?? 'hunt';
  const legendText = options.legendText ?? ((n: number) => `LEGEND ${n}`);
  const back = h('button', { class: `${cls}-back`, type: 'button', 'aria-label': options.back.aria }, options.back.text);
  back.addEventListener('click', options.back.onPress);
  const stat = (label: string, aria: string) => {
    const value = h('dd', { class: names.value, 'aria-label': aria }, '0');
    return { value, el: h('div', { class: names.stat }, h('dt', names.label ? { class: names.label } : {}, label), value) };
  };
  const capital = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
  const harvest = stat(options.stats.harvest, capital(options.stats.harvest));
  const hunger = stat('HUNGER', 'Hunger');
  const notoriety = stat(options.stats.notoriety, capital(options.stats.notoriety));
  const free = stat('STRENGTH', 'Strength free');
  const note = h('p', { class: `${cls}-note` });
  const sleep = h('button', { class: `${cls}-sleep`, type: 'button' });
  sleep.addEventListener('click', options.rest.onToggle);
  // Ending the hunt is for good, so it takes a second tap.
  const end = createConfirmButton({ className: `${cls}-sleep ${cls}-end`, onConfirm: options.onEnd });
  const strips = h('div', { class: `${cls}-preys` });
  let preys: ReturnType<typeof strip>[] = [];
  const upgrades = createBuyList<G>({
    funds: (g) => options.hunt(g)?.dread ?? 0,
    currency: { text: (n) => `${formatNumber(n)} ${options.upgrades.currency}`, spoken: (n) => `${formatNumber(n)} ${options.upgrades.currency.toLowerCase()}` },
    className: names.upgradeList,
    rowClass: names.upgradeRow,
    items: (g) =>
      options.upgrades.items(g).map((u) => ({
        id: u.id,
        name: u.name,
        description: u.description,
        verb: '',
        ariaVerb: options.upgrades.verb,
        owned: () => (u.bought ? `×${u.bought}` : ''),
        price: () => u.cost,
        onBuy: () => options.upgrades.onBuy(u.id),
      })),
  });
  const feed = h('ol', { class: names.feed, 'aria-label': options.feed.aria });
  const title = h('h2', { class: `${cls}-name` });
  const el = h(
    'section',
    { class: ['hunt', cls, options.variant].filter(Boolean).join(' '), 'aria-label': options.label, hidden: true, ...(options.attrs ?? {}) },
    options.header ? options.header(title, options.guide?.rulesButton ?? null, back) : h('header', { class: `${cls}-head` }, title, ...(options.guide ? [options.guide.rulesButton] : []), back),
    h(
      'div',
      { class: `${cls}-body` },
      h(
        'div',
        { class: `${cls}-col` },
        ...(options.guide ? [options.guide.el] : []),
        h('dl', { class: names.stats }, harvest.el, hunger.el, notoriety.el, free.el),
        note,
        strips,
        sleep,
        end.el,
        h('h3', { class: names.sub }, options.feed.heading),
        feed,
      ),
      h('div', { class: `${cls}-col` }, h('h3', { class: names.sub }, options.upgrades.heading), upgrades.el),
    ),
    ...(options.extra ?? []),
    ...(options.guide ? [options.guide.rulesDialog] : []),
  );

  function strip(index: number) {
    const cells = options.prey.rows.map((row) => row.map((c) => ({ c, el: h('span', { class: c.className }) })));
    const fill = h('i', { class: `${cls}-alarm-fill` });
    const steps = createStepper({
      className: `${cls}-steps`,
      less: { label: '', onPress: () => options.prey.onShift(index, -1) },
      more: { label: '', onPress: () => options.prey.onShift(index, 1) },
    });
    const box = h(
      'section',
      { class: `${cls}-prey`, role: 'group' },
      ...cells.map((row) => h('div', { class: `${cls}-row` }, ...row.map((x) => x.el))),
      h('span', { class: `${cls}-alarm`, 'aria-hidden': 'true' }, fill),
      steps.el,
    );
    let named = '';
    return {
      el: box,
      render(hunt: HuntState<P>) {
        const prey = hunt.prey[index]!;
        const name = options.prey.name(prey, index);
        if (name !== named) {
          named = name;
          setAttr(box, 'aria-label', name);
          steps.relabel(options.prey.less(name), options.prey.more(name));
          for (const row of cells) for (const x of row) if (x.c.aria) setAttr(x.el, 'aria-label', x.c.aria(name));
        }
        for (const row of cells) for (const x of row) setText(x.el, x.c.read(prey, index));
        const alarm = options.prey.alarm(prey);
        fill.style.width = `${Math.round(alarm * 100)}%`;
        const pushed = hunt.split[index] ?? 0;
        steps.render(String(pushed));
        box.dataset.pushed = String(pushed > 0);
        box.dataset.wary = String(alarm >= WARY);
      },
    };
  }

  let shownFeed = '';
  return {
    el,
    render(g) {
      const hunt = options.hunt(g);
      el.hidden = !hunt;
      // Titled only while open (and only then asked for), so nothing else on the page shares its heading.
      const carried = hunt && typeof options.title === 'string' ? (options.legend?.(g) ?? 0) : 0;
      setText(title, !hunt ? '' : typeof options.title === 'function' ? options.title(g) : carried > 0 ? `${options.title} · ${legendText(carried)}` : options.title);
      if (!hunt) return options.guide?.render(g);
      if (preys.length !== hunt.prey.length) {
        preys = hunt.prey.map((_, i) => strip(i));
        strips.replaceChildren(...preys.map((p) => p.el));
      }
      // Spent in whole amounts, so shown whole.
      setText(harvest.value, formatNumber(Math.floor(hunt.dread)));
      setText(hunger.value, `${Math.round(hunt.hunger)}%`);
      setText(notoriety.value, hunt.notoriety.toFixed(2));
      const used = hunt.split.reduce((a, b) => a + b, 0);
      setText(free.value, `${hunt.strength - used} / ${hunt.strength}`);
      setText(note, options.note(hunt, used));
      el.dataset.state = hunt.beatenFor > 0 ? 'beaten' : hunt.dormant ? 'dormant' : 'hunting';
      setText(sleep, hunt.dormant ? options.rest.wake : options.rest.sleep);
      setAttr(sleep, 'aria-label', capital(hunt.dormant ? options.rest.wake : options.rest.sleep));
      const earned = legendEarned(hunt.harvest);
      end.label(`End the ${noun} for ${earned} Legend`, `END THE ${noun.toUpperCase()} · +${earned} LEGEND`);
      for (const p of preys) p.render(hunt);
      upgrades.render(g);
      const entries = [...options.feed.entries(hunt)].sort((a, b) => b.t - a.t).slice(0, options.feed.length ?? 8);
      const key = entries.map((e) => e.key).join(',');
      if (key !== shownFeed) {
        shownFeed = key;
        feed.replaceChildren(...entries.map((e) => h('li', { class: names.entry }, h('span', { class: names.when }, e.when), ' ', h('span', { class: names.text }, e.text))));
      }
      options.onRender?.(g);
      // Last, so the controls it points at are labelled.
      options.guide?.render(g);
    },
  };
}
