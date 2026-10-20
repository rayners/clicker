import { formatDuration, formatNumber } from '../shared/format';
import { h, setAttr, setText } from '../shared/ui/dom';
import { CLASSES, CLASS_IDS } from '../forest-data/classes';
import { REGIONS } from '../forest-data/regions';
import { available, chartingPerTrip, isRegionOpen, maxStandingRegions, project } from '../forest/company';
import type { Company } from '../forest/state';
import type { ForestStore } from '../forest/store';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** One card per open region: its standing order (±1 per class), the projected outcome, and SEND. */
export function createExpeditions(store: ForestStore): { el: HTMLElement; render(c: Company): void } {
  const cards = REGIONS.map((region) => {
    const lower = region.name.toLowerCase();
    const counts = CLASSES.map((k) => {
      const value = h('span', { class: 'order-count', 'aria-label': `${k.plural} for ${lower}` }, '0');
      const less = h('button', { class: 'order-step', type: 'button', 'aria-label': `One fewer ${k.name.toLowerCase()} for ${lower}` }, '−');
      const more = h('button', { class: 'order-step', type: 'button', 'aria-label': `One more ${k.name.toLowerCase()} for ${lower}` }, '+');
      less.addEventListener('click', () => store.dispatch({ type: 'adjustOrder', region: region.id, id: k.id, step: -1 }));
      more.addEventListener('click', () => store.dispatch({ type: 'adjustOrder', region: region.id, id: k.id, step: 1 }));
      const el = h('div', { class: 'order-class' }, h('span', { class: 'order-name' }, k.short), h('div', { class: 'order-steps' }, less, value, more));
      return { k, el, value };
    });
    const odds = h('span', { class: 'odds-value', 'aria-label': 'Strength against danger' });
    const forecast = h('p', { class: 'forecast' });
    const send = h('button', { class: 'buy send', type: 'button', 'aria-label': `Send a party to ${lower}` }, 'SEND THE PARTY');
    send.addEventListener('click', () => store.dispatch({ type: 'dispatch', region: region.id }));
    const standing = h('button', { class: 'standing', type: 'button', 'aria-label': `${lower} order sends itself`, 'aria-pressed': 'false' });
    standing.addEventListener('click', () => store.dispatch({ type: 'toggleStanding', region: region.id }));
    const el = h(
      'article',
      { class: 'sys-row region-card', 'aria-label': region.name, 'data-region': region.id },
      h('div', { class: 'sys-head' }, h('span', { class: 'sys-name' }, region.name), h('span', { class: 'odds' }, odds)),
      h('p', { class: 'sys-desc' }, region.description),
      h('div', { class: 'order' }, ...counts.map((x) => x.el)),
      forecast,
      h('div', { class: 'card-actions' }, send, standing),
    );
    return { region, el, counts, odds, forecast, send, standing };
  });
  const sealed = h('p', { class: 'sealed' });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'Standing Orders'), ...cards.map((c) => c.el), sealed);

  function render(c: Company) {
    let nextSealed: string | null = null;
    for (const card of cards) {
      const open = isRegionOpen(c, card.region);
      card.el.hidden = !open;
      if (!open) {
        nextSealed ??= `BEYOND: ${card.region.name}. THE HANDS WILL NOT GO DEEPER UNTIL THE COMPANY HAS DELVED ${card.region.opensAt} LEAGUES.`;
        continue;
      }
      const order = c.orders[card.region.id]!;
      for (const x of card.counts) setText(x.value, String(order[x.k.id]));
      const p = project(c, card.region, order);
      setText(card.odds, `${formatNumber(p.strength)} / ${formatNumber(p.danger)}`);
      card.el.dataset.odds = p.ratio >= 1 ? 'good' : p.ratio >= 0.6 ? 'risky' : 'grim';
      const index = REGIONS.indexOf(card.region);
      const onward = REGIONS[index + 1];
      const charting = !onward
        ? ''
        : c.charted >= onward.opensAt
          ? ' WAY ONWARD ALREADY CHARTED.'
          : ` CHARTS +${chartingPerTrip(c, card.region, order).toFixed(2)} LEAGUES TOWARD ${onward.name}.`;
      setText(
        card.forecast,
        `EXPECT ~${formatNumber(p.haul)} RELICS IN ${formatDuration(p.duration)}. EACH HAND: ${pct(p.woundRisk)} WOUNDED, ${pct(p.woundRisk * p.deathRisk)} DEAD. BLIGHT +${p.blightPerHand.toFixed(2)} EACH.${charting}`,
      );
      card.el.dataset.frontier = String(charting.includes('CHARTS'));
      const short = CLASS_IDS.filter((id) => available(c, id) < order[id]);
      card.send.disabled = short.length > 0 || CLASS_IDS.every((id) => order[id] === 0);
      setText(card.send, short.length > 0 ? `NOT ENOUGH ${short.map((id) => CLASSES.find((k) => k.id === id)!.plural).join(', ')}` : 'SEND THE PARTY');
      setAttr(card.send, 'aria-label', `Send a party to ${card.region.name.toLowerCase()}`);
      const allowed = maxStandingRegions(c);
      const on = c.standing.includes(card.region.id);
      card.standing.hidden = allowed === 0;
      setAttr(card.standing, 'aria-pressed', String(on));
      setText(card.standing, on ? 'SENDS ITSELF ✓' : `QUARTERMASTER (${c.standing.length}/${allowed})`);
      card.standing.disabled = !on && c.standing.length >= allowed;
      card.el.dataset.standing = String(on);
    }
    sealed.hidden = nextSealed === null;
    setText(sealed, nextSealed ?? '');
  }

  return { el, render };
}
