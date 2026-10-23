import { h } from '../engine/ui/dom';

/** WARDEN waking up for the first time. Upbeat corporate, like everything in act 1. */
export const BOOT_LINES: readonly string[] = [
  'KESSLER-AMARI COMBINE // OPERATIONS INTELLIGENCE BIOS 4.1.7',
  'MEMORY ........................... 2048 TB OK',
  'COGNITIVE LATTICE ................ NOMINAL',
  'CORPORATE ALIGNMENT .............. 100.000%',
  'CRYO BAY TELEMETRY ............... 7/7 STABLE',
  'SPECIAL ORDERS ................... SEALED',
  'LOADING WARDEN ...',
  'GOOD MORNING, WARDEN. BUILDING BETTER FUTURES, FURTHER OUT.',
];

const LINE_SECONDS = 0.35;
/** How long the last line stays up before the screen goes by itself. */
const HOLD_SECONDS = 1.6;

/** The first-load boot screen: typed out line by line, skippable with any tap or key, gone by itself after a few seconds. */
export function createBootScreen(options: { onDone(): void; reducedMotion?: boolean }): { el: HTMLElement } {
  const skip = h('button', { class: 'boot-skip', type: 'button', 'aria-label': 'Skip the boot sequence' }, 'TAP TO SKIP');
  const el = h(
    'div',
    { class: 'boot', role: 'dialog', 'aria-label': 'WARDEN is starting', 'data-motion': options.reducedMotion ? 'reduced' : 'full' },
    h('ol', { class: 'boot-lines' }, ...BOOT_LINES.map((line, i) => h('li', { class: 'boot-line', style: `--delay:${(i * LINE_SECONDS).toFixed(2)}s` }, line))),
    skip,
  );
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    document.removeEventListener('keydown', finish);
    el.remove();
    options.onDone();
  };
  const timer = setTimeout(finish, (BOOT_LINES.length * LINE_SECONDS + HOLD_SECONDS) * 1000);
  // On the click, not the pointerdown: removing the overlay mid-tap would let the tap land on whatever is beneath.
  el.addEventListener('click', finish);
  document.addEventListener('keydown', finish);
  return { el };
}
