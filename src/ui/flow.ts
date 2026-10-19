import { formatNumber } from '../core/format';
import type { GameState } from '../core/game';
import { bottleneck, creditRate, oreRate, refineryCapacity } from '../mission/economy';
import { h, setAttr, setText } from './dom';

const DELTA_LIFETIME = 1400;

function cell(label: string, ariaLabel: string, unit: string, cls: string) {
  const value = h('span', { class: 'flow-value', 'aria-label': ariaLabel }, '0');
  const el = h(
    'div',
    { class: `flow-cell ${cls}` },
    h('span', { class: 'flow-label' }, label),
    value,
    h('span', { class: 'flow-unit' }, unit),
  );
  return { el, value };
}

/**
 * The paperclip-style balance at the top of the screen: what is extracted, what the refinery can take,
 * and what actually becomes income. Purchases that move the rate get an immediate call-out.
 */
export function createFlow(): { el: HTMLElement; render(game: GameState): void } {
  const extract = cell('EXTRACT', 'Ore per second', 'ORE/S', 'flow-extract');
  const refine = cell('REFINE', 'Refinery throughput', 'ORE/S', 'flow-refine');
  const income = cell('INCOME', 'Income', 'CR/S', 'flow-income');
  const fill = h('span', { class: 'flow-fill' });
  const meter = h(
    'div',
    { class: 'flow-meter', role: 'meter', 'aria-label': 'Refinery load', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 },
    fill,
  );
  const note = h('p', { class: 'flow-note' });
  const arrow = () => h('span', { class: 'flow-arrow', 'aria-hidden': 'true' }, '▸');
  const el = h(
    'section',
    { class: 'flow', 'aria-label': 'Production flow' },
    h('div', { class: 'flow-row' }, extract.el, arrow(), refine.el, arrow(), income.el),
    meter,
    note,
  );

  let lastRate: number | null = null;
  let lastContract = '';

  function callOut(delta: number) {
    const sign = delta > 0 ? '+' : '-';
    const tag = h('span', { class: `rate-delta${delta < 0 ? ' is-loss' : ''}`, 'aria-hidden': 'true' }, `${sign}${formatNumber(Math.abs(delta))} ORE/S`);
    extract.el.append(tag);
    extract.el.classList.remove('is-bumped');
    void extract.el.offsetWidth; // restart the flash animation
    extract.el.classList.add('is-bumped');
    setTimeout(() => tag.remove(), DELTA_LIFETIME);
  }

  function render(game: GameState) {
    const m = game.mission;
    const rate = oreRate(m);
    const capacity = refineryCapacity(m);
    const contract = `${m.config.shipName}:${m.seed}`;
    // Rates only move on purchases and crew/containment changes, so any difference is worth showing.
    if (lastRate !== null && contract === lastContract && Math.abs(rate - lastRate) > Math.max(1e-9, lastRate * 1e-6)) {
      callOut(rate - lastRate);
    }
    lastRate = rate;
    lastContract = contract;

    setText(extract.value, formatNumber(rate));
    setText(refine.value, formatNumber(capacity));
    setText(income.value, formatNumber(creditRate(m)));
    const load = Math.round(Math.min(1, rate / capacity) * 100);
    setAttr(meter, 'aria-valuenow', String(load));
    fill.style.width = `${load}%`;
    const limit = bottleneck(m);
    setAttr(el, 'data-bottleneck', limit);
    setText(
      note,
      limit === 'refinery'
        ? `REFINERY AT CAPACITY · ${formatNumber(rate - capacity)} ORE/S BACKING UP`
        : rate === 0
          ? 'REFINERY IDLE · DRILL OR ACQUIRE EXTRACTION'
          : `${100 - load}% SPARE CAPACITY · ADD EXTRACTION`,
    );
  }

  return { el, render };
}
