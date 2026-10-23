import type { HuntState } from '../engine/hunt';
import { createHuntView, type HuntViewOptions, type PreyCell } from '../engine/ui/hunt-view';
import type { ForestGame } from '../forest/game';
import { formatDay } from '../forest/calendar';
import type { Company } from '../forest/state';

/** The companies a horror of the wood watches, by the order they came to Thistlegate. */
export const COMPANY_NAMES = ['THE COMPANY OF THE ASHEN KEY', 'THE GREY LANTERN COMPANY', 'THE BRASS HOUND COMPANY', 'THE ORDER OF THE LONG ROAD'];
const ACT_NAMES = ['', 'THE CHARTER', 'MARKS', 'THE KEY', 'THE WOOD WAKES'];
const companyName = (index: number) => COMPANY_NAMES[index] ?? `COMPANY ${index + 1}`;

/**
 * A horror's hunt over the companies, kept in the ledger's hand: shared by the wood and the dragon, which differ
 * only in their words, their tables and what they do.
 */
export function createLedgerHunt<P extends { company: Company }>(
  spec: Omit<HuntViewOptions<ForestGame, P>, 'className' | 'classes' | 'legendText' | 'prey' | 'feed' | 'back'> & {
    onBack(): void;
    /** The right-hand cell of each of the strip's two lines (named after the company). */
    cells: [PreyCell<P>, PreyCell<P>];
    alarm(prey: P): number;
    less(name: string): string;
    more(name: string): string;
    onShift(index: number, step: 1 | -1): void;
    feed: { aria: string; heading: string; took(entryText: string, kind: string): boolean };
  },
): { el: HTMLElement; render(game: ForestGame): void } {
  return createHuntView<ForestGame, P>({
    ...spec,
    className: 'wood',
    classes: { stats: 'stats', stat: 'stat', value: 'stat-value', label: 'stat-label', sub: 'panel-subtitle' },
    legendText: (n) => `Legend ${n}`,
    back: { text: 'RETURN TO THE LEDGER', aria: 'Return to the ledger', onPress: spec.onBack },
    prey: {
      name: (_p, i) => companyName(i),
      rows: [
        [{ className: 'wood-title', read: (p, i) => `${companyName(i)} · CHARTER ${p.company.charter.number}` }, spec.cells[0]],
        [{ className: 'wood-act', read: (p) => `ACT ${p.company.act}: ${ACT_NAMES[p.company.act] ?? ''}` }, spec.cells[1]],
      ],
      alarm: spec.alarm,
      less: spec.less,
      more: spec.more,
      onShift: spec.onShift,
    },
    feed: {
      heading: spec.feed.heading,
      aria: spec.feed.aria,
      entries: (h: HuntState<P>) =>
        h.prey.flatMap((p, i) =>
          p.company.log.filter((e) => spec.feed.took(e.text, e.kind)).map((e) => ({ key: `${p.company.seed}:${e.id}`, t: e.t, when: `${formatDay(e.t)} · ${companyName(i)}`, text: e.text })),
        ),
    },
  });
}
