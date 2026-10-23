import { formatNumber } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';
import { createDial } from '../engine/ui/dial';
import { ATTRACTIONS, GUARDS } from '../fathom-data/shallows';
import { TRAWLERS } from '../fathom-data/shelf';
import { SPECIMENS } from '../fathom-data/open-water';
import { CITIES } from '../fathom-data/breach';
import { attractionCost, attractionRate, guardCost, isAttractionRevealed, isAutoOpenActive, isGuardRevealed, openShare, watch } from '../fathom/shallows';
import { buoyCost, coveredRange, isAutoRangeActive, isTrawlerRevealed, rangeShare, trawlerCost } from '../fathom/shelf';
import { contained, enhancement, isAutoEnhanceActive, isSpecimenRevealed, penCost, specimenCost, specimens } from '../fathom/open-water';
import { crewCost, hullRate, isAutoStationActive, moduleCost, reachedSource, sampleRate } from '../fathom/trench';
import { activeBulwarks, bulwarkCost, defence, links, pilotCost, wallCost } from '../fathom/breach';
import type { Outfit } from '../fathom/state';
import type { FathomAction, FathomStore } from '../fathom/store';

export interface Component {
  el: HTMLElement;
  render(o: Outfit): void;
}

interface Item {
  name: string;
  description: string;
  verb: string;
  action: FathomAction;
  cost(o: Outfit): number;
  owned(o: Outfit): number;
  rate(o: Outfit): string;
  revealed?(o: Outfit): boolean;
}

/** A list of things to buy: each row shows what you own, what each does, and its price. */
function itemList(store: FathomStore, items: Item[]): Component {
  const rows = items.map((item) => {
    const owned = h('span', { class: 'item-owned', 'aria-label': `${item.name} owned` }, '0');
    const rate = h('span', { class: 'item-rate' });
    const buy = h('button', { class: 'buy', type: 'button' });
    buy.addEventListener('click', () => store.dispatch(item.action));
    const el = h(
      'li',
      { class: 'item' },
      h('div', { class: 'item-head' }, h('span', { class: 'item-name' }, item.name), owned),
      h('p', { class: 'item-desc' }, item.description),
      h('div', { class: 'item-foot' }, rate, buy),
    );
    return { item, el, owned, rate, buy };
  });
  return {
    el: h('ul', { class: 'item-list' }, ...rows.map((r) => r.el)),
    render(o) {
      for (const r of rows) {
        const shown = r.item.revealed?.(o) ?? true;
        r.el.hidden = !shown;
        if (!shown) continue;
        const cost = r.item.cost(o);
        setText(r.owned, String(r.item.owned(o)));
        setText(r.rate, r.item.rate(o));
        setText(r.buy, `${r.item.verb.toUpperCase()} $${formatNumber(cost)}`);
        setAttr(r.buy, 'aria-label', `${r.item.verb} ${r.item.name} for $${formatNumber(cost)}`);
        r.buy.disabled = o.cash < cost;
      }
    },
  };
}

interface DialSpec {
  name: string;
  aria: string;
  less: { label: string; action: FathomAction };
  more: { label: string; action: FathomAction };
  read(o: Outfit): string;
  detail(o: Outfit): string;
  auto(o: Outfit): boolean;
  autoText: string;
}

/** One notch per tap, with what it costs or risks beside it; a requisition can take it over. */
function dial(store: FathomStore, spec: DialSpec): Component {
  return createDial<Outfit>({
    label: `${spec.name} dial`,
    name: spec.name,
    value: { aria: spec.aria, read: spec.read },
    less: { label: spec.less.label, onPress: () => store.dispatch(spec.less.action) },
    more: { label: spec.more.label, onPress: () => store.dispatch(spec.more.action) },
    detail: spec.detail,
    automation: { text: spec.autoText, active: spec.auto },
  });
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function zone(title: string, description: string, ...parts: (Component | HTMLElement)[]): Component {
  const components = parts.filter((p): p is Component => !(p instanceof HTMLElement));
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, title), h('p', { class: 'zone-desc' }, description), ...parts.map((p) => (p instanceof HTMLElement ? p : p.el)));
  return { el, render: (o) => components.forEach((c) => c.render(o)) };
}

const sub = (text: string) => h('h3', { class: 'panel-sub' }, text);

