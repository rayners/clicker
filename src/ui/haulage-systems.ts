import { formatNumber } from '../engine/format';
import type { Store } from '../core/store';
import { carCost, carValue, engineCost, engineThrust, incomeGain, isCarRevealed, isEngineRevealed, thrust, trainMass, trainValue } from '../mission/haulage/economy';
import type { HaulageMission } from '../mission/state';
import { createBuyPanel } from '../engine/ui/buy-list';
import { CREDITS, addsIncome, unitItem } from './buy';
import type { HaulProfile } from '../mission/haulage/profiles';
import type { HaulWords } from './haul-words';

export function createHaulageSystemsPanel(store: Store, profile: HaulProfile, words: HaulWords): { el: HTMLElement; render(m: HaulageMission): void } {
  const engines = profile.engines.map((def, index) =>
    unitItem<HaulageMission>(def, {
      verb: words.fit,
      owned: (m) => m.engines[def.id] ?? 0,
      price: (m) => engineCost(def, m.engines[def.id] ?? 0),
      each: (m) => `+${formatNumber(engineThrust(m, def))} ${words.power} EA`,
      adds: (m) => addsIncome(incomeGain(m, { engine: def.id }), m.fuel <= 0 ? 'NO FUEL ABOARD' : 'NOTHING TO HAUL'),
      addsAria: `${def.name} income`,
      shown: (m) => isEngineRevealed(m, index),
      onBuy: () => store.dispatch({ type: 'buyEngine', id: def.id }),
    }),
  );
  const cars = profile.cars.map((def, index) =>
    unitItem<HaulageMission>(def, {
      verb: words.couple,
      owned: (m) => m.cars[def.id] ?? 0,
      price: (m) => carCost(def, m.cars[def.id] ?? 0),
      each: (m) => `+${formatNumber(carValue(m, def))} CR/KM · +${formatNumber(def.mass)} T EA`,
      adds: (m) => addsIncome(incomeGain(m, { car: def.id }), 'TOO HEAVY FOR THE ENGINES'),
      addsAria: `${def.name} income`,
      shown: (m) => isCarRevealed(m, index),
      onBuy: () => store.dispatch({ type: 'buyCar', id: def.id }),
    }),
  );

  return createBuyPanel<HaulageMission>({
    title: words.panelTitle,
    funds: (m) => m.credits,
    currency: CREDITS,
    sections: [
      { heading: words.engines, total: (m) => `${formatNumber(thrust(m))} ${words.power}`, items: engines },
      { heading: words.cars, total: (m) => `${formatNumber(trainValue(m))} CR/KM · ${formatNumber(trainMass(m))} T`, items: cars },
    ],
  });
}
