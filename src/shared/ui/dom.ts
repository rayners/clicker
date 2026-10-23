type Attrs = Record<string, string | number | boolean | undefined>;

/** Tiny element builder: h('button', { class: 'x', 'aria-label': 'y' }, 'text', child). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(key, value === true ? '' : String(value));
  }
  el.append(...children);
  return el;
}

/** Only touch the DOM when the text actually changed (keeps per-tick renders cheap). */
export function setText(el: Element, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function setAttr(el: Element, name: string, value: string): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

/** The link from any game's settings to the About page and its tip jar (every game sits one level below it). */
export const aboutLink = (className: string): HTMLAnchorElement => h('a', { class: className, href: '../about/' }, 'ABOUT THESE GAMES · TIP JAR') as HTMLAnchorElement;