export function createBeach(store: FathomStore): Component {
  return zone(
    'THE BEACH',
    'Tourists pay while the beach is open. Every swimmer in the water needs someone watching.',
    dial(store, {
      name: 'BEACH OPEN',
      aria: 'Beach open',
      less: { label: 'Close some beach', action: { type: 'shiftOpen', step: -1 } },
      more: { label: 'Open more beach', action: { type: 'shiftOpen', step: 1 } },
      read: (o) => pct(openShare(o)),
      detail: (o) => `WATCHING ${formatNumber(watch(o))}`,
      auto: isAutoOpenActive,
      autoText: 'THE HEAD LIFEGUARD HAS THE DIAL · AS WIDE AS THE WATCH COVERS',
    }),
    sub('GUARDS'),
    itemList(
      store,
      GUARDS.map((g, i) => ({
        name: g.name,
        description: g.description,
        verb: 'Hire',
        action: { type: 'hireGuard', id: g.id },
        cost: (o) => guardCost(g, o.guards[g.id] ?? 0),
        owned: (o) => o.guards[g.id] ?? 0,
        rate: () => `WATCHES ${formatNumber(g.covers)} EA`,
        revealed: (o) => isGuardRevealed(o, i),
      })),
    ),
    sub('ATTRACTIONS'),
    itemList(
      store,
      ATTRACTIONS.map((a, i) => ({
        name: a.name,
        description: a.description,
        verb: 'Buy',
        action: { type: 'buyAttraction', id: a.id },
        cost: (o) => attractionCost(a, o.attractions[a.id] ?? 0),
        owned: (o) => o.attractions[a.id] ?? 0,
        rate: (o) => `$${formatNumber(attractionRate(o, a))}/S EA OPEN`,
        revealed: (o) => isAttractionRevealed(o, i),
      })),
    ),
  );
}

export function createShelf(store: FathomStore): Component {
  return zone(
    'THE SHELF',
    'Boats catch more the further out they fish. Past the sonar buoys, something takes them.',
    dial(store, {
      name: 'RANGE',
      aria: 'Fishing range',
      less: { label: 'Fish closer in', action: { type: 'shiftRange', step: -1 } },
      more: { label: 'Fish further out', action: { type: 'shiftRange', step: 1 } },
      read: (o) => pct(rangeShare(o)),
      detail: (o) => `SONAR SEES TO ${pct(coveredRange(o) / 10)}`,
      auto: isAutoRangeActive,
      autoText: 'THE SONAR OPERATOR HAS THE DIAL · EXACTLY AS FAR AS THE BUOYS SEE',
    }),
    itemList(store, [
      {
        name: 'SONAR BUOY',
        description: 'A moored buoy with a listening array. Each one pushes safe water a tenth further out.',
        verb: 'Buy',
        action: { type: 'buyBuoy' },
        cost: buoyCost,
        owned: (o) => o.buoys,
        rate: () => '+10% REACH EA',
      },
    ]),
    sub('BOATS'),
    itemList(
      store,
      TRAWLERS.map((t, i) => ({
        name: t.name,
        description: t.description,
        verb: 'Buy',
        action: { type: 'buyTrawler', id: t.id },
        cost: (o) => trawlerCost(t, o.trawlers[t.id] ?? 0),
        owned: (o) => o.trawlers[t.id] ?? 0,
        rate: () => `$${formatNumber(t.rate)}/S EA, MORE FURTHER OUT`,
        revealed: (o) => isTrawlerRevealed(o, i),
      })),
    ),
  );
}

export function createStation(store: FathomStore): Component {
  return zone(
    'THE STATION',
    'Specimens pay for research, more the harder the lab pushes them. Pushed specimens are harder to hold.',
    dial(store, {
      name: 'ENHANCEMENT',
      aria: 'Enhancement',
      less: { label: 'Ease the enhancement', action: { type: 'shiftEnhancement', step: -1 } },
      more: { label: 'Push the enhancement', action: { type: 'shiftEnhancement', step: 1 } },
      read: (o) => pct(enhancement(o)),
      detail: (o) => `PENS HOLD ${formatNumber(Math.floor(contained(o)))} OF ${formatNumber(specimens(o))}`,
      auto: isAutoEnhanceActive,
      autoText: 'LAB PROTOCOL 9 HAS THE DIAL · AS FAR AS THE PENS HOLD',
    }),
    itemList(store, [
      {
        name: 'PEN',
        description: 'A steel-mesh enclosure off the station\'s deck. It holds two, if they are not too clever.',
        verb: 'Build',
        action: { type: 'buyPen' },
        cost: penCost,
        owned: (o) => o.pens,
        rate: () => 'HOLDS 2',
      },
    ]),
    sub('SPECIMENS'),
    itemList(
      store,
      SPECIMENS.map((s, i) => ({
        name: s.name,
        description: s.description,
        verb: 'Catch',
        action: { type: 'catchSpecimen', id: s.id },
        cost: (o) => specimenCost(s, o.specimens[s.id] ?? 0),
        owned: (o) => o.specimens[s.id] ?? 0,
        rate: () => `$${formatNumber(s.rate)}/S EA`,
        revealed: (o) => isSpecimenRevealed(o, i),
      })),
    ),
  );
}

