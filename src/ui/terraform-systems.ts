import { formatNumber } from '../engine/format';
import type { Store } from '../core/store';
import { LINES, PROCESSORS, REACTORS } from '../data/terraform/systems';
import {
  incomeGain,
  isProcessorRevealed,
  isReactorRevealed,
  lineStates,
  power,
  processorCost,
  processorRate,
  reactorCost,
} from '../mission/terraform/economy';
import type { TerraformMission } from '../mission/state';
import { createBuyPanel } from '../engine/ui/buy-list';
import { CREDITS, addsIncome, unitItem } from './buy';

export function createTerraformSystemsPanel(store: Store): { el: HTMLElement; render(m: TerraformMission): void } {
  const reactors = REACTORS.map((def, index) =>
    unitItem<TerraformMission>(def, {
      verb: 'Build',
      owned: (m) => m.reactors[def.id] ?? 0,
      price: (m) => reactorCost(def, m.reactors[def.id] ?? 0),
      each: () => `+${formatNumber(def.mw)} MW EA`,
      adds: (m) => addsIncome(incomeGain(m, { reactor: def.id }), Object.values(m.processors).some((n) => n > 0) ? 'PROCESSORS FULLY POWERED' : 'NO PROCESSORS TO FEED'),
      addsAria: `${def.name} income`,
      shown: (m) => isReactorRevealed(m, index),
      onBuy: () => store.dispatch({ type: 'buyReactor', id: def.id }),
    }),
  );
  const processors = (line: string) =>
    PROCESSORS.filter((p) => p.line === line).map((def) =>
      unitItem<TerraformMission>(def, {
        verb: 'Build',
        owned: (m) => m.processors[def.id] ?? 0,
        price: (m) => processorCost(def, m.processors[def.id] ?? 0),
        each: (m) => `+${formatNumber(processorRate(m, def))} U/S · ${formatNumber(processorRate(m, def))} MW EA`,
        adds: (m) => addsIncome(incomeGain(m, { processor: def.id }), lineStates(m)[def.line] === 'power-limited' ? 'NO POWER TO SPARE' : 'OFF SPEC'),
        addsAria: `${def.name} income`,
        shown: (m) => isProcessorRevealed(m, def),
        onBuy: () => store.dispatch({ type: 'buyProcessor', id: def.id }),
      }),
    );

  return createBuyPanel<TerraformMission>({
    title: 'STATION SYSTEMS',
    funds: (m) => m.credits,
    currency: CREDITS,
    sections: [
      { heading: 'POWER', total: (m) => `${formatNumber(power(m))} MW`, items: reactors },
      ...LINES.map((line) => ({ heading: `${line.name} LINE`, items: processors(line.id) })),
    ],
  });
}
