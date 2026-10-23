/**
 * A dial: a stepper between the two things it trades off (or under one name), an optional meter, and an
 * automation that can take it over once bought.
 * @module
 */
import { h, setAttr, setText } from './dom';
import { createStepper } from './stepper';

/** One side of what a dial trades off, and what it comes to now. */
export interface DialSide<S> {
  name: string;
  read(s: S): string;
  aria?: string;
}

/** How a game builds a dial. */
export interface DialOptions<S> {
  /** The region's accessible name. */
  label: string;
  /** An extra class beside `dial`, for the game's own look. */
  className?: string;
  value: { aria: string; read(s: S): string };
  less: { label: string; onPress(): void };
  more: { label: string; onPress(): void };
  /** The two sides of the trade, around the steps. */
  sides?: readonly [DialSide<S>, DialSide<S>];
  /** Or one name over the steps. */
  name?: string;
  /** A line under the steps: what the setting costs or risks. */
  detail?(s: S): string;
  /** A reading that fills toward trouble (0..1), with an optional name; without a name it is only a bar. */
  meter?: { name?: string; aria?: string; read(s: S): number; text?(s: S): string };
  /** What can run the dial instead of the player, once bought. */
  automation?: {
    text: string;
    active(s: S): boolean;
    handover?: { available(s: S): boolean; onToggle(): void; take: string; give: string };
  };
  /** Controls of the game's own, under the steps and meter (e.g. a refuel button). */
  extra?: readonly HTMLElement[];
  /** `data-*` marks for the stylesheet. */
  flags?(s: S): Record<string, string | boolean>;
}

/** A dial; `render` reads it off the game. */
export function createDial<S>(options: DialOptions<S>): { el: HTMLElement; render(s: S): void } {
  const stepper = createStepper({ value: { aria: options.value.aria }, less: options.less, more: options.more });
  const side = (s: DialSide<S>, extra: string) => {
    const figure = h('span', { class: 'dial-figure', ...(s.aria ? { 'aria-label': s.aria } : {}) });
    return { s, figure, el: h('div', { class: `dial-side ${extra}` }, h('span', { class: 'dial-name' }, s.name), figure) };
  };
  const sides = options.sides ? [side(options.sides[0], 'dial-side-left'), side(options.sides[1], 'dial-side-right')] : [];
  const row = h(
    'div',
    { class: 'dial-row' },
    ...(sides.length ? [sides[0]!.el, stepper.el, sides[1]!.el] : [...(options.name ? [h('span', { class: 'dial-name' }, options.name)] : []), stepper.el]),
  );
  const detail = h('span', { class: 'dial-detail' });
  const parts: HTMLElement[] = [row];
  if (options.detail) parts.push(detail);

  const fill = h('i', { class: 'dial-fill' });
  const meterValue = h('span', { class: 'dial-meter-value', ...(options.meter?.aria ? { 'aria-label': options.meter.aria } : {}) });
  if (options.meter) {
    const bar = h('span', { class: 'dial-bar', 'aria-hidden': 'true' }, fill);
    parts.push(options.meter.name ? h('div', { class: 'dial-meter' }, h('span', { class: 'dial-name' }, options.meter.name), meterValue, bar) : bar);
  }

  parts.push(...(options.extra ?? []));

  const auto = h('p', { class: 'dial-auto', hidden: true }, options.automation?.text ?? '');
  const handover = h('button', { class: 'dial-handover', type: 'button', hidden: true });
  const automation = options.automation;
  if (automation) {
    handover.addEventListener('click', () => automation.handover?.onToggle());
    parts.push(auto, handover);
  }
  const el = h('section', { class: options.className ? `dial ${options.className}` : 'dial', 'aria-label': options.label }, ...parts);

  return {
    el,
    render(s) {
      const automated = automation?.active(s) ?? false;
      stepper.render(options.value.read(s), { hidden: automated });
      for (const x of sides) setText(x.figure, x.s.read(s));
      if (options.detail) setText(detail, options.detail(s));
      if (options.meter) {
        const level = Math.max(0, Math.min(1, options.meter.read(s)));
        setText(meterValue, options.meter.text ? options.meter.text(s) : `${Math.round(level * 100)}%`);
        fill.style.width = `${Math.round(level * 100)}%`;
      }
      if (automation) {
        auto.hidden = !automated;
        const offered = automation.handover?.available(s) ?? false;
        handover.hidden = !offered;
        if (offered && automation.handover) {
          const label = automated ? automation.handover.take : automation.handover.give;
          setText(handover, label.toUpperCase());
          setAttr(handover, 'aria-label', label);
        }
      }
      el.dataset.auto = String(automated);
      for (const [k, v] of Object.entries(options.flags?.(s) ?? {})) el.dataset[k] = String(v);
    },
  };
}