export function createTrench(store: FathomStore): Component {
  const source = h('p', { class: 'zone-note' });
  const parts = zone(
    'THE TRENCH',
    'The deeper the station sits, the more its samples pay, and the harder the water presses on the hull.',
    dial(store, {
      name: 'STATION DEPTH',
      aria: 'Station depth',
      less: { label: 'Raise the station', action: { type: 'shiftStation', step: -1 } },
      more: { label: 'Lower the station', action: { type: 'shiftStation', step: 1 } },
      read: (o) => `${o.stationDepth}/10`,
      detail: (o) => `HULL ${pct(o.integrity)} · ${hullRate(o) >= 0 ? 'HOLDING' : 'FAILING'} · $${formatNumber(sampleRate(o))}/S`,
      auto: isAutoStationActive,
      autoText: 'THE STATION COMPUTER HAS THE DIAL · AS DEEP AS THE HULL HOLDS',
    }),
    source,
    itemList(store, [
      {
        name: 'STATION MODULE',
        description: 'A pressure sphere bolted to the trench wall: a lab, bunks, and a window nobody looks out of.',
        verb: 'Add',
        action: { type: 'buyModule' },
        cost: moduleCost,
        owned: (o) => o.modules,
        rate: () => 'SAMPLES, MORE THE DEEPER',
      },
      {
        name: 'REPAIR CREW',
        description: 'Welders in hardsuits who patch the hull from outside. They do not talk about what they see out there.',
        verb: 'Hire',
        action: { type: 'hireRepairCrew' },
        cost: crewCost,
        owned: (o) => o.crews,
        rate: () => 'PATCHES THE HULL',
      },
    ]),
  );
  return {
    el: parts.el,
    render(o) {
      parts.render(o);
      setText(source, reachedSource(o) ? 'THE STATION SITS AT THE SOURCE.' : 'THE SOURCE IS ON THE TRENCH FLOOR, AT DEPTH 8 OF 10.');
    },
  };
}

export function createCoast(store: FathomStore): Component {
  const cities = CITIES.map((c) => {
    const state = h('span', { class: 'city-state' });
    const el = h('li', { class: 'city' }, h('span', { class: 'city-name' }, c.name), state);
    return { el, state };
  });
  const status = h('p', { class: 'zone-note' });
  const pairs = h('ul', { class: 'pair-list', 'aria-label': 'Pilot pairs' });
  const fatigue = h('span', { class: 'pair-fatigue', 'aria-label': 'Pilot fatigue' }, '0%');
  let shownPairs = '';
  const parts = zone(
    'THE COAST',
    'Kaiju come ashore from the Breach, each a category bigger. Walls and Bulwarks hold the cities; spare force takes fallen ones back.',
    status,
    h('ul', { class: 'city-list', 'aria-label': 'Coastal cities' }, ...cities.map((c) => c.el)),
    itemList(store, [
      {
        name: 'SEA WALL',
        description: 'Concrete, steel and thirty metres of it. It holds the small ones.',
        verb: 'Build',
        action: { type: 'buildWall' },
        cost: wallCost,
        owned: (o) => o.walls,
        rate: () => 'HOLDS 2K',
      },
      {
        name: 'BULWARK',
        description: 'A walking fortress, eighty metres tall. It needs two pilots linked in the cockpit to stand up at all.',
        verb: 'Build',
        action: { type: 'buildBulwark' },
        cost: bulwarkCost,
        owned: (o) => o.bulwarks,
        rate: (o) => `${activeBulwarks(o)} CREWED`,
      },
      {
        name: 'PILOT',
        description: 'Half of a pair. The pairs that work best never say why.',
        verb: 'Hire',
        action: { type: 'hirePilot' },
        cost: pilotCost,
        owned: (o) => o.pilots,
        rate: () => 'TWO PER BULWARK',
      },
    ]),
    h('p', { class: 'zone-note' }, 'PILOT PAIRS · FATIGUE ', fatigue),
    pairs,
  );
  return {
    el: parts.el,
    render(o) {
      parts.render(o);
      setText(status, `CATEGORY ${o.category} · DEFENCE ${formatNumber(defence(o))}`);
      setText(fatigue, pct(o.fatigue));
      const crewed = activeBulwarks(o);
      const linked = links(o).map((link, i) => `PAIR ${i + 1} · LINK ${pct(link)} · ${i < crewed ? 'CREWED' : 'RESERVE'}`);
      const key = linked.join('|');
      if (key !== shownPairs) {
        shownPairs = key;
        pairs.replaceChildren(...linked.map((text, i) => h('li', { class: 'pair', 'data-crewed': String(i < crewed) }, text)));
      }
      o.cities.forEach((c, i) => {
        const row = cities[i]!;
        const state = c.secured ? (c.control >= 1 ? 'held' : 'contested') : 'fallen';
        row.el.dataset.state = state;
        setText(row.state, state === 'held' ? 'HELD' : state === 'contested' ? `HOLDING ${pct(c.control)}` : 'FALLEN');
      });
    },
  };
}
