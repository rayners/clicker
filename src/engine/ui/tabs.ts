/**
 * Tabs: a tab bar and a panel per tab, shown as they apply, marked when they want attention.
 * @module
 */
import { h, setAttr } from './dom';

/** One tab and its panel. */
export interface TabPanel<S> {
  id: string;
  /** The tab's name (and the panel's). */
  label: string;
  /** A shorter label for a narrow tab bar; the full one stays its accessible name. */
  short?: string;
  /** What goes in the panel's section. */
  content?: readonly HTMLElement[];
  /** Or a panel that is its own section (it keeps its classes and marks; the tab's wiring is added). */
  el?: HTMLElement;
  render(s: S): void;
  /** Whether the tab applies yet (default always). */
  visible?(s: S): boolean;
  /** Something there wants the player: `active` (or true) to mark the tab, `alert` when it needs them. */
  attention?(s: S): 'active' | 'alert' | boolean | null;
}

/** How a game lays out its tabs. */
export interface TabsOptions<S> {
  /** The tab bar's accessible name. */
  label: string;
  panels: readonly TabPanel<S>[];
  /** The tab chosen at first, and when the chosen one goes away. */
  home: string;
  /** On desktop the home panel is always in view: the side column shows this one while home is chosen. */
  side?: string;
  /** Prefix for the ids `<prefix>tab-<id>` and `<prefix>panel-<id>`. */
  idPrefix?: string;
  /** Gets `data-tab` with the chosen tab, for the stylesheet. */
  root?: HTMLElement;
}

/** The tab bar and the panels; `render` shows, hides and marks tabs and renders the panels that apply. */
export function createTabs<S>(options: TabsOptions<S>): {
  tabbar: HTMLElement;
  sections: HTMLElement[];
  select(id: string): void;
  render(s: S): void;
  /** Rename a tab (and its panel) as the game changes. */
  setLabel(id: string, label: string): void;
} {
  const prefix = options.idPrefix ?? '';
  const sections = options.panels.map((p) => {
    const section = p.el ?? h('section', {}, ...(p.content ?? []));
    section.classList.add('panel', `panel-${p.id}`);
    section.setAttribute('role', 'tabpanel');
    section.id = `${prefix}panel-${p.id}`;
    section.setAttribute('aria-labelledby', `${prefix}tab-${p.id}`);
    return section;
  });
  const tabs = options.panels.map((p) => {
    const b = p.short
      ? h('button', { class: `tab tab-${p.id}`, role: 'tab', id: `${prefix}tab-${p.id}`, 'aria-controls': `${prefix}panel-${p.id}`, 'aria-label': p.label, type: 'button' }, h('span', { class: 'tab-full' }, p.label), h('span', { class: 'tab-short' }, p.short))
      : h('button', { class: `tab tab-${p.id}`, role: 'tab', id: `${prefix}tab-${p.id}`, 'aria-controls': `${prefix}panel-${p.id}`, type: 'button' }, p.label);
    b.addEventListener('click', () => select(p.id));
    return b;
  });
  const labels = options.panels.map((p) => p.label);
  const tabbar = h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': options.label }, ...tabs);
  let current = options.home;

  function select(id: string) {
    current = id;
    if (options.root) options.root.dataset.tab = id;
    const side = id === options.home && options.side ? options.side : id;
    options.panels.forEach((p, i) => {
      sections[i]!.classList.toggle('is-active', p.id === id);
      sections[i]!.classList.toggle('is-side', p.id === side);
      tabs[i]!.classList.toggle('is-side', p.id === side);
      tabs[i]!.setAttribute('aria-selected', String(p.id === id));
    });
  }
  select(options.home);

  return {
    tabbar,
    sections,
    select,
    setLabel(id, label) {
      const i = options.panels.findIndex((p) => p.id === id);
      const tab = tabs[i];
      if (!tab || labels[i] === label) return;
      labels[i] = label;
      const full = tab.querySelector('.tab-full');
      if (full) full.textContent = label;
      else tab.textContent = label;
      if (tab.hasAttribute('aria-label')) setAttr(tab, 'aria-label', tab.dataset.attention ? `${label} (${tab.dataset.attention === 'alert' ? 'needs attention' : 'active'})` : label);
    },
    render(s) {
      options.panels.forEach((p, i) => {
        const tab = tabs[i]!;
        const shown = p.visible?.(s) ?? true;
        tab.hidden = !shown;
        const raw = shown ? (p.attention?.(s) ?? null) : null;
        const attention = raw === true ? 'active' : raw || null;
        if ((tab.dataset.attention ?? null) !== attention) {
          if (attention) tab.dataset.attention = attention;
          else delete tab.dataset.attention;
          const named = attention ? `${labels[i]} (${attention === 'alert' ? 'needs attention' : 'active'})` : labels[i]!;
          if (p.short || attention) setAttr(tab, 'aria-label', named);
          else tab.removeAttribute('aria-label');
        }
        if (!shown) {
          if (current === p.id) select(options.home);
          return;
        }
        try {
          p.render(s);
        } catch (error) {
          // One broken panel must never freeze the whole game loop.
          console.error(`panel ${p.id} failed to render`, error);
        }
      });
    },
  };
}
