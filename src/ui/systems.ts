import { formatNumber } from '../engine/format';
import type { Store } from '../core/store';
import { GENERATORS } from '../data/extraction/generators';
import {
  generatorCost,
  generatorRate,
  isGeneratorRevealed,
  refineryCapacity,
  incomeGain,
  refineryCost,
} from '../mission/extraction/economy';
import type { ExtractionMission as MissionState } from '../mission/state';
import { h } from '../engine/ui/dom';
import { createBuyList, type BuyItem } from '../engine/ui/buy-list';
import { CREDITS } from './buy';

export function createSystemsPanel(store: Store): { el: HTMLElement; render(m: MissionState): void } {
  const refinery: BuyItem<MissionState> = {
    id: 'refinery',
    name: 'ORBITAL REFINERY',
    description: 'Converts raw ore to Combine scrip. Throughput is the bottleneck.',
    verb: 'UPGRADE',
    ariaName: 'refinery',
    owned: (m) => `LV ${m.refineryLevel}`,
    ownedAria: 'Refinery level',
    notes: [
      { read: (m) => `${formatNumber(refineryCapacity(m))} ORE/S` },
      {
        aria: 'Refinery income',
        className: 'sys-gain',
        read: (m) => {
          const gain = incomeGain(m, { refinery: true });
          return gain > 0 ? `+${formatNumber(gain)} CR/S` : '+0 CR/S · NEEDS MORE ORE';
        },
        wasted: (m) => incomeGain(m, { refinery: true }) <= 0,
      },
    ],
    price: refineryCost,
    onBuy: () => store.dispatch({ type: 'buyRefinery' }),
  };
  const generators = GENERATORS.map(
    (def, index): BuyItem<MissionState> => ({
      id: def.id,
      name: def.name,
      description: def.description,
      verb: 'ACQUIRE',
      owned: (m) => String(m.generators[def.id] ?? 0),
      ownedAria: `${def.name} owned`,
      notes: [
        { read: (m) => `+${formatNumber(generatorRate(m, def))} ORE/S EA` },
        // What it does to income, which is what the player is really buying: nothing, if the refinery is the limit.
        {
          aria: `${def.name} income`,
          className: 'sys-gain',
          read: (m) => {
            const gain = incomeGain(m, { generator: def.id });
            return gain > 0 ? `+${formatNumber(gain)} CR/S` : '+0 CR/S · REFINERY FULL';
          },
          wasted: (m) => incomeGain(m, { generator: def.id }) <= 0,
        },
      ],
      price: (m) => generatorCost(def, m.generators[def.id] ?? 0),
      shown: (m) => isGeneratorRevealed(m, index),
      onBuy: () => store.dispatch({ type: 'buyGenerator', id: def.id }),
    }),
  );
  const list = createBuyList<MissionState>({ items: [refinery, ...generators], funds: (m) => m.credits, currency: CREDITS });
  const el = h('div', { class: 'panel-body' }, h('h2', { class: 'panel-title' }, 'EXTRACTION SYSTEMS'), list.el);
  return { el, render: list.render };
}
